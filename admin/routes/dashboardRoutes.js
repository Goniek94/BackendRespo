// admin/routes/dashboardRoutes.js
import express from "express";
import { requireAuth } from "../../middleware/auth.js";
import {
  getDashboardStats,
  getDetailedUserStats,
  getDetailedListingStats,
  getDetailedMessageStats,
  getSystemHealth,
  getActivityTimeline,
} from "../controllers/dashboard/dashboardController.js";

const router = express.Router();

// Wszystkie te ścieżki kończą pod /api/admin-panel/dashboard...
router.get("/", requireAuth, getDashboardStats); // GET /api/admin-panel/dashboard
router.get("/stats", requireAuth, getDashboardStats); // GET /api/admin-panel/dashboard/stats (alias)
router.get("/users/stats", requireAuth, getDetailedUserStats);
router.get("/listings/stats", requireAuth, getDetailedListingStats);
router.get("/messages/stats", requireAuth, getDetailedMessageStats);
router.get("/system/health", requireAuth, getSystemHealth);
router.get("/activity/timeline", requireAuth, getActivityTimeline);

export default router;
