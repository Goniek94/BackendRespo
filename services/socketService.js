import { Server } from "socket.io";
import logger from "../utils/logger.js";
import config from "../config/index.js";

// Import modularnych komponentów
import SocketAuth from "./socket/SocketAuth.js";
import SocketConnectionManager from "./socket/SocketConnectionManager.js";
import SocketConversationManager from "./socket/SocketConversationManager.js";
import SocketNotificationManager from "./socket/SocketNotificationManager.js";
import SocketHeartbeatManager from "./socket/SocketHeartbeatManager.js";

/**
 * Klasa SocketService - główny serwis zarządzający Socket.IO
 * Zrefaktoryzowany na modularne komponenty dla lepszej czytelności i utrzymania
 * @class
 */
class SocketService {
  constructor() {
    this.io = null;

    // Inicjalizacja menedżerów
    this.connectionManager = new SocketConnectionManager();
    this.conversationManager = new SocketConversationManager();
    this.notificationManager = null; // Inicjalizowany po utworzeniu io
    this.heartbeatManager = null; // Inicjalizowany po utworzeniu io
  }

  /**
   * Inicjalizuje serwer Socket.IO
   * @param {Object} server - Serwer HTTP
   * @returns {Object} - Instancja Socket.IO
   */
  initialize(server) {
    if (this.io) {
      logger.info("Socket.IO już zainicjalizowany");
      return this.io;
    }

    this.io = new Server(server, {
      cors: {
        origin: config.security?.cors?.origin || [
          "http://localhost:3000",
          "http://localhost:3001",
        ],
        methods: ["GET", "POST"],
        credentials: true,
      },
      pingTimeout: 60000, // 60 sekund timeout dla ping
      connectionStateRecovery: {
        // Włącz connection state recovery zamiast custom heartbeat
        maxDisconnectionDuration: 2 * 60 * 1000, // 2 minuty
        skipMiddlewares: true,
      },
    });

    // Inicjalizacja menedżerów z referencją do io
    this.notificationManager = new SocketNotificationManager(
      this.io,
      this.connectionManager
    );
    this.heartbeatManager = new SocketHeartbeatManager(
      this.io,
      this.connectionManager,
      this.conversationManager
    );

    // Middleware do uwierzytelniania połączeń
    this.io.use(SocketAuth.authMiddleware);

    // Obsługa połączeń
    this.io.on("connection", this.handleConnection.bind(this));

    // Uruchom mechanizm heartbeat
    this.heartbeatManager.startHeartbeat();

    logger.info("Socket.IO initialized successfully");
    return this.io;
  }

  /**
   * Obsługa nowego połączenia
   * @param {Object} socket - Socket klienta
   */
  handleConnection(socket) {
    // Dodaj połączenie przez ConnectionManager
    const connectionAdded = this.connectionManager.addConnection(
      socket,
      this.io
    );

    if (!connectionAdded) {
      return; // Połączenie zostało odrzucone
    }

    // Obsługa rozłączenia
    socket.on("disconnect", () => {
      this.connectionManager.removeConnection(socket);
    });

    // Obsługa żądania oznaczenia powiadomienia jako przeczytane
    socket.on("mark_notification_read", async (data) => {
      // Walidacja payloadu
      if (!this.connectionManager.validateEventPayload(data)) {
        logger.warn("Invalid payload for mark_notification_read", {
          userId: socket.user?.userId,
          socketId: socket.id,
        });
        return;
      }

      await this.notificationManager.handleMarkNotificationRead(socket, data);
    });

    // Obsługa wejścia do konwersacji
    socket.on("enter_conversation", (data) => {
      // Walidacja payloadu
      if (!this.connectionManager.validateEventPayload(data)) {
        logger.warn("Invalid payload for enter_conversation", {
          userId: socket.user?.userId,
          socketId: socket.id,
        });
        return;
      }

      this.conversationManager.handleEnterConversation(socket, data);
    });

    // Obsługa wyjścia z konwersacji
    socket.on("leave_conversation", (data) => {
      // Walidacja payloadu
      if (!this.connectionManager.validateEventPayload(data)) {
        logger.warn("Invalid payload for leave_conversation", {
          userId: socket.user?.userId,
          socketId: socket.id,
        });
        return;
      }

      this.conversationManager.handleLeaveConversation(socket, data);
    });
  }

  // ========== DELEGACJA METOD DO MENEDŻERÓW ==========

  /**
   * Wysyła powiadomienie do konkretnego użytkownika
   * @param {string} userId - ID użytkownika
   * @param {Object} notification - Obiekt powiadomienia
   */
  sendNotification(userId, notification) {
    return this.notificationManager?.sendNotification(userId, notification);
  }

  /**
   * Wysyła powiadomienie do wielu użytkowników
   * @param {Array<string>} userIds - Tablica ID użytkowników
   * @param {Object} notification - Obiekt powiadomienia
   */
  sendNotificationToMany(userIds, notification) {
    return this.notificationManager?.sendNotificationToMany(
      userIds,
      notification
    );
  }

  /**
   * Wysyła powiadomienie do wszystkich użytkowników
   * @param {Object} notification - Obiekt powiadomienia
   */
  sendNotificationToAll(notification) {
    return this.notificationManager?.sendNotificationToAll(notification);
  }

  /**
   * Sprawdza, czy użytkownik jest online
   * @param {string} userId - ID użytkownika
   * @returns {boolean} - Czy użytkownik jest online
   */
  isUserOnline(userId) {
    return this.connectionManager.isUserOnline(userId);
  }

  /**
   * Zwraca liczbę aktywnych połączeń dla użytkownika
   * @param {string} userId - ID użytkownika
   * @returns {number} - Liczba aktywnych połączeń
   */
  getUserConnectionCount(userId) {
    return this.connectionManager.getUserConnectionCount(userId);
  }

  /**
   * Zwraca liczbę wszystkich aktywnych połączeń
   * @returns {number} - Liczba aktywnych połączeń
   */
  getTotalConnectionCount() {
    return this.connectionManager.getTotalConnectionCount();
  }

  /**
   * Ustawia użytkownika jako aktywnego w konwersacji
   * @param {string} userId - ID użytkownika
   * @param {string} participantId - ID uczestnika konwersacji
   * @param {string} conversationId - ID konwersacji (opcjonalne)
   */
  setUserInActiveConversation(userId, participantId, conversationId = null) {
    return this.conversationManager.setUserInActiveConversation(
      userId,
      participantId,
      conversationId
    );
  }

  /**
   * Usuwa użytkownika z aktywnej konwersacji
   * @param {string} userId - ID użytkownika
   * @param {string} participantId - ID uczestnika konwersacji
   * @param {string} conversationId - ID konwersacji (opcjonalne)
   */
  removeUserFromActiveConversation(
    userId,
    participantId,
    conversationId = null
  ) {
    return this.conversationManager.removeUserFromActiveConversation(
      userId,
      participantId,
      conversationId
    );
  }

  /**
   * Sprawdza, czy użytkownik jest aktywny w konwersacji z danym uczestnikiem
   * @param {string} userId - ID użytkownika
   * @param {string} participantId - ID uczestnika konwersacji
   * @returns {boolean} - Czy użytkownik jest aktywny w konwersacji
   */
  isUserInActiveConversation(userId, participantId) {
    return this.conversationManager.isUserInActiveConversation(
      userId,
      participantId
    );
  }

  /**
   * Sprawdza, czy należy wysłać powiadomienie o nowej wiadomości
   * @param {string} userId - ID odbiorcy
   * @param {string} senderId - ID nadawcy
   * @returns {boolean} - Czy wysłać powiadomienie
   */
  shouldSendMessageNotification(userId, senderId) {
    return this.conversationManager.shouldSendMessageNotification(
      userId,
      senderId
    );
  }

  /**
   * Resetuje stan powiadomień dla konwersacji
   * @param {string} userId - ID użytkownika
   * @param {string} participantId - ID uczestnika konwersacji
   */
  resetConversationNotificationState(userId, participantId) {
    return this.conversationManager.resetConversationNotificationState(
      userId,
      participantId
    );
  }

  /**
   * Zwraca statystyki połączeń
   * @returns {Object} - Statystyki połączeń
   */
  getConnectionStats() {
    const connectionStats = this.connectionManager.getConnectionStats();
    const conversationStats = this.conversationManager.getConversationStats();
    const heartbeatStatus = this.heartbeatManager?.getHeartbeatStatus();

    return {
      ...connectionStats,
      ...conversationStats,
      heartbeat: heartbeatStatus,
    };
  }

  /**
   * Zwraca listę online użytkowników
   * @returns {Array} - Lista ID użytkowników online
   */
  getOnlineUsers() {
    return this.connectionManager.getOnlineUsers();
  }

  /**
   * Sprawdza ostatnie widzenie użytkownika
   * @param {string} userId - ID użytkownika
   * @returns {number|null} - Timestamp ostatniego widzenia lub null
   */
  getUserLastSeen(userId) {
    return this.connectionManager.getUserLastSeen(userId);
  }

  /**
   * Wysyła wiadomość do konkretnego socketa
   * @param {string} socketId - ID socketa
   * @param {string} event - Nazwa zdarzenia
   * @param {Object} data - Dane do wysłania
   */
  sendToSocket(socketId, event, data) {
    return this.notificationManager?.sendToSocket(socketId, event, data);
  }

  /**
   * Rozłącza wszystkich użytkowników (np. podczas zamykania serwera)
   */
  disconnectAll() {
    if (!this.io) return;

    this.connectionManager.disconnectAll(this.io);
    this.conversationManager.clear();

    // Zatrzymaj heartbeat
    this.heartbeatManager?.stopHeartbeat();
  }

  /**
   * Zamyka serwis Socket.IO
   */
  shutdown() {
    logger.info("Shutting down Socket.IO service");

    this.disconnectAll();

    if (this.io) {
      this.io.close();
      this.io = null;
    }

    // Reset menedżerów
    this.notificationManager = null;
    this.heartbeatManager = null;
  }
}

// Eksport instancji serwisu jako singleton
const socketService = new SocketService();
export default socketService;
