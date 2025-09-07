/**
 * Skrypt diagnostyczny do identyfikacji duplikacji w systemie powiadomień
 * Sprawdza potencjalne problemy z powiadomieniami na frontendzie
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 DIAGNOZA DUPLIKACJI POWIADOMIEŃ FRONTEND');
console.log('='.repeat(50));

const frontendPath = '../marketplace-frontend/src';

// Funkcja do czytania pliku
const readFile = (filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return null;
  }
};

// Sprawdź duplikacje serwisów
console.log('\n📋 1. ANALIZA SERWISÓW POWIADOMIEŃ:');
console.log('-'.repeat(30));

const notificationsJs = readFile(path.join(frontendPath, 'services/notifications.js'));
const notificationServiceJs = readFile(path.join(frontendPath, 'services/NotificationService.js'));

if (notificationsJs && notificationServiceJs) {
  console.log('❌ PROBLEM: Znaleziono DWA serwisy powiadomień:');
  console.log('   - services/notifications.js (Socket.IO)');
  console.log('   - services/NotificationService.js (HTTP API)');
  console.log('   ⚠️  To może powodować konflikty i duplikacje!');
} else {
  console.log('✅ Brak duplikacji serwisów');
}

// Sprawdź NotificationContext
console.log('\n📋 2. ANALIZA NOTIFICATION CONTEXT:');
console.log('-'.repeat(30));

const notificationContext = readFile(path.join(frontendPath, 'contexts/NotificationContext.js'));
if (notificationContext) {
  // Sprawdź czy używa obu serwisów
  const usesNotificationsJs = notificationContext.includes("from '../services/notifications'");
  const usesNotificationServiceJs = notificationContext.includes("from '../services/NotificationService'");
  const usesAxios = notificationContext.includes("import axios");
  
  console.log(`   - Używa notifications.js: ${usesNotificationsJs ? '✅' : '❌'}`);
  console.log(`   - Używa NotificationService.js: ${usesNotificationServiceJs ? '✅' : '❌'}`);
  console.log(`   - Używa axios bezpośrednio: ${usesAxios ? '✅' : '❌'}`);
  
  if ((usesNotificationsJs && usesNotificationServiceJs) || (usesNotificationsJs && usesAxios)) {
    console.log('   ❌ PROBLEM: Context używa wielu sposobów komunikacji z API!');
  }
  
  // Sprawdź event listenery
  const eventListeners = [
    'notification',
    'new_notification',
    'notification_updated',
    'all_notifications_read',
    'notification_deleted'
  ];
  
  console.log('\n   Event Listeners:');
  eventListeners.forEach(event => {
    const hasOn = notificationContext.includes(`notificationService.on('${event}'`);
    const hasOff = notificationContext.includes(`notificationService.off('${event}'`);
    console.log(`   - ${event}: on=${hasOn ? '✅' : '❌'}, off=${hasOff ? '✅' : '❌'}`);
    
    if (hasOn && !hasOff) {
      console.log(`     ⚠️  Brak cleanup dla ${event}!`);
    }
  });
}

// Sprawdź komponenty używające powiadomień
console.log('\n📋 3. ANALIZA KOMPONENTÓW:');
console.log('-'.repeat(30));

const componentsToCheck = [
  'components/Navigation/Navigation.js',
  'components/profil/navigation/ProfileNavigation.js',
  'components/notifications/Notifications.js',
  'components/notifications/NotificationBadge.js'
];

componentsToCheck.forEach(componentPath => {
  const content = readFile(path.join(frontendPath, componentPath));
  if (content) {
    const usesNotificationContext = content.includes('useNotifications');
    const usesNotificationService = content.includes('NotificationService');
    const usesAxios = content.includes('axios');
    
    console.log(`\n   ${componentPath}:`);
    console.log(`   - Używa useNotifications: ${usesNotificationContext ? '✅' : '❌'}`);
    console.log(`   - Używa NotificationService: ${usesNotificationService ? '✅' : '❌'}`);
    console.log(`   - Używa axios: ${usesAxios ? '✅' : '❌'}`);
  }
});

// Sprawdź konfigurację API
console.log('\n📋 4. ANALIZA KONFIGURACJI API:');
console.log('-'.repeat(30));

const apiConfig = readFile(path.join(frontendPath, 'services/api/config.js'));
if (apiConfig) {
  const apiUrlMatch = apiConfig.match(/process\.env\.REACT_APP_API_URL \|\| '([^']+)'/);
  if (apiUrlMatch) {
    console.log(`   - API URL: ${apiUrlMatch[1]}`);
  }
  
  const envFile = readFile('../marketplace-frontend/.env');
  if (envFile) {
    const envApiUrl = envFile.match(/REACT_APP_API_URL=(.+)/);
    if (envApiUrl) {
      console.log(`   - .env API URL: ${envApiUrl[1]}`);
    }
  }
}

// Rekomendacje naprawy
console.log('\n🔧 REKOMENDACJE NAPRAWY:');
console.log('-'.repeat(30));
console.log('1. ❌ Usuń jeden z serwisów powiadomień (zalecane: zostaw NotificationService.js)');
console.log('2. 🔄 Zaktualizuj NotificationContext aby używał tylko jednego serwisu');
console.log('3. 🧹 Upewnij się, że wszystkie event listenery mają cleanup');
console.log('4. ✅ Sprawdź czy wszystkie komponenty używają useNotifications hook');
console.log('5. 🔍 Przetestuj system powiadomień po zmianach');

console.log('\n✅ Diagnoza zakończona!');
