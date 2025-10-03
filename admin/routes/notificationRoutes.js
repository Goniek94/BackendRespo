// admin/routes/notificationRoutes.js
import express from "express";
import { sendNotification } from "../controllers/notifications/sendNotificationController.js";

const router = express.Router();

/**
 * POST /admin/notifications/send
 * Send notification to users
 * Body: { type, message, sendToAll, userIds }
 */
router.post("/send", sendNotification);

export default router;
