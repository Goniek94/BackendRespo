import express from 'express';
import {
  getUsers,
  getUserById,
  updateUser,
  toggleUserBlock,
  deleteUser,
  bulkUpdateUsers,
  getUserAnalytics,
  exportUsers
} from '../controllers/users/userController.js';
import {
  validateUserUpdate,
  validateUserBlock,
  validateUserDelete,
  validateBulkUserUpdate,
  validateUserQuery,
  validateAnalyticsQuery,
  validateExportQuery,
  validateUserId,
  validateBusinessRules,
  sanitizeUserInput
} from '../validators/userValidators.js';
import {
  requireAdminAuth,
  requireAdminRole,
  logAdminActivity,
  adminApiLimiter
} from '../middleware/adminAuth.js';

/**
 * Professional User Management Routes
 * Secure, validated, and monitored routes for user administration
 * Features: Authentication, authorization, validation, activity logging
 * 
 * @author Senior Developer
 * @version 1.0.0
 */

const router = express.Router();

// Apply authentication and rate limiting to all routes
router.use(requireAdminAuth);
router.use(adminApiLimiter);

/**
 * GET /admin/users
 * Get paginated list of users with filtering and sorting
 * Permissions: admin, moderator
 */
router.get('/',
  requireAdminRole(['admin', 'moderator']),
  validateUserQuery,
  logAdminActivity('users_list_viewed'),
  getUsers
);

/**
 * GET /admin/users/analytics
 * Get user analytics and insights
 * Permissions: admin only
 */
router.get('/analytics',
  requireAdminRole(['admin']),
  validateAnalyticsQuery,
  logAdminActivity('users_analytics_viewed'),
  getUserAnalytics
);

/**
 * GET /admin/users/export
 * Export users data in JSON or CSV format
 * Permissions: admin only
 */
router.get('/export',
  requireAdminRole(['admin']),
  validateExportQuery,
  logAdminActivity('users_data_exported'),
  exportUsers
);

/**
 * POST /admin/users/bulk-update
 * Bulk update multiple users
 * Permissions: admin, moderator (with limits)
 */
router.post('/bulk-update',
  requireAdminRole(['admin', 'moderator']),
  sanitizeUserInput,
  validateBulkUserUpdate,
  validateBusinessRules,
  logAdminActivity('users_bulk_updated'),
  bulkUpdateUsers
);

/**
 * GET /admin/users/:id
 * Get single user by ID with detailed information
 * Permissions: admin, moderator
 */
router.get('/:id',
  requireAdminRole(['admin', 'moderator']),
  validateUserId,
  logAdminActivity('user_details_viewed'),
  getUserById
);

/**
 * PUT /admin/users/:id
 * Update user information
 * Permissions: admin, moderator (limited fields)
 */
router.put('/:id',
  requireAdminRole(['admin', 'moderator']),
  sanitizeUserInput,
  validateUserUpdate,
  validateBusinessRules,
  logAdminActivity('user_updated'),
  updateUser
);

/**
 * POST /admin/users/:id/block
 * Block or unblock user
 * Permissions: admin, moderator
 */
router.post('/:id/block',
  requireAdminRole(['admin', 'moderator']),
  sanitizeUserInput,
  validateUserBlock,
  validateBusinessRules,
  logAdminActivity('user_block_toggled'),
  toggleUserBlock
);

/**
 * DELETE /admin/users/:id
 * Delete user (soft delete)
 * Permissions: admin only
 */
router.delete('/:id',
  requireAdminRole(['admin']),
  sanitizeUserInput,
  validateUserDelete,
  validateBusinessRules,
  logAdminActivity('user_deleted'),
  deleteUser
);

export default router;
