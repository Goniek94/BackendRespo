/**
 * Typy powiadomień używane w systemie
 * @module utils/notificationTypes
 */

/**
 * Typy powiadomień
 * @enum {string}
 */
export const NotificationType = {
  // Ogłoszenia
  AD_CREATED: 'ad_created',
  AD_EXPIRING: 'ad_expiring',
  AD_STATUS_CHANGED: 'ad_status_changed',
  AD_ADDED_TO_FAVORITES: 'ad_added_to_favorites',
  
  // Wiadomości
  NEW_MESSAGE: 'new_message',
  
  // Komentarze
  NEW_COMMENT: 'new_comment',
  
  // Płatności
  PAYMENT_STATUS_CHANGED: 'payment_status_changed',
  
  // System
  SYSTEM_NOTIFICATION: 'system_notification'
};

/**
 * Szablony wiadomości dla różnych typów powiadomień
 * @type {Object.<string, function>}
 */
export const notificationTemplates = {
  /**
   * Szablon powiadomienia o dodaniu nowego ogłoszenia
   * @param {string} adTitle - Tytuł ogłoszenia
   * @returns {string} - Treść powiadomienia
   */
  [NotificationType.AD_CREATED]: (adTitle) => {
    return `Twoje ogłoszenie "${adTitle}" zostało pomyślnie dodane.`;
  },
  
  /**
   * Szablon powiadomienia o kończącym się terminie ogłoszenia
   * @param {string} adTitle - Tytuł ogłoszenia
   * @param {number} daysLeft - Liczba dni do końca
   * @returns {string} - Treść powiadomienia
   */
  [NotificationType.AD_EXPIRING]: (adTitle, daysLeft) => {
    return `Twoje ogłoszenie "${adTitle}" wygaśnie za ${daysLeft} dni. Rozważ jego odnowienie.`;
  },
  
  /**
   * Szablon powiadomienia o zmianie statusu ogłoszenia
   * @param {string} adTitle - Tytuł ogłoszenia
   * @param {string} status - Nowy status ogłoszenia
   * @returns {string} - Treść powiadomienia
   */
  [NotificationType.AD_STATUS_CHANGED]: (adTitle, status) => {
    const statusMessages = {
      'opublikowane': `Twoje ogłoszenie "${adTitle}" zostało opublikowane.`,
      'archiwalne': `Twoje ogłoszenie "${adTitle}" zostało zarchiwizowane.`,
      'w toku': `Twoje ogłoszenie "${adTitle}" jest w trakcie weryfikacji.`
    };
    
    return statusMessages[status] || `Status Twojego ogłoszenia "${adTitle}" został zmieniony na "${status}".`;
  },
  
  /**
   * Szablon powiadomienia o dodaniu ogłoszenia do ulubionych
   * @param {string} adTitle - Tytuł ogłoszenia
   * @returns {string} - Treść powiadomienia
   */
  [NotificationType.AD_ADDED_TO_FAVORITES]: (adTitle) => {
    return `Twoje ogłoszenie "${adTitle}" zostało dodane do ulubionych przez innego użytkownika.`;
  },
  
  /**
   * Szablon powiadomienia o nowej wiadomości
   * @param {string} senderName - Nazwa nadawcy
   * @param {string} adTitle - Tytuł ogłoszenia (opcjonalnie)
   * @returns {string} - Treść powiadomienia
   */
  [NotificationType.NEW_MESSAGE]: (senderName, adTitle = null) => {
    if (adTitle) {
      return `Otrzymałeś nową wiadomość od ${senderName} dotyczącą ogłoszenia "${adTitle}".`;
    } else {
      return `Otrzymałeś nową wiadomość od ${senderName}.`;
    }
  },
  
  /**
   * Szablon powiadomienia o nowym komentarzu
   * @param {string} adTitle - Tytuł ogłoszenia
   * @returns {string} - Treść powiadomienia
   */
  [NotificationType.NEW_COMMENT]: (adTitle) => {
    return `Dodano nowy komentarz do Twojego ogłoszenia "${adTitle}".`;
  },
  
  /**
   * Szablon powiadomienia o zmianie statusu płatności
   * @param {string} status - Status płatności
   * @param {string} adTitle - Tytuł ogłoszenia (opcjonalnie)
   * @returns {string} - Treść powiadomienia
   */
  [NotificationType.PAYMENT_STATUS_CHANGED]: (status, adTitle = null) => {
    const statusMessages = {
      'completed': adTitle 
        ? `Płatność za ogłoszenie "${adTitle}" została zrealizowana.` 
        : `Twoja płatność została zrealizowana.`,
      'pending': adTitle 
        ? `Oczekujemy na potwierdzenie płatności za ogłoszenie "${adTitle}".` 
        : `Oczekujemy na potwierdzenie Twojej płatności.`,
      'failed': adTitle 
        ? `Wystąpił problem z płatnością za ogłoszenie "${adTitle}". Prosimy o kontakt.` 
        : `Wystąpił problem z Twoją płatnością. Prosimy o kontakt.`
    };
    
    return statusMessages[status] || `Status Twojej płatności${adTitle ? ` za ogłoszenie "${adTitle}"` : ''} został zmieniony na "${status}".`;
  },
  
  /**
   * Szablon powiadomienia systemowego
   * @param {string} message - Treść powiadomienia
   * @returns {string} - Treść powiadomienia
   */
  [NotificationType.SYSTEM_NOTIFICATION]: (message) => {
    return message;
  }
};
