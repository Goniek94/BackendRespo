import logger from "../../utils/logger.js";

/**
 * Klasa SocketConversationManager - zarządza aktywnymi konwersacjami
 */
class SocketConversationManager {
  constructor() {
    this.activeConversations = new Map(); // userId -> Set of conversationId/participantId
    this.conversationNotificationState = new Map(); // "userId:participantId" -> lastNotificationTime
    this.socketService = null;
  }

  /**
   * Ustawia referencję do socketService
   * @param {Object} socketService - Instancja socketService
   */
  setSocketService(socketService) {
    this.socketService = socketService;
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
   * Obsługuje otwarcie konwersacji przez użytkownika (nowy event z frontendu)
   * @param {Object} socket - Socket klienta
   * @param {Object} data - { conversationId }
   */
  async handleConversationOpened(socket, data) {
    try {
      const { conversationId } = data;
      const userId = socket.user?.userId;

      if (!conversationId || !userId) {
        logger.warn("Missing data in conversation:opened event", {
          conversationId,
          userId,
        });
        return;
      }

      // Pobierz informacje o konwersacji żeby znaleźć participantId
      const Conversation = (
        await import("../../models/communication/conversation.js")
      ).default;
      const conversation = await Conversation.findById(conversationId);

      if (!conversation) {
        logger.warn("Conversation not found", { conversationId });
        return;
      }

      // Znajdź ID drugiego uczestnika
      const participantId = conversation.participants.find(
        (p) => p.toString() !== userId.toString()
      );

      if (!participantId) {
        logger.warn("Participant not found in conversation", {
          conversationId,
          userId,
        });
        return;
      }

      logger.info("📱 User opened conversation", {
        userId,
        conversationId,
        participantId: participantId.toString(),
      });

      this.setUserInActiveConversation(
        userId,
        participantId.toString(),
        conversationId
      );

      // NOWE: Oznacz powiadomienia o wiadomościach jako przeczytane
      try {
        const Notification = (
          await import("../../models/communication/notification.js")
        ).default;

        // Oznacz tylko nieprzeczytane powiadomienia typu "new_message"
        // od tego konkretnego uczestnika konwersacji
        const result = await Notification.updateMany(
          {
            $or: [{ userId: userId }, { user: userId }],
            type: "new_message",
            "metadata.senderId": participantId.toString(),
            isRead: false,
          },
          { $set: { isRead: true } }
        );

        if (result.modifiedCount > 0) {
          logger.info(
            `📬 Marked ${result.modifiedCount} message notifications as read`,
            {
              userId,
              conversationId,
              senderId: participantId.toString(),
            }
          );

          // Pobierz zaktualizowaną liczbę nieprzeczytanych powiadomień
          const unreadCount = await Notification.countDocuments({
            $or: [{ userId: userId }, { user: userId }],
            isRead: false,
          });

          // Wyślij zaktualizowaną liczbę do klienta przez socketService
          if (this.socketService && this.socketService.io) {
            this.socketService.io
              .to(`user_${userId}`)
              .emit("notifications:count", { count: unreadCount });

            logger.info(
              `🔔 Updated notification count for user ${userId}: ${unreadCount}`
            );
          }
        }
      } catch (notificationError) {
        logger.error("Error marking notifications as read", {
          error: notificationError.message,
          stack: notificationError.stack,
          userId,
          conversationId,
        });
      }
    } catch (error) {
      logger.error("Error handling conversation:opened", {
        error: error.message,
        stack: error.stack,
        userId: socket.user?.userId,
        data,
      });
    }
  }

  /**
   * Obsługuje zamknięcie konwersacji przez użytkownika (nowy event z frontendu)
   * @param {Object} socket - Socket klienta
   * @param {Object} data - { conversationId }
   */
  async handleConversationClosed(socket, data) {
    try {
      const { conversationId } = data;
      const userId = socket.user?.userId;

      if (!conversationId || !userId) {
        logger.warn("Missing data in conversation:closed event", {
          conversationId,
          userId,
        });
        return;
      }

      // Pobierz informacje o konwersacji żeby znaleźć participantId
      const Conversation = (
        await import("../../models/communication/conversation.js")
      ).default;
      const conversation = await Conversation.findById(conversationId);

      if (!conversation) {
        logger.warn("Conversation not found", { conversationId });
        return;
      }

      // Znajdź ID drugiego uczestnika
      const participantId = conversation.participants.find(
        (p) => p.toString() !== userId.toString()
      );

      if (!participantId) {
        logger.warn("Participant not found in conversation", {
          conversationId,
          userId,
        });
        return;
      }

      logger.info("📱 User closed conversation", {
        userId,
        conversationId,
        participantId: participantId.toString(),
      });

      this.removeUserFromActiveConversation(
        userId,
        participantId.toString(),
        conversationId
      );
    } catch (error) {
      logger.error("Error handling conversation:closed", {
        error: error.message,
        stack: error.stack,
        userId: socket.user?.userId,
        data,
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
