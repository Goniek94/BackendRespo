import express from "express";
import auth from "../../middleware/auth.js";
import notificationManager from "../../services/notificationManager.js";
import Notification from "../../models/communication/notification.js";

const router = express.Router();

/**
 * Trasy testowe do powiadomień real-time
 * (dostępne wyłącznie poza produkcją i po ustawieniu flagi)
 */
const testRouter = express.Router();

/**
 * @route POST /api/notifications/test
 * @desc Prosty endpoint do testowania powiadomień w czasie rzeczywistym
 * @access Public (tylko DEV + flaga)
 */
testRouter.post("/", async (req, res) => {
  try {
    const { userId, title, message, type = "system" } = req.body;

    if (!userId) return res.status(400).json({ error: "Brak ID użytkownika" });
    if (!message)
      return res.status(400).json({ error: "Brak treści powiadomienia" });

    const notification = await notificationManager.createNotification(
      userId,
      title || "Testowe powiadomienie",
      message,
      type,
      { metadata: { test: true } }
    );

    if (!notification) {
      return res
        .status(500)
        .json({ error: "Nie udało się utworzyć powiadomienia" });
    }

    return res.status(200).json({
      success: true,
      message: "Powiadomienie wysłane pomyślnie",
      notification: notification.toApiResponse
        ? notification.toApiResponse()
        : notification,
    });
  } catch (error) {
    // nie loguj pełnych treści; tylko komunikat
    return res
      .status(500)
      .json({
        error: error.message || "Wystąpił błąd podczas wysyłania powiadomienia",
      });
  }
});

/**
 * @route POST /api/notifications/test/send
 * @desc Testowe wysyłanie różnych typów powiadomień
 * @access Public (tylko DEV + flaga)
 */
testRouter.post("/send", async (req, res) => {
  try {
    const { userId, type, data = {} } = req.body;

    if (!userId) return res.status(400).json({ error: "Brak ID użytkownika" });
    if (!type)
      return res.status(400).json({ error: "Brak typu powiadomienia" });

    let notification = null;

    switch (type) {
      case "new_message":
        notification = await notificationManager.notifyNewMessage(
          userId,
          data.senderName || "Użytkownik",
          data.adTitle || "Ogłoszenie",
          data.metadata || {}
        );
        break;

      case "listing_liked":
        notification = await notificationManager.notifyAdAddedToFavorites(
          userId,
          data.adTitle || "Ogłoszenie",
          data.adId || null
        );
        break;

      case "payment_completed":
        notification = await notificationManager.notifyPaymentStatusChange(
          userId,
          "completed",
          data.adTitle || "Ogłoszenie",
          data.metadata || {}
        );
        break;

      case "listing_added":
        notification = await notificationManager.notifyAdCreated(
          userId,
          data.adTitle || "Ogłoszenie",
          data.adId || null
        );
        break;

      case "listing_expiring":
        notification = await notificationManager.notifyAdExpiringSoon(
          userId,
          data.adTitle || "Ogłoszenie",
          data.daysLeft || 3,
          data.adId || null
        );
        break;

      case "listing_expired":
        notification = await notificationManager.notifyAdExpired(
          userId,
          data.adTitle || "Ogłoszenie",
          data.adId || null
        );
        break;

      case "listing_viewed":
        notification = await notificationManager.notifyAdViewed(
          userId,
          data.adTitle || "Ogłoszenie",
          data.viewCount || null,
          data.adId || null
        );
        break;

      case "comment_reply":
        notification = await notificationManager.notifyCommentReply(
          userId,
          data.adTitle || "Ogłoszenie",
          data.adId || null,
          data.commentId || null
        );
        break;

      case "payment_failed":
        notification = await notificationManager.notifyPaymentFailed(
          userId,
          data.reason || null,
          data.metadata || {}
        );
        break;

      case "payment_refunded":
        notification = await notificationManager.notifyPaymentRefunded(
          userId,
          data.amount || null,
          data.metadata || {}
        );
        break;

      case "account_activity":
        notification = await notificationManager.notifyAccountActivity(
          userId,
          data.activity || "Nieznana aktywność",
          data.metadata || {}
        );
        break;

      case "profile_viewed":
        notification = await notificationManager.notifyProfileViewed(
          userId,
          data.viewerName || null,
          data.metadata || {}
        );
        break;

      case "maintenance_notification":
        notification = await notificationManager.notifyMaintenance(
          userId,
          data.message || "Planowana konserwacja systemu",
          data.scheduledTime || null,
          data.metadata || {}
        );
        break;

      default:
        return res
          .status(400)
          .json({ error: "Nieobsługiwany typ powiadomienia" });
    }

    if (!notification) {
      return res
        .status(500)
        .json({ error: "Nie udało się utworzyć powiadomienia" });
    }

    return res.status(200).json({
      success: true,
      notification: notification.toApiResponse
        ? notification.toApiResponse()
        : notification,
    });
  } catch (error) {
    return res
      .status(500)
      .json({
        error: error.message || "Wystąpił błąd podczas wysyłania powiadomienia",
      });
  }
});

/**
 * @route GET /api/notifications/test
 * @desc Prosta strona testowa realtime
 * @access Public (tylko DEV + flaga)
 */
testRouter.get("/", (_req, res) => {
  res.sendFile("notification-tester.html", { root: "./examples" });
});

// Rejestracja tras testowych (wyłączone na produkcji lub bez flagi)
const allowTestEndpoints =
  process.env.NODE_ENV !== "production" &&
  process.env.ALLOW_NOTIFICATION_TESTS === "1";
if (allowTestEndpoints) {
  router.use("/test", testRouter);
} else {
  router.use("/test", (_req, res) =>
    res.status(410).json({ error: "Notification test endpoints disabled" })
  );
}

/**
 * @route GET /api/notifications
 * @desc Pobieranie powiadomień użytkownika z paginacją
 * @access Private
 */
router.get("/", auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      isRead,
      type,
      sort = "createdAt",
      order = "desc",
    } = req.query;

    const filter = { user: req.user.userId };
    if (isRead !== undefined) filter.isRead = isRead === "true";
    if (type) filter.type = String(type);

    const sortOptions = { [sort]: order === "desc" ? -1 : 1 };

    const notifications = await Notification.find(filter)
      .select(
        "title message type isRead link adId metadata createdAt updatedAt"
      )
      .sort(sortOptions)
      .skip((parseInt(page, 10) - 1) * parseInt(limit, 10))
      .limit(parseInt(limit, 10))
      .lean();

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.getUnreadCount(req.user.userId);

    res.status(200).json({
      notifications,
      currentPage: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
      totalNotifications: total,
      unreadCount,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Błąd serwera", error: err.message });
  }
});

/**
 * @route GET /api/notifications/unread
 * @access Private
 */
router.get("/unread", auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const notifications = await notificationManager.getUnreadNotifications(
      req.user.userId,
      parseInt(limit, 10)
    );

    res.status(200).json({
      notifications: notifications.map((n) =>
        n.toApiResponse
          ? n.toApiResponse()
          : {
              id: n._id,
              title: n.title,
              message: n.message,
              type: n.type,
              isRead: n.isRead,
              link: n.link,
              adId: n.adId,
              metadata: n.metadata,
              createdAt: n.createdAt,
              updatedAt: n.updatedAt,
            }
      ),
      unreadCount: await Notification.getUnreadCount(req.user.userId),
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Błąd serwera", error: err.message });
  }
});

/**
 * @route GET /api/notifications/unread-count
 * @access Private
 */
router.get("/unread-count", auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const allUnreadNotifications = await Notification.countDocuments({
      user: userId,
      isRead: false,
    });

    const Message = (await import("../../models/communication/message.js"))
      .default;
    const unreadMessages = await Message.countDocuments({
      recipient: userId,
      read: false,
      deletedBy: { $ne: userId },
      archived: { $ne: true },
      draft: { $ne: true },
      unsent: { $ne: true },
    });

    res.status(200).json({
      unreadCount: allUnreadNotifications + unreadMessages,
      messages: unreadMessages,
      notifications: allUnreadNotifications,
      breakdown: {
        realMessages: unreadMessages,
        allNotifications: allUnreadNotifications,
        separated: true,
      },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Błąd serwera", error: err.message });
  }
});

/**
 * @route PATCH /api/notifications/:id/read
 * @access Private
 */
router.patch("/:id/read", auth, async (req, res) => {
  try {
    const notification = await notificationManager.markAsRead(
      req.params.id,
      req.user.userId
    );

    res.status(200).json({
      message: "Powiadomienie oznaczone jako przeczytane",
      notification: {
        id: notification._id,
        message: notification.message,
        type: notification.type,
        isRead: notification.isRead,
        metadata: notification.metadata,
        createdAt: notification.createdAt,
        updatedAt: notification.updatedAt,
      },
    });
  } catch (err) {
    if (err.message === "Powiadomienie nie znalezione") {
      return res.status(404).json({ message: err.message });
    }
    if (err.message === "Brak uprawnień do tego powiadomienia") {
      return res.status(403).json({ message: err.message });
    }
    return res
      .status(500)
      .json({ message: "Błąd serwera", error: err.message });
  }
});

/**
 * @route PATCH /api/notifications/mark-all-read
 * @access Private
 */
router.patch("/mark-all-read", auth, async (req, res) => {
  try {
    const result = await notificationManager.markAllAsRead(req.user.userId);
    res.status(200).json({
      message: "Wszystkie powiadomienia oznaczone jako przeczytane",
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Błąd serwera", error: err.message });
  }
});

/**
 * @route DELETE /api/notifications/:id
 * @access Private
 */
router.delete("/:id", auth, async (req, res) => {
  try {
    await notificationManager.deleteNotification(
      req.params.id,
      req.user.userId
    );
    res.status(200).json({ message: "Powiadomienie usunięte" });
  } catch (err) {
    if (err.message === "Powiadomienie nie znalezione") {
      return res.status(404).json({ message: err.message });
    }
    if (err.message === "Brak uprawnień do tego powiadomienia") {
      return res.status(403).json({ message: err.message });
    }
    return res
      .status(500)
      .json({ message: "Błąd serwera", error: err.message });
  }
});

/**
 * @route POST /api/notifications/send
 * @access Private
 */
router.post("/send", auth, async (req, res) => {
  try {
    const { type, recipientId, title, message, relatedId, actionUrl } =
      req.body;

    if (!type || !recipientId || !title || !message) {
      return res.status(400).json({
        success: false,
        message: "Brak wymaganych pól: type, recipientId, title, message",
      });
    }

    const notification = await notificationManager.createNotification(
      recipientId,
      title,
      message,
      type,
      { relatedId, actionUrl, senderId: req.user.userId }
    );

    if (!notification) {
      return res.status(500).json({
        success: false,
        message: "Nie udało się utworzyć powiadomienia",
      });
    }

    res.status(200).json({
      success: true,
      message: "Powiadomienie wysłane pomyślnie",
      data: {
        notification: {
          id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          metadata: notification.metadata,
          createdAt: notification.createdAt,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Błąd podczas wysyłania powiadomienia",
    });
  }
});

// Statystyki
router.get("/stats", auth, async (_req, res) => {
  try {
    const stats = await notificationManager.getNotificationStats();
    res.json({ success: true, stats });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Błąd podczas pobierania statystyk powiadomień",
    });
  }
});

export default router;
