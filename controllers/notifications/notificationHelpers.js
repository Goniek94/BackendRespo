/**
 * Pomocnicze funkcje do obsługi powiadomień
 * @module controllers/notificationHelpers
 */

import { NotificationType, notificationTemplates } from '../../utils/notificationTypes.js';
import socketService from '../../services/socketService.js';

/**
 * Formatuje powiadomienie do formatu API
 * @param {Object} notification - Obiekt powiadomienia z bazy danych
 * @returns {Object} - Sformatowane powiadomienie
 */
export const formatNotificationForApi = (notification) => {
  if (!notification) return null;
  
  return {
    _id: notification._id,
    user: notification.user,
    message: notification.message,
    type: notification.type,
    read: notification.isRead,
    metadata: notification.metadata,
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt,
    // Dodatkowe pola dla kompatybilności z frontendem
    title: getNotificationTitle(notification.type, notification.metadata),
    actionUrl: getNotificationActionUrl(notification.type, notification.metadata),
    actionText: getNotificationActionText(notification.type, notification.metadata)
  };
};

/**
 * Generuje tytuł powiadomienia na podstawie typu i metadanych
 * @param {string} type - Typ powiadomienia
 * @param {Object} metadata - Metadane powiadomienia
 * @returns {string} - Tytuł powiadomienia
 */
export const getNotificationTitle = (type, metadata = {}) => {
  const titles = {
    [NotificationType.SYSTEM_NOTIFICATION]: 'Powiadomienie systemowe',
    [NotificationType.MAINTENANCE_NOTIFICATION]: 'Konserwacja systemu',
    [NotificationType.LISTING_ADDED]: 'Dodanie ogłoszenia',
    [NotificationType.LISTING_EXPIRING]: 'Wygasające ogłoszenie',
    [NotificationType.LISTING_EXPIRED]: 'Wygasłe ogłoszenie',
    [NotificationType.LISTING_STATUS_CHANGED]: 'Zmiana statusu ogłoszenia',
    [NotificationType.LISTING_LIKED]: 'Polubienie ogłoszenia',
    [NotificationType.LISTING_VIEWED]: 'Wyświetlenie ogłoszenia',
    [NotificationType.NEW_MESSAGE]: 'Nowa wiadomość',
    [NotificationType.NEW_COMMENT]: 'Nowy komentarz',
    [NotificationType.COMMENT_REPLY]: 'Odpowiedź na komentarz',
    [NotificationType.PAYMENT_COMPLETED]: 'Płatność zrealizowana',
    [NotificationType.PAYMENT_FAILED]: 'Płatność nieudana',
    [NotificationType.PAYMENT_REFUNDED]: 'Zwrot płatności',
    [NotificationType.ACCOUNT_ACTIVITY]: 'Aktywność na koncie',
    [NotificationType.PROFILE_VIEWED]: 'Wyświetlenie profilu'
  };
  
  return titles[type] || 'Powiadomienie';
};

/**
 * Generuje URL akcji dla powiadomienia
 * @param {string} type - Typ powiadomienia
 * @param {Object} metadata - Metadane powiadomienia
 * @returns {string|null} - URL akcji lub null, jeśli brak akcji
 */
export const getNotificationActionUrl = (type, metadata = {}) => {
  switch (type) {
    case NotificationType.LISTING_ADDED:
    case NotificationType.LISTING_EXPIRING:
    case NotificationType.LISTING_EXPIRED:
    case NotificationType.LISTING_STATUS_CHANGED:
    case NotificationType.LISTING_LIKED:
    case NotificationType.LISTING_VIEWED:
      return metadata.adId ? `/ogloszenia/${metadata.adId}` : null;
      
    case NotificationType.NEW_MESSAGE:
      return metadata.conversationId ? `/profil/wiadomosci/${metadata.conversationId}` : '/profil/wiadomosci';
      
    case NotificationType.NEW_COMMENT:
    case NotificationType.COMMENT_REPLY:
      return metadata.adId ? `/ogloszenia/${metadata.adId}#komentarze` : null;
      
    case NotificationType.PAYMENT_COMPLETED:
    case NotificationType.PAYMENT_FAILED:
    case NotificationType.PAYMENT_REFUNDED:
      return '/profil/platnosci';
      
    case NotificationType.ACCOUNT_ACTIVITY:
      return '/profil/ustawienia';
      
    case NotificationType.PROFILE_VIEWED:
      return '/profil';
      
    default:
      return null;
  }
};

/**
 * Generuje tekst akcji dla powiadomienia
 * @param {string} type - Typ powiadomienia
 * @param {Object} metadata - Metadane powiadomienia
 * @returns {string|null} - Tekst akcji lub null, jeśli brak akcji
 */
export const getNotificationActionText = (type, metadata = {}) => {
  switch (type) {
    case NotificationType.LISTING_ADDED:
    case NotificationType.LISTING_EXPIRING:
    case NotificationType.LISTING_EXPIRED:
    case NotificationType.LISTING_STATUS_CHANGED:
    case NotificationType.LISTING_LIKED:
    case NotificationType.LISTING_VIEWED:
      return 'Zobacz ogłoszenie';
      
    case NotificationType.NEW_MESSAGE:
      return 'Odpowiedz';
      
    case NotificationType.NEW_COMMENT:
    case NotificationType.COMMENT_REPLY:
      return 'Zobacz komentarz';
      
    case NotificationType.PAYMENT_COMPLETED:
    case NotificationType.PAYMENT_FAILED:
    case NotificationType.PAYMENT_REFUNDED:
      return 'Szczegóły płatności';
      
    case NotificationType.ACCOUNT_ACTIVITY:
      return 'Sprawdź konto';
      
    case NotificationType.PROFILE_VIEWED:
      return 'Zobacz profil';
      
    default:
      return null;
  }
};

/**
 * Wysyła powiadomienie do użytkownika przez WebSocket
 * @param {string} userId - ID użytkownika
 * @param {Object} notification - Obiekt powiadomienia
 */
export const sendNotificationToUser = (userId, notification) => {
  if (!userId || !notification) return;
  
  const formattedNotification = formatNotificationForApi(notification);
  
  if (socketService.isUserOnline(userId)) {
    socketService.sendNotification(userId, {
      type: 'notification:new',
      notification: formattedNotification
    });
  }
};

export default {
  formatNotificationForApi,
  getNotificationTitle,
  getNotificationActionUrl,
  getNotificationActionText,
  sendNotificationToUser
};
