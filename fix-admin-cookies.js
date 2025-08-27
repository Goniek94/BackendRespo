/**
 * SKRYPT DO CZYSZCZENIA STARYCH CIASTECZEK ADMINISTRATORA
 * 
 * Rozwiązuje problem HTTP 431 "Request Header Fields Too Large" poprzez:
 * - Usuwanie starych/zduplikowanych tokenów
 * - Czyszczenie nagromadzonych cookies sesji
 * - Optymalizację rozmiaru nagłówków HTTP
 * 
 * UŻYCIE:
 * node fix-admin-cookies.js
 * 
 * @author Senior Developer
 * @version 1.0.0
 */

import express from 'express';
import cookieParser from 'cookie-parser';
import { clearAuthCookies } from './config/cookieConfig.js';
import logger from './utils/logger.js';

/**
 * Lista problemowych cookies do wyczyszczenia
 */
const PROBLEMATIC_COOKIES = [
  'admin_token',
  'old_token',
  'backup_token',
  'temp_token',
  'session_backup',
  'old_session',
  'temp_session',
  'admin_session',
  'legacy_token',
  'expired_token'
];

/**
 * Middleware do czyszczenia starych cookies
 */
const cleanupMiddleware = (req, res, next) => {
  try {
    let cleanedCount = 0;
    const cookieNames = Object.keys(req.cookies || {});
    
    // Wyczyść problematyczne cookies
    PROBLEMATIC_COOKIES.forEach(cookieName => {
      if (req.cookies && req.cookies[cookieName]) {
        res.clearCookie(cookieName, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
          path: '/',
          domain: process.env.NODE_ENV === 'production' ? process.env.DOMAIN : undefined
        });
        cleanedCount++;
        logger.info(`Cleaned problematic cookie: ${cookieName}`);
      }
    });
    
    // Wyczyść cookies z podejrzanymi wzorcami
    cookieNames.forEach(cookieName => {
      if (cookieName.includes('old_') || 
          cookieName.includes('backup_') || 
          cookieName.includes('temp_') ||
          cookieName.includes('legacy_') ||
          cookieName.includes('expired_')) {
        
        res.clearCookie(cookieName, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
          path: '/'
        });
        cleanedCount++;
        logger.info(`Cleaned suspicious cookie: ${cookieName}`);
      }
    });
    
    // Sprawdź rozmiar cookies
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      const cookieSize = Buffer.byteLength(cookieHeader, 'utf8');
      
      if (cookieSize > 4096) { // > 4KB
        logger.warn(`Large cookie header detected: ${cookieSize} bytes`);
        
        // Wyczyść wszystkie cookies autoryzacji jeśli za duże
        clearAuthCookies(res);
        cleanedCount += 2; // token + refreshToken
        
        logger.info('Cleared all auth cookies due to size limit');
      }
    }
    
    if (cleanedCount > 0) {
      logger.info(`Total cookies cleaned: ${cleanedCount}`);
      
      // Dodaj nagłówek informujący o czyszczeniu
      res.setHeader('X-Cookies-Cleaned', cleanedCount.toString());
      res.setHeader('X-Cleanup-Reason', 'HTTP_431_Prevention');
    }
    
    next();
  } catch (error) {
    logger.error('Cookie cleanup error:', error);
    next(); // Nie blokuj żądania przy błędzie czyszczenia
  }
};

/**
 * Endpoint do ręcznego czyszczenia cookies
 */
const createCleanupEndpoint = () => {
  const router = express.Router();
  
  router.post('/cleanup-cookies', (req, res) => {
    try {
      let cleanedCount = 0;
      const cookieNames = Object.keys(req.cookies || {});
      
      // Wyczyść wszystkie cookies
      cookieNames.forEach(cookieName => {
        res.clearCookie(cookieName, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
          path: '/'
        });
        cleanedCount++;
      });
      
      // Wyczyść standardowe cookies autoryzacji
      clearAuthCookies(res);
      
      logger.info(`Manual cookie cleanup completed: ${cleanedCount} cookies cleared`);
      
      res.json({
        success: true,
        message: 'Cookies zostały wyczyszczone pomyślnie',
        cleanedCount: cleanedCount,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('Manual cookie cleanup error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Błąd podczas czyszczenia cookies',
        message: error.message
      });
    }
  });
  
  return router;
};

/**
 * Funkcja do analizy cookies w żądaniu
 */
const analyzeCookies = (req) => {
  const analysis = {
    total: 0,
    totalSize: 0,
    problematic: [],
    large: [],
    suspicious: []
  };
  
  if (!req.cookies) return analysis;
  
  const cookieNames = Object.keys(req.cookies);
  analysis.total = cookieNames.length;
  
  // Oblicz całkowity rozmiar
  if (req.headers.cookie) {
    analysis.totalSize = Buffer.byteLength(req.headers.cookie, 'utf8');
  }
  
  cookieNames.forEach(name => {
    const value = req.cookies[name];
    const size = Buffer.byteLength(`${name}=${value}`, 'utf8');
    
    // Problematyczne cookies
    if (PROBLEMATIC_COOKIES.includes(name)) {
      analysis.problematic.push({ name, size });
    }
    
    // Duże cookies (> 1KB)
    if (size > 1024) {
      analysis.large.push({ name, size });
    }
    
    // Podejrzane cookies
    if (name.includes('old_') || name.includes('backup_') || 
        name.includes('temp_') || name.includes('legacy_')) {
      analysis.suspicious.push({ name, size });
    }
  });
  
  return analysis;
};

/**
 * Middleware do logowania analizy cookies
 */
const cookieAnalysisMiddleware = (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    const analysis = analyzeCookies(req);
    
    if (analysis.totalSize > 2048 || analysis.problematic.length > 0) {
      logger.debug('Cookie Analysis:', {
        url: req.originalUrl,
        total: analysis.total,
        totalSize: analysis.totalSize,
        problematic: analysis.problematic.length,
        large: analysis.large.length,
        suspicious: analysis.suspicious.length
      });
    }
  }
  
  next();
};

/**
 * Główna funkcja eksportowana
 */
const cookieCleanupSystem = {
  middleware: cleanupMiddleware,
  analysisMiddleware: cookieAnalysisMiddleware,
  createCleanupEndpoint,
  analyzeCookies,
  PROBLEMATIC_COOKIES
};

export default cookieCleanupSystem;
export { 
  cleanupMiddleware, 
  cookieAnalysisMiddleware, 
  createCleanupEndpoint, 
  analyzeCookies 
};

/**
 * Jeśli uruchomiony bezpośrednio jako skrypt
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🧹 SKRYPT CZYSZCZENIA COOKIES ADMINISTRATORA');
  console.log('==========================================');
  console.log('');
  console.log('Ten skrypt został utworzony, aby rozwiązać problem HTTP 431.');
  console.log('');
  console.log('Aby użyć tego skryptu:');
  console.log('1. Zaimportuj middleware w swojej aplikacji:');
  console.log('   import { cleanupMiddleware } from "./fix-admin-cookies.js";');
  console.log('   app.use(cleanupMiddleware);');
  console.log('');
  console.log('2. Lub użyj endpointu do ręcznego czyszczenia:');
  console.log('   POST /cleanup-cookies');
  console.log('');
  console.log('3. Middleware automatycznie wyczyści problematyczne cookies.');
  console.log('');
  console.log('✅ Skrypt gotowy do użycia!');
}
