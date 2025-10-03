// admin/controllers/notifications/sendNotificationController.js
import Notification from "../../../models/communication/notification.js";
import User from "../../../models/user/user.js";
import logger from "../../../utils/logger.js";

/**
 * Send notification to users
 * POST /admin/notifications/send
 *
 * Body:
 * - type: "system" | "info" | "promo"
 * - message: string (content)
 * - sendToAll: boolean
 * - userIds: string[] (if not sendToAll)
 */
export const sendNotification = async (req, res) => {
  try {
    const { type, message, sendToAll, userIds } = req.body;

    // Validation
    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: "Message content is required",
      });
    }

    if (!sendToAll && (!userIds || userIds.length === 0)) {
      return res.status(400).json({
        success: false,
        error: "User IDs are required when not sending to all",
      });
    }

    // Map type to notification type
    const typeMapping = {
      system: "system_notification",
      info: "system_notification",
      promo: "system_notification",
    };

    const notificationType = typeMapping[type] || "system_notification";

    // Get title based on type
    const titleMapping = {
      system: "Wiadomość systemowa",
      info: "Informacja",
      promo: "Promocja",
    };

    const title = titleMapping[type] || "Powiadomienie";

    // Get recipients
    let recipients = [];
    if (sendToAll) {
      const allUsers = await User.find(
        { status: { $ne: "deleted" } },
        "_id"
      ).lean();
      recipients = allUsers.map((u) => u._id);
    } else {
      recipients = userIds;
    }

    if (recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No recipients found",
      });
    }

    // Create notifications for all recipients
    const notifications = recipients.map((userId) => ({
      userId: userId,
      user: userId, // For backward compatibility
      type: notificationType,
      title,
      message: message.trim(),
      isRead: false,
      metadata: {
        sentBy: req.user._id,
        sentByRole: req.user.role,
        sentAt: new Date(),
        originalType: type,
      },
    }));

    // Bulk insert notifications
    const created = await Notification.insertMany(notifications);

    logger.info(
      `Admin ${req.user._id} sent ${created.length} notifications (type: ${type})`
    );

    // Socket.IO emission removed - notifications will be fetched on next poll
    logger.info(`Created ${created.length} notifications (Socket.IO disabled)`);

    return res.status(200).json({
      success: true,
      message: `Sent ${created.length} notifications successfully`,
      data: {
        count: created.length,
        type,
      },
    });
  } catch (error) {
    logger.error("Error sending notifications:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to send notifications",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
