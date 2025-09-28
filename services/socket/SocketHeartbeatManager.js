import logger from "../../utils/logger.js";

/**
 * Klasa SocketHeartbeatManager - zarządza heartbeat i monitorowaniem połączeń
 */
class SocketHeartbeatManager {
  constructor(io, connectionManager, conversationManager) {
    this.io = io;
    this.connectionManager = connectionManager;
    this.conversationManager = conversationManager;
    this.heartbeatInterval = null;
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

    logger.info("Heartbeat mechanism started");
  }

  /**
   * Zatrzymuje mechanizm heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      logger.info("Heartbeat mechanism stopped");
    }
  }

  /**
   * Wykonuje heartbeat - sprawdza aktywne połączenia
   * UWAGA: Usunięto custom ping - Socket.IO ma własne ping/pong z connectionStateRecovery
   */
  performHeartbeat() {
    if (!this.io) return;

    const now = Date.now();
    let activeConnections = 0;
    let staleConnections = 0;

    // Sprawdź wszystkie połączenia
    this.connectionManager.socketUsers.forEach((userId, socketId) => {
      const socket = this.io.sockets.sockets.get(socketId);

      if (!socket || !socket.connected) {
        // Połączenie nie istnieje lub jest nieaktywne
        this.connectionManager.cleanupStaleConnection(socketId, userId);
        staleConnections++;
      } else {
        // Aktualizuj ostatnie widzenie użytkownika
        this.connectionManager.updateUserLastSeen(userId, now);
        activeConnections++;

        // USUNIĘTO: Custom ping - Socket.IO obsługuje to automatycznie
        // socket.emit("ping", { timestamp: now });
      }
    });

    // Aktualizuj statystyki
    this.connectionManager.connectionStats.currentConnections =
      activeConnections;

    if (staleConnections > 0) {
      logger.info(
        `Heartbeat: Cleaned up ${staleConnections} stale connections, ${activeConnections} active`
      );
    }

    // Wyczyść stare stany konwersacji (starsze niż 1 godzina)
    this.conversationManager.cleanupOldConversationStates(now);
  }

  /**
   * Zwraca status heartbeat
   * @returns {Object} - Status heartbeat
   */
  getHeartbeatStatus() {
    return {
      isRunning: this.heartbeatInterval !== null,
      interval: 30000, // 30 sekund
      lastCheck: Date.now(),
    };
  }
}

export default SocketHeartbeatManager;
