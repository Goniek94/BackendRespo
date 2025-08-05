import express from 'express';
import { getDashboardStats } from '../controllers/dashboard/dashboardController.js';
import { cleanupOldActivity, getCleanupStats, scheduleCleanup } from '../controllers/dashboard/activityCleanupController.js';

const router = express.Router();

/**
 * Dashboard Routes
 * Endpoints for admin dashboard data
 * Authentication is handled by parent router
 */

// GET /admin/dashboard - Get dashboard statistics (main endpoint)
router.get('/', getDashboardStats);

// GET /admin/dashboard/stats - Get dashboard statistics (alias)
router.get('/stats', getDashboardStats);

// Activity cleanup routes
// POST /admin/dashboard/cleanup - Manual cleanup of old activity
router.post('/cleanup', cleanupOldActivity);

// GET /admin/dashboard/cleanup/stats - Get cleanup statistics
router.get('/cleanup/stats', getCleanupStats);

// POST /admin/dashboard/cleanup/schedule - Schedule automatic cleanup
router.post('/cleanup/schedule', scheduleCleanup);

export default router;
