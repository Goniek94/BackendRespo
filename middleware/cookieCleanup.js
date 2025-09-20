/**
 * COOKIE CLEANUP MIDDLEWARE
 * Usuwa niepotrzebne cookies które mogą powodować duże nagłówki HTTP 431
 */

import logger from '../utils/logger.js';

/**
 * Lista dozwolonych cookies - WSZYSTKIE niezbędne tokeny uwierzytelniania
 * FIXED: Dodano wszystkie tokeny używane w aplikacji
 */
const ALLOWED_COOKIES = [
  // Główne tokeny użytkowników
  'token',              // access token
  'refreshToken',       // refresh token
  
  // Tokeny administratorów
  'admin_token',        // admin access token
  'admin_refreshToken', // admin refresh token
  
  // Skrócone nazwy (kompatybilność wsteczna)
  'at',                 // short access token
  'rt',                 // short refresh token
  
  // Tokeny bezpieczeństwa
  'csrf_token',         // CSRF protection
  'xsrf_token',         // XSRF protection
  '_csrf',              // Alternative CSRF
  
  // Sesje i bezpieczeństwo
  'session_id',         // Session identifier
  'remember_token'      // Remember me functionality
];

/**
 * REMOVED: Nie usuwamy już żadnych tokenów uwierzytelniania jako duplikaty
 * Wszystkie tokeny auth są teraz chronione w ALLOWED_COOKIES
 */
const LEGACY_TOKENS_TO_MONITOR = [
  // Monitorujemy ale nie usuwamy - mogą być potrzebne
  'old_token',
  'legacy_auth',
  'temp_token'
];

/**
 * Lista cookies do usunięcia - znane problematyczne cookies
 */
const COOKIES_TO_REMOVE = [
  // Session cookies
  'connect.sid',
  'session',
  'sessionid',
  'JSESSIONID',
  'PHPSESSID',
  'ASP.NET_SessionId',
  
  // Analytics cookies
  '_ga',
  '_gid',
  '_gat',
  '_gtag',
  '_fbp',
  '_fbc',
  'gtm_id',
  
  // Tracking cookies
  '_utm_source',
  '_utm_medium',
  '_utm_campaign',
  '_utm_term',
  '_utm_content',
  
  // Other common cookies
  // SECURITY FIX: Removed CSRF cookies from cleanup to preserve CSRF protection
  // 'csrf_token',
  // 'xsrf_token', 
  // '_csrf',
  'remember_token',
  'user_preferences',
  'theme',
  'language',
  'locale',
  
  // Development cookies
  'debug',
  'dev_mode',
  'test_cookie'
];

/**
 * EMERGENCY MIDDLEWARE - Natychmiastowe usuwanie duplikatów tokenów
 */
export const cookieCleanupMiddleware = (req, res, next) => {
  try {
    const cookies = req.cookies || {};
    const cookieNames = Object.keys(cookies);
    
    // FIXED: Nie usuwamy już tokenów uwierzytelniania jako duplikaty
    // Monitorujemy legacy tokeny ale ich nie usuwamy automatycznie
    const legacyTokens = cookieNames.filter(name => 
      LEGACY_TOKENS_TO_MONITOR.includes(name)
    );
    
    if (legacyTokens.length > 0) {
      logger.info('Legacy tokens detected (monitoring only)', {
        tokens: legacyTokens,
        endpoint: req.originalUrl
      });
    }
    
    // Sprawdź czy są niepotrzebne cookies
    const unnecessaryCookies = cookieNames.filter(name => 
      !ALLOWED_COOKIES.includes(name) && 
      (COOKIES_TO_REMOVE.includes(name) || shouldRemoveCookie(name))
    );
    
    if (unnecessaryCookies.length > 0) {
      logger.info('Removing unnecessary cookies', {
        cookies: unnecessaryCookies,
        totalCookies: cookieNames.length,
        endpoint: req.originalUrl
      });
      
      // Usuń niepotrzebne cookies
      unnecessaryCookies.forEach(cookieName => {
        res.clearCookie(cookieName, {
          path: '/',
          domain: process.env.NODE_ENV === 'production' ? '.autosell.pl' : undefined,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
        });
      });
    }
    
    // FIXED: Zwiększony próg cookies z 1KB do 4KB (rozsądny limit)
    const cookieHeader = req.headers.cookie;
    if (cookieHeader && cookieHeader.length > 4096) { // Zwiększony próg do 4KB
      logger.warn('Large cookie header detected', {
        size: cookieHeader.length,
        cookies: cookieNames,
        url: req.originalUrl,
        threshold: '4KB'
      });
    }
    
    next();
  } catch (error) {
    logger.error('Cookie cleanup middleware error', {
      error: error.message,
      stack: error.stack
    });
    next(); // Continue even if cleanup fails
  }
};

/**
 * Sprawdza czy cookie powinno zostać usunięte na podstawie wzorców
 */
const shouldRemoveCookie = (cookieName) => {
  const suspiciousPatterns = [
    /^_utm_/,           // Google Analytics UTM parameters
    /^_ga/,             // Google Analytics
    /^_fb/,             // Facebook tracking
    /^gtm_/,            // Google Tag Manager
    /session/i,         // Session cookies
    // SECURITY FIX: Removed CSRF patterns to preserve CSRF protection
    // /csrf/i,            // CSRF tokens
    // /xsrf/i,            // XSRF tokens
    /tracking/i,        // Tracking cookies
    /analytics/i,       // Analytics cookies
    /advertisement/i,   // Advertisement cookies
    /marketing/i,       // Marketing cookies
    /^tmp_/,            // Temporary cookies
    /^temp_/,           // Temporary cookies
    /^cache_/,          // Cache cookies
    /^debug_/,          // Debug cookies
    /^test_/            // Test cookies
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(cookieName));
};

/**
 * Middleware do agresywnego czyszczenia wszystkich cookies oprócz auth
 */
export const aggressiveCookieCleanup = (req, res, next) => {
  try {
    const cookies = req.cookies || {};
    const cookieNames = Object.keys(cookies);
    
    // Usuń wszystkie cookies oprócz dozwolonych
    const cookiesToRemove = cookieNames.filter(name => !ALLOWED_COOKIES.includes(name));
    
    if (cookiesToRemove.length > 0) {
      logger.info('Aggressive cookie cleanup', {
        removed: cookiesToRemove,
        kept: cookieNames.filter(name => ALLOWED_COOKIES.includes(name)),
        endpoint: req.originalUrl
      });
      
      cookiesToRemove.forEach(cookieName => {
        res.clearCookie(cookieName, {
          path: '/',
          domain: process.env.NODE_ENV === 'production' ? '.autosell.pl' : undefined,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
        });
      });
    }
    
    next();
  } catch (error) {
    logger.error('Aggressive cookie cleanup error', {
      error: error.message,
      stack: error.stack
    });
    next();
  }
};

/**
 * Middleware do monitorowania rozmiaru cookies
 */
export const cookieSizeMonitor = (req, res, next) => {
  try {
    const cookieHeader = req.headers.cookie;
    
    if (cookieHeader) {
      const cookieSize = cookieHeader.length;
      const cookies = req.cookies || {};
      const cookieCount = Object.keys(cookies).length;
      
      // FIXED: Zwiększony próg monitorowania cookies
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Cookie monitoring', {
          count: cookieCount,
          size: cookieSize,
          cookies: Object.keys(cookies)
        });
        
        if (cookieSize > 4096) { // 4KB warning (zwiększony z 1KB)
          logger.warn('Large cookies detected', {
            size: cookieSize,
            threshold: '4KB',
            cookies: Object.keys(cookies)
          });
        }
      }
      
      // Dodaj nagłówki informacyjne (tylko development)
      if (process.env.NODE_ENV === 'development') {
        res.setHeader('X-Cookie-Count', cookieCount);
        res.setHeader('X-Cookie-Size', cookieSize);
      }
    }
    
    next();
  } catch (error) {
    logger.error('Cookie size monitor error', {
      error: error.message,
      stack: error.stack
    });
    next();
  }
};

export default {
  cookieCleanupMiddleware,
  aggressiveCookieCleanup,
  cookieSizeMonitor,
  ALLOWED_COOKIES,
  COOKIES_TO_REMOVE
};
