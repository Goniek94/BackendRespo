import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

/**
 * Klasa SocketService - zarządza połączeniami WebSocket i powiadomieniami w czasie rzeczywistym
 * @class
 */
class SocketService {
  constructor() {
    this.io = null;
    this.userSockets = new Map(); // Mapa przechowująca połączenia użytkowników: userId -> Set of socket.id
    this.socketUsers = new Map(); // Mapa przechowująca użytkowników dla socketów: socket.id -> userId
    this.activeConversations = new Map(); // Mapa aktywnych konwersacji: userId -> Set of conversationId/participantId
    this.conversationNotificationState = new Map(); // Mapa stanu powiadomień dla konwersacji: "userId:participantId" -> lastNotificationTime
    this.heartbeatInterval = null; // Interval dla heartbeat
    this.userLastSeen = new Map(); // Mapa ostatniego widzenia użytkowników: userId -> timestamp
    this.connectionStats = {
      totalConnections: 0,
      totalDisconnections: 0,
      currentConnections: 0,
      startTime: Date.now()
    };
  }

  /**
   * Inicjalizuje serwer Socket.IO
   * @param {Object} server - Serwer HTTP
   * @returns {Object} - Instancja Socket.IO
   */
  initialize(server) {
    if (this.io) {
      logger.info('Socket.IO już zainicjalizowany');
      return this.io;
    }

    this.io = new Server(server, {
      cors: {
        origin: [
          'http://localhost:3000',
          'http://localhost:3001',
          process.env.FRONTEND_URL || 'http://localhost:3000'
        ],
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 60000, // 60 sekund timeout dla ping
    });

    // Middleware do uwierzytelniania połączeń
    this.io.use(this.authMiddleware.bind(this));

    // Obsługa połączeń
    this.io.on('connection', this.handleConnection.bind(this));

    // Uruchom mechanizm heartbeat
    this.startHeartbeat();

    logger.info('Socket.IO initialized successfully');
    return this.io;
  }

  /**
   * Middleware do uwierzytelniania połączeń Socket.IO
   * Obsługuje cookies zamiast localStorage - bezpieczniejsze rozwiązanie
   * @param {Object} socket - Socket klienta
   * @param {Function} next - Funkcja next
   */
  authMiddleware(socket, next) {
    try {
      let token = null;

      // Priorytet 1: Token z cookie (bezpieczne, HttpOnly)
      const cookies = socket.handshake.headers.cookie;
      if (cookies) {
        const cookieArray = cookies.split(';');
        for (let cookie of cookieArray) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'token') {
            token = value;
            break;
          }
        }
      }

      // Priorytet 2: Token z auth object (dla kompatybilności wstecznej)
      if (!token) {
        token = socket.handshake.auth.token;
      }

      // Priorytet 3: Token z Authorization header (fallback)
      if (!token) {
        const authHeader = socket.handshake.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.split(' ')[1];
        }
      }

      if (!token) {
        logger.warn('Socket.IO authentication failed - missing token', {
          ip: socket.handshake.address,
          userAgent: socket.handshake.headers['user-agent']
        });
        return next(new Error('Brak tokenu uwierzytelniającego'));
      }

      // Weryfikacja tokenu JWT
      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
          logger.warn('Socket.IO authentication failed - invalid token', {
            error: err.message,
            ip: socket.handshake.address,
            userAgent: socket.handshake.headers['user-agent']
          });
          return next(new Error('Nieprawidłowy token'));
        }

        // Zapisanie danych użytkownika w obiekcie socket
        // Obsługa różnych formatów payload (userId vs id)
        socket.user = {
          userId: decoded.userId || decoded.id,
          email: decoded.email,
          role: decoded.role
        };

        logger.info('Socket.IO user authenticated', {
          userId: socket.user.userId,
          email: socket.user.email,
          ip: socket.handshake.address
        });
        next();
      });
    } catch (error) {
      logger.error('Socket.IO authentication error', {
        error: error.message,
        stack: error.stack,
        ip: socket.handshake.address
      });
      next(new Error('Błąd uwierzytelniania'));
    }
  }

  /**
   * Obsługa nowego połączenia
   * @param {Object} socket - Socket klienta
   */
  handleConnection(socket) {
    const userId = socket.user?.userId;

    if (!userId) {
      logger.warn('Socket connection without user ID', {
        socketId: socket.id,
        ip: socket.handshake.address
      });
      socket.disconnect();
      return;
    }

    logger.info('New Socket.IO connection', {
      socketId: socket.id,
      userId: userId,
      ip: socket.handshake.address
    });

    // Zapisanie połączenia w mapach
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(socket.id);
    this.socketUsers.set(socket.id, userId);

    // Dołączenie do pokoju specyficznego dla użytkownika
    socket.join(`user:${userId}`);

    // Wysłanie potwierdzenia połączenia
    socket.emit('connection_success', {
      message: 'Połączono z systemem powiadomień',
      userId: userId
    });

    // Obsługa rozłączenia
    socket.on('disconnect', () => {
      logger.info('Socket.IO disconnection', {
        socketId: socket.id,
        userId: userId,
        ip: socket.handshake.address
      });
      
      // Usunięcie połączenia z map
      if (this.userSockets.has(userId)) {
        this.userSockets.get(userId).delete(socket.id);
        if (this.userSockets.get(userId).size === 0) {
          this.userSockets.delete(userId);
        }
      }
      this.socketUsers.delete(socket.id);
    });

    // Obsługa żądania oznaczenia powiadomienia jako przeczytane
    socket.on('mark_notification_read', async (data) => {
      try {
        const { notificationId } = data;
        if (!notificationId) return;

        // Tutaj można dodać kod do oznaczenia powiadomienia jako przeczytane
        // np. wywołanie metody z notificationService
        
        // Emitowanie potwierdzenia
        socket.emit('notification_marked_read', { notificationId });
      } catch (error) {
        logger.error('Error marking notification as read', {
          error: error.message,
          stack: error.stack,
          userId: userId,
          socketId: socket.id
        });
      }
    });

    // Obsługa wejścia do konwersacji
    socket.on('enter_conversation', (data) => {
      try {
        const { participantId, conversationId } = data;
        if (!participantId) return;

        logger.debug('User entered conversation', {
          userId: userId,
          participantId: participantId,
          conversationId: conversationId
        });
        this.setUserInActiveConversation(userId, participantId, conversationId);
      } catch (error) {
        logger.error('Error handling conversation entry', {
          error: error.message,
          stack: error.stack,
          userId: userId,
          socketId: socket.id
        });
      }
    });

    // Obsługa wyjścia z konwersacji
    socket.on('leave_conversation', (data) => {
      try {
        const { participantId, conversationId } = data;
        if (!participantId) return;

        logger.debug('User left conversation', {
          userId: userId,
          participantId: participantId,
          conversationId: conversationId
        });
        this.removeUserFromActiveConversation(userId, participantId, conversationId);
      } catch (error) {
        logger.error('Error handling conversation exit', {
          error: error.message,
          stack: error.stack,
          userId: userId,
          socketId: socket.id
        });
      }
    });
  }

  /**
   * Wysyła powiadomienie do konkretnego użytkownika
   * @param {string} userId - ID użytkownika
   * @param {Object} notification - Obiekt powiadomienia
   */
  sendNotification(userId, notification) {
    if (!this.io) {
      logger.warn('Socket.IO not initialized');
      return;
    }

    try {
      // Wysłanie powiadomienia do wszystkich połączeń użytkownika
      this.io.to(`user:${userId}`).emit('new_notification', notification);
      logger.info('Notification sent to user', {
        userId: userId,
        notificationType: notification.type
      });
    } catch (error) {
      logger.error('Error sending notification to user', {
        error: error.message,
        stack: error.stack,
        userId: userId
      });
    }
  }

  /**
   * Wysyła powiadomienie do wielu użytkowników
   * @param {Array<string>} userIds - Tablica ID użytkowników
   * @param {Object} notification - Obiekt powiadomienia
   */
  sendNotificationToMany(userIds, notification) {
    if (!this.io || !userIds || !Array.isArray(userIds)) {
      return;
    }

    userIds.forEach(userId => {
      this.sendNotification(userId, notification);
    });
  }

  /**
   * Wysyła powiadomienie do wszystkich użytkowników
   * @param {Object} notification - Obiekt powiadomienia
   */
  sendNotificationToAll(notification) {
    if (!this.io) {
      logger.warn('Socket.IO not initialized');
      return;
    }

    try {
      this.io.emit('new_notification', notification);
      logger.info('Notification sent to all users', {
        notificationType: notification.type
      });
    } catch (error) {
      logger.error('Error sending notification to all users', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Sprawdza, czy użytkownik jest online
   * @param {string} userId - ID użytkownika
   * @returns {boolean} - Czy użytkownik jest online
   */
  isUserOnline(userId) {
    return this.userSockets.has(userId) && this.userSockets.get(userId).size > 0;
  }

  /**
   * Zwraca liczbę aktywnych połączeń dla użytkownika
   * @param {string} userId - ID użytkownika
   * @returns {number} - Liczba aktywnych połączeń
   */
  getUserConnectionCount(userId) {
    if (!this.userSockets.has(userId)) {
      return 0;
    }
    return this.userSockets.get(userId).size;
  }

  /**
   * Zwraca liczbę wszystkich aktywnych połączeń
   * @returns {number} - Liczba aktywnych połączeń
   */
  getTotalConnectionCount() {
    return this.socketUsers.size;
  }

  /**
   * Ustawia użytkownika jako aktywnego w konwersacji
   * @param {string} userId - ID użytkownika
   * @param {string} participantId - ID uczestnika konwersacji
   * @param {string} conversationId - ID konwersacji (opcjonalne)
   */
  setUserInActiveConversation(userId, participantId, conversationId = null) {
    if (!this.activeConversations.has(userId)) {
      this.activeConversations.set(userId, new Set());
    }
    
    // Dodaj identyfikator konwersacji (używamy participantId jako główny identyfikator)
    this.activeConversations.get(userId).add(participantId);
    
    logger.debug('User set as active in conversation', {
      userId: userId,
      participantId: participantId,
      conversationId: conversationId
    });
  }

  /**
   * Usuwa użytkownika z aktywnej konwersacji
   * @param {string} userId - ID użytkownika
   * @param {string} participantId - ID uczestnika konwersacji
   * @param {string} conversationId - ID konwersacji (opcjonalne)
   */
  removeUserFromActiveConversation(userId, participantId, conversationId = null) {
    if (this.activeConversations.has(userId)) {
      this.activeConversations.get(userId).delete(participantId);
      
      // Jeśli użytkownik nie ma już aktywnych konwersacji, usuń go z mapy
      if (this.activeConversations.get(userId).size === 0) {
        this.activeConversations.delete(userId);
      }
    }
    
    logger.debug('User removed from active conversation', {
      userId: userId,
      participantId: participantId,
      conversationId: conversationId
    });
  }

  /**
   * Sprawdza, czy użytkownik jest aktywny w konwersacji z danym uczestnikiem
   * @param {string} userId - ID użytkownika
   * @param {string} participantId - ID uczestnika konwersacji
   * @returns {boolean} - Czy użytkownik jest aktywny w konwersacji
   */
  isUserInActiveConversation(userId, participantId) {
    if (!this.activeConversations.has(userId)) {
      return false;
    }
    
    return this.activeConversations.get(userId).has(participantId);
  }

  /**
   * Sprawdza, czy należy wysłać powiadomienie o nowej wiadomości
   * Implementuje logikę "tylko pierwsze powiadomienie w konwersacji"
   * @param {string} userId - ID odbiorcy
   * @param {string} senderId - ID nadawcy
   * @returns {boolean} - Czy wysłać powiadomienie
   */
  shouldSendMessageNotification(userId, senderId) {
    // Jeśli użytkownik jest aktywny w konwersacji z nadawcą, nie wysyłaj powiadomienia
    if (this.isUserInActiveConversation(userId, senderId)) {
      logger.debug('User is active in conversation - skipping notification', {
        userId: userId,
        senderId: senderId
      });
      return false;
    }

    // Sprawdź, czy to pierwsze powiadomienie w tej konwersacji
    const conversationKey = `${userId}:${senderId}`;
    const now = Date.now();
    const lastNotificationTime = this.conversationNotificationState.get(conversationKey);
    
    // Jeśli nie było wcześniejszego powiadomienia lub minęło więcej niż 5 minut, wyślij powiadomienie
    const shouldSend = !lastNotificationTime || (now - lastNotificationTime) > 5 * 60 * 1000; // 5 minut
    
    if (shouldSend) {
      // Zapisz czas wysłania powiadomienia
      this.conversationNotificationState.set(conversationKey, now);
      logger.debug('Sending first notification in conversation', {
        conversationKey: conversationKey
      });
    } else {
      logger.debug('Skipping duplicate notification in conversation', {
        conversationKey: conversationKey,
        timeSinceLastNotification: Math.round((now - lastNotificationTime) / 1000)
      });
    }
    
    return shouldSend;
  }

  /**
   * Resetuje stan powiadomień dla konwersacji (np. gdy użytkownik przeczyta wiadomości)
   * @param {string} userId - ID użytkownika
   * @param {string} participantId - ID uczestnika konwersacji
   */
  resetConversationNotificationState(userId, participantId) {
    const conversationKey = `${userId}:${participantId}`;
    this.conversationNotificationState.delete(conversationKey);
    logger.debug('Conversation notification state reset', {
      conversationKey: conversationKey
    });
  }

  /**
   * Uruchamia mechanizm heartbeat do monitorowania połączeń
   */
  startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      this.performHeartbeat();
    }, 30000); // Co 30 sekund

    logger.info('Heartbeat mechanism started');
  }

  /**
   * Zatrzymuje mechanizm heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      logger.info('Heartbeat mechanism stopped');
    }
  }

  /**
   * Wykonuje heartbeat - sprawdza aktywne połączenia
   */
  performHeartbeat() {
    if (!this.io) return;

    const now = Date.now();
    let activeConnections = 0;
    let staleConnections = 0;

    // Sprawdź wszystkie połączenia
    this.socketUsers.forEach((userId, socketId) => {
      const socket = this.io.sockets.sockets.get(socketId);
      
      if (!socket || !socket.connected) {
        // Połączenie nie istnieje lub jest nieaktywne
        this.cleanupStaleConnection(socketId, userId);
        staleConnections++;
      } else {
        // Aktualizuj ostatnie widzenie użytkownika
        this.userLastSeen.set(userId, now);
        activeConnections++;
        
        // Wyślij ping do klienta
        socket.emit('ping', { timestamp: now });
      }
    });

    // Aktualizuj statystyki
    this.connectionStats.currentConnections = activeConnections;

    if (staleConnections > 0) {
      logger.info(`Heartbeat: Cleaned up ${staleConnections} stale connections, ${activeConnections} active`);
    }

    // Wyczyść stare stany konwersacji (starsze niż 1 godzina)
    this.cleanupOldConversationStates(now);
  }

  /**
   * Czyści nieaktywne połączenie
   * @param {string} socketId - ID socketa
   * @param {string} userId - ID użytkownika
   */
  cleanupStaleConnection(socketId, userId) {
    // Usuń z map
    this.socketUsers.delete(socketId);
    
    if (this.userSockets.has(userId)) {
      this.userSockets.get(userId).delete(socketId);
      if (this.userSockets.get(userId).size === 0) {
        this.userSockets.delete(userId);
      }
    }

    logger.debug('Cleaned up stale connection', {
      socketId: socketId,
      userId: userId
    });
  }

  /**
   * Czyści stare stany konwersacji
   * @param {number} now - Aktualny timestamp
   */
  cleanupOldConversationStates(now) {
    const oneHourAgo = now - (60 * 60 * 1000); // 1 godzina
    let cleanedCount = 0;

    this.conversationNotificationState.forEach((timestamp, key) => {
      if (timestamp < oneHourAgo) {
        this.conversationNotificationState.delete(key);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      logger.debug(`Cleaned up ${cleanedCount} old conversation states`);
    }
  }

  /**
   * Aktualizuje statystyki połączeń
   * @param {string} event - Typ zdarzenia ('connect' lub 'disconnect')
   */
  updateConnectionStats(event) {
    if (event === 'connect') {
      this.connectionStats.totalConnections++;
      this.connectionStats.currentConnections++;
    } else if (event === 'disconnect') {
      this.connectionStats.totalDisconnections++;
      this.connectionStats.currentConnections = Math.max(0, this.connectionStats.currentConnections - 1);
    }
  }

  /**
   * Zwraca statystyki połączeń
   * @returns {Object} - Statystyki połączeń
   */
  getConnectionStats() {
    const uptime = Date.now() - this.connectionStats.startTime;
    
    return {
      ...this.connectionStats,
      uptime: uptime,
      uptimeFormatted: this.formatUptime(uptime),
      onlineUsers: this.userSockets.size,
      activeConversations: this.activeConversations.size,
      conversationStates: this.conversationNotificationState.size
    };
  }

  /**
   * Formatuje czas działania
   * @param {number} uptime - Czas w milisekundach
   * @returns {string} - Sformatowany czas
   */
  formatUptime(uptime) {
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Zwraca listę online użytkowników
   * @returns {Array} - Lista ID użytkowników online
   */
  getOnlineUsers() {
    return Array.from(this.userSockets.keys());
  }

  /**
   * Sprawdza ostatnie widzenie użytkownika
   * @param {string} userId - ID użytkownika
   * @returns {number|null} - Timestamp ostatniego widzenia lub null
   */
  getUserLastSeen(userId) {
    return this.userLastSeen.get(userId) || null;
  }

  /**
   * Wysyła wiadomość do konkretnego socketa
   * @param {string} socketId - ID socketa
   * @param {string} event - Nazwa zdarzenia
   * @param {Object} data - Dane do wysłania
   */
  sendToSocket(socketId, event, data) {
    if (!this.io) return;

    const socket = this.io.sockets.sockets.get(socketId);
    if (socket && socket.connected) {
      socket.emit(event, data);
    }
  }

  /**
   * Rozłącza wszystkich użytkowników (np. podczas zamykania serwera)
   */
  disconnectAll() {
    if (!this.io) return;

    logger.info('Disconnecting all Socket.IO connections');
    
    this.io.sockets.sockets.forEach(socket => {
      socket.emit('server_shutdown', { 
        message: 'Serwer jest restartowany. Połączenie zostanie przywrócone automatycznie.' 
      });
      socket.disconnect(true);
    });

    // Wyczyść wszystkie mapy
    this.userSockets.clear();
    this.socketUsers.clear();
    this.activeConversations.clear();
    this.conversationNotificationState.clear();
    this.userLastSeen.clear();

    // Zatrzymaj heartbeat
    this.stopHeartbeat();
  }

  /**
   * Zamyka serwis Socket.IO
   */
  shutdown() {
    logger.info('Shutting down Socket.IO service');
    
    this.disconnectAll();
    
    if (this.io) {
      this.io.close();
      this.io = null;
    }
  }
}

// Eksport instancji serwisu jako singleton
const socketService = new SocketService();
export default socketService;
