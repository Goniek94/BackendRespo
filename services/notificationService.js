import Notification from '../models/communication/notification.js';
import { NotificationType, NotificationTypeNames, NotificationTypeDescriptions, createNotificationData } from '../utils/notificationTypes.js';
import socketService from './socketService.js';
import logger from '../utils/logger.js';

/**
 * Szablony wiadomości dla różnych typów powiadomień
 */
const notificationTemplates = {
  [NotificationType.LISTING_ADDED]: (adTitle) => 
    `Twoje ogłoszenie "${adTitle}" zostało pomyślnie opublikowane!`,
  
  [NotificationType.LISTING_EXPIRING]: (adTitle, daysLeft) => 
    `Twoje ogłoszenie "${adTitle}" wkrótce straci ważność, przedłuż teraz! (${daysLeft} ${daysLeft === 1 ? 'dzień' : 'dni'} do końca)`,
  
  [NotificationType.LISTING_EXPIRED]: (adTitle) => 
    `Twoje ogłoszenie "${adTitle}" wygasło.`,
  
  [NotificationType.LISTING_STATUS_CHANGED]: (adTitle, status) => 
    `Status Twojego ogłoszenia "${adTitle}" został zmieniony na "${status}".`,
  
  [NotificationType.LISTING_LIKED]: (adTitle) => 
    `Ktoś dodał Twoje ogłoszenie "${adTitle}" do ulubionych!`,
  
  [NotificationType.LISTING_VIEWED]: (adTitle, viewCount) => 
    viewCount ? `Twoje ogłoszenie "${adTitle}" zostało wyświetlone ${viewCount} razy.` : `Ktoś wyświetlił Twoje ogłoszenie "${adTitle}".`,
  
  [NotificationType.NEW_MESSAGE]: (senderName, adTitle) => 
    adTitle ? `Masz nową wiadomość od ${senderName} dotyczącą ogłoszenia "${adTitle}"` : `Masz nową wiadomość od ${senderName}`,
  
  [NotificationType.NEW_COMMENT]: (adTitle) => 
    `Ktoś skomentował Twoje ogłoszenie "${adTitle}".`,
  
  [NotificationType.COMMENT_REPLY]: (adTitle) => 
    `Ktoś odpowiedział na Twój komentarz w ogłoszeniu "${adTitle}".`,
  
  [NotificationType.PAYMENT_COMPLETED]: (adTitle) => 
    adTitle ? `Twoja płatność za ogłoszenie "${adTitle}" zakończyła się sukcesem!` : 'Twoja płatność zakończyła się sukcesem!',
  
  [NotificationType.PAYMENT_FAILED]: (reason) => 
    reason ? `Płatność nie powiodła się. Powód: ${reason}` : 'Płatność nie powiodła się.',
  
  [NotificationType.PAYMENT_REFUNDED]: (amount) => 
    amount ? `Otrzymałeś zwrot płatności w wysokości ${amount}.` : 'Otrzymałeś zwrot płatności.',
  
  [NotificationType.ACCOUNT_ACTIVITY]: (activity) => 
    `Wykryto aktywność na Twoim koncie: ${activity}`,
  
  [NotificationType.PROFILE_VIEWED]: (viewerName) => 
    viewerName ? `${viewerName} wyświetlił Twój profil.` : 'Ktoś wyświetlił Twój profil.',
  
  [NotificationType.MAINTENANCE_NOTIFICATION]: (message, scheduledTime) => 
    scheduledTime ? `${message} Planowany czas: ${scheduledTime}` : message,
  
  [NotificationType.SYSTEM_NOTIFICATION]: (message) => message
};

/**
 * Klasa NotificationService - odpowiada za zarządzanie powiadomieniami w systemie
 * Ulepszona wersja z pełną integracją real-time
 * @class
 */
class NotificationService {
  constructor() {
    this.offlineQueue = new Map(); // Queue dla powiadomień offline
    this.retryAttempts = new Map(); // Licznik prób ponownego wysłania
    this.maxRetryAttempts = 3;
    this.retryDelay = 5000; // 5 sekund
  }

  /**
   * Tworzy nowe powiadomienie dla użytkownika z ulepszonym systemem real-time
   * @param {string} userId - ID użytkownika
   * @param {string} title - Tytuł powiadomienia
   * @param {string} message - Treść powiadomienia
   * @param {string} type - Typ powiadomienia (z NotificationType)
   * @param {Object} options - Dodatkowe opcje (link, adId, metadata)
   * @returns {Promise<Object>} - Utworzone powiadomienie
   * @throws {Error} - Błąd podczas tworzenia powiadomienia
   */
  async createNotification(userId, title, message, type = NotificationType.SYSTEM_NOTIFICATION, options = {}) {
    try {
      if (!userId) {
        logger.warn('[NotificationService] Próba utworzenia powiadomienia bez ID użytkownika');
        return null;
      }
      
      if (!message) {
        logger.warn('[NotificationService] Próba utworzenia powiadomienia bez treści');
        return null;
      }
      
      // Sprawdź, czy użytkownik istnieje w bazie danych
      try {
        const mongoose = await import('mongoose');
        const User = mongoose.default.models?.User || mongoose.models?.User;
        
        if (User) {
          const userExists = await User.exists({ _id: userId });
          if (!userExists) {
            logger.warn(`[NotificationService] Użytkownik o ID ${userId} nie istnieje`);
            return null;
          }
        }
      } catch (userCheckError) {
        logger.error('[NotificationService] Błąd podczas sprawdzania użytkownika:', userCheckError);
        // Kontynuuj mimo błędu sprawdzania
      }
      
      logger.info(`[NotificationService] Tworzenie powiadomienia dla użytkownika ${userId}, typ: ${type}`);
      
      const notification = new Notification({
        userId: userId,
        user: userId, // Zachowujemy dla kompatybilności wstecznej
        title: title,
        message: message,
        type: type,
        link: options.link || null,
        adId: options.adId || null,
        metadata: options.metadata || {},
        isRead: false
      });
      
      await notification.save();
      logger.info(`[NotificationService] Powiadomienie utworzone pomyślnie, ID: ${notification._id}`);
      
      // Ulepszone wysyłanie powiadomienia przez WebSocket
      await this.sendRealtimeNotification(userId, notification);
      
      return notification;
    } catch (error) {
      logger.error(`[NotificationService] Błąd podczas tworzenia powiadomienia: ${error.message}`, error);
      // Zwracamy null zamiast rzucać wyjątek, aby nie przerywać głównego procesu
      return null;
    }
  }

  /**
   * Ulepszone wysyłanie powiadomienia w czasie rzeczywistym
   * @param {string} userId - ID użytkownika
   * @param {Object} notification - Obiekt powiadomienia
   */
  async sendRealtimeNotification(userId, notification) {
    try {
      const isUserOnline = socketService.isUserOnline(userId);
      
      if (isUserOnline) {
        // Użytkownik jest online - wyślij natychmiast
        const notificationData = {
          id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          isRead: notification.isRead,
          link: notification.link,
          adId: notification.adId,
          metadata: notification.metadata,
          createdAt: notification.createdAt,
          updatedAt: notification.updatedAt,
          priority: this.getNotificationPriority(notification.type),
          timestamp: Date.now()
        };

        socketService.sendNotification(userId, notificationData);
        logger.info(`[NotificationService] Powiadomienie wysłane w czasie rzeczywistym do użytkownika ${userId}`);
        
        // Usuń z kolejki offline jeśli tam było
        this.removeFromOfflineQueue(userId, notification._id);
      } else {
        // Użytkownik jest offline - dodaj do kolejki
        this.addToOfflineQueue(userId, notification);
        logger.info(`[NotificationService] Użytkownik ${userId} offline - dodano powiadomienie do kolejki`);
      }
    } catch (error) {
      logger.error(`[NotificationService] Błąd podczas wysyłania powiadomienia real-time: ${error.message}`, error);
      
      // Dodaj do kolejki offline w przypadku błędu
      this.addToOfflineQueue(userId, notification);
    }
  }

  /**
   * Dodaje powiadomienie do kolejki offline
   * @param {string} userId - ID użytkownika
   * @param {Object} notification - Powiadomienie
   */
  addToOfflineQueue(userId, notification) {
    if (!this.offlineQueue.has(userId)) {
      this.offlineQueue.set(userId, []);
    }
    
    const queue = this.offlineQueue.get(userId);
    const notificationData = {
      id: notification._id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      isRead: notification.isRead,
      link: notification.link,
      adId: notification.adId,
      metadata: notification.metadata,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
      priority: this.getNotificationPriority(notification.type),
      timestamp: Date.now(),
      queuedAt: Date.now()
    };
    
    queue.push(notificationData);
    
    // Ogranicz rozmiar kolejki do 50 powiadomień na użytkownika
    if (queue.length > 50) {
      queue.shift(); // Usuń najstarsze
    }
    
    logger.debug(`[NotificationService] Dodano powiadomienie do kolejki offline dla użytkownika ${userId}, rozmiar kolejki: ${queue.length}`);
  }

  /**
   * Usuwa powiadomienie z kolejki offline
   * @param {string} userId - ID użytkownika
   * @param {string} notificationId - ID powiadomienia
   */
  removeFromOfflineQueue(userId, notificationId) {
    if (!this.offlineQueue.has(userId)) {
      return;
    }
    
    const queue = this.offlineQueue.get(userId);
    const index = queue.findIndex(notification => notification.id === notificationId);
    
    if (index !== -1) {
      queue.splice(index, 1);
      logger.debug(`[NotificationService] Usunięto powiadomienie ${notificationId} z kolejki offline użytkownika ${userId}`);
      
      // Usuń całą kolejkę jeśli jest pusta
      if (queue.length === 0) {
        this.offlineQueue.delete(userId);
      }
    }
  }

  /**
   * Wysyła wszystkie powiadomienia z kolejki offline gdy użytkownik wraca online
   * @param {string} userId - ID użytkownika
   */
  async sendOfflineNotifications(userId) {
    if (!this.offlineQueue.has(userId)) {
      return;
    }
    
    const queue = this.offlineQueue.get(userId);
    logger.info(`[NotificationService] Wysyłanie ${queue.length} powiadomień offline dla użytkownika ${userId}`);
    
    // Sortuj według priorytetu i czasu
    queue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Wyższy priorytet pierwszy
      }
      return a.queuedAt - b.queuedAt; // Starsze pierwsze
    });
    
    // Wyślij powiadomienia z opóźnieniem, aby nie przeciążyć klienta
    for (let i = 0; i < queue.length; i++) {
      const notification = queue[i];
      
      try {
        // Sprawdź czy powiadomienie nie jest zbyt stare (starsze niż 24h)
        const maxAge = 24 * 60 * 60 * 1000; // 24 godziny
        if (Date.now() - notification.queuedAt > maxAge) {
          logger.debug(`[NotificationService] Pomijanie starego powiadomienia ${notification.id}`);
          continue;
        }
        
        socketService.sendNotification(userId, notification);
        
        // Małe opóźnienie między powiadomieniami
        if (i < queue.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        logger.error(`[NotificationService] Błąd podczas wysyłania powiadomienia offline ${notification.id}: ${error.message}`);
      }
    }
    
    // Wyczyść kolejkę po wysłaniu
    this.offlineQueue.delete(userId);
    logger.info(`[NotificationService] Wysłano wszystkie powiadomienia offline dla użytkownika ${userId}`);
  }

  /**
   * Określa priorytet powiadomienia na podstawie typu
   * @param {string} type - Typ powiadomienia
   * @returns {number} - Priorytet (wyższy = ważniejsze)
   */
  getNotificationPriority(type) {
    const priorities = {
      [NotificationType.NEW_MESSAGE]: 10,
      [NotificationType.PAYMENT_COMPLETED]: 9,
      [NotificationType.PAYMENT_FAILED]: 9,
      [NotificationType.LISTING_EXPIRING]: 8,
      [NotificationType.LISTING_EXPIRED]: 7,
      [NotificationType.COMMENT_REPLY]: 6,
      [NotificationType.LISTING_LIKED]: 5,
      [NotificationType.LISTING_VIEWED]: 4,
      [NotificationType.NEW_COMMENT]: 4,
      [NotificationType.PROFILE_VIEWED]: 3,
      [NotificationType.LISTING_ADDED]: 3,
      [NotificationType.ACCOUNT_ACTIVITY]: 2,
      [NotificationType.SYSTEM_NOTIFICATION]: 1,
      [NotificationType.MAINTENANCE_NOTIFICATION]: 1
    };
    
    return priorities[type] || 1;
  }

  /**
   * Obsługuje połączenie użytkownika - wysyła powiadomienia offline
   * @param {string} userId - ID użytkownika
   */
  async handleUserOnline(userId) {
    logger.info(`[NotificationService] Użytkownik ${userId} połączył się - sprawdzanie powiadomień offline`);
    
    try {
      // Wyślij powiadomienia z kolejki offline
      await this.sendOfflineNotifications(userId);
      
      // Wyczyść licznik prób ponownego wysłania
      this.retryAttempts.delete(userId);
    } catch (error) {
      logger.error(`[NotificationService] Błąd podczas obsługi połączenia użytkownika ${userId}: ${error.message}`, error);
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
    const title = "Ogłoszenie opublikowane!";
    const message = notificationTemplates[NotificationType.LISTING_ADDED](adTitle);
    const options = {
      adId: adId,
      link: adId ? `/ads/${adId}` : null,
      metadata: { adId }
    };
    
    return this.createNotification(userId, title, message, NotificationType.LISTING_ADDED, options);
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
    const title = "Ogłoszenie wkrótce wygaśnie";
    const message = notificationTemplates[NotificationType.LISTING_EXPIRING](adTitle, daysLeft);
    const options = {
      adId: adId,
      link: adId ? `/ads/${adId}` : null,
      metadata: { adId, daysLeft }
    };
    
    return this.createNotification(userId, title, message, NotificationType.LISTING_EXPIRING, options);
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
    const title = "Nowa wiadomość";
    const message = notificationTemplates[NotificationType.NEW_MESSAGE](senderName, adTitle);
    
    if (adTitle) {
      metadata.adTitle = adTitle;
    }
    
    const options = {
      link: '/profile/messages',
      metadata: metadata
    };
    
    return this.createNotification(userId, title, message, NotificationType.NEW_MESSAGE, options);
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
      const title = "Płatność zakończona sukcesem";
      const message = notificationTemplates[NotificationType.PAYMENT_COMPLETED](adTitle);
      
      if (adTitle) {
        metadata.adTitle = adTitle;
      }
      
      const options = {
        link: '/profile/payments',
        metadata: metadata
      };
      
      return this.createNotification(userId, title, message, NotificationType.PAYMENT_COMPLETED, options);
    } else {
      // Dla innych statusów używamy systemowego powiadomienia
      const title = "Status płatności";
      const statusMessage = `Status Twojej płatności${adTitle ? ` za ogłoszenie "${adTitle}"` : ''} został zmieniony na "${status}".`;
      metadata.status = status;
      if (adTitle) {
        metadata.adTitle = adTitle;
      }
      
      const options = {
        link: '/profile/payments',
        metadata: metadata
      };
      
      return this.createNotification(userId, title, statusMessage, NotificationType.SYSTEM_NOTIFICATION, options);
    }
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
      logger.info(`[NotificationService] Próba utworzenia powiadomienia o dodaniu do ulubionych dla użytkownika ${userId}, ogłoszenie: ${adTitle}`);
      
      // Sprawdź, czy mamy wszystkie potrzebne dane
      if (!userId) {
        logger.warn('[NotificationService] Brak ID użytkownika dla powiadomienia o dodaniu do ulubionych');
        return null;
      }
      
      // Jeśli nie ma tytułu, użyj domyślnego
      const safeAdTitle = adTitle || 'Ogłoszenie';
      
      const title = "Dodano do ulubionych";
      const message = notificationTemplates[NotificationType.LISTING_LIKED](safeAdTitle);
      const options = {
        adId: adId,
        link: adId ? `/ads/${adId}` : null,
        metadata: { adId }
      };
      
      return this.createNotification(userId, title, message, NotificationType.LISTING_LIKED, options);
    } catch (error) {
      logger.error(`[NotificationService] Błąd podczas tworzenia powiadomienia o dodaniu do ulubionych: ${error.message}`, error);
      return null;
    }
  }

  /**
   * Tworzy powiadomienie o wygaśnięciu ogłoszenia
   * @param {string} userId - ID użytkownika
   * @param {string} adTitle - Tytuł ogłoszenia
   * @param {string} adId - ID ogłoszenia (opcjonalne)
   * @returns {Promise<Object>} - Utworzone powiadomienie
   */
  async notifyAdExpired(userId, adTitle, adId = null) {
    const title = "Ogłoszenie wygasło";
    const message = notificationTemplates[NotificationType.LISTING_EXPIRED](adTitle);
    const options = {
      adId: adId,
      link: adId ? `/ads/${adId}` : null,
      metadata: { adId }
    };
    
    return this.createNotification(userId, title, message, NotificationType.LISTING_EXPIRED, options);
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
    const title = "Ogłoszenie wyświetlone";
    const message = notificationTemplates[NotificationType.LISTING_VIEWED](adTitle, viewCount);
    const options = {
      adId: adId,
      link: adId ? `/ads/${adId}` : null,
      metadata: { adId, viewCount }
    };
    
    return this.createNotification(userId, title, message, NotificationType.LISTING_VIEWED, options);
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
    const title = "Odpowiedź na komentarz";
    const message = notificationTemplates[NotificationType.COMMENT_REPLY](adTitle);
    const options = {
      adId: adId,
      link: adId ? `/ads/${adId}` : null,
      metadata: { adId, commentId }
    };
    
    return this.createNotification(userId, title, message, NotificationType.COMMENT_REPLY, options);
  }

  /**
   * Tworzy powiadomienie o nieudanej płatności
   * @param {string} userId - ID użytkownika
   * @param {string} reason - Powód niepowodzenia (opcjonalnie)
   * @param {Object} metadata - Dodatkowe dane (opcjonalnie)
   * @returns {Promise<Object>} - Utworzone powiadomienie
   */
  async notifyPaymentFailed(userId, reason = null, metadata = {}) {
    const title = "Płatność nieudana";
    const message = notificationTemplates[NotificationType.PAYMENT_FAILED](reason);
    
    if (reason) {
      metadata.reason = reason;
    }
    
    const options = {
      link: '/profile/payments',
      metadata: metadata
    };
    
    return this.createNotification(userId, title, message, NotificationType.PAYMENT_FAILED, options);
  }

  /**
   * Tworzy powiadomienie o zwrocie płatności
   * @param {string} userId - ID użytkownika
   * @param {string} amount - Kwota zwrotu (opcjonalnie)
   * @param {Object} metadata - Dodatkowe dane (opcjonalnie)
   * @returns {Promise<Object>} - Utworzone powiadomienie
   */
  async notifyPaymentRefunded(userId, amount = null, metadata = {}) {
    const title = "Zwrot płatności";
    const message = notificationTemplates[NotificationType.PAYMENT_REFUNDED](amount);
    
    if (amount) {
      metadata.amount = amount;
    }
    
    const options = {
      link: '/profile/payments',
      metadata: metadata
    };
    
    return this.createNotification(userId, title, message, NotificationType.PAYMENT_REFUNDED, options);
  }

  /**
   * Tworzy powiadomienie o aktywności na koncie
   * @param {string} userId - ID użytkownika
   * @param {string} activity - Rodzaj aktywności
   * @param {Object} metadata - Dodatkowe dane (opcjonalnie)
   * @returns {Promise<Object>} - Utworzone powiadomienie
   */
  async notifyAccountActivity(userId, activity, metadata = {}) {
    const title = "Aktywność na koncie";
    const message = notificationTemplates[NotificationType.ACCOUNT_ACTIVITY](activity);
    metadata.activity = activity;
    
    const options = {
      link: '/profile/settings',
      metadata: metadata
    };
    
    return this.createNotification(userId, title, message, NotificationType.ACCOUNT_ACTIVITY, options);
  }

  /**
   * Tworzy powiadomienie o wyświetleniu profilu
   * @param {string} userId - ID użytkownika
   * @param {string} viewerName - Nazwa osoby przeglądającej profil (opcjonalnie)
   * @param {Object} metadata - Dodatkowe dane (opcjonalnie)
   * @returns {Promise<Object>} - Utworzone powiadomienie
   */
  async notifyProfileViewed(userId, viewerName = null, metadata = {}) {
    const title = "Profil wyświetlony";
    const message = notificationTemplates[NotificationType.PROFILE_VIEWED](viewerName);
    
    if (viewerName) {
      metadata.viewerName = viewerName;
    }
    
    const options = {
      link: '/profile',
      metadata: metadata
    };
    
    return this.createNotification(userId, title, message, NotificationType.PROFILE_VIEWED, options);
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
    const title = "Konserwacja systemu";
    const notificationMessage = notificationTemplates[NotificationType.MAINTENANCE_NOTIFICATION](message, scheduledTime);
    
    if (scheduledTime) {
      metadata.scheduledTime = scheduledTime;
    }
    
    const options = {
      metadata: metadata
    };
    
    return this.createNotification(userId, title, notificationMessage, NotificationType.MAINTENANCE_NOTIFICATION, options);
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
      logger.error(`[NotificationService] Błąd podczas pobierania nieprzeczytanych powiadomień: ${error.message}`, error);
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
      logger.error(`[NotificationService] Błąd podczas oznaczania powiadomienia jako przeczytane: ${error.message}`, error);
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
      logger.error(`[NotificationService] Błąd podczas oznaczania wszystkich powiadomień jako przeczytane: ${error.message}`, error);
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
      logger.error(`[NotificationService] Błąd podczas usuwania powiadomienia: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Czyści stare powiadomienia (starsze niż 30 dni)
   * @returns {Promise<Object>} - Wynik operacji
   */
  async cleanupOldNotifications() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const result = await Notification.deleteMany({
        createdAt: { $lt: thirtyDaysAgo },
        isRead: true
      });
      
      logger.info(`[NotificationService] Usunięto ${result.deletedCount} starych powiadomień`);
      
      return {
        success: true,
        deletedCount: result.deletedCount
      };
    } catch (error) {
      logger.error(`[NotificationService] Błąd podczas czyszczenia starych powiadomień: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Zwraca statystyki powiadomień
   * @returns {Promise<Object>} - Statystyki
   */
  async getNotificationStats() {
    try {
      const stats = {
        totalNotifications: await Notification.countDocuments(),
        unreadNotifications: await Notification.countDocuments({ isRead: false }),
        offlineQueueSize: Array.from(this.offlineQueue.values()).reduce((total, queue) => total + queue.length, 0),
        onlineUsers: socketService.getTotalConnectionCount()
      };
      
      return stats;
    } catch (error) {
      logger.error(`[NotificationService] Błąd podczas pobierania statystyk powiadomień: ${error.message}`, error);
      throw error;
    }
  }
}

// Eksport instancji serwisu jako singleton
const notificationService = new NotificationService();

// Obsługa połączeń użytkowników - integracja z socketService
if (socketService) {
  // Nasłuchuj na nowe połączenia użytkowników
  const originalHandleConnection = socketService.handleConnection;
  socketService.handleConnection = function(socket) {
    // Wywołaj oryginalną metodę
    originalHandleConnection.call(this, socket);
    
    // Dodaj obsługę powiadomień offline
    const userId = socket.user?.userId;
    if (userId) {
      // Wyślij powiadomienia offline po połączeniu
      setTimeout(() => {
        notificationService.handleUserOnline(userId);
      }, 1000); // Małe opóźnienie, aby socket był w pełni gotowy
    }
  };
}

export default notificationService;
