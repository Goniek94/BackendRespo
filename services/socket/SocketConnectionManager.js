import logger from "../../utils/logger.js";
import SocketAuth from "./SocketAuth.js";

/**
 * Klasa SocketConnectionManager - zarządza połączeniami użytkowników
 */
class SocketConnectionManager {
  constructor() {
    this.userSockets = new Map(); // userId -> Set of socket.id
    this.socketUsers = new Map(); // socket.id -> userId
    this.userLastSeen = new Map(); // userId -> timestamp
    this.maxConnectionsPerUser = 10; // Maksymalna liczba połączeń na użytkownika
    this.connectionStats = {
      totalConnections: 0,
      totalDisconnections: 0,
      currentConnections: 0,
      startTime: Date.now(),
    };
  }

  /**
   * Waliduje i sanityzuje payload eventów
   * @param {any} data - Dane do walidacji
   * @returns {boolean} - Czy dane są bezpieczne
   */
  validateEventPayload(data) {
    if (!data || typeof data !== "object") return false;

    // Sprawdź rozmiar payloadu (max 10KB)
    const jsonString = JSON.stringify(data);
    if (jsonString.length > 10240) return false;

    // Sprawdź głębokość zagnieżdżenia (max 5 poziomów)
    const checkDepth = (obj, depth = 0) => {
      if (depth > 5) return false;
      if (typeof obj !== "object" || obj === null) return true;

      for (const key in obj) {
        if (typeof key !== "string" || key.length > 100) return false;
        if (!checkDepth(obj[key], depth + 1)) return false;
      }
      return true;
    };

    return checkDepth(data);
  }

  /**
   * Ogranicza liczbę połączeń na użytkownika
   * @param {string} userId - ID użytkownika
   * @param {Object} io - Instancja Socket.IO
   */
  limitUserConnections(userId, io) {
    if (!this.userSockets.has(userId)) return;

    const userConnections = this.userSockets.get(userId);
    if (userConnections.size > this.maxConnectionsPerUser) {
      // Usuń najstarsze połączenia (pierwsze w Set)
      const connectionsToRemove =
        userConnections.size - this.maxConnectionsPerUser;
      const connectionsArray = Array.from(userConnections);

      for (let i = 0; i < connectionsToRemove; i++) {
        const oldSocketId = connectionsArray[i];
        const oldSocket = io.sockets.sockets.get(oldSocketId);

        if (oldSocket) {
          logger.info("Disconnecting old connection due to limit", {
            userId,
            oldSocketId,
            newLimit: this.maxConnectionsPerUser,
          });
          oldSocket.emit("connection_limit_exceeded", {
            message:
              "Przekroczono limit połączeń. Najstarsze połączenie zostało zamknięte.",
          });
          oldSocket.disconnect(true);
        }

        // Cleanup będzie obsłużony przez event 'disconnect'
      }
    }
  }

  /**
   * Dodaje nowe połączenie
   * @param {Object} socket - Socket klienta
   * @param {Object} io - Instancja Socket.IO
   */
  addConnection(socket, io) {
    const userId = socket.user?.userId;

    if (!userId) {
      logger.warn("Socket connection without user ID", {
        socketId: socket.id,
        ip: socket.handshake.address,
      });
      socket.disconnect();
      return false;
    }

    // Aktualizuj statystyki połączeń
    this.updateConnectionStats("connect");

    logger.info("New Socket.IO connection", {
      socketId: socket.id,
      userId: userId,
      email: SocketAuth.maskEmail(socket.user?.email),
      ip: socket.handshake.address,
    });

    // Zapisanie połączenia w mapach
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(socket.id);
    this.socketUsers.set(socket.id, userId);

    // Ograniczenie liczby połączeń na użytkownika
    this.limitUserConnections(userId, io);

    // Dołączenie do pokoju specyficznego dla użytkownika
    socket.join(`user:${userId}`);

    // Logowanie połączenia bez wysyłania powiadomienia
    logger.info("[NotificationManager] Użytkownik " + userId + " połączył się");

    return true;
  }

  /**
   * Usuwa połączenie
   * @param {Object} socket - Socket klienta
   */
  removeConnection(socket) {
    const userId = socket.user?.userId;

    if (!userId) return;

    // Aktualizuj statystyki połączeń
    this.updateConnectionStats("disconnect");

    logger.info("Socket.IO disconnection", {
      socketId: socket.id,
      userId: userId,
      email: SocketAuth.maskEmail(socket.user?.email),
      ip: socket.handshake.address,
    });

    // Usunięcie połączenia z map
    if (this.userSockets.has(userId)) {
      this.userSockets.get(userId).delete(socket.id);
      if (this.userSockets.get(userId).size === 0) {
        this.userSockets.delete(userId);
      }
    }
    this.socketUsers.delete(socket.id);
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

    logger.debug("Cleaned up stale connection", {
      socketId: socketId,
      userId: userId,
    });
  }

  /**
   * Sprawdza, czy użytkownik jest online
   * @param {string} userId - ID użytkownika
   * @returns {boolean} - Czy użytkownik jest online
   */
  isUserOnline(userId) {
    return (
      this.userSockets.has(userId) && this.userSockets.get(userId).size > 0
    );
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
   * Aktualizuje ostatnie widzenie użytkownika
   * @param {string} userId - ID użytkownika
   * @param {number} timestamp - Timestamp
   */
  updateUserLastSeen(userId, timestamp) {
    this.userLastSeen.set(userId, timestamp);
  }

  /**
   * Aktualizuje statystyki połączeń
   * @param {string} event - Typ zdarzenia ('connect' lub 'disconnect')
   */
  updateConnectionStats(event) {
    if (event === "connect") {
      this.connectionStats.totalConnections++;
      this.connectionStats.currentConnections++;
    } else if (event === "disconnect") {
      this.connectionStats.totalDisconnections++;
      this.connectionStats.currentConnections = Math.max(
        0,
        this.connectionStats.currentConnections - 1
      );
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
   * Rozłącza wszystkich użytkowników
   * @param {Object} io - Instancja Socket.IO
   */
  disconnectAll(io) {
    if (!io) return;

    logger.info("Disconnecting all Socket.IO connections");

    io.sockets.sockets.forEach((socket) => {
      socket.emit("server_shutdown", {
        message:
          "Serwer jest restartowany. Połączenie zostanie przywrócone automatycznie.",
      });
      socket.disconnect(true);
    });

    // Wyczyść wszystkie mapy
    this.userSockets.clear();
    this.socketUsers.clear();
    this.userLastSeen.clear();
  }
}

export default SocketConnectionManager;
