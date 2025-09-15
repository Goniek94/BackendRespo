/**
 * SKRYPT ANALIZY PRZEPŁYWU POWIADOMIEŃ
 * Sprawdza gdzie backend wysyła powiadomienia i jak frontend je odbiera
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

function analyzeNotificationFlow() {
  log('\n🔍 ANALIZA PRZEPŁYWU POWIADOMIEŃ', 'bright');
  log('=' .repeat(50), 'cyan');

  // 1. Analiza backendu - gdzie są tworzone powiadomienia
  log('\n📤 BACKEND - Gdzie są tworzone powiadomienia:', 'yellow');
  
  const backendFiles = [
    'services/notificationManager.js',
    'services/notificationService.js',
    'controllers/notifications/notificationController.js',
    'routes/listings/handlers/createAdHandler.js',
    'admin/controllers/listings/adController.js'
  ];

  backendFiles.forEach(file => {
    const fullPath = path.join(__dirname, '..', file);
    if (fs.existsSync(fullPath)) {
      log(`  ✅ ${file}`, 'green');
      analyzeFileForNotifications(fullPath, 'backend');
    } else {
      log(`  ❌ ${file} - nie znaleziono`, 'red');
    }
  });

  // 2. Analiza routingu backendu
  log('\n🛣️  BACKEND - Routing powiadomień:', 'yellow');
  
  const routingFiles = [
    'routes/index.js',
    'routes/notifications/notificationRoutes.js'
  ];

  routingFiles.forEach(file => {
    const fullPath = path.join(__dirname, '..', file);
    if (fs.existsSync(fullPath)) {
      log(`  ✅ ${file}`, 'green');
      analyzeRoutingFile(fullPath);
    } else {
      log(`  ❌ ${file} - nie znaleziono`, 'red');
    }
  });

  // 3. Analiza frontendu - gdzie są odbierane powiadomienia
  log('\n📥 FRONTEND - Gdzie są odbierane powiadomienia:', 'yellow');
  
  const frontendPath = path.join(__dirname, '../../marketplace-frontend/src');
  if (fs.existsSync(frontendPath)) {
    analyzeFrontendNotifications(frontendPath);
  } else {
    log('  ❌ Frontend nie znaleziony', 'red');
  }

  // 4. Podsumowanie
  log('\n📋 PODSUMOWANIE:', 'bright');
  log('=' .repeat(50), 'cyan');
  
  log('\n🔄 PRZEPŁYW POWIADOMIEŃ:', 'magenta');
  log('1. Backend tworzy powiadomienie → notificationManager.js', 'cyan');
  log('2. Zapisuje do bazy danych → models/communication/notification.js', 'cyan');
  log('3. Wysyła przez Socket.IO → socketService.js', 'cyan');
  log('4. Udostępnia przez API → routes/notifications/notificationRoutes.js', 'cyan');
  log('5. Frontend odbiera przez:', 'cyan');
  log('   - HTTP API → services/api/notificationsApi.js', 'cyan');
  log('   - Socket.IO → services/UnifiedNotificationService.js', 'cyan');
  log('   - Kontekst → contexts/NotificationContext.js', 'cyan');
  log('   - Komponent → components/notifications/Notifications.js', 'cyan');
}

function analyzeFileForNotifications(filePath, type) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Szukaj funkcji tworzących powiadomienia
    const notificationPatterns = [
      /notifyAdCreated/g,
      /notifyNewMessage/g,
      /notifyAdExpiring/g,
      /notifyPaymentCompleted/g,
      /createNotification/g,
      /new_notification/g,
      /TWOJE OGLOSZENIE ZOSTALO DODANE/g,
      /MASZ NOWA WIADOMOSC/g
    ];

    notificationPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        log(`    🎯 Znaleziono: ${pattern.source} (${matches.length}x)`, 'green');
      }
    });

    // Szukaj endpointów API
    if (type === 'backend') {
      const apiPatterns = [
        /\/api\/notifications/g,
        /\/notifications/g,
        /router\.get.*notifications/g,
        /router\.post.*notifications/g
      ];

      apiPatterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          log(`    🌐 API endpoint: ${pattern.source} (${matches.length}x)`, 'blue');
        }
      });
    }

  } catch (error) {
    log(`    ❌ Błąd odczytu pliku: ${error.message}`, 'red');
  }
}

function analyzeRoutingFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Szukaj definicji tras
    const routePatterns = [
      /app\.use.*notifications/g,
      /router\.use.*notifications/g,
      /\/api\/notifications/g,
      /\/api\/v1\/notifications/g
    ];

    routePatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          log(`    🛣️  Trasa: ${match}`, 'blue');
        });
      }
    });

  } catch (error) {
    log(`    ❌ Błąd odczytu pliku: ${error.message}`, 'red');
  }
}

function analyzeFrontendNotifications(frontendPath) {
  const frontendFiles = [
    'services/api/notificationsApi.js',
    'services/UnifiedNotificationService.js',
    'contexts/NotificationContext.js',
    'components/notifications/Notifications.js',
    'components/notifications/index.js'
  ];

  frontendFiles.forEach(file => {
    const fullPath = path.join(frontendPath, file);
    if (fs.existsSync(fullPath)) {
      log(`  ✅ ${file}`, 'green');
      analyzeFrontendFile(fullPath);
    } else {
      log(`  ❌ ${file} - nie znaleziono`, 'red');
    }
  });

  // Sprawdź routing frontendu
  const routingFile = path.join(frontendPath, 'components/profil/UserProfileRoutes.js');
  if (fs.existsSync(routingFile)) {
    log(`  ✅ UserProfileRoutes.js`, 'green');
    analyzeFrontendRouting(routingFile);
  }
}

function analyzeFrontendFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Szukaj wywołań API
    const apiPatterns = [
      /\/notifications/g,
      /\/api\/notifications/g,
      /apiClient\.get.*notifications/g,
      /fetch.*notifications/g,
      /useNotifications/g
    ];

    apiPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        log(`    🌐 API call: ${pattern.source} (${matches.length}x)`, 'blue');
      }
    });

    // Szukaj komponentów
    const componentPatterns = [
      /import.*Notifications/g,
      /export.*Notifications/g,
      /const.*Notifications/g
    ];

    componentPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          log(`    🧩 Komponent: ${match.trim()}`, 'magenta');
        });
      }
    });

  } catch (error) {
    log(`    ❌ Błąd odczytu pliku: ${error.message}`, 'red');
  }
}

function analyzeFrontendRouting(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Szukaj tras do powiadomień
    const routePatterns = [
      /<Route.*notifications/g,
      /path.*notifications/g,
      /element.*Notifications/g
    ];

    routePatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          log(`    🛣️  Frontend route: ${match.trim()}`, 'blue');
        });
      }
    });

  } catch (error) {
    log(`    ❌ Błąd odczytu pliku: ${error.message}`, 'red');
  }
}

// Uruchom analizę
analyzeNotificationFlow();

log('\n✅ Analiza zakończona!', 'bright');
log('\n💡 REKOMENDACJE:', 'yellow');
log('1. Sprawdź czy frontend łączy się z backendem na porcie 5000', 'cyan');
log('2. Sprawdź czy użytkownik jest zalogowany (cookies)', 'cyan');
log('3. Sprawdź logi backendu podczas tworzenia ogłoszenia', 'cyan');
log('4. Sprawdź Network tab w przeglądarce dla /api/notifications', 'cyan');
log('5. Sprawdź czy Socket.IO działa poprawnie', 'cyan');
