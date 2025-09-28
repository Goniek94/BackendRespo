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

// Middleware (jeden poziom wyżej: admin/middleware)
import { adminApiLimiter, requireAdminAuth } from "../middleware/adminAuth.js";

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
// Prosty health-check używany przez frontend przy starcie panelu.
// Nie wymaga autoryzacji – jeżeli req.user jest ustawiony przez wyższe middleware,
// zwrócimy podstawowe info o użytkowniku, w przeciwnym razie user=null.
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

/** Dashboard (wymagana autoryzacja admin) */
router.use("/dashboard", requireAdminAuth, dashboardRoutes);

/** Users (wymagana autoryzacja admin) */
router.use("/users", requireAdminAuth, userRoutes);

/** Listings (wymagana autoryzacja admin) */
router.use("/listings", requireAdminAuth, listingRoutes);

/** Reports (wymagana autoryzacja admin) */
router.use("/reports", requireAdminAuth, reportRoutes);

/** Promotions (wymagana autoryzacja admin) */
router.use("/promotions", requireAdminAuth, promotionRoutes);

/** Settings (wymagana autoryzacja admin) */
router.use("/settings", requireAdminAuth, settingsRoutes);

/** Statistics (wymagana autoryzacja admin) */
router.use("/statistics", requireAdminAuth, statisticsRoutes);

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

      // reports
      "GET /admin-panel/reports",

      // promotions (CRUD + tools)
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

      // cleanup / session tools
      "GET /admin-panel/clear-cookies",
      "POST /admin-panel/clear-cookies",
      "POST /admin-panel/cleanup-session",
      "GET /admin-panel/session-info",
    ],
  });
});

export default router;
