import Notification from '../models/communication/notification.js';
import { NotificationType, NotificationTypeNames, NotificationTypeDescriptions, createNotificationData } from '../utils/notificationTypes.js';
import socketService from './socketService.js';
import logger from '../utils/logger.js';

/**
 * Ulepszona klasa NotificationService - rzeczywiste powiadomienia w czasie rzeczywistym
 * @class
 */
class EnhancedNotificationService {
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
  }

  /**
   * Inicjalizuje serwis - nasłuchuje na zdarzenia Socket.IO
   */
  initialize() {
    // Nasłuchuj na połączenia użytkowników
    if (socketService.io) {
      socketService.io.on('connection', (socket) => {
        const userId = socket.user?.userId;
        if (userId) {
          this.handleUserOnline(userId);
          this.activeUsers.add(userId);
          
          // Obsługa rozłączenia
          socket.on('disconnect', () => {
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
        }
      });
    }

    logger.info('[EnhancedNotificationService] Serwis zainicjalizowany');
  }

  /**
   * Tworzy powiadomienie z zaawansowanymi funkcjami
   * @param {string} userId - ID użytkownika
   * @param {string} title - Tytuł powiadomienia
   * @param {string} message - Treść powiadomienia
   * @param {string} type - Typ powiadomienia
   * @param {Object} options - Dodatkowe opcje
   * @returns {Promise<Object>} - Utworzone powiadomienie
   */
  async createNotification(userId, title, message, type = NotificationType.SYSTEM_NOTIFICATION, options = {}) {
    try {
      // Sprawdź preferencje użytkownika
      if (!this.shouldSendNotification(userId, type)) {
        logger.debug(`[EnhancedNotificationService] Powiadomienie ${type} zablokowane przez preferencje użytkownika ${userId}`);
        return null;
      }

      // Sprawdź deduplikację
      const notificationHash = this.generateNotificationHash(userId, type, message);
      if (this.isDuplicate(notificationHash)) {
        logger.debug(`[EnhancedNotificationService] Powiadomienie ${type} jest duplikatem dla użytkownika ${userId}`);
        return null;
      }

      // Sprawdź czy użytkownik istnieje
      const userExists = await this.verifyUserExists(userId);
      if (!userExists) {
        logger.warn(`[EnhancedNotificationService] Użytkownik ${userId} nie istnieje`);
        return null;
      }

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
      logger.info(`[EnhancedNotificationService] Powiadomienie utworzone: ${notification._id}`);

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
      logger.error(`[EnhancedNotificationService] Błąd podczas tworzenia powiadomienia: ${error.message}`, error);
      return null;
    }
  }

  /**
   * Wysyła powiadomienie w czasie rzeczywistym z potwierdzeniem dostarczenia
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
        
        logger.info(`[EnhancedNotificationService] Powiadomienie wysłane w czasie rzeczywistym do użytkownika ${userId}`);
        
        // Usuń z kolejki offline jeśli tam było
        this.removeFromOfflineQueue(userId, notification._id);
      } else {
        // Użytkownik jest offline - dodaj do kolejki
        this.addToOfflineQueue(userId, notificationData);
        await this.updateDeliveryStatus(notification._id, 'queued');
        logger.info(`[EnhancedNotificationService] Użytkownik ${userId} offline - dodano powiadomienie do kolejki`);
      }
    } catch (error) {
      logger.error(`[EnhancedNotificationService] Błąd podczas wysyłania powiadomienia real-time: ${error.message}`, error);
      
      // Dodaj do kolejki offline w przypadku błędu
      this.addToOfflineQueue(userId, notification);
      await this.updateDeliveryStatus(notification._id, 'failed');
    }
  }

  /**
   * Dodaje powiadomienie do kolejki wsadowej
   * @param {string} userId - ID użytkownika
   * @param {Object} notification - Powiadomienie
   */
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
    
    // Ustaw timeout dla wysłania wsadu
    if (batch.timeout) {
      clearTimeout(batch.timeout);
    }
    
    batch.timeout = setTimeout(() => {
      this.processBatch(batchKey);
    }, this.batchTimeout);
    
    logger.debug(`[EnhancedNotificationService] Dodano powiadomienie do wsadu ${batchKey}, rozmiar: ${batch.notifications.length}`);
  }

  /**
   * Przetwarza wsad powiadomień
   * @param {string} batchKey - Klucz wsadu
   */
  async processBatch(batchKey) {
    const batch = this.batchQueue.get(batchKey);
    if (!batch || batch.notifications.length === 0) {
      return;
    }
    
    const { userId, type, notifications } = batch;
    
    try {
      if (notifications.length === 1) {
        // Pojedyncze powiadomienie - wyślij normalnie
        await this.sendRealtimeNotification(userId, notifications[0]);
      } else {
        // Wiele powiadomień - utwórz powiadomienie grupowe
        const groupedNotification = this.createGroupedNotification(notifications, type);
        await this.sendRealtimeNotification(userId, groupedNotification);
      }
      
      logger.info(`[EnhancedNotificationService] Przetworzono wsad ${batchKey} z ${notifications.length} powiadomieniami`);
    } catch (error) {
      logger.error(`[EnhancedNotificationService] Błąd podczas przetwarzania wsadu ${batchKey}: ${error.message}`, error);
    } finally {
      // Wyczyść wsad
      this.batchQueue.delete(batchKey);
    }
  }

  /**
   * Tworzy grupowe powiadomienie z wielu pojedynczych
   * @param {Array} notifications - Lista powiadomień
   * @param {string} type - Typ powiadomienia
   * @returns {Object} - Grupowe powiadomienie
   */
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

  /**
   * Obsługuje potwierdzenie dostarczenia powiadomienia
   * @param {string} userId - ID użytkownika
   * @param {string} notificationId - ID powiadomienia
   */
  async handleDeliveryConfirmation(userId, notificationId) {
    try {
      // Usuń z oczekujących potwierdzeń
      const confirmationKey = `${userId}:${notificationId}`;
      if (this.deliveryConfirmations.has(confirmationKey)) {
        clearTimeout(this.deliveryConfirmations.get(confirmationKey));
        this.deliveryConfirmations.delete(confirmationKey);
      }
      
      // Aktualizuj status w bazie danych
      await this.updateDeliveryStatus(notificationId, 'delivered');
      
      logger.debug(`[EnhancedNotificationService] Potwierdzono dostarczenie powiadomienia ${notificationId} dla użytkownika ${userId}`);
    } catch (error) {
      logger.error(`[EnhancedNotificationService] Błąd podczas obsługi potwierdzenia dostarczenia: ${error.message}`, error);
    }
  }

  /**
   * Ustawia timeout dla potwierdzenia dostarczenia
   * @param {string} userId - ID użytkownika
   * @param {string} notificationId - ID powiadomienia
   */
  setDeliveryTimeout(userId, notificationId) {
    const confirmationKey = `${userId}:${notificationId}`;
    const timeout = setTimeout(async () => {
      logger.warn(`[EnhancedNotificationService] Brak potwierdzenia dostarczenia powiadomienia ${notificationId} dla użytkownika ${userId}`);
      await this.updateDeliveryStatus(notificationId, 'unconfirmed');
      this.deliveryConfirmations.delete(confirmationKey);
    }, 30000); // 30 sekund na potwierdzenie
    
    this.deliveryConfirmations.set(confirmationKey, timeout);
  }

  /**
   * Aktualizuje status dostarczenia powiadomienia
   * @param {string} notificationId - ID powiadomienia
   * @param {string} status - Nowy status
   */
  async updateDeliveryStatus(notificationId, status) {
    try {
      await Notification.findByIdAndUpdate(notificationId, {
        deliveryStatus: status,
        deliveryTimestamp: new Date()
      });
    } catch (error) {
      logger.error(`[EnhancedNotificationService] Błąd podczas aktualizacji statusu dostarczenia: ${error.message}`, error);
    }
  }

  /**
   * Sprawdza czy powiadomienie wymaga potwierdzenia dostarczenia
   * @param {string} type - Typ powiadomienia
   * @returns {boolean}
   */
  requiresDeliveryConfirmation(type) {
    const criticalTypes = [
      NotificationType.PAYMENT_COMPLETED,
      NotificationType.PAYMENT_FAILED,
      NotificationType.LISTING_EXPIRED,
      NotificationType.ACCOUNT_ACTIVITY
    ];
    
    return criticalTypes.includes(type);
  }

  /**
   * Sprawdza czy powiadomienie powinno być grupowane
   * @param {string} type - Typ powiadomienia
   * @returns {boolean}
   */
  shouldBatchNotification(type) {
    const batchableTypes = [
      NotificationType.LISTING_VIEWED,
      NotificationType.LISTING_LIKED,
      NotificationType.PROFILE_VIEWED
    ];
    
    return batchableTypes.includes(type);
  }

  /**
   * Generuje hash powiadomienia dla deduplikacji
   * @param {string} userId - ID użytkownika
   * @param {string} type - Typ powiadomienia
   * @param {string} message - Treść powiadomienia
   * @returns {string} - Hash
   */
  generateNotificationHash(userId, type, message) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(`${userId}:${type}:${message}`).digest('hex');
  }

  /**
   * Sprawdza czy powiadomienie jest duplikatem
   * @param {string} hash - Hash powiadomienia
   * @returns {boolean}
   */
  isDuplicate(hash) {
    const now = Date.now();
    const history = this.notificationHistory.get(hash);
    
    if (!history) {
      return false;
    }
    
    // Sprawdź czy duplikat w ciągu ostatnich 5 minut
    return (now - history.timestamp) < 5 * 60 * 1000;
  }

  /**
   * Dodaje powiadomienie do historii
   * @param {string} hash - Hash powiadomienia
   */
  addToHistory(hash) {
    this.notificationHistory.set(hash, {
      timestamp: Date.now()
    });
    
    // Wyczyść starą historię (starszą niż 1 godzina)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [key, value] of this.notificationHistory.entries()) {
      if (value.timestamp < oneHourAgo) {
        this.notificationHistory.delete(key);
      }
    }
  }

  /**
   * Sprawdza czy użytkownik istnieje
   * @param {string} userId - ID użytkownika
   * @returns {Promise<boolean>}
   */
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
      logger.error(`[EnhancedNotificationService] Błąd podczas sprawdzania użytkownika: ${error.message}`, error);
      return true;
    }
  }

  /**
   * Sprawdza czy należy wysłać powiadomienie na podstawie preferencji użytkownika
   * @param {string} userId - ID użytkownika
   * @param {string} type - Typ powiadomienia
   * @returns {boolean}
   */
  shouldSendNotification(userId, type) {
    const preferences = this.userPreferences.get(userId);
    
    if (!preferences) {
      return true; // Domyślnie wysyłaj wszystkie
    }
    
    // Sprawdź globalne ustawienia
    if (preferences.disabled === true) {
      return false;
    }
    
    // Sprawdź ustawienia dla konkretnego typu
    if (preferences.types && preferences.types[type] === false) {
      return false;
    }
    
    // Sprawdź godziny ciszy
    if (preferences.quietHours) {
      const now = new Date();
      const currentHour = now.getHours();
      const { start, end } = preferences.quietHours;
      
      if (start <= end) {
        // Normalne godziny ciszy (np. 22:00 - 08:00)
        if (currentHour >= start && currentHour < end) {
          return false;
        }
      } else {
        // Godziny ciszy przez północ (np. 22:00 - 08:00)
        if (currentHour >= start || currentHour < end) {
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Aktualizuje preferencje użytkownika
   * @param {string} userId - ID użytkownika
   * @param {Object} preferences - Nowe preferencje
   */
  updateUserPreferences(userId, preferences) {
    this.userPreferences.set(userId, preferences);
    logger.debug(`[EnhancedNotificationService] Zaktualizowano preferencje użytkownika ${userId}`);
  }

  /**
   * Określa kategorię powiadomienia
   * @param {string} type - Typ powiadomienia
   * @returns {string} - Kategoria
   */
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

  /**
   * Określa priorytet powiadomienia
   * @param {string} type - Typ powiadomienia
   * @returns {number} - Priorytet (1-10, wyższy = ważniejsze)
   */
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

  /**
   * Dodaje powiadomienie do kolejki offline (ulepszona wersja)
   * @param {string} userId - ID użytkownika
   * @param {Object} notification - Powiadomienie
   */
  addToOfflineQueue(userId, notification) {
    if (!this.offlineQueue.has(userId)) {
      this.offlineQueue.set(userId, []);
    }
    
    const queue = this.offlineQueue.get(userId);
    
    // Dodaj timestamp kolejkowania
    const queuedNotification = {
      ...notification,
      queuedAt: Date.now()
    };
    
    queue.push(queuedNotification);
    
    // Sortuj według priorytetu
    queue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Wyższy priorytet pierwszy
      }
      return a.queuedAt - b.queuedAt; // Starsze pierwsze przy tym samym priorytecie
    });
    
    // Ogranicz rozmiar kolejki do 100 powiadomień na użytkownika
    if (queue.length > 100) {
      queue.splice(100); // Usuń nadmiar
    }
    
    logger.debug(`[EnhancedNotificationService] Dodano powiadomienie do kolejki offline dla użytkownika ${userId}, rozmiar kolejki: ${queue.length}`);
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
      logger.debug(`[EnhancedNotificationService] Usunięto powiadomienie ${notificationId} z kolejki offline użytkownika ${userId}`);
      
      // Usuń całą kolejkę jeśli jest pusta
      if (queue.length === 0) {
        this.offlineQueue.delete(userId);
      }
    }
  }

  /**
   * Wysyła wszystkie powiadomienia z kolejki offline (ulepszona wersja)
   * @param {string} userId - ID użytkownika
   */
  async sendOfflineNotifications(userId) {
    if (!this.offlineQueue.has(userId)) {
      return;
    }
    
    const queue = this.offlineQueue.get(userId);
    logger.info(`[EnhancedNotificationService] Wysyłanie ${queue.length} powiadomień offline dla użytkownika ${userId}`);
    
    // Filtruj stare powiadomienia (starsze niż 24h)
    const maxAge = 24 * 60 * 60 * 1000; // 24 godziny
    const now = Date.now();
    const validNotifications = queue.filter(notification => {
      return (now - notification.queuedAt) <= maxAge;
    });
    
    if (validNotifications.length !== queue.length) {
      logger.info(`[EnhancedNotificationService] Odfiltrowano ${queue.length - validNotifications.length} starych powiadomień`);
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
          if (notification.id && notification.id !== `grouped_${Date.now()}`) {
            await this.updateDeliveryStatus(notification.id, 'sent');
          }
        } catch (error) {
          logger.error(`[EnhancedNotificationService] Błąd podczas wysyłania powiadomienia offline ${notification.id}: ${error.message}`);
        }
      }
      
      // Małe opóźnienie między wsadami
      if (i + batchSize < validNotifications.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Wyczyść kolejkę po wysłaniu
    this.offlineQueue.delete(userId);
    logger.info(`[EnhancedNotificationService] Wysłano wszystkie powiadomienia offline dla użytkownika ${userId}`);
  }

  /**
   * Obsługuje połączenie użytkownika (ulepszona wersja)
   * @param {string} userId - ID użytkownika
   */
  async handleUserOnline(userId) {
    logger.info(`[EnhancedNotificationService] Użytkownik ${userId} połączył się - sprawdzanie powiadomień offline`);
    
    try {
      // Dodaj do aktywnych użytkowników
      this.activeUsers.add(userId);
      
      // Wyślij powiadomienia z kolejki offline
      await this.sendOfflineNotifications(userId);
      
      // Wyczyść licznik prób ponownego wysłania
      this.retryAttempts.delete(userId);
      
      // Wyślij powiadomienie o połączeniu (opcjonalne)
      socketService.sendNotification(userId, {
        type: 'system_status',
        message: 'Połączono z systemem powiadomień',
        timestamp: Date.now()
      });
      
    } catch (error) {
      logger.error(`[EnhancedNotificationService] Błąd podczas obsługi połączenia użytkownika ${userId}: ${error.message}`, error);
    }
  }

  /**
   * Zwraca statystyki serwisu
   * @returns {Object} - Statystyki
   */
  getStats() {
    return {
      activeUsers: this.activeUsers.size,
      offlineQueueSize: Array.from(this.offlineQueue.values()).reduce((total, queue) => total + queue.length, 0),
      batchQueueSize: this.batchQueue.size,
      historySize: this.notificationHistory.size,
      pendingConfirmations: this.deliveryConfirmations.size,
      userPreferences: this.userPreferences.size
    };
  }

  /**
   * Czyści stare dane
   */
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
    
    logger.debug('[EnhancedNotificationService] Wykonano czyszczenie starych danych');
  }
}

// Eksport instancji serwisu jako singleton
const enhancedNotificationService = new EnhancedNotificationService();
export default enhancedNotificationService;
