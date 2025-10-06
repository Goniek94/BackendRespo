/**
 * Typy powiadomień w systemie - Backend
 *
 * UWAGA: Ten plik musi być zsynchronizowany z odpowiadającym mu plikiem w frontendzie:
 * frontend/src/utils/NotificationTypes.js
 */

export const NotificationType = {
  // Powiadomienia systemowe
  SYSTEM_NOTIFICATION: "system_notification",

  // Powiadomienia związane z ogłoszeniami
  LISTING_ADDED: "listing_added",
  LISTING_EXPIRING: "listing_expiring",
  LISTING_EXPIRED: "listing_expired",
  LISTING_STATUS_CHANGED: "listing_status_changed",
  LISTING_LIKED: "listing_liked",

  // Powiadomienia związane z wiadomościami
  NEW_MESSAGE: "new_message",

  // Powiadomienia związane z komentarzami
  NEW_COMMENT: "new_comment",

  // Powiadomienia związane z płatnościami
  PAYMENT_COMPLETED: "payment_completed",
  PAYMENT_FAILED: "payment_failed",
  PAYMENT_REFUNDED: "payment_refunded",

  // Powiadomienia związane z kontem
  ACCOUNT_ACTIVITY: "account_activity",
};

/**
 * Mapowanie typów powiadomień na ich czytelne nazwy
 */
export const NotificationTypeNames = {
  [NotificationType.SYSTEM_NOTIFICATION]: "Powiadomienie systemowe",
  [NotificationType.LISTING_ADDED]: "Ogłoszenie opublikowane!",
  [NotificationType.LISTING_EXPIRING]: "Ogłoszenie za 3 dni traci ważność",
  [NotificationType.LISTING_EXPIRED]: "Ogłoszenie wygasło",
  [NotificationType.LISTING_STATUS_CHANGED]: "Zmiana statusu ogłoszenia",
  [NotificationType.LISTING_LIKED]: "Dodano do ulubionych",
  [NotificationType.NEW_MESSAGE]: "Nowa wiadomość",
  [NotificationType.NEW_COMMENT]: "Nowy komentarz",
  [NotificationType.PAYMENT_COMPLETED]: "Płatność zrealizowana",
  [NotificationType.PAYMENT_FAILED]: "Płatność nieudana",
  [NotificationType.PAYMENT_REFUNDED]: "Zwrot płatności",
  [NotificationType.ACCOUNT_ACTIVITY]: "Aktywność na koncie",
};

/**
 * Mapowanie typów powiadomień na ich opisy
 */
export const NotificationTypeDescriptions = {
  [NotificationType.SYSTEM_NOTIFICATION]:
    "Ważne informacje od administratorów serwisu",
  [NotificationType.LISTING_ADDED]:
    "Twoje ogłoszenie zostało pomyślnie opublikowane",
  [NotificationType.LISTING_EXPIRING]: "Twoje ogłoszenie wygaśnie za 3 dni",
  [NotificationType.LISTING_EXPIRED]: "Twoje ogłoszenie wygasło",
  [NotificationType.LISTING_STATUS_CHANGED]:
    "Status Twojego ogłoszenia został zmieniony",
  [NotificationType.LISTING_LIKED]: "Ktoś dodał Twoje ogłoszenie do ulubionych",
  [NotificationType.NEW_MESSAGE]: "Otrzymałeś nową wiadomość",
  [NotificationType.NEW_COMMENT]: "Ktoś skomentował Twoje ogłoszenie",
  [NotificationType.PAYMENT_COMPLETED]: "Płatność została zrealizowana",
  [NotificationType.PAYMENT_FAILED]: "Płatność nie powiodła się",
  [NotificationType.PAYMENT_REFUNDED]: "Otrzymałeś zwrot płatności",
  [NotificationType.ACCOUNT_ACTIVITY]: "Wykryto aktywność na Twoim koncie",
};

/**
 * Funkcja pomocnicza do tworzenia powiadomienia
 * @param {string} userId - ID użytkownika
 * @param {string} type - Typ powiadomienia
 * @param {string} title - Tytuł powiadomienia
 * @param {string} message - Treść powiadomienia
 * @param {string} link - Link do przekierowania (opcjonalny)
 * @param {string} adId - ID ogłoszenia (opcjonalny)
 * @param {Object} metadata - Dodatkowe metadane (opcjonalny)
 * @returns {Object} - Obiekt powiadomienia
 */
export const createNotificationData = (
  userId,
  type,
  title,
  message,
  link = null,
  adId = null,
  metadata = {}
) => {
  return {
    userId,
    user: userId, // Dla kompatybilności wstecznej
    type,
    title,
    message,
    link,
    adId,
    metadata,
    isRead: false,
    createdAt: new Date(),
  };
};

export default NotificationType;
