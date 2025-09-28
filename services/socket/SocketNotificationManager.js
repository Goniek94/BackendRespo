import logger from "../../utils/logger.js";

/**
 * Klasa SocketNotificationManager - zarządza powiadomieniami Socket.IO
 */
class SocketNotificationManager {
  constructor(io, connectionManager) {
    this.io = io;
    this.connectionManager = connectionManager;
  }

  /**
   * Wysyła powiadomienie do konkretnego użytkownika
   * @param {string} userId - ID użytkownika
   * @param {Object} notification - Obiekt powiadomienia
   */
  sendNotification(userId, notification) {
    if (!this.io) {
      logger.warn("Socket.IO not initialized");
      return;
    }

    try {
      // Wysłanie powiadomienia do wszystkich połączeń użytkownika
      this.io.to(`user:${userId}`).emit("new_notification", notification);
      logger.info("Notification sent to user", {
        userId: userId,
        notificationType: notification.type,
      });
    } catch (error) {
      logger.error("Error sending notification to user", {
        error: error.message,
        stack: error.stack,
        userId: userId,
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

    userIds.forEach((userId) => {
      this.sendNotification(userId, notification);
    });
  }

  /**
   * Wysyła powiadomienie do wszystkich użytkowników
   * @param {Object} notification - Obiekt powiadomienia
   */
  sendNotificationToAll(notification) {
    if (!this.io) {
      logger.warn("Socket.IO not initialized");
      return;
    }

    try {
      this.io.emit("new_notification", notification);
      logger.info("Notification sent to all users", {
        notificationType: notification.type,
      });
    } catch (error) {
      logger.error("Error sending notification to all users", {
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * Obsługuje oznaczenie powiadomienia jako przeczytane
   * @param {Object} socket - Socket klienta
   * @param {Object} data - Dane powiadomienia
   */
  async handleMarkNotificationRead(socket, data) {
    try {
      const { notificationId } = data;
      const userId = socket.user?.userId;

      if (!notificationId || !userId) return;

      // Tutaj można dodać kod do oznaczenia powiadomienia jako przeczytane
      // np. wywołanie metody z notificationService

      // Emitowanie potwierdzenia
      socket.emit("notification_marked_read", { notificationId });

      logger.debug("Notification marked as read", {
        userId: userId,
        notificationId: notificationId,
      });
    } catch (error) {
      logger.error("Error marking notification as read", {
        error: error.message,
        stack: error.stack,
        userId: socket.user?.userId,
        socketId: socket.id,
      });
    }
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
   * Sprawdza, czy użytkownik jest online (deleguje do ConnectionManager)
   * @param {string} userId - ID użytkownika
   * @returns {boolean} - Czy użytkownik jest online
   */
  isUserOnline(userId) {
    return this.connectionManager.isUserOnline(userId);
  }

  /**
   * Zwraca liczbę aktywnych połączeń dla użytkownika (deleguje do ConnectionManager)
   * @param {string} userId - ID użytkownika
   * @returns {number} - Liczba aktywnych połączeń
   */
  getUserConnectionCount(userId) {
    return this.connectionManager.getUserConnectionCount(userId);
  }

  /**
   * Zwraca listę online użytkowników (deleguje do ConnectionManager)
   * @returns {Array} - Lista ID użytkowników online
   */
  getOnlineUsers() {
    return this.connectionManager.getOnlineUsers();
  }
}

export default SocketNotificationManager;
