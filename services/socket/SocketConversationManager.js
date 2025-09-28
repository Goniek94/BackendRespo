import logger from "../../utils/logger.js";

/**
 * Klasa SocketConversationManager - zarządza aktywnymi konwersacjami
 */
class SocketConversationManager {
  constructor() {
    this.activeConversations = new Map(); // userId -> Set of conversationId/participantId
    this.conversationNotificationState = new Map(); // "userId:participantId" -> lastNotificationTime
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

    logger.debug("User set as active in conversation", {
      userId: userId,
      participantId: participantId,
      conversationId: conversationId,
    });
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
    if (this.activeConversations.has(userId)) {
      this.activeConversations.get(userId).delete(participantId);

      // Jeśli użytkownik nie ma już aktywnych konwersacji, usuń go z mapy
      if (this.activeConversations.get(userId).size === 0) {
        this.activeConversations.delete(userId);
      }
    }

    logger.debug("User removed from active conversation", {
      userId: userId,
      participantId: participantId,
      conversationId: conversationId,
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
      logger.debug("User is active in conversation - skipping notification", {
        userId: userId,
        senderId: senderId,
      });
      return false;
    }

    // Sprawdź, czy to pierwsze powiadomienie w tej konwersacji
    const conversationKey = `${userId}:${senderId}`;
    const now = Date.now();
    const lastNotificationTime =
      this.conversationNotificationState.get(conversationKey);

    // Jeśli nie było wcześniejszego powiadomienia lub minęło więcej niż 5 minut, wyślij powiadomienie
    const shouldSend =
      !lastNotificationTime || now - lastNotificationTime > 5 * 60 * 1000; // 5 minut

    if (shouldSend) {
      // Zapisz czas wysłania powiadomienia
      this.conversationNotificationState.set(conversationKey, now);
      logger.debug("Sending first notification in conversation", {
        conversationKey: conversationKey,
      });
    } else {
      logger.debug("Skipping duplicate notification in conversation", {
        conversationKey: conversationKey,
        timeSinceLastNotification: Math.round(
          (now - lastNotificationTime) / 1000
        ),
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
    logger.debug("Conversation notification state reset", {
      conversationKey: conversationKey,
    });
  }

  /**
   * Czyści stare stany konwersacji
   * @param {number} now - Aktualny timestamp
   */
  cleanupOldConversationStates(now) {
    const oneHourAgo = now - 60 * 60 * 1000; // 1 godzina
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
   * Obsługuje wejście użytkownika do konwersacji
   * @param {Object} socket - Socket klienta
   * @param {Object} data - Dane konwersacji
   */
  handleEnterConversation(socket, data) {
    try {
      const { participantId, conversationId } = data;
      const userId = socket.user?.userId;

      if (!participantId || !userId) return;

      logger.debug("User entered conversation", {
        userId: userId,
        participantId: participantId,
        conversationId: conversationId,
      });
      this.setUserInActiveConversation(userId, participantId, conversationId);
    } catch (error) {
      logger.error("Error handling conversation entry", {
        error: error.message,
        stack: error.stack,
        userId: socket.user?.userId,
        socketId: socket.id,
      });
    }
  }

  /**
   * Obsługuje wyjście użytkownika z konwersacji
   * @param {Object} socket - Socket klienta
   * @param {Object} data - Dane konwersacji
   */
  handleLeaveConversation(socket, data) {
    try {
      const { participantId, conversationId } = data;
      const userId = socket.user?.userId;

      if (!participantId || !userId) return;

      logger.debug("User left conversation", {
        userId: userId,
        participantId: participantId,
        conversationId: conversationId,
      });
      this.removeUserFromActiveConversation(
        userId,
        participantId,
        conversationId
      );
    } catch (error) {
      logger.error("Error handling conversation exit", {
        error: error.message,
        stack: error.stack,
        userId: socket.user?.userId,
        socketId: socket.id,
      });
    }
  }

  /**
   * Zwraca statystyki konwersacji
   * @returns {Object} - Statystyki konwersacji
   */
  getConversationStats() {
    return {
      activeConversations: this.activeConversations.size,
      conversationStates: this.conversationNotificationState.size,
    };
  }

  /**
   * Czyści wszystkie dane konwersacji
   */
  clear() {
    this.activeConversations.clear();
    this.conversationNotificationState.clear();
  }
}

export default SocketConversationManager;
