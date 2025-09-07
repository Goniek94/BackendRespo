/**
 * CENTRALNA KONFIGURACJA COOKIES DLA AUTOSELL.PL
 * 
 * Bezpieczna konfiguracja cookies zgodna z polityką bezpieczeństwa
 * - Produkcja: maksymalne zabezpieczenia dla domeny .autosell.pl
 * - Development: bezpieczne ustawienia dla localhost
 * 
 * UŻYCIE:
 * import { getSecureCookieConfig, clearSecureCookie } from '../config/cookieConfig.js';
 * 
 * res.cookie('token', token, getSecureCookieConfig('access'));
 * clearSecureCookie(res, 'token');
 */

// Sprawdź środowisko
const isProd = process.env.NODE_ENV === 'production';
const isStaging = process.env.NODE_ENV === 'staging';

// Domeny dla różnych środowisk
const cookieDomain = isProd ? '.autosell.pl' : undefined;

// Czasy życia tokenów (w milisekundach) - zgodnie z wytycznymi bezpieczeństwa
const TOKEN_EXPIRY = {
  // Produkcja: krótkie czasy dla bezpieczeństwa
  production: {
    access: 15 * 60 * 1000,           // 15 minut
    refresh: 7 * 24 * 60 * 60 * 1000, // 7 dni
    admin_access: 15 * 60 * 1000,     // 15 minut dla admin access
    admin_refresh: 7 * 24 * 60 * 60 * 1000 // 7 dni dla admin refresh
  },
  
  // Staging: średnie czasy dla testów
  staging: {
    access: 60 * 60 * 1000,           // 1 godzina
    refresh: 7 * 24 * 60 * 60 * 1000, // 7 dni
    admin_access: 60 * 60 * 1000,     // 1 godzina dla admin access
    admin_refresh: 7 * 24 * 60 * 60 * 1000 // 7 dni dla admin refresh
  },
  
  // Development: 60 minut jak wymagane
  development: {
    access: 60 * 60 * 1000,           // 60 minut (zgodne z JWT)
    refresh: 60 * 60 * 1000,          // 1 godzina (zgodne z JWT)
    admin_access: 60 * 60 * 1000,     // 60 minut dla admin access
    admin_refresh: 60 * 60 * 1000     // 1 godzina dla admin refresh
  }
};

// Pobierz czasy życia dla aktualnego środowiska
const getCurrentExpiry = () => {
  if (isProd) return TOKEN_EXPIRY.production;
  if (isStaging) return TOKEN_EXPIRY.staging;
  return TOKEN_EXPIRY.development;
};

/**
 * Pobierz bezpieczną konfigurację cookie dla określonego typu tokena
 * 
 * @param {string} tokenType - Typ tokena: 'access', 'refresh', 'admin'
 * @returns {object} Konfiguracja cookie
 */
export const getSecureCookieConfig = (tokenType = 'access') => {
  const expiry = getCurrentExpiry();
  
  return {
    httpOnly: true,                    // ZAWSZE HttpOnly dla bezpieczeństwa
    secure: isProd || isStaging,       // HTTPS w produkcji i staging
    sameSite: isProd ? 'strict' : 'lax', // Strict w produkcji, Lax w dev
    domain: cookieDomain,              // .autosell.pl w produkcji
    path: '/',                         // Dostępne dla całej aplikacji
    maxAge: expiry[tokenType] || expiry.access, // Odpowiedni czas życia
    
    // Dodatkowe zabezpieczenia dla produkcji
    ...(isProd && {
      priority: 'high',                // Wysoki priorytet
      partitioned: true                // Partitioned cookies
    })
  };
};

/**
 * Pobierz konfigurację dla czyszczenia cookie
 * WAŻNE: Musi mieć te same parametry co przy ustawianiu!
 * 
 * @returns {object} Konfiguracja do clearCookie
 */
export const getClearCookieConfig = () => {
  return {
    httpOnly: true,
    secure: isProd || isStaging,
    sameSite: isProd ? 'strict' : 'lax',
    domain: cookieDomain,
    path: '/'
  };
};

/**
 * Bezpieczne ustawienie cookie z tokenem
 * 
 * @param {object} res - Express response object
 * @param {string} name - Nazwa cookie
 * @param {string} value - Wartość tokena
 * @param {string} tokenType - Typ tokena: 'access', 'refresh', 'admin'
 */
export const setSecureCookie = (res, name, value, tokenType = 'access') => {
  const config = getSecureCookieConfig(tokenType);
  res.cookie(name, value, config);
};

/**
 * Bezpieczne czyszczenie cookie
 * 
 * @param {object} res - Express response object
 * @param {string} name - Nazwa cookie do wyczyszczenia
 */
export const clearSecureCookie = (res, name) => {
  const config = getClearCookieConfig();
  res.clearCookie(name, config);
};

/**
 * Ustawienie pary tokenów (access + refresh) - SKRÓCONE NAZWY
 * 
 * @param {object} res - Express response object
 * @param {string} accessToken - Access token
 * @param {string} refreshToken - Refresh token
 */
export const setAuthCookies = (res, accessToken, refreshToken) => {
  setSecureCookie(res, 'token', accessToken, 'access'); // Pełna nazwa dla czytelności
  setSecureCookie(res, 'refreshToken', refreshToken, 'refresh'); // Pełna nazwa dla czytelności
};

/**
 * Czyszczenie pary tokenów (access + refresh) - SKRÓCONE NAZWY
 * 
 * @param {object} res - Express response object
 */
export const clearAuthCookies = (res) => {
  clearSecureCookie(res, 'token');
  clearSecureCookie(res, 'refreshToken');
  
  // Wyczyść też skrócone nazwy dla kompatybilności wstecznej
  clearSecureCookie(res, 'at');
  clearSecureCookie(res, 'rt');
};

/**
 * Ustawienie admin tokenów (access + refresh)
 * 
 * @param {object} res - Express response object
 * @param {string} accessToken - Admin access token
 * @param {string} refreshToken - Admin refresh token
 */
export const setAdminCookies = (res, accessToken, refreshToken) => {
  setSecureCookie(res, 'admin_token', accessToken, 'admin_access');
  setSecureCookie(res, 'admin_refreshToken', refreshToken, 'admin_refresh');
};

/**
 * Czyszczenie admin tokenów (access + refresh)
 * 
 * @param {object} res - Express response object
 */
export const clearAdminCookies = (res) => {
  clearSecureCookie(res, 'admin_token');
  clearSecureCookie(res, 'admin_refreshToken');
};

/**
 * Ustawienie pojedynczego admin tokena (backward compatibility)
 * 
 * @param {object} res - Express response object
 * @param {string} adminToken - Admin token
 */
export const setAdminCookie = (res, adminToken) => {
  setSecureCookie(res, 'admin_token', adminToken, 'admin_access');
};

/**
 * Czyszczenie pojedynczego admin tokena (backward compatibility)
 * 
 * @param {object} res - Express response object
 */
export const clearAdminCookie = (res) => {
  clearSecureCookie(res, 'admin_token');
};

/**
 * Informacje o aktualnej konfiguracji (do debugowania)
 */
export const getCookieInfo = () => {
  const expiry = getCurrentExpiry();
  
  return {
    environment: process.env.NODE_ENV || 'development',
    domain: cookieDomain || 'localhost',
    secure: isProd || isStaging,
    sameSite: isProd ? 'strict' : 'lax',
    expiry: {
      access: `${expiry.access / 1000 / 60} minut`,
      refresh: `${expiry.refresh / 1000 / 60 / 60 / 24} dni`,
      admin: `${expiry.admin / 1000 / 60} minut`
    }
  };
};

// Export domyślny dla kompatybilności
export default {
  getSecureCookieConfig,
  getClearCookieConfig,
  setSecureCookie,
  clearSecureCookie,
  setAuthCookies,
  clearAuthCookies,
  setAdminCookies,
  clearAdminCookies,
  setAdminCookie,
  clearAdminCookie,
  getCookieInfo
};
