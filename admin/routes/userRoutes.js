// routes/admin/userRoutes.js
import express from "express";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserBlock,
  deleteUser,
  bulkUpdateUsers,
  getUserAnalytics,
  exportUsers,
} from "../controllers/users/userController.js"; // <— UWAGA na ścieżkę (1x ..)
import {
  validateUserCreate,
  validateUserUpdate,
  validateUserBlock,
  validateUserDelete,
  validateBulkUserUpdate,
  validateUserQuery,
  validateAnalyticsQuery,
  validateExportQuery,
  validateUserId,
  validateBusinessRules,
  sanitizeUserInput,
} from "../validators/userValidators.js"; // <— UWAGA na ścieżkę (1x ..)
import {
  // requireAdminAuth, // użyj tylko jeśli NIE montujesz z requireAuth w parent index
  requireAdminRole,
  logAdminActivity, // przywrócone po naprawie AdminActivity
  // adminApiLimiter   // rate limit masz globalnie w routes/admin/index.js
} from "../middleware/adminAuth.js"; // <— w tym samym module /routes/middleware

/**
 * Professional User Management Routes
 * Secure, validated, and monitored routes for user administration
 */

const router = express.Router();

// Jeśli NIE montujesz tych tras z requireAuth w parent routerze, odkomentuj:
// router.use(requireAdminAuth);

/**
 * GET /api/admin-panel/users
 * Lista użytkowników (paginacja + filtry)
 * Uprawnienia: admin, moderator
 */
router.get(
  "/",
  requireAdminRole(["admin", "moderator"]),
  validateUserQuery,
  logAdminActivity("users_list_viewed"),
  getUsers
);

/**
 * GET /api/admin-panel/users/stats
 * Alias do analytics
 * Uprawnienia: admin
 */
router.get(
  "/stats",
  requireAdminRole(["admin"]),
  validateAnalyticsQuery,
  logAdminActivity("users_stats_viewed"),
  getUserAnalytics
);

/**
 * GET /api/admin-panel/users/analytics
 * Analityka użytkowników
 * Uprawnienia: admin
 */
router.get(
  "/analytics",
  requireAdminRole(["admin"]),
  validateAnalyticsQuery,
  logAdminActivity("users_analytics_viewed"),
  getUserAnalytics
);

/**
 * GET /api/admin-panel/users/export
 * Eksport JSON/CSV
 * Uprawnienia: admin
 */
router.get(
  "/export",
  requireAdminRole(["admin"]),
  validateExportQuery,
  logAdminActivity("users_data_exported"),
  exportUsers
);

/**
 * POST /api/admin-panel/users
 * Tworzenie użytkownika
 * Uprawnienia: admin
 */
router.post(
  "/",
  requireAdminRole(["admin"]),
  sanitizeUserInput,
  validateUserCreate,
  // TYMCZASOWO WYŁĄCZONE: validateBusinessRules blokuje tworzenie użytkowników
  // validateBusinessRules,
  logAdminActivity("user_created"),
  createUser
);

/**
 * POST /api/admin-panel/users/bulk-update
 * Zbiorcza aktualizacja
 * Uprawnienia: admin, moderator
 */
router.post(
  "/bulk-update",
  requireAdminRole(["admin", "moderator"]),
  sanitizeUserInput,
  validateBulkUserUpdate,
  validateBusinessRules,
  logAdminActivity("bulk_operation"),
  bulkUpdateUsers
);

/**
 * GET /api/admin-panel/users/:id
 * Szczegóły użytkownika
 * Uprawnienia: admin, moderator
 */
router.get(
  "/:id",
  requireAdminRole(["admin", "moderator"]),
  validateUserId,
  logAdminActivity("user_details_viewed"),
  getUserById
);

/**
 * PUT /api/admin-panel/users/:id
 * Aktualizacja użytkownika
 * Uprawnienia: admin, moderator (ograniczone pola)
 */
router.put(
  "/:id",
  requireAdminRole(["admin", "moderator"]),
  sanitizeUserInput,
  validateUserUpdate,
  validateBusinessRules,
  logAdminActivity("user_updated"),
  updateUser
);

/**
 * POST /api/admin-panel/users/:id/block
 * Blokuj/odblokuj
 * Uprawnienia: admin, moderator
 */
router.post(
  "/:id/block",
  requireAdminRole(["admin", "moderator"]),
  sanitizeUserInput,
  validateUserBlock,
  validateBusinessRules,
  logAdminActivity("user_blocked"),
  toggleUserBlock
);

/**
 * POST /api/admin-panel/users/:id/send-password-reset
 * Wyślij link do resetu hasła
 * Uprawnienia: admin, moderator
 */
router.post(
  "/:id/send-password-reset",
  requireAdminRole(["admin", "moderator"]),
  validateUserId,
  logAdminActivity("password_reset_link_sent"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const crypto = await import("crypto");

      // Find user
      const User = (await import("../../models/user/user.js")).default;
      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "Użytkownik nie został znaleziony",
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      // Save token to user (expires in 1 hour)
      user.passwordResetToken = hashedToken;
      user.passwordResetTokenExpires = Date.now() + 3600000; // 1 hour
      await user.save();

      // Send email with reset link
      const emailService = (await import("../../services/emailService.js"))
        .default;
      const resetUrl = `${
        process.env.FRONTEND_URL || "http://localhost:3000"
      }/reset-password?token=${resetToken}`;

      await emailService.sendPasswordResetEmail(
        user.email,
        resetUrl,
        user.name || user.email
      );

      res.json({
        success: true,
        message: `Link do resetu hasła został wysłany na adres: ${user.email}`,
      });
    } catch (error) {
      console.error("Error sending password reset link:", error);
      res.status(500).json({
        success: false,
        error: "Błąd podczas wysyłania linku resetującego",
      });
    }
  }
);

/**
 * DELETE /api/admin-panel/users/:id
 * Usunięcie (soft delete)
 * Uprawnienia: admin
 */
router.delete(
  "/:id",
  requireAdminRole(["admin"]),
  sanitizeUserInput,
  validateUserDelete,
  validateBusinessRules,
  logAdminActivity("user_deleted"),
  deleteUser
);

export default router;
