/**
 * SKRYPT SPRAWDZANIA TOKENU UŻYTKOWNIKA
 * Sprawdza czy użytkownik ma token w kontekście i jak wygląda obiekt user
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Kolory dla konsoli
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkUserToken() {
  log('\n🔍 SPRAWDZANIE TOKENU UŻYTKOWNIKA', 'bright');
  log('=' .repeat(60), 'cyan');

  // 1. Sprawdź AuthContext - jak wygląda obiekt user
  log('\n👤 AUTHCONTEXT - Struktura obiektu user:', 'yellow');
  
  const authContextPath = path.join(__dirname, '../../marketplace-frontend/src/contexts/AuthContext.js');
  if (fs.existsSync(authContextPath)) {
    log('  ✅ AuthContext.js znaleziony', 'green');
    analyzeAuthContext(authContextPath);
  } else {
    log('  ❌ AuthContext.js nie znaleziony', 'red');
  }

  // 2. Sprawdź NotificationContext - jak sprawdza token
  log('\n🔔 NOTIFICATIONCONTEXT - Sprawdzanie tokenu:', 'yellow');
  
  const notificationContextPath = path.join(__dirname, '../../marketplace-frontend/src/contexts/NotificationContext.js');
  if (fs.existsSync(notificationContextPath)) {
    log('  ✅ NotificationContext.js znaleziony', 'green');
    analyzeNotificationContext(notificationContextPath);
  } else {
    log('  ❌ NotificationContext.js nie znaleziony', 'red');
  }

  // 3. Sprawdź config.js - jak zarządzane są tokeny
  log('\n⚙️  CONFIG.JS - Zarządzanie tokenami:', 'yellow');
  
  const configPath = path.join(__dirname, '../../marketplace-frontend/src/services/api/config.js');
  if (fs.existsSync(configPath)) {
    log('  ✅ config.js znaleziony', 'green');
    analyzeConfig(configPath);
  } else {
    log('  ❌ config.js nie znaleziony', 'red');
  }

  // 4. Sprawdź authApi.js - jak logowanie ustawia dane użytkownika
  log('\n🔐 AUTHAPI.JS - Logowanie i dane użytkownika:', 'yellow');
  
  const authApiPath = path.join(__dirname, '../../marketplace-frontend/src/services/api/authApi.js');
  if (fs.existsSync(authApiPath)) {
    log('  ✅ authApi.js znaleziony', 'green');
    analyzeAuthApi(authApiPath);
  } else {
    log('  ❌ authApi.js nie znaleziony', 'red');
  }

  // 5. Podsumowanie i rekomendacje
  log('\n📋 PODSUMOWANIE:', 'bright');
  log('=' .repeat(60), 'cyan');
  
  log('\n🔍 ANALIZA PROBLEMU Z TOKENEM:', 'magenta');
  log('1. System używa HttpOnly cookies - token NIE jest dostępny w JavaScript', 'cyan');
  log('2. NotificationContext sprawdza user?.token - zawsze undefined!', 'red');
  log('3. AuthContext prawdopodobnie nie ustawia pola token w obiekcie user', 'yellow');
  log('4. Config.js zwraca null dla getAuthToken() - to jest poprawne!', 'green');
  
  log('\n💡 ROZWIĄZANIA:', 'yellow');
  log('OPCJA 1: Usuń sprawdzanie user?.token z NotificationContext', 'cyan');
  log('OPCJA 2: Dodaj pole token: true do obiektu user po zalogowaniu', 'cyan');
  log('OPCJA 3: Sprawdzaj tylko isAuthenticated bez user?.token', 'cyan');
  
  log('\n🛠️  REKOMENDOWANE ZMIANY:', 'green');
  log('W NotificationContext.js zmień:', 'cyan');
  log('  PRZED: if (!isAuthenticated || !user?.token)', 'red');
  log('  PO:    if (!isAuthenticated || !user)', 'green');
}

function analyzeAuthContext(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Szukaj jak tworzone są dane użytkownika
    const userDataPatterns = [
      /const userData = \{[^}]+\}/gs,
      /setUser\([^)]+\)/g,
      /user\s*:\s*\{[^}]+\}/gs,
      /token\s*:/g,
      /accessToken/g,
      /refreshToken/g
    ];

    log('    🔍 Szukam struktury obiektu user...', 'blue');
    
    userDataPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          if (match.includes('token') || match.includes('Token')) {
            log(`    🎯 Znaleziono token: ${match.substring(0, 100)}...`, 'green');
          } else if (match.includes('userData') || match.includes('setUser')) {
            log(`    👤 Struktura user: ${match.substring(0, 100)}...`, 'blue');
          }
        });
      }
    });

    // Sprawdź czy token jest dodawany do userData
    if (content.includes('token:') || content.includes('accessToken:')) {
      log('    ✅ Token jest dodawany do obiektu user', 'green');
    } else {
      log('    ❌ Token NIE jest dodawany do obiektu user', 'red');
    }

  } catch (error) {
    log(`    ❌ Błąd odczytu: ${error.message}`, 'red');
  }
}

function analyzeNotificationContext(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Szukaj sprawdzania tokenu
    const tokenCheckPatterns = [
      /user\?\.token/g,
      /user\.token/g,
      /!user\?\.token/g,
      /isAuthenticated.*user/g
    ];

    log('    🔍 Szukam sprawdzania tokenu...', 'blue');
    
    tokenCheckPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          log(`    🎯 Znaleziono sprawdzanie: ${match}`, 'yellow');
        });
      }
    });

    // Znajdź konkretną linię z problemem
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('user?.token') || line.includes('user.token')) {
        log(`    🚨 PROBLEM w linii ${index + 1}: ${line.trim()}`, 'red');
      }
    });

  } catch (error) {
    log(`    ❌ Błąd odczytu: ${error.message}`, 'red');
  }
}

function analyzeConfig(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Szukaj funkcji getAuthToken
    const tokenPatterns = [
      /export const getAuthToken[^}]+\}/gs,
      /getAuthToken.*=>[^}]+\}/gs,
      /return null/g,
      /HttpOnly cookies/g
    ];

    log('    🔍 Szukam zarządzania tokenami...', 'blue');
    
    tokenPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          if (match.includes('getAuthToken')) {
            log(`    🎯 getAuthToken: ${match.substring(0, 150)}...`, 'blue');
          } else if (match.includes('HttpOnly')) {
            log(`    🔒 HttpOnly cookies: ${match}`, 'green');
          } else if (match.includes('return null')) {
            log(`    ✅ Zwraca null: ${match}`, 'green');
          }
        });
      }
    });

  } catch (error) {
    log(`    ❌ Błąd odczytu: ${error.message}`, 'red');
  }
}

function analyzeAuthApi(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Szukaj jak ustawiane są dane po logowaniu
    const loginPatterns = [
      /setAuthData\([^)]+\)/g,
      /response\.data\.user/g,
      /userData\s*=/g,
      /token.*response/g
    ];

    log('    🔍 Szukam ustawiania danych po logowaniu...', 'blue');
    
    loginPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          log(`    🎯 Ustawianie danych: ${match}`, 'blue');
        });
      }
    });

    // Sprawdź czy token jest przekazywany
    if (content.includes('accessToken') || content.includes('token')) {
      log('    ⚠️  Token może być przekazywany', 'yellow');
    } else {
      log('    ✅ Token NIE jest przekazywany (poprawne dla HttpOnly)', 'green');
    }

  } catch (error) {
    log(`    ❌ Błąd odczytu: ${error.message}`, 'red');
  }
}

// Uruchom sprawdzanie
checkUserToken();

log('\n✅ Sprawdzanie zakończone!', 'bright');
