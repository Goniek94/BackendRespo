import crypto from 'crypto';
import logger from '../utils/logger.js';

/**
 * Walidacja zmiennych środowiskowych - KRYTYCZNE dla bezpieczeństwa
 */
const validateEnvironment = () => {
  logger.info('Validating environment variables...');
  
  const required = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET', 
    'MONGO_URI'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    logger.error('CRITICAL ERROR: Missing required environment variables', {
      missingVariables: missing
    });
    logger.error('Application cannot start without these variables!');
    process.exit(1);
  }
  
  // Sprawdź czy sekrety nie są domyślne/słabe
  const weakSecrets = [
    'tajnyKluczJWT123',
    'default_jwt_secret_key', 
    'refreshSecretKey456',
    'default_refresh_secret_key',
    'complex-secure-password-for-cookie-encryption'
  ];
  
  const isWeakJWT = weakSecrets.includes(process.env.JWT_SECRET);
  const isWeakRefresh = weakSecrets.includes(process.env.JWT_REFRESH_SECRET);
  const isShortJWT = process.env.JWT_SECRET.length < 32;
  const isShortRefresh = process.env.JWT_REFRESH_SECRET.length < 32;
  
  if (isWeakJWT || isWeakRefresh || isShortJWT || isShortRefresh) {
    logger.error('CRITICAL SECURITY ERROR: Using weak JWT secrets!', {
      weakJWT: isWeakJWT,
      weakRefresh: isWeakRefresh,
      shortJWT: isShortJWT,
      shortRefresh: isShortRefresh
    });
    
    if (process.env.NODE_ENV === 'production') {
      logger.error('This is a SECURITY CATASTROPHE in production!');
      process.exit(1);
    } else {
      logger.warn('Continuing in development mode, but you MUST fix this before production!');
    }
  }
  
  // Sprawdź połączenie MongoDB URI
  if (!process.env.MONGO_URI.includes('mongodb')) {
    logger.error('MONGO_URI does not look like a valid MongoDB URI');
    process.exit(1);
  }
  
  logger.info('All required environment variables are set');
  logger.info('JWT secrets validation completed');
};

/**
 * Generuje silne sekrety dla rozwoju
 */
const generateSecrets = () => {
  console.log('🔐 Wygenerowane sekrety dla .env:');
  console.log('');
  console.log(`JWT_SECRET=${crypto.randomBytes(64).toString('hex')}`);
  console.log(`JWT_REFRESH_SECRET=${crypto.randomBytes(64).toString('hex')}`);
  console.log(`ADMIN_COOKIE_SECRET=${crypto.randomBytes(32).toString('hex')}`);
  console.log('');
};

/**
 * Konfiguracja bezpieczeństwa dla różnych środowisk
 */
const getSecurityConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    // JWT Configuration
    jwt: {
      secret: process.env.JWT_SECRET,
      refreshSecret: process.env.JWT_REFRESH_SECRET,
      accessTokenExpiry: isProduction ? '15m' : '1h', // Krótszy czas na produkcji
      refreshTokenExpiry: '7d',
      algorithm: 'HS256'
    },
    
    // Cookie Configuration - Enhanced Security
    cookies: {
      httpOnly: true, // Prevents XSS attacks
      secure: isProduction, // HTTPS only in production
      sameSite: isProduction ? 'strict' : 'lax', // CSRF protection
      domain: undefined, // Let browser set automatically
      path: '/', // Available for entire domain
      maxAge: isProduction ? 15 * 60 * 1000 : 3600000, // 15min vs 1h for access token
      priority: 'high', // High priority cookie
      partitioned: false, // Not partitioned by default
      refreshTokenMaxAge: 7 * 24 * 3600000 // 7 days for refresh token
    },
    
    // Rate Limiting
    rateLimiting: {
      global: {
        windowMs: 15 * 60 * 1000, // 15 minut
        max: isProduction ? 1000 : 5000 // Mniej na produkcji
      },
      auth: {
        windowMs: 15 * 60 * 1000,
        max: isProduction ? 20 : 50 // Bardzo restrykcyjne na produkcji
      },
      api: {
        windowMs: 1 * 60 * 1000, // 1 minuta
        max: isProduction ? 100 : 200
      }
    },
    
    // Security Headers
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
          scriptSrc: ["'self'", ...(isDevelopment ? ["'unsafe-inline'", "'unsafe-eval'"] : [])],
          imgSrc: ["'self'", 'data:', 'https://*', 'blob:'],
          connectSrc: ["'self'", ...(isDevelopment ? ['http://localhost:*'] : []), 'https://*'],
          fontSrc: ["'self'", 'https:', 'data:'],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: isProduction ? [] : null
        }
      },
      hsts: isProduction ? {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      } : false
    },
    
    // Environment flags
    isProduction,
    isDevelopment,
    
    // Logging levels
    logging: {
      level: isProduction ? 'error' : 'debug',
      includeStack: isDevelopment,
      includeSensitiveData: isDevelopment
    }
  };
};

export { 
  validateEnvironment, 
  generateSecrets, 
  getSecurityConfig 
};
