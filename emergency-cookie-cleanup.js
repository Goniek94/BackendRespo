/**
 * EMERGENCY COOKIE CLEANUP SCRIPT
 * 
 * Natychmiastowe czyszczenie wszystkich problematycznych cookies
 * które powodują błąd HTTP 431 "Request Header Fields Too Large"
 * 
 * UŻYCIE:
 * 1. Uruchom serwer
 * 2. Przejdź do: http://localhost:5000/emergency-cleanup
 * 3. Lub dodaj ?emergency_cleanup=true do dowolnego URL
 */

import express from 'express';
import { getClearCookieConfig } from './config/cookieConfig.js';
import logger from './utils/logger.js';

/**
 * Lista WSZYSTKICH możliwych cookies do wyczyszczenia
 */
const ALL_POSSIBLE_COOKIES = [
  // Standardowe cookies autoryzacji
  'token',
  'refreshToken',
  'admin_token',
  'admin_refreshToken',
  
  // Stare/zduplikowane cookies
  'old_token',
  'backup_token',
  'temp_token',
  'legacy_token',
  'session_backup',
  'old_admin_token',
  'temp_admin_token',
  
  // Cookies sesji
  'session',
  'sessionId',
  'admin_session',
  'admin_sessionId',
  'connect.sid',
  'express:sess',
  'express:sess.sig',
  
  // Cookies użytkownika
  'user',
  'userData',
  'userInfo',
  'admin',
  'adminData',
  'adminInfo',
  
  // Cookies autoryzacji (różne warianty)
  'auth',
  'authorization',
  'access_token',
  'refresh_token',
  'jwt',
  'jwt_token',
  'bearer',
  'bearer_token',
  
  // Cookies z błędnymi nazwami
  'undefined',
  'null',
  'NaN',
  '[object Object]',
  'true',
  'false',
  
  // Cookies z prefiksami
  'autosell_token',
  'autosell_session',
  'marketplace_token',
  'marketplace_session',
  
  // Cookies z sufiksami numerycznymi (duplikaty)
  'token_1', 'token_2', 'token_3', 'token_4', 'token_5',
  'session_1', 'session_2', 'session_3', 'session_4', 'session_5',
  'admin_token_1', 'admin_token_2', 'admin_token_3',
  
  // Cookies z datami
  'token_2024', 'token_2025',
  'session_2024', 'session_2025',
  
  // Cookies z różnymi formatami
  'Token', 'TOKEN', 'Session', 'SESSION',
  'Admin_Token', 'ADMIN_TOKEN',
  
  // Cookies z podkreślnikami i myślnikami
  'auth-token', 'auth_token',
  'admin-token', 'admin_token',
  'user-session', 'user_session',
  
  // Cookies z długimi nazwami (potencjalnie uszkodzone)
  'very_long_cookie_name_that_might_be_corrupted',
  'extremely_long_token_name_with_timestamp_and_random_data',
  
  // Cookies testowe
  'test_token',
  'dev_token',
  'debug_token',
  'local_token'
];

/**
 * Funkcja do całkowitego czyszczenia wszystkich cookies
 */
export const performEmergencyCleanup = (res, req = null) => {
  const clearConfig = getClearCookieConfig();
  let clearedCount = 0;
  let errors = [];
  
  console.log('🚨 ROZPOCZYNANIE EMERGENCY CLEANUP COOKIES...');
  
  // Wyczyść wszystkie znane cookies
  ALL_POSSIBLE_COOKIES.forEach(cookieName => {
    try {
      res.clearCookie(cookieName, clearConfig);
      
      // Wyczyść też z różnymi ścieżkami
      res.clearCookie(cookieName, { ...clearConfig, path: '/' });
      res.clearCookie(cookieName, { ...clearConfig, path: '/admin' });
      res.clearCookie(cookieName, { ...clearConfig, path: '/api' });
      
      // Wyczyść też z różnymi domenami (dla localhost)
      if (process.env.NODE_ENV === 'development') {
        res.clearCookie(cookieName, { ...clearConfig, domain: 'localhost' });
        res.clearCookie(cookieName, { ...clearConfig, domain: '.localhost' });
        res.clearCookie(cookieName, { ...clearConfig, domain: undefined });
      }
      
      clearedCount++;
    } catch (error) {
      errors.push({ cookieName, error: error.message });
    }
  });
  
  // Jeśli mamy dostęp do req, wyczyść też cookies z nagłówka
  if (req && req.headers.cookie) {
    const cookieHeader = req.headers.cookie;
    const cookiePairs = cookieHeader.split(';');
    
    cookiePairs.forEach(pair => {
      const trimmedPair = pair.trim();
      const equalIndex = trimmedPair.indexOf('=');
      
      if (equalIndex > 0) {
        const cookieName = trimmedPair.substring(0, equalIndex).trim();
        
        // Wyczyść każdy cookie znaleziony w nagłówku
        try {
          res.clearCookie(cookieName, clearConfig);
          res.clearCookie(cookieName, { ...clearConfig, path: '/' });
          res.clearCookie(cookieName, { ...clearConfig, path: '/admin' });
          res.clearCookie(cookieName, { ...clearConfig, path: '/api' });
          
          if (process.env.NODE_ENV === 'development') {
            res.clearCookie(cookieName, { ...clearConfig, domain: 'localhost' });
            res.clearCookie(cookieName, { ...clearConfig, domain: '.localhost' });
            res.clearCookie(cookieName, { ...clearConfig, domain: undefined });
          }
          
          clearedCount++;
        } catch (error) {
          errors.push({ cookieName, error: error.message });
        }
      }
    });
  }
  
  // Dodaj nagłówki informujące o czyszczeniu
  res.setHeader('X-Emergency-Cleanup', 'true');
  res.setHeader('X-Cookies-Cleared', clearedCount.toString());
  res.setHeader('X-Cleanup-Errors', errors.length.toString());
  
  // Dodaj nagłówki do wymuszenia odświeżenia cache
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  console.log(`✅ EMERGENCY CLEANUP ZAKOŃCZONY:`);
  console.log(`   - Wyczyszczono cookies: ${clearedCount}`);
  console.log(`   - Błędy: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('❌ Błędy podczas czyszczenia:');
    errors.forEach(({ cookieName, error }) => {
      console.log(`   - ${cookieName}: ${error}`);
    });
  }
  
  return {
    success: true,
    clearedCount,
    errors,
    message: `Emergency cleanup completed. Cleared ${clearedCount} cookies.`
  };
};

/**
 * Endpoint do emergency cleanup
 */
export const emergencyCleanupEndpoint = (req, res) => {
  try {
    const result = performEmergencyCleanup(res, req);
    
    // Loguj cleanup
    logger.warn('Emergency cookie cleanup performed', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      clearedCount: result.clearedCount,
      errors: result.errors.length,
      url: req.originalUrl
    });
    
    res.status(200).json({
      success: true,
      message: 'Emergency cookie cleanup completed successfully',
      details: result,
      instructions: [
        '1. All cookies have been cleared',
        '2. Please refresh the page',
        '3. Log in again if needed',
        '4. The HTTP 431 error should be resolved'
      ]
    });
    
  } catch (error) {
    logger.error('Emergency cleanup failed', {
      error: error.message,
      stack: error.stack,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      error: 'Emergency cleanup failed',
      message: error.message
    });
  }
};

/**
 * Middleware do automatycznego emergency cleanup
 */
export const autoEmergencyCleanup = (req, res, next) => {
  // Sprawdź czy nagłówki są za duże
  const cookieHeader = req.headers.cookie;
  
  if (cookieHeader && cookieHeader.length > 4096) { // 4KB limit
    console.log('🚨 WYKRYTO DUŻE COOKIES - AUTOMATYCZNE CZYSZCZENIE');
    
    const result = performEmergencyCleanup(res, req);
    
    logger.warn('Automatic emergency cleanup triggered', {
      cookieSize: cookieHeader.length,
      ip: req.ip,
      url: req.originalUrl,
      clearedCount: result.clearedCount
    });
    
    // Zwróć odpowiedź z instrukcjami
    return res.status(200).json({
      success: true,
      message: 'Cookies were too large and have been automatically cleared',
      details: result,
      instructions: [
        'Your cookies were causing HTTP 431 error',
        'All cookies have been automatically cleared',
        'Please refresh the page and log in again',
        'This should resolve the issue'
      ]
    });
  }
  
  next();
};

export default {
  performEmergencyCleanup,
  emergencyCleanupEndpoint,
  autoEmergencyCleanup,
  ALL_POSSIBLE_COOKIES
};
