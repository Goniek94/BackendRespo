import { getSecurityConfig } from '../config/security.js';

const config = getSecurityConfig();

/**
 * Bezpieczny system logowania - nie wyciekają wrażliwe dane na produkcji
 */
class SecureLogger {
  constructor() {
    this.isDev = config.isDevelopment;
    this.isProduction = config.isProduction;
    this.includeStack = config.logging.includeStack;
    this.includeSensitiveData = config.logging.includeSensitiveData;
  }

  /**
   * Czyści wrażliwe dane z obiektów przed logowaniem
   */
  sanitizeData(data) {
    if (!data || typeof data !== 'object') return data;
    
    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'authorization',
      'cookie', 'session', 'jwt', 'refresh', 'twoFACode',
      'phoneNumber', 'email', 'dob'
    ];
    
    const sanitized = { ...data };
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        if (this.includeSensitiveData) {
          // W dev mode pokazuj częściowo
          if (typeof sanitized[field] === 'string') {
            sanitized[field] = sanitized[field].substring(0, 3) + '***';
          }
        } else {
          // Na produkcji ukryj całkowicie
          sanitized[field] = '[HIDDEN]';
        }
      }
    }
    
    return sanitized;
  }

  /**
   * Formatuje timestamp
   */
  getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Informacyjne logi
   */
  info(message, data = {}) {
    const sanitizedData = this.sanitizeData(data);
    const hasData = Object.keys(sanitizedData).length > 0;
    
    if (this.isDev) {
      console.log(`ℹ️ [${this.getTimestamp()}] ${message}`, hasData ? sanitizedData : '');
    } else {
      // Na produkcji tylko message bez danych
      console.log(`ℹ️ [${this.getTimestamp()}] ${message}`);
    }
  }

  /**
   * Logi błędów
   */
  error(message, error = {}) {
    const timestamp = this.getTimestamp();
    
    if (this.isDev) {
      console.error(`❌ [${timestamp}] ${message}`, {
        message: error.message,
        stack: this.includeStack ? error.stack : undefined,
        ...this.sanitizeData(error)
      });
    } else {
      // Na produkcji nie loguj stack trace
      console.error(`❌ [${timestamp}] ${message}: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Logi ostrzeżeń
   */
  warn(message, data = {}) {
    const sanitizedData = this.sanitizeData(data);
    console.warn(`⚠️ [${this.getTimestamp()}] ${message}`, this.isDev ? sanitizedData : '');
  }

  /**
   * Logi bezpieczeństwa - zawsze pełne (dla audytu)
   */
  security(message, ip, userId = null, additionalData = {}) {
    const timestamp = this.getTimestamp();
    const logData = {
      ip: ip || 'unknown',
      userId: userId || 'anonymous',
      timestamp,
      ...additionalData
    };
    
    console.log(`🔒 [SECURITY] ${message}`, logData);
  }

  /**
   * Logi debugowania - tylko w dev mode
   */
  debug(message, data = {}) {
    if (this.isDev) {
      console.log(`🐛 [${this.getTimestamp()}] DEBUG: ${message}`, this.sanitizeData(data));
    }
  }

  /**
   * Logi wydajności
   */
  performance(message, duration, additionalData = {}) {
    const emoji = duration > 1000 ? '🐌' : duration > 500 ? '⚡' : '🚀';
    console.log(`${emoji} [${this.getTimestamp()}] ${message} (${duration}ms)`, 
      this.isDev ? this.sanitizeData(additionalData) : '');
  }

  /**
   * Logi HTTP requestów
   */
  http(method, url, statusCode, duration, ip, userId = null) {
    const emoji = statusCode >= 500 ? '💥' : statusCode >= 400 ? '⚠️' : '✅';
    const message = `${emoji} ${method} ${url} ${statusCode} (${duration}ms)`;
    
    if (this.isDev) {
      console.log(`🌐 [${this.getTimestamp()}] ${message} IP: ${ip} User: ${userId || 'anonymous'}`);
    } else {
      console.log(`🌐 [${this.getTimestamp()}] ${message}`);
    }
  }

  /**
   * Logi startowe aplikacji
   */
  startup(message, data = {}) {
    console.log(`🚀 [${this.getTimestamp()}] ${message}`, data);
  }

  /**
   * Logi bazy danych
   */
  database(message, data = {}) {
    const sanitizedData = this.sanitizeData(data);
    console.log(`🗄️ [${this.getTimestamp()}] ${message}`, this.isDev ? sanitizedData : '');
  }
}

// Singleton instance
const logger = new SecureLogger();

// Middleware do logowania HTTP requestów
const httpLoggerMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // Override res.end to capture response
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - start;
    const userId = req.user?.userId;
    
    logger.http(req.method, req.originalUrl, res.statusCode, duration, req.ip, userId);
    
    originalEnd.apply(this, args);
  };
  
  next();
};

export { logger as secureLog, httpLoggerMiddleware };
export default logger;
