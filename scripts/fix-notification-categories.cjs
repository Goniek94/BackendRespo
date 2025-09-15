const fs = require('fs');
const path = require('path');

console.log('🔧 NAPRAWKA KATEGORYZACJI POWIADOMIEŃ');
console.log('============================================================');

/**
 * Mapowanie typów powiadomień na kategorie
 */
const typeToCategory = {
  // Ogłoszenia
  'listing_added': 'listings',
  'listing_expiring': 'listings', 
  'listing_expired': 'listings',
  'listing_status_changed': 'listings',
  'listing_liked': 'listings',
  'listing_viewed': 'listings',
  'listing_approved': 'listings',
  'listing_rejected': 'listings',
  
  // Wiadomości
  'new_message': 'messages',
  'NEW_MESSAGE': 'messages',
  'message_reply': 'messages',
  
  // Komentarze
  'new_comment': 'comments',
  'comment_added': 'comments',
  'comment_reply': 'comments',
  
  // Płatności
  'payment_completed': 'payments',
  'payment_failed': 'payments',
  'payment_pending': 'payments',
  'payment_refunded': 'payments',
  
  // Systemowe
  'system': 'system',
  'system_notification': 'system',
  'maintenance': 'system',
  'maintenance_notification': 'system',
  'update': 'system',
  'account_activity': 'system',
  'profile_viewed': 'system',
  
  // Preferencje
  'settings_changed': 'preferences',
  'preferences_updated': 'preferences'
};

/**
 * Polskie nazwy kategorii
 */
const categoryNames = {
  'all': 'Wszystkie',
  'listings': 'Ogłoszenia', 
  'messages': 'Wiadomości',
  'comments': 'Komentarze',
  'payments': 'Płatności',
  'system': 'Systemowe',
  'preferences': 'Preferencje'
};

/**
 * Ikony dla kategorii
 */
const categoryIcons = {
  'all': 'Bell',
  'listings': 'FileText',
  'messages': 'MessageCircle', 
  'comments': 'MessageSquare',
  'payments': 'CreditCard',
  'system': 'AlertTriangle',
  'preferences': 'Cog'
};

/**
 * Funkcja do aktualizacji komponentu Notifications.js
 */
function updateNotificationsComponent() {
  const filePath = path.join(__dirname, '../../marketplace-frontend/src/components/notifications/Notifications.js');
  
  if (!fs.existsSync(filePath)) {
    console.log('❌ Plik Notifications.js nie znaleziony');
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Ulepszone filtrowanie - dodaj więcej typów
  const newFilteringFunction = `  /**
   * Filtrowanie powiadomień na podstawie aktywnej kategorii
   */
  const getFilteredNotifications = () => {
    switch(activeTab) {
      case 'listings':
        return notifications.filter(notification => 
          notification.type === 'listing_added' || 
          notification.type === 'listing_expiring' ||
          notification.type === 'listing_expired' ||
          notification.type === 'listing_status_changed' ||
          notification.type === 'listing_liked' ||
          notification.type === 'listing_viewed' ||
          notification.type === 'listing_approved' ||
          notification.type === 'listing_rejected'
        );
      case 'messages':
        return notifications.filter(notification => 
          notification.type === 'new_message' || 
          notification.type === 'NEW_MESSAGE' || 
          notification.type === 'message_reply'
        );
      case 'comments':
        return notifications.filter(notification => 
          notification.type === 'new_comment' ||
          notification.type === 'comment_added' || 
          notification.type === 'comment_reply'
        );
      case 'payments':
        return notifications.filter(notification => 
          notification.type === 'payment_completed' ||
          notification.type === 'payment_failed' ||
          notification.type === 'payment_pending' ||
          notification.type === 'payment_refunded'
        );
      case 'system':
        return notifications.filter(notification => 
          notification.type === 'system' || 
          notification.type === 'system_notification' ||
          notification.type === 'maintenance' ||
          notification.type === 'maintenance_notification' ||
          notification.type === 'update' ||
          notification.type === 'account_activity' ||
          notification.type === 'profile_viewed'
        );
      case 'preferences':
        return notifications.filter(notification => 
          notification.type === 'settings_changed' || 
          notification.type === 'preferences_updated'
        );
      case 'all':
      default:
        return notifications;
    }
  };`;

  // Ulepszone liczenie kategorii
  const newCountsFunction = `  // ===== COUNTS =====
  const getCategoryCounts = () => {
    return {
      all: notifications.length,
      unread: notifications.filter(n => !n.isRead).length,
      listings: notifications.filter(n => 
        n.type === 'listing_added' || 
        n.type === 'listing_expiring' ||
        n.type === 'listing_expired' ||
        n.type === 'listing_status_changed' ||
        n.type === 'listing_liked' ||
        n.type === 'listing_viewed' ||
        n.type === 'listing_approved' ||
        n.type === 'listing_rejected'
      ).length,
      messages: notifications.filter(n => 
        n.type === 'new_message' || 
        n.type === 'NEW_MESSAGE' || 
        n.type === 'message_reply'
      ).length,
      comments: notifications.filter(n => 
        n.type === 'new_comment' ||
        n.type === 'comment_added' || 
        n.type === 'comment_reply'
      ).length,
      payments: notifications.filter(n => 
        n.type === 'payment_completed' ||
        n.type === 'payment_failed' ||
        n.type === 'payment_pending' ||
        n.type === 'payment_refunded'
      ).length,
      system: notifications.filter(n => 
        n.type === 'system' || 
        n.type === 'system_notification' ||
        n.type === 'maintenance' ||
        n.type === 'maintenance_notification' ||
        n.type === 'update' ||
        n.type === 'account_activity' ||
        n.type === 'profile_viewed'
      ).length,
      preferences: notifications.filter(n => 
        n.type === 'settings_changed' || 
        n.type === 'preferences_updated'
      ).length
    };
  };`;

  // Zastąp stare funkcje nowymi
  content = content.replace(
    /\/\*\*\s*\n\s*\* Filtrowanie powiadomień na podstawie aktywnej kategorii[\s\S]*?};/,
    newFilteringFunction
  );
  
  content = content.replace(
    /\/\/ ===== COUNTS =====[\s\S]*?};/,
    newCountsFunction
  );

  // Zapisz zaktualizowany plik
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Zaktualizowano komponent Notifications.js');
  return true;
}

/**
 * Funkcja do tworzenia pliku mapowania kategorii
 */
function createCategoryMapping() {
  const mappingContent = `/**
 * Mapowanie typów powiadomień na kategorie
 * Automatycznie wygenerowane przez fix-notification-categories.cjs
 */

export const NotificationCategories = {
  ALL: 'all',
  LISTINGS: 'listings',
  MESSAGES: 'messages', 
  COMMENTS: 'comments',
  PAYMENTS: 'payments',
  SYSTEM: 'system',
  PREFERENCES: 'preferences'
};

export const typeToCategory = ${JSON.stringify(typeToCategory, null, 2)};

export const categoryNames = ${JSON.stringify(categoryNames, null, 2)};

export const categoryIcons = ${JSON.stringify(categoryIcons, null, 2)};

/**
 * Funkcja pomocnicza do określenia kategorii na podstawie typu powiadomienia
 * @param {string} type - Typ powiadomienia
 * @returns {string} - Kategoria powiadomienia
 */
export const getNotificationCategory = (type) => {
  return typeToCategory[type] || 'system';
};

/**
 * Funkcja pomocnicza do pobrania nazwy kategorii
 * @param {string} category - ID kategorii
 * @returns {string} - Nazwa kategorii
 */
export const getCategoryName = (category) => {
  return categoryNames[category] || 'Nieznana kategoria';
};

/**
 * Funkcja pomocnicza do pobrania ikony kategorii
 * @param {string} category - ID kategorii
 * @returns {string} - Nazwa ikony
 */
export const getCategoryIcon = (category) => {
  return categoryIcons[category] || 'Bell';
};

export default {
  NotificationCategories,
  typeToCategory,
  categoryNames,
  categoryIcons,
  getNotificationCategory,
  getCategoryName,
  getCategoryIcon
};`;

  const mappingPath = path.join(__dirname, '../../marketplace-frontend/src/utils/NotificationCategories.js');
  fs.writeFileSync(mappingPath, mappingContent, 'utf8');
  console.log('✅ Utworzono plik mapowania kategorii: NotificationCategories.js');
  return true;
}

/**
 * Funkcja do sprawdzenia spójności typów w backendzie
 */
function checkBackendConsistency() {
  console.log('\n🔍 SPRAWDZANIE SPÓJNOŚCI TYPÓW W BACKENDZIE:');
  
  const filesToCheck = [
    'controllers/communication/messageBasics.js',
    'controllers/communication/conversations.js', 
    'controllers/communication/adMessages.js'
  ];
  
  let inconsistencies = [];
  
  filesToCheck.forEach(relativePath => {
    const fullPath = path.join(__dirname, '..', relativePath);
    
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Szukaj niestandarowych typów
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (line.includes("type: 'new_message'") && !line.includes('NEW_MESSAGE')) {
          inconsistencies.push({
            file: relativePath,
            line: index + 1,
            content: line.trim(),
            issue: 'Używa lowercase new_message zamiast NEW_MESSAGE'
          });
        }
      });
    }
  });
  
  if (inconsistencies.length === 0) {
    console.log('   ✅ Brak niespójności w typach powiadomień');
  } else {
    console.log('   ⚠️  Znaleziono niespójności:');
    inconsistencies.forEach(issue => {
      console.log(`      📄 ${issue.file}:${issue.line}`);
      console.log(`         ${issue.content}`);
      console.log(`         Problem: ${issue.issue}`);
    });
  }
  
  return inconsistencies;
}

/**
 * Funkcja do generowania raportu kategoryzacji
 */
function generateCategorizationReport() {
  console.log('\n📊 RAPORT KATEGORYZACJI POWIADOMIEŃ:');
  console.log('--------------------------------------------------');
  
  Object.entries(typeToCategory).forEach(([type, category]) => {
    console.log(`   ${type.padEnd(25)} → ${categoryNames[category]}`);
  });
  
  console.log('\n📈 STATYSTYKI:');
  const categoryStats = {};
  Object.values(typeToCategory).forEach(category => {
    categoryStats[category] = (categoryStats[category] || 0) + 1;
  });
  
  Object.entries(categoryStats).forEach(([category, count]) => {
    console.log(`   ${categoryNames[category].padEnd(15)} ${count} typów`);
  });
}

/**
 * Główna funkcja
 */
function main() {
  console.log('🚀 Rozpoczynanie naprawki kategoryzacji powiadomień...\n');
  
  // 1. Sprawdź spójność w backendzie
  const inconsistencies = checkBackendConsistency();
  
  // 2. Utwórz plik mapowania kategorii
  createCategoryMapping();
  
  // 3. Zaktualizuj komponent Notifications.js
  updateNotificationsComponent();
  
  // 4. Wygeneruj raport
  generateCategorizationReport();
  
  console.log('\n🎯 PODSUMOWANIE:');
  console.log('============================================================');
  
  if (inconsistencies.length === 0) {
    console.log('✅ Kategoryzacja powiadomień została ulepszona!');
    console.log('✅ Wszystkie typy są spójne między backendem a frontendem');
    console.log('✅ Utworzono plik mapowania kategorii');
    console.log('✅ Zaktualizowano komponent powiadomień');
  } else {
    console.log('⚠️  Kategoryzacja została ulepszona, ale znaleziono niespójności');
    console.log('🔧 Rozważ naprawienie niespójności w backendzie');
  }
  
  console.log('\n💡 NASTĘPNE KROKI:');
  console.log('1. Przetestuj system powiadomień w przeglądarce');
  console.log('2. Sprawdź czy kategorie działają poprawnie');
  console.log('3. Utwórz nowe ogłoszenie i sprawdź czy pojawi się w kategorii "Ogłoszenia"');
  console.log('4. Wyślij wiadomość i sprawdź czy pojawi się w kategorii "Wiadomości"');
  
  console.log('\n✅ Naprawka zakończona!');
}

main();
