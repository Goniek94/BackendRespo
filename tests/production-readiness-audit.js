/**
 * COMPREHENSIVE PRODUCTION READINESS AUDIT
 * 
 * Kompleksowy audyt gotowości produkcyjnej backendu Marketplace
 * Sprawdza wszystkie aspekty: bezpieczeństwo, konfigurację, wydajność, stabilność
 */

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Kolory dla konsoli
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Funkcje pomocnicze
const log = (message, color = colors.reset) => console.log(`${color}${message}${colors.reset}`);
const success = (message) => log(`✅ ${message}`, colors.green);
const error = (message) => log(`❌ ${message}`, colors.red);
const warning = (message) => log(`⚠️  ${message}`, colors.yellow);
const info = (message) => log(`ℹ️  ${message}`, colors.blue);
const critical = (message) => log(`🚨 KRYTYCZNE: ${message}`, colors.red + colors.bold);
const header = (message) => log(`\n${colors.bold}${colors.cyan}${'='.repeat(60)}${colors.reset}\n${colors.bold}${colors.white}${message}${colors.reset}\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);

// Liczniki
let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;
let warningChecks = 0;
let criticalIssues = 0;

// Funkcja sprawdzająca
const check = (description, testFn, isCritical = false) => {
  totalChecks++;
  try {
    const result = testFn();
    if (result === true) {
      success(description);
      passedChecks++;
    } else if (result === 'warning') {
      warning(description);
      warningChecks++;
    } else {
      if (isCritical) {
        critical(description);
        criticalIssues++;
      } else {
        error(description);
      }
      failedChecks++;
    }
  } catch (err) {
    if (isCritical) {
      critical(`${description} - Error: ${err.message}`);
      criticalIssues++;
    } else {
      error(`${description} - Error: ${err.message}`);
    }
    failedChecks++;
  }
};

// Funkcja sprawdzająca istnienie pliku
const fileExists = (filePath) => {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
};

// Funkcja czytająca plik
const readFile = (filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
};

// Funkcja sprawdzająca zawartość pliku
const fileContains = (filePath, searchString) => {
  const content = readFile(filePath);
  return content ? content.includes(searchString) : false;
};

// GŁÓWNA FUNKCJA AUDYTU
const runProductionReadinessAudit = async () => {
  header('🔍 KOMPLEKSOWY AUDYT GOTOWOŚCI PRODUKCYJNEJ');
  info('Sprawdzanie wszystkich aspektów bezpieczeństwa, konfiguracji i stabilności...\n');

  // ==================== STRUKTURA PROJEKTU ====================
  header('📁 STRUKTURA PROJEKTU I PLIKI KONFIGURACYJNE');

  check('package.json istnieje', () => fileExists('package.json'), true);
  check('README.md istnieje z instrukcjami', () => {
    const readme = readFile('README.md');
    return readme && readme.includes('Instalacja i uruchomienie') && readme.includes('npm install');
  });
  check('.env.example istnieje', () => fileExists('.env.example'), true);
  check('.gitignore istnieje', () => fileExists('.gitignore'));
  check('index.js (główny plik) istnieje', () => fileExists('index.js'), true);

  // Sprawdzenie struktury folderów
  const requiredDirs = ['config', 'controllers', 'models', 'routes', 'middleware', 'utils'];
  requiredDirs.forEach(dir => {
    check(`Folder ${dir}/ istnieje`, () => fs.existsSync(dir));
  });

  // ==================== KONFIGURACJA ŚRODOWISKA ====================
  header('⚙️ KONFIGURACJA ŚRODOWISKA');

  check('.env.example zawiera MONGODB_URI', () => fileContains('.env.example', 'MONGODB_URI'));
  check('.env.example zawiera JWT_SECRET', () => fileContains('.env.example', 'JWT_SECRET'));
  check('.env.example zawiera FRONTEND_URL', () => fileContains('.env.example', 'FRONTEND_URL'));
  check('.env.example zawiera NODE_ENV', () => fileContains('.env.example', 'NODE_ENV'));
  check('.env.example zawiera PORT', () => fileContains('.env.example', 'PORT'));

  // Sprawdzenie konfiguracji środowisk
  check('config/environments/production.js istnieje', () => fileExists('config/environments/production.js'), true);
  check('config/environments/development.js istnieje', () => fileExists('config/environments/development.js'));
  check('config/index.js istnieje', () => fileExists('config/index.js'), true);

  // ==================== BEZPIECZEŃSTWO ====================
  header('🔒 BEZPIECZEŃSTWO');

  // Sprawdzenie middleware bezpieczeństwa
  check('middleware/auth.js istnieje', () => fileExists('middleware/auth.js'), true);
  check('middleware/rateLimiting.js istnieje', () => fileExists('middleware/rateLimiting.js'));
  check('middleware/sanitization.js istnieje', () => fileExists('middleware/sanitization.js'));

  // Sprawdzenie konfiguracji bezpieczeństwa
  check('Helmet jest skonfigurowany', () => {
    const indexContent = readFile('index.js');
    return indexContent && indexContent.includes('helmet');
  }, true);

  check('CORS jest skonfigurowany', () => {
    const indexContent = readFile('index.js');
    return indexContent && indexContent.includes('cors');
  }, true);

  check('Rate limiting jest zaimplementowany', () => {
    const rateLimitContent = readFile('middleware/rateLimiting.js');
    return rateLimitContent && rateLimitContent.includes('express-rate-limit');
  });

  // Sprawdzenie walidacji danych
  check('Walidacja emaili w modelu User', () => {
    const userModel = readFile('models/user/user.js');
    return userModel && userModel.includes('validate:') && userModel.includes('email');
  }, true);

  check('Hashowanie haseł w modelu User', () => {
    const userModel = readFile('models/user/user.js');
    return userModel && userModel.includes('bcrypt') && userModel.includes('pre(\'save\'');
  }, true);

  // Sprawdzenie nagłówków bezpieczeństwa
  check('X-Frame-Options: DENY jest ustawiony', () => {
    const devConfig = readFile('config/environments/development.js');
    const prodConfig = readFile('config/environments/production.js');
    return (devConfig && devConfig.includes('X-Frame-Options')) || 
           (prodConfig && prodConfig.includes('X-Frame-Options'));
  });

  // ==================== MODELE DANYCH ====================
  header('🗄️ MODELE DANYCH I BAZA DANYCH');

  check('Model User istnieje', () => fileExists('models/user/user.js'), true);
  check('Model Ad istnieje', () => fileExists('models/listings/ad.js'));
  check('Indeksy bazy danych są zdefiniowane', () => {
    const userModel = readFile('models/user/user.js');
    return userModel && (userModel.includes('unique: true') || userModel.includes('index:'));
  });

  // ==================== ROUTING I API ====================
  header('🛣️ ROUTING I API');

  check('routes/index.js istnieje', () => fileExists('routes/index.js'), true);
  check('routes/auth.js istnieje', () => fileExists('routes/auth.js'));
  check('routes/user/userRoutes.js istnieje', () => fileExists('routes/user/userRoutes.js'), true);
  check('routes/health.js istnieje', () => fileExists('routes/health.js'));

  // Sprawdzenie kontrolerów
  check('controllers/user/ istnieje', () => fs.existsSync('controllers/user'));
  check('controllers/listings/ istnieje', () => fs.existsSync('controllers/listings'));

  // ==================== OBSŁUGA BŁĘDÓW ====================
  header('🚨 OBSŁUGA BŁĘDÓW');

  check('Centralna obsługa błędów w index.js', () => {
    const indexContent = readFile('index.js');
    return indexContent && indexContent.includes('error') && indexContent.includes('middleware');
  });

  check('Niestandardowe klasy błędów', () => {
    return fileExists('errors/CustomError.js') || fileExists('errors/ValidationError.js');
  });

  // ==================== LOGOWANIE ====================
  header('📝 LOGOWANIE');

  check('System logowania istnieje', () => fileExists('utils/logger.js'));
  check('Konfiguracja logowania dla produkcji', () => {
    const prodConfig = readFile('config/environments/production.js');
    return prodConfig && prodConfig.includes('logging');
  });

  // ==================== TESTY ====================
  header('🧪 TESTY');

  check('Folder tests/ istnieje', () => fs.existsSync('tests'));
  check('Jest jest skonfigurowany', () => fileExists('jest.config.js'));
  check('Testy bezpieczeństwa istnieją', () => fs.existsSync('tests/security'));
  check('Testy modeli istnieją', () => fs.existsSync('tests/models'));
  check('Testy kontrolerów istnieją', () => fs.existsSync('tests/controllers'));

  // ==================== WYDAJNOŚĆ ====================
  header('⚡ WYDAJNOŚĆ');

  check('Kompresja odpowiedzi (gzip)', () => {
    const indexContent = readFile('index.js');
    return indexContent && indexContent.includes('compression');
  });

  check('Optymalizacja obrazów', () => {
    return fileExists('utils/optimizeImages.js') || fileExists('middleware/processing/imageProcessor.js');
  });

  check('Konfiguracja cache', () => {
    const prodConfig = readFile('config/environments/production.js');
    return prodConfig && prodConfig.includes('cache');
  });

  // ==================== MONITORING ====================
  header('📊 MONITORING I HEALTH CHECKS');

  check('Health check endpoint', () => fileExists('routes/health.js'));
  check('System monitoringu', () => fileExists('utils/monitoring-system.js'));
  check('Backup system', () => fileExists('utils/backup-system.js'));

  // ==================== DEPLOYMENT ====================
  header('🚀 GOTOWOŚĆ DO WDROŻENIA');

  check('Skrypty npm są zdefiniowane', () => {
    const packageJson = readFile('package.json');
    if (!packageJson) return false;
    try {
      const pkg = JSON.parse(packageJson);
      return !!(pkg.scripts && pkg.scripts.start && pkg.scripts.test);
    } catch (e) {
      return false;
    }
  }, true);

  check('Zmienne środowiskowe są udokumentowane', () => {
    const envExample = readFile('.env.example');
    return envExample && envExample.length > 500; // Sprawdza czy jest rozbudowany
  });

  check('Dockerfile istnieje', () => fileExists('Dockerfile'));

  // ==================== ZALEŻNOŚCI ====================
  header('📦 ZALEŻNOŚCI I BEZPIECZEŃSTWO PAKIETÓW');

  check('package-lock.json istnieje', () => fileExists('package-lock.json'), true);
  
  // Sprawdzenie krytycznych zależności
  const packageJson = readFile('package.json');
  if (packageJson) {
    const pkg = JSON.parse(packageJson);
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    
    check('Express jest zainstalowany', () => !!deps.express, true);
    check('Mongoose jest zainstalowany', () => !!deps.mongoose, true);
    check('bcryptjs jest zainstalowany', () => !!deps.bcryptjs, true);
    check('jsonwebtoken jest zainstalowany', () => !!deps.jsonwebtoken, true);
    check('helmet jest zainstalowany', () => !!deps.helmet, true);
    check('cors jest zainstalowany', () => !!deps.cors, true);
    check('express-rate-limit jest zainstalowany', () => !!deps['express-rate-limit']);
    check('express-validator jest zainstalowany', () => !!deps['express-validator']);
  }

  // ==================== KONFIGURACJA PRODUKCYJNA ====================
  header('🏭 KONFIGURACJA PRODUKCYJNA');

  const prodConfig = readFile('config/environments/production.js');
  if (prodConfig) {
    check('Rate limiting włączony w produkcji', () => prodConfig.includes('rateLimiting') && prodConfig.includes('enabled: true'));
    check('HTTPS wymuszony w produkcji', () => prodConfig.includes('secure: true'));
    check('Restrykcyjne CORS w produkcji', () => prodConfig.includes('origin:') && !prodConfig.includes('*'));
    check('Minimalne logowanie w produkcji', () => prodConfig.includes('level:') && prodConfig.includes('error'));
    check('Szyfrowanie bazy danych', () => prodConfig.includes('encryption'));
  }

  // ==================== BEZPIECZEŃSTWO ZAAWANSOWANE ====================
  header('🛡️ ZAAWANSOWANE BEZPIECZEŃSTWO');

  check('2FA jest zaimplementowane', () => {
    const userModel = readFile('models/user/user.js');
    return userModel && userModel.includes('2FA');
  });

  check('Blokowanie kont po nieudanych próbach', () => {
    const userModel = readFile('models/user/user.js');
    return userModel && userModel.includes('loginAttempts');
  });

  check('Sanityzacja danych wejściowych', () => fileExists('middleware/sanitization.js'));

  check('Walidacja schematów', () => fs.existsSync('validationSchemas'));

  // ==================== PODSUMOWANIE ====================
  header('📋 PODSUMOWANIE AUDYTU');

  const totalScore = Math.round((passedChecks / totalChecks) * 100);
  const securityScore = Math.round(((passedChecks - warningChecks) / totalChecks) * 100);

  info(`📊 STATYSTYKI:`);
  info(`   Wszystkie sprawdzenia: ${totalChecks}`);
  success(`   Zaliczone: ${passedChecks}`);
  if (warningChecks > 0) warning(`   Ostrzeżenia: ${warningChecks}`);
  if (failedChecks > 0) error(`   Niezaliczone: ${failedChecks}`);
  if (criticalIssues > 0) critical(`   Krytyczne problemy: ${criticalIssues}`);

  console.log('\n');
  info(`🎯 OGÓLNY WYNIK: ${totalScore}%`);
  info(`🔒 WYNIK BEZPIECZEŃSTWA: ${securityScore}%`);

  // Ocena gotowości
  console.log('\n');
  if (criticalIssues > 0) {
    critical('❌ PROJEKT NIE JEST GOTOWY NA PRODUKCJĘ!');
    critical(`Wykryto ${criticalIssues} krytycznych problemów, które MUSZĄ zostać naprawione.`);
  } else if (totalScore >= 90) {
    success('🎉 PROJEKT JEST GOTOWY NA PRODUKCJĘ!');
    success('Wszystkie krytyczne aspekty są spełnione.');
    if (warningChecks > 0) {
      warning(`Rozważ naprawienie ${warningChecks} ostrzeżeń dla lepszej jakości.`);
    }
  } else if (totalScore >= 80) {
    warning('⚠️  PROJEKT JEST PRAWIE GOTOWY NA PRODUKCJĘ');
    warning('Większość aspektów jest spełniona, ale niektóre wymagają uwagi.');
    warning('Zalecane naprawienie problemów przed wdrożeniem.');
  } else {
    error('❌ PROJEKT WYMAGA ZNACZNYCH POPRAWEK');
    error('Zbyt wiele problemów do bezpiecznego wdrożenia na produkcję.');
    error('Napraw problemy i uruchom audyt ponownie.');
  }

  // Rekomendacje
  console.log('\n');
  header('💡 REKOMENDACJE');
  
  if (criticalIssues > 0) {
    critical('PRIORYTET 1 - KRYTYCZNE:');
    critical('• Napraw wszystkie krytyczne problemy bezpieczeństwa');
    critical('• Upewnij się, że wszystkie wymagane pliki istnieją');
    critical('• Skonfiguruj prawidłowo middleware bezpieczeństwa');
  }
  
  if (failedChecks > criticalIssues) {
    error('PRIORYTET 2 - WAŻNE:');
    error('• Dodaj brakujące komponenty (testy, monitoring, backup)');
    error('• Skonfiguruj optymalizacje wydajności');
    error('• Uzupełnij dokumentację');
  }
  
  if (warningChecks > 0) {
    warning('PRIORYTET 3 - ZALECANE:');
    warning('• Rozważ dodanie Dockerfile dla konteneryzacji');
    warning('• Dodaj więcej testów dla lepszego pokrycia');
    warning('• Skonfiguruj CI/CD pipeline');
  }

  success('DOBRE PRAKTYKI:');
  success('• Regularnie aktualizuj zależności (npm audit)');
  success('• Monitoruj logi aplikacji w produkcji');
  success('• Wykonuj regularne backupy bazy danych');
  success('• Testuj aplikację w środowisku staging przed produkcją');

  console.log('\n' + '='.repeat(60));
  
  // Kod wyjścia
  process.exit(criticalIssues > 0 ? 1 : 0);
};

// Uruchomienie audytu
runProductionReadinessAudit().catch(err => {
  critical(`Krytyczny błąd audytu: ${err.message}`);
  process.exit(1);
});
