import Notification from '../models/notification.js';
import { NotificationType, notificationTemplates } from '../utils/notificationTypes.js';
import socketService from '../services/socketService.js';

/**
 * Klasa NotificationService - odpowiada za zarządzanie powiadomieniami w systemie
 * @class
 */
class NotificationService {
  /**
   * Tworzy nowe powiadomienie dla użytkownika
   * @param {string} userId - ID użytkownika
   * @param {string} message - Treść powiadomienia
   * @param {string} type - Typ powiadomienia (z NotificationType)
   * @param {Object} metadata - Dodatkowe dane związane z powiadomieniem (opcjonalne)
   * @returns {Promise<Object>} - Utworzone powiadomienie
   * @throws {Error} - Błąd podczas tworzenia powiadomienia
   */
  async createNotification(userId, message, type = NotificationType.SYSTEM_NOTIFICATION, metadata = {}) {
    try {
      if (!userId) {
        console.warn('[NotificationService] Próba utworzenia powiadomienia bez ID użytkownika');
        return null;
      }
      
      if (!message) {
        console.warn('[NotificationService] Próba utworzenia powiadomienia bez treści');
        return null;
      }
      
      // Sprawdź, czy użytkownik istnieje w bazie danych
      try {
        const mongoose = await import('mongoose');
        const User = mongoose.models.User;
        
        if (User) {
          const userExists = await User.exists({ _id: userId });
          if (!userExists) {
            console.warn(`[NotificationService] Użytkownik o ID ${userId} nie istnieje`);
            return null;
          }
        }
      } catch (userCheckError) {
        console.error('[NotificationService] Błąd podczas sprawdzania użytkownika:', userCheckError);
        // Kontynuuj mimo błędu sprawdzania
      }
      
      console.log(`[NotificationService] Tworzenie powiadomienia dla użytkownika ${userId}, typ: ${type}`);
      
      const notification = new Notification({
        user: userId,
        message,
        type,
        metadata,
        isRead: false
      });
      
      await notification.save();
      console.log(`[NotificationService] Powiadomienie utworzone pomyślnie, ID: ${notification._id}`);
      
      // Wysłanie powiadomienia przez WebSocket, jeśli użytkownik jest online
      if (socketService.isUserOnline(userId)) {
        socketService.sendNotification(userId, notification.toApiResponse());
      }
      
      return notification;
    } catch (error) {
      console.error(`[NotificationService] Błąd podczas tworzenia powiadomienia: ${error.message}`, error);
      // Zwracamy null zamiast rzucać wyjątek, aby nie przerywać głównego procesu
      return null;
    }
  }

  /**
   * Tworzy powiadomienie o dodaniu nowego ogłoszenia
   * @param {string} userId - ID użytkownika
   * @param {string} adTitle - Tytuł ogłoszenia
   * @param {string} adId - ID ogłoszenia (opcjonalne)
   * @returns {Promise<Object>} - Utworzone powiadomienie
   */
  async notifyAdCreated(userId, adTitle, adId = null) {
    const message = notificationTemplates[NotificationType.LISTING_ADDED](adTitle);
    const metadata = adId ? { adId } : {};
    
    return this.createNotification(userId, message, NotificationType.LISTING_ADDED, metadata);
  }

  /**
   * Tworzy powiadomienie o kończącym się terminie ogłoszenia
   * @param {string} userId - ID użytkownika
   * @param {string} adTitle - Tytuł ogłoszenia
   * @param {number} daysLeft - Liczba dni do końca
   * @param {string} adId - ID ogłoszenia (opcjonalne)
   * @returns {Promise<Object>} - Utworzone powiadomienie
   */
  async notifyAdExpiringSoon(userId, adTitle, daysLeft, adId = null) {
    const message = notificationTemplates[NotificationType.LISTING_EXPIRING](adTitle, daysLeft);
    const metadata = adId ? { adId, daysLeft } : { daysLeft };
    
    return this.createNotification(userId, message, NotificationType.LISTING_EXPIRING, metadata);
  }

  /**
   * Tworzy powiadomienie o nowej wiadomości
   * @param {string} userId - ID użytkownika
   * @param {string} senderName - Nazwa nadawcy
   * @param {string} adTitle - Tytuł ogłoszenia (opcjonalnie)
   * @param {Object} metadata - Dodatkowe dane (opcjonalnie)
   * @returns {Promise<Object>} - Utworzone powiadomienie
   */
  async notifyNewMessage(userId, senderName, adTitle = null, metadata = {}) {
    const message = notificationTemplates[NotificationType.NEW_MESSAGE](senderName, adTitle);
    
    if (adTitle) {
      metadata.adTitle = adTitle;
    }
    
    return this.createNotification(userId, message, NotificationType.NEW_MESSAGE, metadata);
  }

  /**
   * Tworzy powiadomienie o zmianie statusu płatności
   * @param {string} userId - ID użytkownika
   * @param {string} status - Status płatności
   * @param {string} adTitle - Tytuł ogłoszenia (opcjonalnie)
   * @param {Object} metadata - Dodatkowe dane (opcjonalnie)
   * @returns {Promise<Object>} - Utworzone powiadomienie
   */
  async notifyPaymentStatusChange(userId, status, adTitle = null, metadata = {}) {
    // Dla statusu 'completed' używamy dedykowanego typu PAYMENT_COMPLETED
    if (status === 'completed') {
      const message = notificationTemplates[NotificationType.PAYMENT_COMPLETED](adTitle);
      
      if (adTitle) {
        metadata.adTitle = adTitle;
      }
      
      return this.createNotification(userId, message, NotificationType.PAYMENT_COMPLETED, metadata);
    } else {
      // Dla innych statusów używamy systemowego powiadomienia
      const statusMessage = `Status Twojej płatności${adTitle ? ` za ogłoszenie "${adTitle}"` : ''} został zmieniony na "${status}".`;
      metadata.status = status;
      if (adTitle) {
        metadata.adTitle = adTitle;
      }
      
      return this.createNotification(userId, statusMessage, NotificationType.SYSTEM_NOTIFICATION, metadata);
    }
  }

  /**
   * Tworzy powiadomienie o zmianie statusu ogłoszenia
   * @param {string} userId - ID użytkownika
   * @param {string} adTitle - Tytuł ogłoszenia
   * @param {string} status - Nowy status ogłoszenia
   * @param {string} adId - ID ogłoszenia (opcjonalne)
   * @returns {Promise<Object>} - Utworzone powiadomienie
   */
  async notifyAdStatusChange(userId, adTitle, status, adId = null) {
    const message = notificationTemplates[NotificationType.LISTING_STATUS_CHANGED](adTitle, status);
    const metadata = {
      status,
      ...(adId ? { adId } : {})
    };
    
    return this.createNotification(userId, message, NotificationType.LISTING_STATUS_CHANGED, metadata);
  }

  /**
   * Tworzy powiadomienie o dodaniu ogłoszenia do ulubionych
   * @param {string} userId - ID użytkownika
   * @param {string} adTitle - Tytuł ogłoszenia
   * @param {string} adId - ID ogłoszenia (opcjonalne)
   * @returns {Promise<Object>} - Utworzone powiadomienie lub null w przypadku błędu
   */
  async notifyAdAddedToFavorites(userId, adTitle, adId = null) {
    try {
      console.log(`[NotificationService] Próba utworzenia powiadomienia o dodaniu do ulubionych dla użytkownika ${userId}, ogłoszenie: ${adTitle}`);
      
      // Sprawdź, czy mamy wszystkie potrzebne dane
      if (!userId) {
        console.warn('[NotificationService] Brak ID użytkownika dla powiadomienia o dodaniu do ulubionych');
        return null;
      }
      
      // Jeśli nie ma tytułu, użyj domyślnego
      const safeAdTitle = adTitle || 'Ogłoszenie';
      
      const message = notificationTemplates[NotificationType.LISTING_LIKED](safeAdTitle);
      const metadata = adId ? { adId } : {};
      
      return this.createNotification(userId, message, NotificationType.LISTING_LIKED, metadata);
    } catch (error) {
      console.error(`[NotificationService] Błąd podczas tworzenia powiadomienia o dodaniu do ulubionych: ${error.message}`, error);
      return null;
    }
  }

  /**
   * Tworzy powiadomienie o komentarzu do ogłoszenia
   * @param {string} userId - ID użytkownika
   * @param {string} adTitle - Tytuł ogłoszenia
   * @param {string} adId - ID ogłoszenia (opcjonalne)
   * @param {string} commentId - ID komentarza (opcjonalne)
   * @returns {Promise<Object>} - Utworzone powiadomienie
   */
  async notifyNewComment(userId, adTitle, adId = null, commentId = null) {
    const message = notificationTemplates[NotificationType.NEW_COMMENT](adTitle);
    const metadata = {
      ...(adId ? { adId } : {}),
      ...(commentId ? { commentId } : {})
    };
    
    return this.createNotification(userId, message, NotificationType.NEW_COMMENT, metadata);
  }

  /**
   * Tworzy powiadomienie o odpowiedzi na komentarz
   * @param {string} userId - ID użytkownika
   * @param {string} adTitle - Tytuł ogłoszenia
   * @param {string} adId - ID ogłoszenia (opcjonalne)
   * @param {string} commentId - ID komentarza (opcjonalne)
   * @returns {Promise<Object>} - Utworzone powiadomienie
   */
  async notifyCommentReply(userId, adTitle, adId = null, commentId = null) {
    const message = notificationTemplates[NotificationType.COMMENT_REPLY](adTitle);
    const metadata = {
      ...(adId ? { adId } : {}),
      ...(commentId ? { commentId } : {})
    };
    
    return this.createNotification(userId, message, NotificationType.COMMENT_REPLY, metadata);
  }

  /**
   * Tworzy powiadomienie o wygaśnięciu ogłoszenia
   * @param {string} userId - ID użytkownika
   * @param {string} adTitle - Tytuł ogłoszenia
   * @param {string} adId - ID ogłoszenia (opcjonalne)
   * @returns {Promise<Object>} - Utworzone powiadomienie
   */
  async notifyAdExpired(userId, adTitle, adId = null) {
    const message = notificationTemplates[NotificationType.LISTING_EXPIRED](adTitle);
    const metadata = adId ? { adId } : {};
    
    return this.createNotification(userId, message, NotificationType.LISTING_EXPIRED, metadata);
  }

  /**
   * Tworzy powiadomienie o wyświetleniu ogłoszenia
   * @param {string} userId - ID użytkownika
   * @param {string} adTitle - Tytuł ogłoszenia
   * @param {number} viewCount - Liczba wyświetleń (opcjonalnie)
   * @param {string} adId - ID ogłoszenia (opcjonalne)
   * @returns {Promise<Object>} - Utworzone powiadomienie
   */
  async notifyAdViewed(userId, adTitle, viewCount = null, adId = null) {
    const message = notificationTemplates[NotificationType.LISTING_VIEWED](adTitle, viewCount);
    const metadata = {
      ...(adId ? { adId } : {}),
      ...(viewCount ? { viewCount } : {})
    };
    
    return this.createNotification(userId, message, NotificationType.LISTING_VIEWED, metadata);
  }

  /**
   * Tworzy powiadomienie o nieudanej płatności
   * @param {string} userId - ID użytkownika
   * @param {string} reason - Powód niepowodzenia (opcjonalnie)
   * @param {Object} metadata - Dodatkowe dane (opcjonalnie)
   * @returns {Promise<Object>} - Utworzone powiadomienie
   */
  async notifyPaymentFailed(userId, reason = null, metadata = {}) {
    const message = notificationTemplates[NotificationType.PAYMENT_FAILED](reason);
    
    if (reason) {
      metadata.reason = reason;
    }
    
    return this.createNotification(userId, message, NotificationType.PAYMENT_FAILED, metadata);
  }

  /**
   * Tworzy powiadomienie o zwrocie płatności
   * @param {string} userId - ID użytkownika
   * @param {string} amount - Kwota zwrotu (opcjonalnie)
   * @param {Object} metadata - Dodatkowe dane (opcjonalnie)
   * @returns {Promise<Object>} - Utworzone powiadomienie
   */
  async notifyPaymentRefunded(userId, amount = null, metadata = {}) {
    const message = notificationTemplates[NotificationType.PAYMENT_REFUNDED](amount);
    
    if (amount) {
      metadata.amount = amount;
    }
    
    return this.createNotification(userId, message, NotificationType.PAYMENT_REFUNDED, metadata);
  }

  /**
   * Tworzy powiadomienie o aktywności na koncie
   * @param {string} userId - ID użytkownika
   * @param {string} activity - Rodzaj aktywności
   * @param {Object} metadata - Dodatkowe dane (opcjonalnie)
   * @returns {Promise<Object>} - Utworzone powiadomienie
   */
  async notifyAccountActivity(userId, activity, metadata = {}) {
    const message = notificationTemplates[NotificationType.ACCOUNT_ACTIVITY](activity);
    metadata.activity = activity;
    
    return this.createNotification(userId, message, NotificationType.ACCOUNT_ACTIVITY, metadata);
  }

  /**
   * Tworzy powiadomienie o wyświetleniu profilu
   * @param {string} userId - ID użytkownika
   * @param {string} viewerName - Nazwa osoby przeglądającej profil (opcjonalnie)
   * @param {Object} metadata - Dodatkowe dane (opcjonalnie)
   * @returns {Promise<Object>} - Utworzone powiadomienie
   */
  async notifyProfileViewed(userId, viewerName = null, metadata = {}) {
    const message = notificationTemplates[NotificationType.PROFILE_VIEWED](viewerName);
    
    if (viewerName) {
      metadata.viewerName = viewerName;
    }
    
    return this.createNotification(userId, message, NotificationType.PROFILE_VIEWED, metadata);
  }

  /**
   * Tworzy powiadomienie o konserwacji systemu
   * @param {string} userId - ID użytkownika
   * @param {string} message - Treść powiadomienia
   * @param {string} scheduledTime - Planowany czas konserwacji (opcjonalnie)
   * @param {Object} metadata - Dodatkowe dane (opcjonalnie)
   * @returns {Promise<Object>} - Utworzone powiadomienie
   */
  async notifyMaintenance(userId, message, scheduledTime = null, metadata = {}) {
    const notificationMessage = notificationTemplates[NotificationType.MAINTENANCE_NOTIFICATION](message, scheduledTime);
    
    if (scheduledTime) {
      metadata.scheduledTime = scheduledTime;
    }
    
    return this.createNotification(userId, notificationMessage, NotificationType.MAINTENANCE_NOTIFICATION, metadata);
  }
  
  /**
   * Pobiera nieprzeczytane powiadomienia użytkownika
   * @param {string} userId - ID użytkownika
   * @param {number} limit - Limit powiadomień (opcjonalnie)
   * @returns {Promise<Array>} - Lista nieprzeczytanych powiadomień
   */
  async getUnreadNotifications(userId, limit = 10) {
    try {
      return await Notification.find({ user: userId, isRead: false })
        .sort({ createdAt: -1 })
        .limit(limit);
    } catch (error) {
      console.error(`[NotificationService] Błąd podczas pobierania nieprzeczytanych powiadomień: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Oznacza powiadomienie jako przeczytane
   * @param {string} notificationId - ID powiadomienia
   * @param {string} userId - ID użytkownika (dla weryfikacji)
   * @returns {Promise<Object>} - Zaktualizowane powiadomienie
   */
  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findById(notificationId);
      
      if (!notification) {
        throw new Error('Powiadomienie nie znalezione');
      }
      
      if (notification.user.toString() !== userId) {
        throw new Error('Brak uprawnień do tego powiadomienia');
      }
      
      notification.isRead = true;
      await notification.save();
      
      // Powiadom klienta o zmianie statusu powiadomienia
      if (socketService.isUserOnline(userId)) {
        socketService.sendNotification(userId, {
          type: 'notification_updated',
          notificationId: notification._id,
          isRead: true
        });
      }
      
      return notification;
    } catch (error) {
      console.error(`[NotificationService] Błąd podczas oznaczania powiadomienia jako przeczytane: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Oznacza wszystkie powiadomienia użytkownika jako przeczytane
   * @param {string} userId - ID użytkownika
   * @returns {Promise<Object>} - Wynik operacji
   */
  async markAllAsRead(userId) {
    try {
      const result = await Notification.updateMany(
        { user: userId, isRead: false },
        { $set: { isRead: true } }
      );
      
      // Powiadom klienta o oznaczeniu wszystkich powiadomień jako przeczytane
      if (socketService.isUserOnline(userId)) {
        socketService.sendNotification(userId, {
          type: 'all_notifications_read'
        });
      }
      
      return {
        success: true,
        modifiedCount: result.modifiedCount
      };
    } catch (error) {
      console.error(`[NotificationService] Błąd podczas oznaczania wszystkich powiadomień jako przeczytane: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Usuwa powiadomienie
   * @param {string} notificationId - ID powiadomienia
   * @param {string} userId - ID użytkownika (dla weryfikacji)
   * @returns {Promise<Object>} - Wynik operacji
   */
  async deleteNotification(notificationId, userId) {
    try {
      const notification = await Notification.findById(notificationId);
      
      if (!notification) {
        throw new Error('Powiadomienie nie znalezione');
      }
      
      if (notification.user.toString() !== userId) {
        throw new Error('Brak uprawnień do tego powiadomienia');
      }
      
      await Notification.findByIdAndDelete(notificationId);
      
      // Powiadom klienta o usunięciu powiadomienia
      if (socketService.isUserOnline(userId)) {
        socketService.sendNotification(userId, {
          type: 'notification_deleted',
          notificationId: notificationId
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error(`[NotificationService] Błąd podczas usuwania powiadomienia: ${error.message}`, error);
      throw error;
    }
  }
}

// Eksport instancji serwisu jako singleton
export const notificationService = new NotificationService();
export default notificationService;
