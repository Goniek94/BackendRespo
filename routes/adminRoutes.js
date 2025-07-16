// routes/adminRoutes.js
/**
 * Trasy dla panelu administratora
 * Routes for admin panel
 */

import express from 'express';
import authMiddleware from '../middleware/auth.js';
import roleCheck from '../middleware/roleMiddleware.js';

// Legacy admin routes - basic functionality only
// For full admin features, use /api/admin-panel endpoints

// Placeholder controllers for legacy compatibility
const placeholderController = {
  getDashboardStats: (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Legacy admin endpoint. Use /api/admin-panel for full functionality.',
      redirect: '/api/admin-panel/health',
      data: {
        totalUsers: 0,
        totalAds: 0,
        pendingReports: 0
      }
    });
  },
  
  getUsers: (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Legacy endpoint. Use /api/admin-panel/users for full user management.',
      redirect: '/api/admin-panel/users',
      data: []
    });
  },
  
  getUserDetails: (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Legacy endpoint. Use /api/admin-panel/users/:id for full user details.',
      redirect: `/api/admin-panel/users/${req.params.userId}`,
      data: null
    });
  },
  
  updateUser: (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Legacy endpoint. Use /api/admin-panel/users/:id for user updates.',
      redirect: `/api/admin-panel/users/${req.params.userId}`
    });
  },
  
  deleteUser: (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Legacy endpoint. Use /api/admin-panel/users/:id for user deletion.',
      redirect: `/api/admin-panel/users/${req.params.userId}`
    });
  },
  
  blockUser: (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Legacy endpoint. Use /api/admin-panel/users/:id/block for user blocking.',
      redirect: `/api/admin-panel/users/${req.params.userId}/block`
    });
  },
  
  unblockUser: (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Legacy endpoint. Use /api/admin-panel/users/:id/block for user unblocking.',
      redirect: `/api/admin-panel/users/${req.params.userId}/block`
    });
  }
};

// Use placeholder for all missing controllers
const dashboardController = placeholderController;
const userController = placeholderController;
const adController = placeholderController;
const commentController = placeholderController;
const reportController = placeholderController;
const discountController = placeholderController;

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
router.get('/ads', authMiddleware, adminOrModerator, placeholderController.getUsers);
router.get('/ads/pending', authMiddleware, adminOrModerator, placeholderController.getUsers);
router.get('/ads/:adId', authMiddleware, adminOrModerator, placeholderController.getUserDetails);
router.put('/ads/:adId', authMiddleware, adminOrModerator, placeholderController.updateUser);
router.delete('/ads/:adId', authMiddleware, adminOnly, placeholderController.deleteUser);
router.post('/ads/bulk-discount', authMiddleware, adminOnly, placeholderController.updateUser);
router.post('/ads/:adId/approve', authMiddleware, adminOrModerator, placeholderController.updateUser);
router.post('/ads/:adId/reject', authMiddleware, adminOrModerator, placeholderController.updateUser);
router.post('/ads/:adId/moderate', authMiddleware, adminOrModerator, placeholderController.updateUser);

/**
 * Trasy zarządzania komentarzami / Comment management routes
 */
router.get('/comments', authMiddleware, adminOrModerator, placeholderController.getUsers);
router.get('/comments/:commentId', authMiddleware, adminOrModerator, placeholderController.getUserDetails);
router.put('/comments/:commentId/status', authMiddleware, adminOrModerator, placeholderController.updateUser);
router.delete('/comments/:commentId', authMiddleware, adminOrModerator, placeholderController.deleteUser);
router.post('/comments/bulk-update', authMiddleware, adminOrModerator, placeholderController.updateUser);

/**
 * Trasy zarządzania zgłoszeniami / Report management routes
 */
router.get('/reports', authMiddleware, adminOrModerator, placeholderController.getUsers);
router.get('/reports/:reportId', authMiddleware, adminOrModerator, placeholderController.getUserDetails);
router.put('/reports/:reportId/status', authMiddleware, adminOrModerator, placeholderController.updateUser);
router.delete('/reports/:reportId', authMiddleware, adminOnly, placeholderController.deleteUser);
router.put('/reports/:reportId/assign', authMiddleware, adminOrModerator, placeholderController.updateUser);

/**
 * Trasy zarządzania zniżkami i bonusami / Discount and bonus management routes
 */
// Zniżki dla ogłoszeń / Discounts for ads
router.get('/discounts', authMiddleware, adminOrModerator, placeholderController.getUsers);
router.put('/ads/:adId/discount', authMiddleware, adminOnly, placeholderController.updateUser);
router.post('/discounts/bulk', authMiddleware, adminOnly, placeholderController.updateUser);
router.put('/users/:userId/discounts', authMiddleware, adminOnly, placeholderController.updateUser);
router.put('/categories/:category/discounts', authMiddleware, adminOnly, placeholderController.updateUser);

// Bonusy dla użytkowników / Bonuses for users
router.post('/users/:userId/bonuses', authMiddleware, adminOnly, placeholderController.updateUser);
router.get('/users/:userId/bonuses', authMiddleware, adminOrModerator, placeholderController.getUsers);
router.delete('/users/:userId/bonuses/:bonusId', authMiddleware, adminOnly, placeholderController.deleteUser);

export default router;
