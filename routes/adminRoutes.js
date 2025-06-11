// routes/adminRoutes.js
/**
 * Trasy dla panelu administratora
 * Routes for admin panel
 */

import express from 'express';
import authMiddleware from '../middleware/auth.js';
import roleCheck from '../middleware/roleMiddleware.js';

// Kontrolery administratora / Admin controllers
import * as dashboardController from '../controllers/admin/dashboardController.js';
import * as userController from '../controllers/admin/userController.js';
import * as adController from '../controllers/admin/adController.js';
import * as commentController from '../controllers/admin/commentController.js';
import * as reportController from '../controllers/admin/reportController.js';
import * as discountController from '../controllers/admin/discountController.js';

const router = express.Router();

// Middleware do sprawdzania uprawnień administratora / Middleware to check admin permissions
const adminOnly = roleCheck(['admin']);
const adminOrModerator = roleCheck(['admin', 'moderator']);

/**
 * Trasy dashboardu / Dashboard routes
 */
router.get('/dashboard/stats', authMiddleware, adminOrModerator, dashboardController.getDashboardStats);

/**
 * Trasy zarządzania użytkownikami / User management routes
 */
router.get('/users', authMiddleware, adminOrModerator, userController.getUsers);
router.get('/users/:userId', authMiddleware, adminOrModerator, userController.getUserDetails);
router.put('/users/:userId', authMiddleware, adminOnly, userController.updateUser);
router.delete('/users/:userId', authMiddleware, adminOnly, userController.deleteUser);
router.post('/users/:userId/block', authMiddleware, adminOrModerator, userController.blockUser);
router.post('/users/:userId/unblock', authMiddleware, adminOrModerator, userController.unblockUser);

/**
 * Trasy zarządzania ogłoszeniami / Ad management routes
 */
router.get('/ads', authMiddleware, adminOrModerator, adController.getAds);
router.get('/ads/pending', authMiddleware, adminOrModerator, adController.getPendingAds);
router.get('/ads/:adId', authMiddleware, adminOrModerator, adController.getAdDetails);
router.put('/ads/:adId', authMiddleware, adminOrModerator, adController.updateAd);
router.delete('/ads/:adId', authMiddleware, adminOnly, adController.deleteAd);
router.post('/ads/bulk-discount', authMiddleware, adminOnly, adController.setBulkDiscount);
router.post('/ads/:adId/approve', authMiddleware, adminOrModerator, adController.approveAd);
router.post('/ads/:adId/reject', authMiddleware, adminOrModerator, adController.rejectAd);
router.post('/ads/:adId/moderate', authMiddleware, adminOrModerator, adController.moderateAd);

/**
 * Trasy zarządzania komentarzami / Comment management routes
 */
router.get('/comments', authMiddleware, adminOrModerator, commentController.getComments);
router.get('/comments/:commentId', authMiddleware, adminOrModerator, commentController.getCommentDetails);
router.put('/comments/:commentId/status', authMiddleware, adminOrModerator, commentController.updateCommentStatus);
router.delete('/comments/:commentId', authMiddleware, adminOrModerator, commentController.deleteComment);
router.post('/comments/bulk-update', authMiddleware, adminOrModerator, commentController.bulkUpdateComments);

/**
 * Trasy zarządzania zgłoszeniami / Report management routes
 */
router.get('/reports', authMiddleware, adminOrModerator, reportController.getReports);
router.get('/reports/:reportId', authMiddleware, adminOrModerator, reportController.getReportDetails);
router.put('/reports/:reportId/status', authMiddleware, adminOrModerator, reportController.updateReportStatus);
router.delete('/reports/:reportId', authMiddleware, adminOnly, reportController.deleteReport);
router.put('/reports/:reportId/assign', authMiddleware, adminOrModerator, reportController.assignReport);

/**
 * Trasy zarządzania zniżkami i bonusami / Discount and bonus management routes
 */
// Zniżki dla ogłoszeń / Discounts for ads
router.get('/discounts', authMiddleware, adminOrModerator, discountController.getDiscounts);
router.put('/ads/:adId/discount', authMiddleware, adminOnly, discountController.setDiscount);
router.post('/discounts/bulk', authMiddleware, adminOnly, discountController.setBulkDiscount);
router.put('/users/:userId/discounts', authMiddleware, adminOnly, discountController.setUserDiscount);
router.put('/categories/:category/discounts', authMiddleware, adminOnly, discountController.setCategoryDiscount);

// Bonusy dla użytkowników / Bonuses for users
router.post('/users/:userId/bonuses', authMiddleware, adminOnly, discountController.addUserBonus);
router.get('/users/:userId/bonuses', authMiddleware, adminOrModerator, discountController.getUserBonuses);
router.delete('/users/:userId/bonuses/:bonusId', authMiddleware, adminOnly, discountController.removeUserBonus);

export default router;
