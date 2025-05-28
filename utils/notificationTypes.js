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
  LISTING_ADDED: 'listing_added',
  LISTING_EXPIRING: 'listing_expiring',
  LISTING_STATUS_CHANGED: 'listing_status_changed',
  LISTING_LIKED: 'listing_liked',
  
  // Wiadomości
  NEW_MESSAGE: 'new_message',
  
  // Komentarze
  NEW_COMMENT: 'new_comment',
  
  // Płatności
  PAYMENT_COMPLETED: 'payment_completed',
  
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
  [NotificationType.LISTING_ADDED]: (adTitle) => {
    return `Twoje ogłoszenie "${adTitle}" zostało pomyślnie dodane.`;
  },
  
  /**
   * Szablon powiadomienia o kończącym się terminie ogłoszenia
   * @param {string} adTitle - Tytuł ogłoszenia
   * @param {number} daysLeft - Liczba dni do końca
   * @returns {string} - Treść powiadomienia
   */
  [NotificationType.LISTING_EXPIRING]: (adTitle, daysLeft) => {
    return `Twoje ogłoszenie "${adTitle}" wygaśnie za ${daysLeft} dni. Rozważ jego odnowienie.`;
  },
  
  /**
   * Szablon powiadomienia o zmianie statusu ogłoszenia
   * @param {string} adTitle - Tytuł ogłoszenia
   * @param {string} status - Nowy status ogłoszenia
   * @returns {string} - Treść powiadomienia
   */
  [NotificationType.LISTING_STATUS_CHANGED]: (adTitle, status) => {
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
  [NotificationType.LISTING_LIKED]: (adTitle) => {
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
  [NotificationType.PAYMENT_COMPLETED]: (adTitle = null) => {
    return adTitle 
      ? `Płatność za ogłoszenie "${adTitle}" została zrealizowana.` 
      : `Twoja płatność została zrealizowana.`;
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
