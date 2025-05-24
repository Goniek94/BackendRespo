/**
 * Przykładowy kod klienta do obsługi powiadomień w czasie rzeczywistym
 * Ten plik pokazuje, jak zintegrować Socket.IO z frontendem
 */

import { io } from 'socket.io-client';

/**
 * Klasa NotificationClient - zarządza połączeniem WebSocket i obsługą powiadomień
 */
class NotificationClient {
  /**
   * Konstruktor
   * @param {string} serverUrl - URL serwera Socket.IO
   * @param {Object} options - Opcje konfiguracyjne
   */
  constructor(serverUrl, options = {}) {
    this.serverUrl = serverUrl || 'http://localhost:5000';
    this.options = {
      autoReconnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
      notificationSound: true,
      ...options
    };
    
    this.socket = null;
    this.token = null;
    this.connected = false;
    this.notifications = [];
    this.unreadCount = 0;
    
    // Callbacki dla zdarzeń
    this.onConnectCallback = null;
    this.onDisconnectCallback = null;
    this.onNotificationCallback = null;
    this.onErrorCallback = null;
    this.onStatusChangeCallback = null;
  }
  
  /**
   * Inicjalizuje połączenie Socket.IO
   * @param {string} token - Token JWT do uwierzytelnienia
   * @returns {Promise} - Promise rozwiązywane po nawiązaniu połączenia
   */
  connect(token) {
    return new Promise((resolve, reject) => {
      if (!token) {
        reject(new Error('Brak tokenu uwierzytelniającego'));
        return;
      }
      
      this.token = token;
      
      // Inicjalizacja Socket.IO
      this.socket = io(this.serverUrl, {
        auth: { token },
        reconnection: this.options.autoReconnect,
        reconnectionAttempts: this.options.reconnectionAttempts,
        reconnectionDelay: this.options.reconnectionDelay
      });
      
      // Obsługa zdarzeń Socket.IO
      this.socket.on('connect', () => {
        console.log('Połączono z serwerem powiadomień');
        this.connected = true;
        
        if (this.onConnectCallback) {
          this.onConnectCallback();
        }
        
        if (this.onStatusChangeCallback) {
          this.onStatusChangeCallback(true);
        }
        
        resolve();
      });
      
      this.socket.on('disconnect', () => {
        console.log('Rozłączono z serwerem powiadomień');
        this.connected = false;
        
        if (this.onDisconnectCallback) {
          this.onDisconnectCallback();
        }
        
        if (this.onStatusChangeCallback) {
          this.onStatusChangeCallback(false);
        }
      });
      
      this.socket.on('connect_error', (error) => {
        console.error('Błąd połączenia z serwerem powiadomień:', error);
        
        if (this.onErrorCallback) {
          this.onErrorCallback(error);
        }
        
        reject(error);
      });
      
      // Obsługa powiadomień
      this.socket.on('new_notification', (notification) => {
        console.log('Otrzymano nowe powiadomienie:', notification);
        
        // Dodanie powiadomienia do listy
        this.notifications.unshift(notification);
        
        // Aktualizacja licznika nieprzeczytanych
        if (!notification.isRead) {
          this.unreadCount++;
        }
        
        // Odtworzenie dźwięku powiadomienia
        if (this.options.notificationSound) {
          this.playNotificationSound();
        }
        
        // Wywołanie callbacka
        if (this.onNotificationCallback) {
          this.onNotificationCallback(notification);
        }
      });
      
      // Obsługa aktualizacji powiadomień
      this.socket.on('notification_updated', (data) => {
        const { notificationId, isRead } = data;
        
        // Aktualizacja statusu powiadomienia
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
          notification.isRead = isRead;
          
          // Aktualizacja licznika nieprzeczytanych
          if (isRead && !notification.isRead) {
            this.unreadCount = Math.max(0, this.unreadCount - 1);
          }
        }
      });
      
      // Obsługa oznaczenia wszystkich powiadomień jako przeczytane
      this.socket.on('all_notifications_read', () => {
        // Oznaczenie wszystkich powiadomień jako przeczytane
        this.notifications.forEach(notification => {
          notification.isRead = true;
        });
        
        // Wyzerowanie licznika nieprzeczytanych
        this.unreadCount = 0;
      });
      
      // Obsługa usunięcia powiadomienia
      this.socket.on('notification_deleted', (data) => {
        const { notificationId } = data;
        
        // Usunięcie powiadomienia z listy
        const index = this.notifications.findIndex(n => n.id === notificationId);
        if (index !== -1) {
          const notification = this.notifications[index];
          
          // Aktualizacja licznika nieprzeczytanych
          if (!notification.isRead) {
            this.unreadCount = Math.max(0, this.unreadCount - 1);
          }
          
          // Usunięcie powiadomienia z listy
          this.notifications.splice(index, 1);
        }
      });
      
      // Obsługa potwierdzenia połączenia
      this.socket.on('connection_success', (data) => {
        console.log('Potwierdzenie połączenia:', data);
      });
    });
  }
  
  /**
   * Rozłącza połączenie Socket.IO
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }
  
  /**
   * Oznacza powiadomienie jako przeczytane
   * @param {string} notificationId - ID powiadomienia
   */
  markAsRead(notificationId) {
    if (!this.socket || !this.connected) {
      console.warn('Brak połączenia z serwerem powiadomień');
      return;
    }
    
    this.socket.emit('mark_notification_read', { notificationId });
  }
  
  /**
   * Odtwarza dźwięk powiadomienia
   */
  playNotificationSound() {
    try {
      // Można zaimplementować odtwarzanie dźwięku
      // np. za pomocą Web Audio API lub HTML5 Audio
      const audio = new Audio('/notification-sound.mp3');
      audio.play().catch(e => console.log('Nie można odtworzyć dźwięku powiadomienia:', e));
    } catch (error) {
      console.error('Błąd podczas odtwarzania dźwięku powiadomienia:', error);
    }
  }
  
  /**
   * Ustawia callback dla zdarzenia połączenia
   * @param {Function} callback - Funkcja wywoływana po nawiązaniu połączenia
   */
  onConnect(callback) {
    this.onConnectCallback = callback;
  }
  
  /**
   * Ustawia callback dla zdarzenia rozłączenia
   * @param {Function} callback - Funkcja wywoływana po rozłączeniu
   */
  onDisconnect(callback) {
    this.onDisconnectCallback = callback;
  }
  
  /**
   * Ustawia callback dla zdarzenia otrzymania powiadomienia
   * @param {Function} callback - Funkcja wywoływana po otrzymaniu powiadomienia
   */
  onNotification(callback) {
    this.onNotificationCallback = callback;
  }
  
  /**
   * Ustawia callback dla zdarzenia błędu
   * @param {Function} callback - Funkcja wywoływana po wystąpieniu błędu
   */
  onError(callback) {
    this.onErrorCallback = callback;
  }
  
  /**
   * Ustawia callback dla zdarzenia zmiany statusu połączenia
   * @param {Function} callback - Funkcja wywoływana po zmianie statusu połączenia
   */
  onStatusChange(callback) {
    this.onStatusChangeCallback = callback;
  }
  
  /**
   * Zwraca liczbę nieprzeczytanych powiadomień
   * @returns {number} - Liczba nieprzeczytanych powiadomień
   */
  getUnreadCount() {
    return this.unreadCount;
  }
  
  /**
   * Zwraca listę powiadomień
   * @returns {Array} - Lista powiadomień
   */
  getNotifications() {
    return this.notifications;
  }
  
  /**
   * Sprawdza, czy klient jest połączony z serwerem
   * @returns {boolean} - Czy klient jest połączony
   */
  isConnected() {
    return this.connected;
  }
}

export default NotificationClient;

/**
 * Przykład użycia:
 * 
 * import NotificationClient from './notificationClient';
 * 
 * // Inicjalizacja klienta
 * const notificationClient = new NotificationClient('http://localhost:5000', {
 *   notificationSound: true
 * });
 * 
 * // Obsługa zdarzeń
 * notificationClient.onConnect(() => {
 *   console.log('Połączono z serwerem powiadomień');
 * });
 * 
 * notificationClient.onNotification((notification) => {
 *   console.log('Otrzymano nowe powiadomienie:', notification);
 *   
 *   // Tutaj można zaktualizować UI, np. pokazać toast
 *   showToast({
 *     title: 'Nowe powiadomienie',
 *     message: notification.message,
 *     type: notification.type
 *   });
 * });
 * 
 * // Połączenie z serwerem
 * const token = localStorage.getItem('authToken');
 * notificationClient.connect(token)
 *   .then(() => {
 *     console.log('Połączono z serwerem powiadomień');
 *   })
 *   .catch((error) => {
 *     console.error('Błąd połączenia z serwerem powiadomień:', error);
 *   });
 * 
 * // Oznaczanie powiadomienia jako przeczytane
 * function handleNotificationClick(notificationId) {
 *   notificationClient.markAsRead(notificationId);
 * }
 * 
 * // Rozłączenie przy zamknięciu aplikacji
 * window.addEventListener('beforeunload', () => {
 *   notificationClient.disconnect();
 * });
 */
