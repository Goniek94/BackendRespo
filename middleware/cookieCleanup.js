/**
 * COOKIE CLEANUP MIDDLEWARE
 * Usuwa niepotrzebne cookies które mogą powodować duże nagłówki HTTP 431
 */

import logger from '../utils/logger.js';

/**
 * Lista dozwolonych cookies - tylko niezbędne dla działania aplikacji
 * EMERGENCY FIX: Tylko jeden zestaw tokenów, żeby wyeliminować duplikaty
 */
const ALLOWED_COOKIES = [
  'token',        // access token - TYLKO JEDEN
  'refreshToken'  // refresh token - TYLKO JEDEN
  // USUNIĘTE: admin_token, admin_refreshToken - powodują duplikaty
  // USUNIĘTE: at, rt - powodują duplikaty
];

/**
 * EMERGENCY: Lista duplikatów tokenów do natychmiastowego usunięcia
 */
const DUPLICATE_TOKENS_TO_REMOVE = [
  'admin_token',
  'admin_refreshToken', 
  'at',
  'rt'
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
  'csrf_token',
  'xsrf_token',
  '_csrf',
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
    
    // EMERGENCY: Natychmiast usuń duplikaty tokenów
    const duplicateTokens = cookieNames.filter(name => 
      DUPLICATE_TOKENS_TO_REMOVE.includes(name)
    );
    
    if (duplicateTokens.length > 0) {
      console.log(`🚨 EMERGENCY: Removing duplicate tokens: ${duplicateTokens.join(', ')}`);
      
      duplicateTokens.forEach(cookieName => {
        res.clearCookie(cookieName, { path: '/' });
        res.clearCookie(cookieName, { path: '/admin' });
        res.clearCookie(cookieName, { 
          path: '/',
          domain: process.env.NODE_ENV === 'production' ? '.autosell.pl' : undefined,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
        });
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
    
    // Loguj rozmiar cookies dla monitorowania
    const cookieHeader = req.headers.cookie;
    if (cookieHeader && cookieHeader.length > 1024) { // Obniżony próg do 1KB
      console.warn(`⚠️  Large cookie header: ${cookieHeader.length} bytes`);
      console.warn(`   Cookies: ${cookieNames.join(', ')}`);
      console.warn(`   URL: ${req.originalUrl}`);
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
    /csrf/i,            // CSRF tokens
    /xsrf/i,            // XSRF tokens
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
      
      // Loguj informacje o cookies
      if (process.env.NODE_ENV === 'development') {
        console.log(`🍪 Cookies: ${cookieCount} items, ${cookieSize} bytes`);
        
        if (cookieSize > 4096) { // 4KB warning
          console.warn(`⚠️  Large cookies: ${cookieSize} bytes`);
          console.warn('   Cookie names:', Object.keys(cookies));
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
