/**
 * Typy powiadomień w systemie
 * 
 * UWAGA: Ten plik musi być zsynchronizowany z odpowiadającym mu plikiem w frontendzie:
 * frontend/src/utils/NotificationTypes.js
 */

/**
 * Typy powiadomień
 * @enum {string}
 */
export const NOTIFICATION_TYPES = {
  // Powiadomienia systemowe
  SYSTEM_NOTIFICATION: 'system_notification',
  MAINTENANCE_NOTIFICATION: 'maintenance_notification',
  
  // Powiadomienia związane z ogłoszeniami
  LISTING_ADDED: 'listing_added',
  LISTING_EXPIRING: 'listing_expiring',
  LISTING_EXPIRED: 'listing_expired',
  LISTING_STATUS_CHANGED: 'listing_status_changed',
  LISTING_LIKED: 'listing_liked',
  LISTING_VIEWED: 'listing_viewed',
  
  // Powiadomienia związane z wiadomościami
  NEW_MESSAGE: 'new_message',
  
  // Powiadomienia związane z komentarzami
  NEW_COMMENT: 'new_comment',
  COMMENT_REPLY: 'comment_reply',
  
  // Powiadomienia związane z płatnościami
  PAYMENT_COMPLETED: 'payment_completed',
  PAYMENT_FAILED: 'payment_failed',
  PAYMENT_REFUNDED: 'payment_refunded',
  
  // Powiadomienia związane z kontem
  ACCOUNT_ACTIVITY: 'account_activity',
  PROFILE_VIEWED: 'profile_viewed'
};

// Dla zachowania kompatybilności wstecznej
export const NotificationType = NOTIFICATION_TYPES;

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
   * Szablon powiadomienia o wygaśnięciu ogłoszenia
   * @param {string} adTitle - Tytuł ogłoszenia
   * @returns {string} - Treść powiadomienia
   */
  [NotificationType.LISTING_EXPIRED]: (adTitle) => {
    return `Twoje ogłoszenie "${adTitle}" wygasło. Możesz je odnowić w panelu ogłoszeń.`;
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
   * Szablon powiadomienia o wyświetleniu ogłoszenia
   * @param {string} adTitle - Tytuł ogłoszenia
   * @param {number} viewCount - Liczba wyświetleń (opcjonalnie)
   * @returns {string} - Treść powiadomienia
   */
  [NotificationType.LISTING_VIEWED]: (adTitle, viewCount = null) => {
    return viewCount 
      ? `Twoje ogłoszenie "${adTitle}" osiągnęło ${viewCount} wyświetleń.`
      : `Twoje ogłoszenie "${adTitle}" zostało wyświetlone.`;
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
   * Szablon powiadomienia o odpowiedzi na komentarz
   * @param {string} adTitle - Tytuł ogłoszenia
   * @returns {string} - Treść powiadomienia
   */
  [NotificationType.COMMENT_REPLY]: (adTitle) => {
    return `Ktoś odpowiedział na Twój komentarz w ogłoszeniu "${adTitle}".`;
  },
  
  /**
   * Szablon powiadomienia o zrealizowanej płatności
   * @param {string} adTitle - Tytuł ogłoszenia (opcjonalnie)
   * @returns {string} - Treść powiadomienia
   */
  [NotificationType.PAYMENT_COMPLETED]: (adTitle = null) => {
    return adTitle 
      ? `Płatność za ogłoszenie "${adTitle}" została zrealizowana.` 
      : `Twoja płatność została zrealizowana.`;
  },
  
  /**
   * Szablon powiadomienia o nieudanej płatności
   * @param {string} reason - Powód niepowodzenia (opcjonalnie)
   * @returns {string} - Treść powiadomienia
   */
  [NotificationType.PAYMENT_FAILED]: (reason = null) => {
    return reason
      ? `Twoja płatność nie została zrealizowana. Powód: ${reason}`
      : `Twoja płatność nie została zrealizowana. Sprawdź szczegóły w historii płatności.`;
  },
  
  /**
   * Szablon powiadomienia o zwrocie płatności
   * @param {string} amount - Kwota zwrotu (opcjonalnie)
   * @returns {string} - Treść powiadomienia
   */
  [NotificationType.PAYMENT_REFUNDED]: (amount = null) => {
    return amount
      ? `Otrzymałeś zwrot płatności w wysokości ${amount}.`
      : `Otrzymałeś zwrot płatności. Szczegóły znajdziesz w historii płatności.`;
  },
  
  /**
   * Szablon powiadomienia o aktywności na koncie
   * @param {string} activity - Rodzaj aktywności
   * @returns {string} - Treść powiadomienia
   */
  [NotificationType.ACCOUNT_ACTIVITY]: (activity) => {
    return `Wykryto nową aktywność na Twoim koncie: ${activity}`;
  },
  
  /**
   * Szablon powiadomienia o wyświetleniu profilu
   * @param {string} viewerName - Nazwa osoby przeglądającej profil (opcjonalnie)
   * @returns {string} - Treść powiadomienia
   */
  [NotificationType.PROFILE_VIEWED]: (viewerName = null) => {
    return viewerName
      ? `Użytkownik ${viewerName} wyświetlił Twój profil.`
      : `Ktoś wyświetlił Twój profil.`;
  },
  
  /**
   * Szablon powiadomienia o konserwacji systemu
   * @param {string} message - Treść powiadomienia
   * @param {string} scheduledTime - Planowany czas konserwacji (opcjonalnie)
   * @returns {string} - Treść powiadomienia
   */
  [NotificationType.MAINTENANCE_NOTIFICATION]: (message, scheduledTime = null) => {
    return scheduledTime
      ? `Informacja o konserwacji systemu: ${message}. Planowany czas: ${scheduledTime}.`
      : `Informacja o konserwacji systemu: ${message}`;
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
