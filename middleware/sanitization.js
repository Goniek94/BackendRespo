import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import { validationResult } from 'express-validator';
import logger from '../utils/logger.js';

// Inicjalizacja DOMPurify dla środowiska Node.js
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

/**
 * Middleware do sanityzacji danych wejściowych
 * Usuwa potencjalnie niebezpieczne znaki i kod HTML/JavaScript
 */
const sanitizeInput = (req, res, next) => {
  try {
    // Sanityzacja body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    
    // Sanityzacja query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }
    
    // Sanityzacja params
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }
    
    next();
  } catch (error) {
    logger.error('Error in sanitization middleware:', error);
    return res.status(500).json({
      success: false,
      error: 'Błąd podczas przetwarzania danych wejściowych.'
    });
  }
};

/**
 * Rekurencyjnie sanityzuje obiekt
 */
const sanitizeObject = (obj) => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanityzacja klucza
      const sanitizedKey = sanitizeString(key);
      // Sanityzacja wartości
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  return obj;
};

/**
 * Sanityzuje pojedynczy string
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') {
    return str;
  }
  
  // Usuń HTML tags i potencjalnie niebezpieczny kod
  let sanitized = DOMPurify.sanitize(str, { 
    ALLOWED_TAGS: [], // Nie pozwalaj na żadne HTML tagi
    ALLOWED_ATTR: [] // Nie pozwalaj na żadne atrybuty
  });
  
  // Dodatkowa sanityzacja - usuń potencjalnie niebezpieczne znaki
  sanitized = sanitized
    .replace(/[<>]/g, '') // Usuń < i >
    .replace(/javascript:/gi, '') // Usuń javascript: protokół
    .replace(/vbscript:/gi, '') // Usuń vbscript: protokół
    .replace(/on\w+\s*=/gi, '') // Usuń event handlery (onclick, onload, etc.)
    .replace(/eval\s*\(/gi, '') // Usuń eval()
    .replace(/expression\s*\(/gi, '') // Usuń CSS expression()
    .trim();
  
  return sanitized;
};

/**
 * Middleware do walidacji danych z express-validator
 * Sprawdza czy dane przeszły walidację i zwraca błędy jeśli nie
 */
const validateInput = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Loguj próby przesłania nieprawidłowych danych
    logger.warn('Validation failed:', {
      ip: req.ip,
      url: req.url,
      method: req.method,
      errors: errors.array(),
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    // Zwróć błędy walidacji
    return res.status(400).json({
      success: false,
      error: 'Dane wejściowe są nieprawidłowe.',
      details: errors.array().map(error => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

/**
 * Middleware do sprawdzania podejrzanych wzorców w danych
 * Wykrywa potencjalne próby ataków
 */
const detectSuspiciousPatterns = (req, res, next) => {
  const suspiciousPatterns = [
    // SQL Injection patterns
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
    /(\b(or|and)\s+\d+\s*=\s*\d+)/gi,
    /('|(\\')|(;)|(--)|(\|)|(\*)|(%27)|(%3D)|(%3B)|(%2D%2D))/gi,
    
    // XSS patterns
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript\s*:/gi,
    /vbscript\s*:/gi,
    /on\w+\s*=/gi,
    
    // Path traversal
    /\.\.[\/\\]/g,
    /(\/etc\/passwd|\/proc\/self|\/windows\/system32)/gi,
    
    // Command injection
    /(\||&|;|\$\(|\`)/g,
    /(cmd\.exe|powershell|bash|sh|nc|netcat)/gi,
    
    // NoSQL injection
    /(\$where|\$ne|\$gt|\$lt|\$regex)/gi
  ];
  
  const dataToCheck = JSON.stringify({
    body: req.body,
    query: req.query,
    params: req.params
  });
  
  const detectedPatterns = suspiciousPatterns.filter(pattern => 
    pattern.test(dataToCheck)
  );
  
  if (detectedPatterns.length > 0) {
    // Loguj podejrzaną aktywność
    logger.warn('Suspicious patterns detected - potential attack attempt:', {
      ip: req.ip,
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      patterns: detectedPatterns.length,
      timestamp: new Date().toISOString(),
      // Nie loguj pełnych danych ze względów bezpieczeństwa
    });
    
    // Zwróć ogólny błąd (nie ujawniaj szczegółów)
    return res.status(400).json({
      success: false,
      error: 'Nieprawidłowe dane wejściowe.'
    });
  }
  
  next();
};

/**
 * Middleware do ograniczania rozmiaru danych wejściowych
 */
const limitInputSize = (maxSize = 1024 * 1024) => { // Domyślnie 1MB
  return (req, res, next) => {
    const dataSize = JSON.stringify({
      body: req.body,
      query: req.query
    }).length;
    
    if (dataSize > maxSize) {
      logger.warn('Request size limit exceeded:', {
        ip: req.ip,
        url: req.url,
        size: dataSize,
        limit: maxSize,
        timestamp: new Date().toISOString()
      });
      
      return res.status(413).json({
        success: false,
        error: 'Dane wejściowe są zbyt duże.'
      });
    }
    
    next();
  };
};

/**
 * Kombinowany middleware bezpieczeństwa
 * Łączy sanityzację, walidację i wykrywanie ataków
 */
const securityMiddleware = [
  limitInputSize(2 * 1024 * 1024), // 2MB limit
  detectSuspiciousPatterns,
  sanitizeInput,
  validateInput
];

export {
  sanitizeInput,
  validateInput,
  detectSuspiciousPatterns,
  limitInputSize,
  securityMiddleware,
  sanitizeString,
  sanitizeObject
};

export default securityMiddleware;
