// routes/notifications/notificationRoutes.js
import express from "express";
import Joi from "joi";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import auth from "../../middleware/auth.js";
import notificationManager from "../../services/notificationManager.js";
import Notification from "../../models/communication/notification.js";
import logger from "../../utils/logger.js";

const router = express.Router();

/* -------------------------- CONFIG -------------------------- */
const NOTIFICATION_CONFIG = {
  pagination: {
    defaultLimit: 10,
    maxLimit: 100,
    maxPage: 1_000_000,
  },
  validation: {
    maxTitleLength: 200,
    maxMessageLength: 1000,
    allowedSortFields: ["createdAt", "updatedAt", "type", "isRead"],
    allowedTypes: [
      "system",
      "new_message",
      "listing_liked",
      "payment_completed",
      "listing_added",
      "listing_expiring",
      "listing_expired",
      "listing_viewed",
      "comment_reply",
      "payment_failed",
      "payment_refunded",
      "account_activity",
      "profile_viewed",
      "maintenance_notification",
    ],
  },
  features: {
    allowTestEndpoints:
      process.env.NODE_ENV !== "production" &&
      process.env.ALLOW_NOTIFICATION_TESTS === "1",
  },
};

/* -------------------------- RATE LIMITING -------------------------- */
const notificationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minut
  max: 100, // max 100 requestów na 15 minut
  message: {
    error:
      "Zbyt wiele żądań dotyczących powiadomień. Spróbuj ponownie za 15 minut.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const adminActionRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuta
  max: 10, // max 10 akcji admin na minutę
  message: {
    error: "Zbyt wiele akcji administracyjnych. Spróbuj ponownie za minutę.",
  },
  keyGenerator: (req, _res) => req.user?.userId || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
});

/* -------------------------- VALIDATION SCHEMAS -------------------------- */
const schemas = {
  pagination: Joi.object({
    page: Joi.number()
      .integer()
      .min(1)
      .max(NOTIFICATION_CONFIG.pagination.maxPage)
      .default(1),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(NOTIFICATION_CONFIG.pagination.maxLimit)
      .default(10),
    sort: Joi.string()
      .valid(...NOTIFICATION_CONFIG.validation.allowedSortFields)
      .default("createdAt"),
    order: Joi.string().valid("asc", "desc").default("desc"),
    isRead: Joi.boolean(),
    type: Joi.string().valid(...NOTIFICATION_CONFIG.validation.allowedTypes),
  }),

  createNotification: Joi.object({
    recipientId: Joi.string().hex().length(24).required(),
    title: Joi.string()
      .min(1)
      .max(NOTIFICATION_CONFIG.validation.maxTitleLength)
      .required(),
    message: Joi.string()
      .min(1)
      .max(NOTIFICATION_CONFIG.validation.maxMessageLength)
      .required(),
    type: Joi.string()
      .valid(...NOTIFICATION_CONFIG.validation.allowedTypes)
      .required(),
    relatedId: Joi.string().allow(null, ""),
    actionUrl: Joi.string()
      .uri({ scheme: ["http", "https"] })
      .allow(null, ""),
    metadata: Joi.object().default({}),
  }),

  testNotification: Joi.object({
    userId: Joi.string().hex().length(24).required(),
    title: Joi.string()
      .max(NOTIFICATION_CONFIG.validation.maxTitleLength)
      .default("Testowe powiadomienie"),
    message: Joi.string()
      .min(1)
      .max(NOTIFICATION_CONFIG.validation.maxMessageLength)
      .required(),
    type: Joi.string()
      .valid(...NOTIFICATION_CONFIG.validation.allowedTypes)
      .default("system"),
    metadata: Joi.object().default({}),
  }),

  testSendNotification: Joi.object({
    userId: Joi.string().hex().length(24).required(),
    type: Joi.string()
      .valid(...NOTIFICATION_CONFIG.validation.allowedTypes)
      .required(),
    data: Joi.object().default({}),
  }),

  idParam: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};

/* -------------------------- MIDDLEWARE -------------------------- */

// Async handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Input sanitization
const sanitizeHtml = (str) => {
  if (typeof str !== "string") return str;
  return str.replace(/<[^>]*>/g, "").trim();
};

const sanitizeNotificationInput = (payload = {}) => {
  const sanitized = { ...payload };
  if (sanitized.title) sanitized.title = sanitizeHtml(sanitized.title);
  if (sanitized.message) sanitized.message = sanitizeHtml(sanitized.message);
  if (sanitized.type) sanitized.type = String(sanitized.type).toLowerCase();
  return sanitized;
};

// RBAC middleware
const requireNotificationAdmin = (req, res, next) => {
  if (!req.user || !["admin", "moderator"].includes(req.user.role)) {
    logger.warn("Unauthorized notification admin access attempt", {
      userId: req.user?.userId,
      role: req.user?.role,
      ip: req.ip,
      endpoint: req.originalUrl,
    });

    return res.status(403).json({
      success: false,
      message:
        "Brak uprawnień. Wymagane uprawnienia administratora/moderatora.",
    });
  }
  next();
};

// Validation middleware
const validateInput = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(
    { ...req.query, ...req.body, ...req.params },
    { allowUnknown: true, stripUnknown: true }
  );

  if (error) {
    logger.warn("Input validation failed", {
      error: error.details[0].message,
      endpoint: req.originalUrl,
      userId: req.user?.userId,
    });

    return res.status(400).json({
      success: false,
      message: "Nieprawidłowe dane wejściowe",
      details: error.details[0].message,
    });
  }

  req.validated = value;
  next();
};

/* -------------------------- TEST ROUTES -------------------------- */
const testRouter = express.Router();

/**
 * @route POST /api/notifications/test
 * @desc Create test notification
 * @access Private (Admin/Moderator only)
 */
testRouter.post(
  "/",
  auth,
  requireNotificationAdmin,
  adminActionRateLimit,
  validateInput(schemas.testNotification),
  asyncHandler(async (req, res) => {
    const { userId, type, metadata } = req.validated;
    const { title, message } = sanitizeNotificationInput(req.validated);

    logger.info("Creating test notification", {
      adminId: req.user.userId,
      targetUserId: userId,
      type,
    });

    const notification = await notificationManager.createNotification(
      userId,
      title,
      message,
      type,
      { metadata: { ...metadata, test: true, createdBy: req.user.userId } }
    );

    if (!notification) {
      logger.error("Failed to create test notification", {
        adminId: req.user.userId,
        targetUserId: userId,
      });

      return res.status(500).json({
        success: false,
        message: "Nie udało się utworzyć powiadomienia",
      });
    }

    logger.info("Test notification created successfully", {
      notificationId: notification._id,
      adminId: req.user.userId,
      targetUserId: userId,
    });

    res.status(201).json({
      success: true,
      message: "Powiadomienie testowe utworzone pomyślnie",
      data: {
        notification: notification.toApiResponse?.() || notification,
      },
    });
  })
);

/**
 * @route POST /api/notifications/test/send
 * @desc Send predefined test notification types
 * @access Private (Admin/Moderator only)
 */
testRouter.post(
  "/send",
  auth,
  requireNotificationAdmin,
  adminActionRateLimit,
  validateInput(schemas.testSendNotification),
  asyncHandler(async (req, res) => {
    const { userId, type, data } = req.validated;

    logger.info("Sending test notification", {
      adminId: req.user.userId,
      targetUserId: userId,
      type,
    });

    const notificationHandlers = {
      new_message: () =>
        notificationManager.notifyNewMessage(
          userId,
          sanitizeHtml(data.senderName || "Użytkownik"),
          sanitizeHtml(data.adTitle || "Ogłoszenie"),
          data.metadata || {}
        ),
      listing_liked: () =>
        notificationManager.notifyAdAddedToFavorites(
          userId,
          sanitizeHtml(data.adTitle || "Ogłoszenie"),
          data.adId || null
        ),
      payment_completed: () =>
        notificationManager.notifyPaymentStatusChange(
          userId,
          "completed",
          sanitizeHtml(data.adTitle || "Ogłoszenie"),
          data.metadata || {}
        ),
      listing_added: () =>
        notificationManager.notifyAdCreated(
          userId,
          sanitizeHtml(data.adTitle || "Ogłoszenie"),
          data.adId || null
        ),
      listing_expiring: () =>
        notificationManager.notifyAdExpiringSoon(
          userId,
          sanitizeHtml(data.adTitle || "Ogłoszenie"),
          data.daysLeft || 3,
          data.adId || null
        ),
      listing_expired: () =>
        notificationManager.notifyAdExpired(
          userId,
          sanitizeHtml(data.adTitle || "Ogłoszenie"),
          data.adId || null
        ),
      listing_viewed: () =>
        notificationManager.notifyAdViewed(
          userId,
          sanitizeHtml(data.adTitle || "Ogłoszenie"),
          data.viewCount || null,
          data.adId || null
        ),
      comment_reply: () =>
        notificationManager.notifyCommentReply(
          userId,
          sanitizeHtml(data.adTitle || "Ogłoszenie"),
          data.adId || null,
          data.commentId || null
        ),
      payment_failed: () =>
        notificationManager.notifyPaymentFailed(
          userId,
          sanitizeHtml(data.reason || ""),
          data.metadata || {}
        ),
      payment_refunded: () =>
        notificationManager.notifyPaymentRefunded(
          userId,
          data.amount || null,
          data.metadata || {}
        ),
      account_activity: () =>
        notificationManager.notifyAccountActivity(
          userId,
          sanitizeHtml(data.activity || "Aktywność"),
          data.metadata || {}
        ),
      profile_viewed: () =>
        notificationManager.notifyProfileViewed(
          userId,
          sanitizeHtml(data.viewerName || ""),
          data.metadata || {}
        ),
      maintenance_notification: () =>
        notificationManager.notifyMaintenance(
          userId,
          sanitizeHtml(data.message || "Planowana konserwacja systemu"),
          data.scheduledTime || null,
          data.metadata || {}
        ),
    };

    const handler = notificationHandlers[type];
    if (!handler) {
      return res.status(400).json({
        success: false,
        message: "Nieobsługiwany typ powiadomienia",
      });
    }

    const notification = await handler();

    if (!notification) {
      logger.error("Failed to send test notification", {
        adminId: req.user.userId,
        targetUserId: userId,
        type,
      });

      return res.status(500).json({
        success: false,
        message: "Nie udało się utworzyć powiadomienia",
      });
    }

    logger.info("Test notification sent successfully", {
      notificationId: notification._id,
      adminId: req.user.userId,
      targetUserId: userId,
      type,
    });

    res.status(201).json({
      success: true,
      message: "Powiadomienie testowe wysłane pomyślnie",
      data: {
        notification: notification.toApiResponse?.() || notification,
      },
    });
  })
);

/**
 * @route GET /api/notifications/test
 * @desc Serve notification testing interface
 * @access Private (Admin/Moderator only)
 */
testRouter.get("/", auth, requireNotificationAdmin, (req, res) => {
  res.sendFile("notification-tester.html", { root: "./examples" });
});

// Mount test routes conditionally
if (NOTIFICATION_CONFIG.features.allowTestEndpoints) {
  router.use("/test", testRouter);
  logger.info("Notification test endpoints enabled");
} else {
  router.use("/test", (req, res) => {
    logger.warn("Attempt to access disabled test endpoints", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.status(410).json({
      success: false,
      message: "Notification test endpoints disabled",
    });
  });
}

/* -------------------------- PRODUCTION ROUTES -------------------------- */

/**
 * @route GET /api/notifications
 * @desc Get user notifications with pagination and filtering
 * @access Private
 */
router.get(
  "/",
  auth,
  notificationRateLimit,
  validateInput(schemas.pagination),
  asyncHandler(async (req, res) => {
    const { page, limit, sort, order, isRead, type } = req.validated;
    const userId = req.user.userId;

    logger.debug("Fetching user notifications", {
      userId,
      page,
      limit,
      filters: { isRead, type },
    });

    const filter = { user: userId };
    if (typeof isRead !== "undefined") filter.isRead = isRead;
    if (type) filter.type = type;

    const sortOptions = { [sort]: order === "asc" ? 1 : -1, _id: 1 };
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .select(
          "title message type isRead link adId metadata createdAt updatedAt"
        )
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
      Notification.getUnreadCount(userId),
    ]);

    const totalPages = Math.ceil(total / limit);

    logger.debug("Notifications fetched successfully", {
      userId,
      count: notifications.length,
      total,
      unreadCount,
    });

    res.status(200).json({
      success: true,
      data: {
        notifications,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        meta: {
          unreadCount,
        },
      },
      // Backward-compat payload (stare fronty)
      notifications,
      currentPage: page,
      totalPages,
      totalNotifications: total,
      unreadCount,
    });
  })
);

/**
 * @route GET /api/notifications/unread
 * @desc Get unread notifications
 * @access Private
 */
router.get(
  "/unread",
  auth,
  notificationRateLimit,
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const userId = req.user.userId;

    logger.debug("Fetching unread notifications", { userId, limit });

    const [notifications, unreadCount] = await Promise.all([
      notificationManager.getUnreadNotifications(userId, limit),
      Notification.getUnreadCount(userId),
    ]);

    const formattedNotifications = notifications.map(
      (notification) =>
        notification.toApiResponse?.() || {
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
        }
    );

    logger.debug("Unread notifications fetched", {
      userId,
      count: formattedNotifications.length,
      unreadCount,
    });

    res.status(200).json({
      success: true,
      data: {
        notifications: formattedNotifications,
        meta: {
          unreadCount,
          returnedCount: formattedNotifications.length,
        },
      },
      // Backward-compat
      notifications: formattedNotifications,
      unreadCount,
    });
  })
);

/**
 * @route GET /api/notifications/unread-count
 * @desc Get combined unread count (notifications + messages)
 * @access Private
 */
router.get(
  "/unread-count",
  auth,
  notificationRateLimit,
  asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    logger.debug("Fetching unread counts", { userId });

    const [notificationStats, messageStats] = await Promise.all([
      Notification.aggregate([
        { $match: { user: userObjectId } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            unread: { $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] } },
          },
        },
      ]),
      (async () => {
        const Message = (await import("../../models/communication/message.js"))
          .default;
        return Message.aggregate([
          {
            $match: {
              recipient: userObjectId,
              read: false,
              deletedBy: { $ne: userObjectId },
              archived: { $ne: true },
              draft: { $ne: true },
              unsent: { $ne: true },
            },
          },
          { $count: "unreadMessages" },
        ]);
      })(),
    ]);

    const notificationCount = notificationStats[0]?.unread || 0;
    const messageCount = messageStats[0]?.unreadMessages || 0;
    const totalUnread = notificationCount + messageCount;

    logger.debug("Unread counts calculated", {
      userId,
      notifications: notificationCount,
      messages: messageCount,
      total: totalUnread,
    });

    res.status(200).json({
      success: true,
      data: {
        unreadCount: totalUnread,
        breakdown: {
          notifications: notificationCount,
          messages: messageCount,
        },
      },
    });
  })
);

/**
 * @route GET /api/notifications/unread/count   (ALIAS DLA STARYCH FRONTÓW)
 * @desc Alias -> zwraca płaskie pola + nowe data.breakdown
 * @access Private
 */
router.get(
  "/unread/count",
  auth,
  notificationRateLimit,
  asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const [notificationStats, messageStats] = await Promise.all([
      Notification.aggregate([
        { $match: { user: userObjectId } },
        {
          $group: {
            _id: null,
            unread: { $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] } },
          },
        },
      ]),
      (async () => {
        const Message = (await import("../../models/communication/message.js"))
          .default;
        return Message.aggregate([
          {
            $match: {
              recipient: userObjectId,
              read: false,
              deletedBy: { $ne: userObjectId },
              archived: { $ne: true },
              draft: { $ne: true },
              unsent: { $ne: true },
            },
          },
          { $count: "unreadMessages" },
        ]);
      })(),
    ]);

    const notifications = notificationStats[0]?.unread || 0;
    const messages = messageStats[0]?.unreadMessages || 0;
    const total = notifications + messages;

    return res.status(200).json({
      success: true,
      unreadCount: total, // stary kształt
      messages,
      notifications,
      data: {
        unreadCount: total, // nowy kształt
        breakdown: { notifications, messages },
      },
    });
  })
);

/**
 * @route PATCH /api/notifications/:id/read
 * @desc Mark notification as read
 * @access Private
 */
router.patch(
  "/:id/read",
  auth,
  notificationRateLimit,
  validateInput(schemas.idParam),
  asyncHandler(async (req, res) => {
    const { id } = req.validated;
    const userId = req.user.userId;

    logger.debug("Marking notification as read", {
      notificationId: id,
      userId,
    });

    const notification = await notificationManager.markAsRead(id, userId);

    logger.info("Notification marked as read", {
      notificationId: id,
      userId,
      type: notification.type,
    });

    res.status(200).json({
      success: true,
      message: "Powiadomienie oznaczone jako przeczytane",
      data: {
        notification: {
          id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          isRead: notification.isRead,
          metadata: notification.metadata,
          createdAt: notification.createdAt,
          updatedAt: notification.updatedAt,
        },
      },
    });
  })
);

/**
 * @route PATCH /api/notifications/mark-all-read
 * @desc Mark all user notifications as read
 * @access Private
 */
router.patch(
  "/mark-all-read",
  auth,
  notificationRateLimit,
  asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    logger.debug("Marking all notifications as read", { userId });

    const result = await notificationManager.markAllAsRead(userId);

    logger.info("All notifications marked as read", {
      userId,
      modifiedCount: result.modifiedCount,
    });

    res.status(200).json({
      success: true,
      message: "Wszystkie powiadomienia oznaczone jako przeczytane",
      data: {
        modifiedCount: result.modifiedCount,
      },
    });
  })
);

/**
 * @route DELETE /api/notifications/:id
 * @desc Delete notification
 * @access Private
 */
router.delete(
  "/:id",
  auth,
  notificationRateLimit,
  validateInput(schemas.idParam),
  asyncHandler(async (req, res) => {
    const { id } = req.validated;
    const userId = req.user.userId;

    logger.debug("Deleting notification", { notificationId: id, userId });

    await notificationManager.deleteNotification(id, userId);

    logger.info("Notification deleted", { notificationId: id, userId });

    res.status(200).json({
      success: true,
      message: "Powiadomienie usunięte pomyślnie",
    });
  })
);

/**
 * @route POST /api/notifications/send
 * @desc Manually send notification (Admin/Moderator only)
 * @access Private (Admin/Moderator)
 */
router.post(
  "/send",
  auth,
  requireNotificationAdmin,
  adminActionRateLimit,
  validateInput(schemas.createNotification),
  asyncHandler(async (req, res) => {
    const { recipientId, type, relatedId, actionUrl, metadata } = req.validated;
    const { title, message } = sanitizeNotificationInput(req.validated);
    const senderId = req.user.userId;

    logger.info("Creating manual notification", {
      senderId,
      recipientId,
      type,
      title: title.substring(0, 50),
    });

    const notification = await notificationManager.createNotification(
      recipientId,
      title,
      message,
      type,
      {
        relatedId,
        actionUrl,
        metadata: { ...metadata, senderId, manual: true },
      }
    );

    if (!notification) {
      logger.error("Failed to create manual notification", {
        senderId,
        recipientId,
        type,
      });

      return res.status(500).json({
        success: false,
        message: "Nie udało się utworzyć powiadomienia",
      });
    }

    logger.info("Manual notification created successfully", {
      notificationId: notification._id,
      senderId,
      recipientId,
      type,
    });

    res.status(201).json({
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
  })
);

/**
 * @route GET /api/notifications/stats
 * @desc Get notification statistics (Admin/Moderator only)
 * @access Private (Admin/Moderator)
 */
router.get(
  "/stats",
  auth,
  requireNotificationAdmin,
  notificationRateLimit,
  asyncHandler(async (req, res) => {
    logger.debug("Fetching notification statistics", {
      adminId: req.user.userId,
    });

    const stats = await notificationManager.getNotificationStats();

    logger.debug("Notification statistics fetched", {
      adminId: req.user.userId,
      statsKeys: Object.keys(stats),
    });

    res.status(200).json({
      success: true,
      data: { stats },
    });
  })
);

/* -------------------------- ERROR HANDLING -------------------------- */

// Global error handler for this router
router.use((error, req, res, next) => {
  logger.error("Notification route error", {
    error: error.message,
    stack: error.stack,
    endpoint: req.originalUrl,
    method: req.method,
    userId: req.user?.userId,
    ip: req.ip,
  });

  // Handle specific error types
  if (error.message === "Powiadomienie nie znalezione") {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }

  if (error.message === "Brak uprawnień do tego powiadomienia") {
    return res.status(403).json({
      success: false,
      message: error.message,
    });
  }

  // Generic server error
  res.status(500).json({
    success: false,
    message: "Wystąpił błąd serwera",
    ...(process.env.NODE_ENV === "development" && { error: error.message }),
  });
});

export default router;
