// admin/routes/index.js
import express from "express";

// Sub-routes (wszystkie w tym samym katalogu: admin/routes)
import authRoutes from "./authRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";
import userRoutes from "./userRoutes.js";
import listingRoutes from "./listingRoutes.js";
import reportRoutes from "./reportRoutes.js";
import promotionRoutes from "./promotionRoutes.js";
import statisticsRoutes from "./statistics/statisticsRoutes.js";
import settingsRoutes from "./settingsRoutes.js";
import cleanupRoutes from "./cleanupRoutes.js";

// 🔹 NOWE: aktywne ogłoszenia
import activeListingsRoutes from "./activeListingsRoutes.js";
import analyticsRoutes from "./analyticsRoutes.js";
import activityRoutes from "./activityRoutes.js";
import paymentRoutes from "./paymentRoutes.js";
import notificationRoutes from "./notificationRoutes.js";

// Middleware (jeden poziom wyżej: admin/middleware)
import { adminApiLimiter, requireAdminAuth } from "../middleware/adminAuth.js";
import trackDailyActive from "../../middleware/analytics/trackDailyActive.js";

/**
 * Main Admin Routes Index
 * Central routing hub for all admin panel endpoints
 */
const router = express.Router();

// Globalny rate limit dla admin API
router.use(adminApiLimiter);

// Minimalne nagłówki cache (unikamy 431)
router.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-cache");
  next();
});

/** ===================== HEALTH ===================== */
router.get("/health", (req, res) => {
  res.json({
    success: true,
    service: "Admin Panel",
    version: "1.0.0",
    user: req.user
      ? { id: String(req.user._id || req.user.id), role: req.user.role }
      : null,
  });
});

/** ===================== ROUTES ===================== */

/** Auth (public) */
router.use("/auth", authRoutes);

/** Dashboard (wymagana autoryzacja admin + tracking) */
router.use("/dashboard", requireAdminAuth, trackDailyActive, dashboardRoutes);

/** Users (wymagana autoryzacja admin + tracking) */
router.use("/users", requireAdminAuth, trackDailyActive, userRoutes);

/** Listings (wymagana autoryzacja admin + tracking) */
router.use(
  "/listings",
  requireAdminAuth,
  trackDailyActive,
  activeListingsRoutes
); // 🔹 najpierw nasze /active
router.use("/listings", requireAdminAuth, trackDailyActive, listingRoutes);

/** Payments (wymagana autoryzacja admin + tracking) */
router.use("/payments", requireAdminAuth, trackDailyActive, paymentRoutes);

/** Reports - ALIAS do /payments dla zgodności wstecznej (308 zachowuje query) */
router.use("/reports", (req, res) => {
  const q = req.url || "";
  res.redirect(308, `/admin/payments${q}`);
});

/** Promotions (wymagana autoryzacja admin + tracking) */
router.use("/promotions", requireAdminAuth, trackDailyActive, promotionRoutes);

/** Settings (wymagana autoryzacja admin + tracking) */
router.use("/settings", requireAdminAuth, trackDailyActive, settingsRoutes);

/** Statistics (wymagana autoryzacja admin + tracking) */
router.use("/statistics", requireAdminAuth, trackDailyActive, statisticsRoutes);

/** Analytics (wymagana autoryzacja admin + tracking) */
router.use("/analytics", requireAdminAuth, trackDailyActive, analyticsRoutes);

/** Activity logs (wymagana autoryzacja admin + tracking) */
router.use("/activity", requireAdminAuth, trackDailyActive, activityRoutes);

/** Notifications (wymagana autoryzacja admin + tracking) */
router.use(
  "/notifications",
  requireAdminAuth,
  trackDailyActive,
  notificationRoutes
);

/** Cleanup / helpers (wymagana autoryzacja admin) */
router.use("/", requireAdminAuth, cleanupRoutes);

/** 404 */
router.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Admin endpoint not found",
    code: "ADMIN_ENDPOINT_NOT_FOUND",
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      // health
      "GET /admin-panel/health",

      // auth
      "POST /admin-panel/auth/login",
      "POST /admin-panel/auth/logout",
      "GET /admin-panel/auth/check",

      // dashboard
      "GET /admin-panel/dashboard",
      "GET /admin-panel/dashboard/stats",

      // users
      "GET /admin-panel/users",
      "GET /admin-panel/users/analytics",
      "GET /admin-panel/users/export",
      "POST /admin-panel/users/bulk-update",
      "GET /admin-panel/users/:id",
      "PUT /admin-panel/users/:id",
      "POST /admin-panel/users/:id/block",
      "DELETE /admin-panel/users/:id",

      // listings
      "GET /admin-panel/listings",
      "GET /admin-panel/listings/active",
      "GET /admin-panel/listings/active/count",
      "GET /admin-panel/listings/active/featured",
      "GET /admin-panel/listings/active/featured/count",
      "GET /admin-panel/listings/active/featured/debug",
      "POST /admin-panel/listings",
      "GET /admin-panel/listings/stats",
      "GET /admin-panel/listings/pending",
      "GET /admin-panel/listings/:id",
      "PUT /admin-panel/listings/:id",
      "DELETE /admin-panel/listings/:id",
      "POST /admin-panel/listings/:id/approve",
      "POST /admin-panel/listings/:id/reject",
      "POST /admin-panel/listings/:id/moderate",
      "POST /admin-panel/listings/bulk-discount",

      // payments
      "GET /admin-panel/payments",
      "GET /admin-panel/payments/stats",
      "GET /admin-panel/payments/stats/users",
      "GET /admin-panel/payments/export",

      // reports (deprecated - redirects to /payments)
      "GET /admin-panel/reports (redirects to /payments)",

      // promotions
      "GET /admin-panel/promotions",
      "POST /admin-panel/promotions",
      "PUT /admin-panel/promotions/:id",
      "DELETE /admin-panel/promotions/:id",
      "POST /admin-panel/promotions/:id/activate",
      "POST /admin-panel/promotions/:id/deactivate",
      "GET /admin-panel/promotions/discounts",
      "POST /admin-panel/promotions/ads/:adId/discount",
      "POST /admin-panel/promotions/bulk-discount",
      "POST /admin-panel/promotions/users/:userId/discount",
      "POST /admin-panel/promotions/categories/:category/discount",
      "POST /admin-panel/promotions/users/:userId/bonus",
      "GET /admin-panel/promotions/users/:userId/bonuses",
      "DELETE /admin-panel/promotions/users/:userId/bonuses/:bonusId",

      // settings
      "GET /admin-panel/settings",
      "PUT /admin-panel/settings",

      // statistics
      "GET /admin-panel/statistics/overview",
      "GET /admin-panel/statistics/timeseries",
      "GET /admin-panel/statistics/export",

      // analytics
      "GET /admin-panel/analytics/active-users/today",
      "GET /admin-panel/analytics/active-users/range",

      // activity logs
      "GET /admin-panel/activity?type=all|listings|users|reports&limit=50",
      "DELETE /admin-panel/activity/:id",
      "DELETE /admin-panel/activity (bulk: {ids:[], olderThanDays:number})",

      // notifications
      "POST /admin-panel/notifications/send",

      // cleanup / session tools
      "GET /admin-panel/clear-cookies",
      "POST /admin-panel/clear-cookies",
      "POST /admin-panel/cleanup-session",
      "GET /admin-panel/session-info",
    ],
  });
});

export default router;
