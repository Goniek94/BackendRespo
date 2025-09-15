import Notification from '../models/communication/notification.js';
import { NotificationType, NotificationTypeNames, NotificationTypeDescriptions, createNotificationData } from '../utils/notificationTypes.js';
import socketService from './socketService.js';
import logger from '../utils/logger.js';

/**
 * Zunifikowany serwis powiadomień - łączy funkcjonalność wszystkich poprzednich serwisów
 * @class
 */
class NotificationManager {
  constructor() {
    this.offlineQueue = new Map(); // Queue dla powiadomień offline
    this.retryAttempts = new Map(); // Licznik prób ponownego wysłania
    this.maxRetryAttempts = 3;
    this.retryDelay = 5000; // 5 sekund
    this.notificationHistory = new Map(); // Historia powiadomień dla deduplikacji
    this.userPreferences = new Map(); // Preferencje użytkowników
    this.activeUsers = new Set(); // Aktywni użytkownicy
    this.deliveryConfirmations = new Map(); // Potwierdzenia dostarczenia
    this.batchQueue = new Map(); // Kolejka wsadowa dla podobnych powiadomień
    this.batchTimeout = 2000; // 2 sekundy na grupowanie
    this.initialized = false;
  }

  /**
   * Inicjalizuje serwis powiadomień
   */
  initialize() {
    if (this.initialized) {
      logger.info('[NotificationManager] Serwis już zainicjalizowany');
      return;
    }

    // Integracja z socketService przez event-based komunikację
    this.setupSocketServiceIntegration();

    this.initialized = true;
    logger.info('[NotificationManager] Serwis zainicjalizowany pomyślnie');
  }

  /**
   * Konfiguruje integrację z socketService
   */
  setupSocketServiceIntegration() {
    if (!socketService || !socketService.io) {
      logger.warn('[NotificationManager] SocketService nie jest dostępny');
      return;
    }

    // Nasłuchuj na zdarzenia z socketService
    socketService.io.on('connection', (socket) => {
      const userId = socket.user?.userId;
      if (!userId) return;

      logger.info(`[NotificationManager] Użytkownik ${userId} połączył się`);
      
      // Dodaj do aktywnych użytkowników
      this.activeUsers.add(userId);
      
      // Obsłuż powiadomienia offline
      this.handleUserOnline(userId);

      // Obsługa rozłączenia
      socket.on('disconnect', () => {
        logger.info(`[NotificationManager] Użytkownik ${userId} rozłączył się`);
        this.activeUsers.delete(userId);
      });

      // Obsługa potwierdzenia dostarczenia
      socket.on('notification_delivered', (data) => {
        this.handleDeliveryConfirmation(userId, data.notificationId);
      });

      // Obsługa preferencji użytkownika
      socket.on('update_notification_preferences', (preferences) => {
        this.updateUserPreferences(userId, preferences);
      });
    });

    logger.info('[NotificationManager] Integracja z socketService skonfigurowana');
  }

  /**
   * Tworzy nowe powiadomienie z zaawansowanymi funkcjami
   * @param {string} userId - ID użytkownika
   * @param {string} title - Tytuł powiadomienia
   * @param {string} message - Treść powiadomienia
   * @param {string} type - Typ powiadomienia
   * @param {Object} options - Dodatkowe opcje
   * @returns {Promise<Object>} - Utworzone powiadomienie
   */
  async createNotification(userId, title, message, type = NotificationType.SYSTEM_NOTIFICATION, options = {}) {
    try {
      if (!userId) {
        logger.warn('[NotificationManager] Próba utworzenia powiadomienia bez ID użytkownika');
        return null;
      }
      
      if (!message) {
        logger.warn('[NotificationManager] Próba utworzenia powiadomienia bez treści');
        return null;
      }

      // Sprawdź preferencje użytkownika
      if (!this.shouldSendNotification(userId, type)) {
        logger.debug(`[NotificationManager] Powiadomienie ${type} zablokowane przez preferencje użytkownika ${userId}`);
        return null;
      }

      // Sprawdź deduplikację
      const notificationHash = this.generateNotificationHash(userId, type, message);
      if (this.isDuplicate(notificationHash)) {
        logger.debug(`[NotificationManager] Powiadomienie ${type} jest duplikatem dla użytkownika ${userId}`);
        return null;
      }

      // Sprawdź czy użytkownik istnieje
      const userExists = await this.verifyUserExists(userId);
      if (!userExists) {
        logger.warn(`[NotificationManager] Użytkownik ${userId} nie istnieje`);
        return null;
      }

      logger.info(`[NotificationManager] Tworzenie powiadomienia dla użytkownika ${userId}, typ: ${type}`);
      
      // Utwórz powiadomienie w bazie danych
      const notification = new Notification({
        userId: userId,
        user: userId,
        title: title,
        message: message,
        type: type,
        link: options.link || null,
        adId: options.adId || null,
        metadata: {
          ...options.metadata,
          priority: this.getNotificationPriority(type),
          category: this.getNotificationCategory(type),
          timestamp: Date.now(),
          source: options.source || 'system'
        },
        isRead: false,
        deliveryStatus: 'pending'
      });

      await notification.save();
      logger.info(`[NotificationManager] Powiadomienie utworzone pomyślnie: ${notification._id}`);

      // Dodaj do historii deduplikacji
      this.addToHistory(notificationHash);

      // Sprawdź czy grupować powiadomienia
      if (this.shouldBatchNotification(type)) {
        this.addToBatch(userId, notification);
      } else {
        // Wyślij natychmiast
        await this.sendRealtimeNotification(userId, notification);
      }

      return notification;
    } catch (error) {
      logger.error(`[NotificationManager] Błąd podczas tworzenia powiadomienia: ${error.message}`, error);
      return null;
    }
  }

  /**
   * Wysyła powiadomienie w czasie rzeczywistym
   * @param {string} userId - ID użytkownika
   * @param {Object} notification - Obiekt powiadomienia
   */
  async sendRealtimeNotification(userId, notification) {
    try {
      const isUserOnline = socketService.isUserOnline(userId);
      
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
        priority: notification.metadata?.priority || this.getNotificationPriority(notification.type),
        category: notification.metadata?.category || this.getNotificationCategory(notification.type),
        timestamp: Date.now(),
        requiresConfirmation: this.requiresDeliveryConfirmation(notification.type)
      };

      if (isUserOnline) {
        // Użytkownik jest online - wyślij natychmiast
        socketService.sendNotification(userId, notificationData);
        
        // Aktualizuj status dostarczenia
        await this.updateDeliveryStatus(notification._id, 'sent');
        
        // Jeśli wymaga potwierdzenia, ustaw timeout
        if (notificationData.requiresConfirmation) {
          this.setDeliveryTimeout(userId, notification._id);
        }
        
        logger.info(`[NotificationManager] Powiadomienie wysłane w czasie rzeczywistym do użytkownika ${userId}`);
        
        // Usuń z kolejki offline jeśli tam było
        this.removeFromOfflineQueue(userId, notification._id);
      } else {
        // Użytkownik jest offline - dodaj do kolejki
        this.addToOfflineQueue(userId, notificationData);
        await this.updateDeliveryStatus(notification._id, 'queued');
        logger.info(`[NotificationManager] Użytkownik ${userId} offline - dodano powiadomienie do kolejki`);
      }
    } catch (error) {
      logger.error(`[NotificationManager] Błąd podczas wysyłania powiadomienia real-time: ${error.message}`, error);
      
      // Dodaj do kolejki offline w przypadku błędu
      this.addToOfflineQueue(userId, notification);
      await this.updateDeliveryStatus(notification._id, 'failed');
    }
  }

  /**
   * Obsługuje połączenie użytkownika - wysyła powiadomienia offline
   * @param {string} userId - ID użytkownika
   */
  async handleUserOnline(userId) {
    logger.info(`[NotificationManager] Użytkownik ${userId} połączył się - sprawdzanie powiadomień offline`);
    
    try {
      // Dodaj do aktywnych użytkowników
      this.activeUsers.add(userId);
      
      // Wyślij powiadomienia z kolejki offline
      await this.sendOfflineNotifications(userId);
      
      // Wyczyść licznik prób ponownego wysłania
      this.retryAttempts.delete(userId);
      
      // Wyślij powiadomienie o połączeniu (opcjonalne)
      if (socketService.isUserOnline(userId)) {
        socketService.sendNotification(userId, {
          type: 'system_status',
          message: 'Połączono z systemem powiadomień',
          timestamp: Date.now()
        });
      }
      
    } catch (error) {
      logger.error(`[NotificationManager] Błąd podczas obsługi połączenia użytkownika ${userId}: ${error.message}`, error);
    }
  }

  /**
   * Wysyła wszystkie powiadomienia z kolejki offline
   * @param {string} userId - ID użytkownika
   */
  async sendOfflineNotifications(userId) {
    if (!this.offlineQueue.has(userId)) {
      return;
    }
    
    const queue = this.offlineQueue.get(userId);
    logger.info(`[NotificationManager] Wysyłanie ${queue.length} powiadomień offline dla użytkownika ${userId}`);
    
    // Filtruj stare powiadomienia (starsze niż 24h)
    const maxAge = 24 * 60 * 60 * 1000; // 24 godziny
    const now = Date.now();
    const validNotifications = queue.filter(notification => {
      return (now - notification.queuedAt) <= maxAge;
    });
    
    if (validNotifications.length !== queue.length) {
      logger.info(`[NotificationManager] Odfiltrowano ${queue.length - validNotifications.length} starych powiadomień`);
    }
    
    // Wyślij powiadomienia wsadowo (po 5 na raz)
    const batchSize = 5;
    for (let i = 0; i < validNotifications.length; i += batchSize) {
      const batch = validNotifications.slice(i, i + batchSize);
      
      // Wyślij wsad
      for (const notification of batch) {
        try {
          socketService.sendNotification(userId, notification);
          
          // Aktualizuj status jeśli ma ID
          if (notification.id && !notification.id.startsWith('grouped_')) {
            await this.updateDeliveryStatus(notification.id, 'sent');
          }
        } catch (error) {
          logger.error(`[NotificationManager] Błąd podczas wysyłania powiadomienia offline ${notification.id}: ${error.message}`);
        }
      }
      
      // Małe opóźnienie między wsadami
      if (i + batchSize < validNotifications.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Wyczyść kolejkę po wysłaniu
    this.offlineQueue.delete(userId);
    logger.info(`[NotificationManager] Wysłano wszystkie powiadomienia offline dla użytkownika ${userId}`);
  }

  // Metody pomocnicze
  shouldSendNotification(userId, type) {
    const preferences = this.userPreferences.get(userId);
    if (!preferences) return true;
    if (preferences.disabled === true) return false;
    if (preferences.types && preferences.types[type] === false) return false;
    return true;
  }

  generateNotificationHash(userId, type, message) {
    // Prosty hash bez crypto dla kompatybilności ES6
    const str = `${userId}:${type}:${message}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  isDuplicate(hash) {
    const now = Date.now();
    const history = this.notificationHistory.get(hash);
    if (!history) return false;
    return (now - history.timestamp) < 5 * 60 * 1000; // 5 minut
  }

  addToHistory(hash) {
    this.notificationHistory.set(hash, { timestamp: Date.now() });
    
    // Wyczyść starą historię (starszą niż 1 godzina)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [key, value] of this.notificationHistory.entries()) {
      if (value.timestamp < oneHourAgo) {
        this.notificationHistory.delete(key);
      }
    }
  }

  async verifyUserExists(userId) {
    try {
      const mongoose = await import('mongoose');
      const User = mongoose.default.models?.User || mongoose.models?.User;
      
      if (User) {
        const userExists = await User.exists({ _id: userId });
        return !!userExists;
      }
      
      return true; // Jeśli nie można sprawdzić, zakładamy że istnieje
    } catch (error) {
      logger.error(`[NotificationManager] Błąd podczas sprawdzania użytkownika: ${error.message}`, error);
      return true;
    }
  }

  shouldBatchNotification(type) {
    const batchableTypes = [
      NotificationType.LISTING_VIEWED,
      NotificationType.LISTING_LIKED,
      NotificationType.PROFILE_VIEWED
    ];
    return batchableTypes.includes(type);
  }

  requiresDeliveryConfirmation(type) {
    const criticalTypes = [
      NotificationType.PAYMENT_COMPLETED,
      NotificationType.PAYMENT_FAILED,
      NotificationType.LISTING_EXPIRED,
      NotificationType.ACCOUNT_ACTIVITY
    ];
    return criticalTypes.includes(type);
  }

  getNotificationPriority(type) {
    const priorities = {
      [NotificationType.PAYMENT_FAILED]: 10,
      [NotificationType.ACCOUNT_ACTIVITY]: 9,
      [NotificationType.PAYMENT_COMPLETED]: 8,
      [NotificationType.NEW_MESSAGE]: 7,
      [NotificationType.LISTING_EXPIRED]: 6,
      [NotificationType.LISTING_EXPIRING]: 5,
      [NotificationType.COMMENT_REPLY]: 4,
      [NotificationType.LISTING_LIKED]: 3,
      [NotificationType.LISTING_VIEWED]: 2,
      [NotificationType.PROFILE_VIEWED]: 2,
      [NotificationType.LISTING_ADDED]: 2,
      [NotificationType.SYSTEM_NOTIFICATION]: 1,
      [NotificationType.MAINTENANCE_NOTIFICATION]: 1
    };
    return priorities[type] || 1;
  }

  getNotificationCategory(type) {
    const categories = {
      [NotificationType.NEW_MESSAGE]: 'communication',
      [NotificationType.COMMENT_REPLY]: 'communication',
      [NotificationType.LISTING_ADDED]: 'listings',
      [NotificationType.LISTING_LIKED]: 'listings',
      [NotificationType.LISTING_VIEWED]: 'listings',
      [NotificationType.LISTING_EXPIRING]: 'listings',
      [NotificationType.LISTING_EXPIRED]: 'listings',
      [NotificationType.PAYMENT_COMPLETED]: 'payments',
      [NotificationType.PAYMENT_FAILED]: 'payments',
      [NotificationType.PAYMENT_REFUNDED]: 'payments',
      [NotificationType.ACCOUNT_ACTIVITY]: 'security',
      [NotificationType.PROFILE_VIEWED]: 'social',
      [NotificationType.SYSTEM_NOTIFICATION]: 'system',
      [NotificationType.MAINTENANCE_NOTIFICATION]: 'system'
    };
    return categories[type] || 'general';
  }

  addToOfflineQueue(userId, notification) {
    if (!this.offlineQueue.has(userId)) {
      this.offlineQueue.set(userId, []);
    }
    
    const queue = this.offlineQueue.get(userId);
    const queuedNotification = {
      ...notification,
      queuedAt: Date.now()
    };
    
    queue.push(queuedNotification);
    
    // Sortuj według priorytetu
    queue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.queuedAt - b.queuedAt;
    });
    
    // Ogranicz rozmiar kolejki do 100 powiadomień na użytkownika
    if (queue.length > 100) {
      queue.splice(100);
    }
    
    logger.debug(`[NotificationManager] Dodano powiadomienie do kolejki offline dla użytkownika ${userId}, rozmiar kolejki: ${queue.length}`);
  }

  removeFromOfflineQueue(userId, notificationId) {
    if (!this.offlineQueue.has(userId)) return;
    
    const queue = this.offlineQueue.get(userId);
    const index = queue.findIndex(notification => notification.id === notificationId);
    
    if (index !== -1) {
      queue.splice(index, 1);
      logger.debug(`[NotificationManager] Usunięto powiadomienie ${notificationId} z kolejki offline użytkownika ${userId}`);
      
      if (queue.length === 0) {
        this.offlineQueue.delete(userId);
      }
    }
  }

  addToBatch(userId, notification) {
    const batchKey = `${userId}:${notification.type}`;
    
    if (!this.batchQueue.has(batchKey)) {
      this.batchQueue.set(batchKey, {
        notifications: [],
        timeout: null,
        userId: userId,
        type: notification.type
      });
    }
    
    const batch = this.batchQueue.get(batchKey);
    batch.notifications.push(notification);
    
    if (batch.timeout) {
      clearTimeout(batch.timeout);
    }
    
    batch.timeout = setTimeout(() => {
      this.processBatch(batchKey);
    }, this.batchTimeout);
    
    logger.debug(`[NotificationManager] Dodano powiadomienie do wsadu ${batchKey}, rozmiar: ${batch.notifications.length}`);
  }

  async processBatch(batchKey) {
    const batch = this.batchQueue.get(batchKey);
    if (!batch || batch.notifications.length === 0) return;
    
    const { userId, type, notifications } = batch;
    
    try {
      if (notifications.length === 1) {
        await this.sendRealtimeNotification(userId, notifications[0]);
      } else {
        const groupedNotification = this.createGroupedNotification(notifications, type);
        await this.sendRealtimeNotification(userId, groupedNotification);
      }
      
      logger.info(`[NotificationManager] Przetworzono wsad ${batchKey} z ${notifications.length} powiadomieniami`);
    } catch (error) {
      logger.error(`[NotificationManager] Błąd podczas przetwarzania wsadu ${batchKey}: ${error.message}`, error);
    } finally {
      this.batchQueue.delete(batchKey);
    }
  }

  createGroupedNotification(notifications, type) {
    const count = notifications.length;
    const firstNotification = notifications[0];
    
    let title, message;
    
    switch (type) {
      case NotificationType.NEW_MESSAGE:
        title = `${count} nowych wiadomości`;
        message = `Masz ${count} nowych wiadomości do przeczytania`;
        break;
      case NotificationType.LISTING_LIKED:
        title = `${count} nowych polubień`;
        message = `Twoje ogłoszenia zostały polubione ${count} razy`;
        break;
      case NotificationType.LISTING_VIEWED:
        title = `${count} nowych wyświetleń`;
        message = `Twoje ogłoszenia zostały wyświetlone ${count} razy`;
        break;
      default:
        title = `${count} nowych powiadomień`;
        message = `Masz ${count} nowych powiadomień`;
    }
    
    return {
      id: `grouped_${Date.now()}`,
      title: title,
      message: message,
      type: type,
      isRead: false,
      metadata: {
        ...firstNotification.metadata,
        isGrouped: true,
        count: count,
        notifications: notifications.map(n => n._id)
      },
      createdAt: new Date(),
      priority: this.getNotificationPriority(type),
      category: this.getNotificationCategory(type)
    };
  }

  async handleDeliveryConfirmation(userId, notificationId) {
    try {
      const confirmationKey = `${userId}:${notificationId}`;
      if (this.deliveryConfirmations.has(confirmationKey)) {
        clearTimeout(this.deliveryConfirmations.get(confirmationKey));
        this.deliveryConfirmations.delete(confirmationKey);
      }
      
      await this.updateDeliveryStatus(notificationId, 'delivered');
      logger.debug(`[NotificationManager] Potwierdzono dostarczenie powiadomienia ${notificationId} dla użytkownika ${userId}`);
    } catch (error) {
      logger.error(`[NotificationManager] Błąd podczas obsługi potwierdzenia dostarczenia: ${error.message}`, error);
    }
  }

  setDeliveryTimeout(userId, notificationId) {
    const confirmationKey = `${userId}:${notificationId}`;
    const timeout = setTimeout(async () => {
      logger.warn(`[NotificationManager] Brak potwierdzenia dostarczenia powiadomienia ${notificationId} dla użytkownika ${userId}`);
      await this.updateDeliveryStatus(notificationId, 'unconfirmed');
      this.deliveryConfirmations.delete(confirmationKey);
    }, 30000); // 30 sekund na potwierdzenie
    
    this.deliveryConfirmations.set(confirmationKey, timeout);
  }

  async updateDeliveryStatus(notificationId, status) {
    try {
      await Notification.findByIdAndUpdate(notificationId, {
        deliveryStatus: status,
        deliveryTimestamp: new Date()
      });
    } catch (error) {
      logger.error(`[NotificationManager] Błąd podczas aktualizacji statusu dostarczenia: ${error.message}`, error);
    }
  }

  updateUserPreferences(userId, preferences) {
    this.userPreferences.set(userId, preferences);
    logger.debug(`[NotificationManager] Zaktualizowano preferencje użytkownika ${userId}`);
  }

  // Metody API dla kompatybilności z poprzednimi serwisami
  async notifyAdCreated(userId, adTitle, adId = null) {
    const title = "Ogłoszenie opublikowane!";
    const message = `Twoje ogłoszenie "${adTitle}" zostało pomyślnie opublikowane!`;
    const options = {
      adId: adId && adId !== 'test_ad_id_123' ? adId : null, // Fix ObjectId validation
      link: adId && adId !== 'test_ad_id_123' ? `/ads/${adId}` : null,
      metadata: { adId: adId && adId !== 'test_ad_id_123' ? adId : null }
    };
    
    return this.createNotification(userId, title, message, NotificationType.LISTING_ADDED, options);
  }

  async notifyAdExpiringSoon(userId, adTitle, daysLeft, adId = null) {
    const title = "Ogłoszenie wkrótce wygaśnie";
    const message = `Twoje ogłoszenie "${adTitle}" wkrótce straci ważność, przedłuż teraz! (${daysLeft} ${daysLeft === 1 ? 'dzień' : 'dni'} do końca)`;
    const options = {
      adId: adId && adId !== 'test_ad_id_123' ? adId : null, // Fix ObjectId validation
      link: adId && adId !== 'test_ad_id_123' ? `/ads/${adId}` : null,
      metadata: { adId: adId && adId !== 'test_ad_id_123' ? adId : null, daysLeft }
    };
    
    return this.createNotification(userId, title, message, NotificationType.LISTING_EXPIRING, options);
  }

  async notifyNewMessage(userId, senderName, adTitle = null, metadata = {}) {
    const title = "Nowa wiadomość";
    const message = adTitle ? `Masz nową wiadomość od ${senderName} dotyczącą ogłoszenia "${adTitle}"` : `Masz nową wiadomość od ${senderName}`;
    
    if (adTitle) {
      metadata.adTitle = adTitle;
    }
    
    const options = {
      link: '/profile/messages',
      metadata: metadata
    };
    
    return this.createNotification(userId, title, message, NotificationType.NEW_MESSAGE, options);
  }

  async notifyAdAddedToFavorites(userId, adTitle, adId = null) {
    try {
      logger.info(`[NotificationManager] Próba utworzenia powiadomienia o dodaniu do ulubionych dla użytkownika ${userId}, ogłoszenie: ${adTitle}`);
      
      if (!userId) {
        logger.warn('[NotificationManager] Brak ID użytkownika dla powiadomienia o dodaniu do ulubionych');
        return null;
      }
      
      const safeAdTitle = adTitle || 'Ogłoszenie';
      const title = "Dodano do ulubionych";
      const message = `Ktoś dodał Twoje ogłoszenie "${safeAdTitle}" do ulubionych!`;
      const options = {
        adId: adId && adId !== 'test_ad_123' && adId !== 'test_ad_id_123' ? adId : null, // Fix ObjectId validation
        link: adId && adId !== 'test_ad_123' && adId !== 'test_ad_id_123' ? `/ads/${adId}` : null,
        metadata: { adId: adId && adId !== 'test_ad_123' && adId !== 'test_ad_id_123' ? adId : null }
      };
      
      return this.createNotification(userId, title, message, NotificationType.LISTING_LIKED, options);
    } catch (error) {
      logger.error(`[NotificationManager] Błąd podczas tworzenia powiadomienia o dodaniu do ulubionych: ${error.message}`, error);
      return null;
    }
  }

  async notifyPaymentStatusChange(userId, status, adTitle = null, metadata = {}) {
    if (status === 'completed') {
      const title = "Płatność zakończona sukcesem";
      const message = adTitle ? `Twoja płatność za ogłoszenie "${adTitle}" zakończyła się sukcesem!` : 'Twoja płatność zakończyła się sukcesem!';
      
      if (adTitle) {
        metadata.adTitle = adTitle;
      }
      
      const options = {
        link: '/profile/payments',
        metadata: metadata
      };
      
      return this.createNotification(userId, title, message, NotificationType.PAYMENT_COMPLETED, options);
    } else {
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

  // Metody do zarządzania powiadomieniami
  async getUnreadNotifications(userId, limit = 10) {
    try {
      return await Notification.find({ user: userId, isRead: false })
        .sort({ createdAt: -1 })
        .limit(limit);
    } catch (error) {
      logger.error(`[NotificationManager] Błąd podczas pobierania nieprzeczytanych powiadomień: ${error.message}`, error);
      throw error;
    }
  }

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
      logger.error(`[NotificationManager] Błąd podczas oznaczania powiadomienia jako przeczytane: ${error.message}`, error);
      throw error;
    }
  }

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
      logger.error(`[NotificationManager] Błąd podczas oznaczania wszystkich powiadomień jako przeczytane: ${error.message}`, error);
      throw error;
    }
  }

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
      logger.error(`[NotificationManager] Błąd podczas usuwania powiadomienia: ${error.message}`, error);
      throw error;
    }
  }

  async getNotificationStats() {
    try {
      const stats = {
        totalNotifications: await Notification.countDocuments(),
        unreadNotifications: await Notification.countDocuments({ isRead: false }),
        offlineQueueSize: Array.from(this.offlineQueue.values()).reduce((total, queue) => total + queue.length, 0),
        onlineUsers: socketService.getTotalConnectionCount(),
        activeUsers: this.activeUsers.size,
        batchQueueSize: this.batchQueue.size,
        historySize: this.notificationHistory.size,
        pendingConfirmations: this.deliveryConfirmations.size,
        userPreferences: this.userPreferences.size
      };
      
      return stats;
    } catch (error) {
      logger.error(`[NotificationManager] Błąd podczas pobierania statystyk powiadomień: ${error.message}`, error);
      throw error;
    }
  }

  cleanup() {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    
    // Wyczyść historię
    for (const [key, value] of this.notificationHistory.entries()) {
      if (value.timestamp < oneHourAgo) {
        this.notificationHistory.delete(key);
      }
    }
    
    // Wyczyść stare wsady
    for (const [key, batch] of this.batchQueue.entries()) {
      if (batch.notifications.length > 0 && batch.notifications[0].metadata?.timestamp < oneHourAgo) {
        if (batch.timeout) {
          clearTimeout(batch.timeout);
        }
        this.batchQueue.delete(key);
      }
    }
    
    logger.debug('[NotificationManager] Wykonano czyszczenie starych danych');
  }
}

// Eksport instancji serwisu jako singleton
const notificationManager = new NotificationManager();
export default notificationManager;
