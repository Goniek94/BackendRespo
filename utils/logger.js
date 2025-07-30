/**
 * ENTERPRISE SECURITY LOGGER
 * 
 * Profesjonalny system logowania z automatycznym filtrowaniem wrażliwych danych.
 * - Poziomy logowania kontrolowane przez ENV
 * - Automatyczne filtrowanie tokenów, sekretów, haseł
 * - Bezpieczne logowanie na produkcji
 * - Strukturalne logi JSON dla monitoringu
 */

import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Konfiguracja poziomów logowania
const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'error' : 'debug');
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Lista wrażliwych słów kluczowych do filtrowania
const SENSITIVE_KEYWORDS = [
  'password', 'token', 'secret', 'key', 'jwt', 'auth', 'credential',
  'bearer', 'authorization', 'cookie', 'session', 'fingerprint',
  'email', 'phone', 'ssn', 'credit', 'card', 'cvv', 'pin'
];

/**
 * Filtruje wrażliwe dane z obiektów i stringów
 */
const sanitizeData = (data) => {
  if (typeof data === 'string') {
    // Filtruj tokeny JWT (format: xxx.yyy.zzz)
    data = data.replace(/[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g, '[JWT_TOKEN_FILTERED]');
    
    // Filtruj długie stringi które mogą być tokenami (>50 znaków alfanumerycznych)
    data = data.replace(/[A-Za-z0-9]{50,}/g, '[LONG_TOKEN_FILTERED]');
    
    // Filtruj hasła i sekrety
    SENSITIVE_KEYWORDS.forEach(keyword => {
      const regex = new RegExp(`(${keyword}[\\s]*[:=][\\s]*)[^\\s,}]+`, 'gi');
      data = data.replace(regex, `$1[${keyword.toUpperCase()}_FILTERED]`);
    });
    
    return data;
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized = Array.isArray(data) ? [] : {};
    
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      
      // Filtruj wrażliwe klucze
      if (SENSITIVE_KEYWORDS.some(keyword => lowerKey.includes(keyword))) {
        sanitized[key] = '[SENSITIVE_DATA_FILTERED]';
      } else {
        sanitized[key] = sanitizeData(value);
      }
    }
    
    return sanitized;
  }
  
  return data;
};

/**
 * Custom format dla bezpiecznego logowania
 */
const secureFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    // Sanityzuj wszystkie dane
    const sanitizedMessage = IS_PRODUCTION ? sanitizeData(message) : message;
    const sanitizedMeta = IS_PRODUCTION ? sanitizeData(meta) : meta;
    
    let logEntry = {
      timestamp,
      level,
      message: sanitizedMessage,
      ...(Object.keys(sanitizedMeta).length > 0 && { meta: sanitizedMeta }),
      ...(stack && !IS_PRODUCTION && { stack })
    };
    
    return JSON.stringify(logEntry);
  })
);

/**
 * Konfiguracja transportów
 */
const transports = [];

// Console transport (tylko dla development)
if (!IS_PRODUCTION) {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  );
}

// File transport dla błędów (zawsze aktywny)
transports.push(
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/error.log'),
    level: 'error',
    format: secureFormat,
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5
  })
);

// File transport dla wszystkich logów (tylko development)
if (!IS_PRODUCTION) {
  transports.push(
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/combined.log'),
      format: secureFormat,
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 3
    })
  );
}

// Audit log dla akcji bezpieczeństwa (zawsze aktywny)
const auditLogger = winston.createLogger({
  level: 'info',
  format: secureFormat,
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/audit.log'),
      maxsize: 100 * 1024 * 1024, // 100MB
      maxFiles: 10
    })
  ]
});

/**
 * Główny logger
 */
const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: secureFormat,
  transports,
  // Nie loguj uncaught exceptions na produkcji (bezpieczeństwo)
  exitOnError: false
});

/**
 * Bezpieczne metody logowania
 */
const secureLogger = {
  // Standardowe poziomy
  error: (message, meta = {}) => logger.error(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  info: (message, meta = {}) => logger.info(message, meta),
  debug: (message, meta = {}) => {
    // Debug logi tylko w development
    if (!IS_PRODUCTION) {
      logger.debug(message, meta);
    }
  },
  
  // Specjalne metody dla bezpieczeństwa
  security: (message, meta = {}) => {
    auditLogger.info(`[SECURITY] ${message}`, meta);
    logger.warn(`[SECURITY] ${message}`, meta);
  },
  
  auth: (message, meta = {}) => {
    auditLogger.info(`[AUTH] ${message}`, meta);
    if (!IS_PRODUCTION) {
      logger.info(`[AUTH] ${message}`, meta);
    }
  },
  
  audit: (message, meta = {}) => {
    auditLogger.info(`[AUDIT] ${message}`, meta);
  },
  
  // Metoda do bezpiecznego logowania błędów z kontekstem
  errorWithContext: (error, context = {}) => {
    const errorInfo = {
      message: error.message,
      name: error.name,
      ...(context && { context: sanitizeData(context) }),
      ...(error.stack && !IS_PRODUCTION && { stack: error.stack })
    };
    
    logger.error('Application error occurred', errorInfo);
    auditLogger.error('Application error occurred', errorInfo);
  }
};

// Tworzenie katalogu logs jeśli nie istnieje
import fs from 'fs';
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

export default secureLogger;
