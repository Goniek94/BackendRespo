import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.js';
import User from '../models/user.js';

// Rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 attempts per IP per window
  message: {
    error: 'Zbyt wiele prób logowania. Spróbuj ponownie za 15 minut.',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: 15 * 60 // seconds
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip} on ${req.path}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method
    });
    
    res.status(429).json({
      error: 'Zbyt wiele prób logowania. Spróbuj ponownie za 15 minut.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 15 * 60
    });
  },
  skip: (req) => {
    // Skip rate limiting for localhost in development
    if (process.env.NODE_ENV === 'development' && req.ip === '127.0.0.1') {
      return true;
    }
    return false;
  },
  // Użyj keyGenerator zamiast skip dla asynchronicznych operacji
  keyGenerator: async (req) => {
    // Sprawdź czy to admin przed wygenerowaniem klucza
    if (req.body && req.body.email) {
      try {
        const user = await User.findOne({ email: req.body.email });
        if (user && (user.role === 'admin' || user.role === 'administrator')) {
          logger.info(`Rate limiting skipped for ${user.role}: ${user.email}`, {
            email: user.email,
            role: user.role,
            ip: req.ip
          });
          // Zwróć unikalny klucz dla adminów, który nigdy nie osiągnie limitu
          return `admin-${user._id}-${Date.now()}`;
        }
      } catch (error) {
        logger.error('Error checking user role for rate limiting:', error);
      }
    }
    // Dla zwykłych użytkowników użyj IP
    return req.ip;
  }
});

// Rate limiter for password reset endpoints (more restrictive)
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // max 3 attempts per IP per hour
  message: {
    error: 'Zbyt wiele prób resetowania hasła. Spróbuj ponownie za godzinę.',
    code: 'PASSWORD_RESET_LIMIT_EXCEEDED',
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Password reset rate limit exceeded for IP: ${req.ip}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      email: req.body.email || 'unknown'
    });
    
    res.status(429).json({
      error: 'Zbyt wiele prób resetowania hasła. Spróbuj ponownie za godzinę.',
      code: 'PASSWORD_RESET_LIMIT_EXCEEDED',
      retryAfter: 60 * 60
    });
  }
});

// Rate limiter for registration endpoints
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // max 5 registrations per IP per hour
  message: {
    error: 'Zbyt wiele prób rejestracji. Spróbuj ponownie za godzinę.',
    code: 'REGISTRATION_LIMIT_EXCEEDED',
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Registration rate limit exceeded for IP: ${req.ip}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      email: req.body.email || 'unknown'
    });
    
    res.status(429).json({
      error: 'Zbyt wiele prób rejestracji. Spróbuj ponownie za godzinę.',
      code: 'REGISTRATION_LIMIT_EXCEEDED',
      retryAfter: 60 * 60
    });
  }
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per IP per window
  message: {
    error: 'Zbyt wiele żądań. Spróbuj ponownie za 15 minut.',
    code: 'API_RATE_LIMIT_EXCEEDED',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`API rate limit exceeded for IP: ${req.ip} on ${req.path}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method
    });
    
    res.status(429).json({
      error: 'Zbyt wiele żądań. Spróbuj ponownie za 15 minut.',
      code: 'API_RATE_LIMIT_EXCEEDED',
      retryAfter: 15 * 60
    });
  }
});

export {
  authLimiter,
  passwordResetLimiter,
  registrationLimiter,
  apiLimiter
};
