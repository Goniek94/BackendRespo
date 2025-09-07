import express from 'express';
import { 
  getDashboardStats, 
  getDetailedUserStats, 
  getDetailedListingStats, 
  getDetailedMessageStats,
  getSystemHealth,
  getActivityTimeline
} from '../controllers/dashboard/dashboardController.js';
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

// Detailed statistics endpoints
// GET /admin/dashboard/users/stats - Get detailed user statistics
router.get('/users/stats', getDetailedUserStats);

// GET /admin/dashboard/listings/stats - Get detailed listing statistics
router.get('/listings/stats', getDetailedListingStats);

// GET /admin/dashboard/messages/stats - Get detailed message statistics
router.get('/messages/stats', getDetailedMessageStats);

// GET /admin/dashboard/system/health - Get system health information
router.get('/system/health', getSystemHealth);

// GET /admin/dashboard/activity/timeline - Get activity timeline
router.get('/activity/timeline', getActivityTimeline);

// Activity cleanup routes
// POST /admin/dashboard/cleanup - Manual cleanup of old activity
router.post('/cleanup', cleanupOldActivity);

// GET /admin/dashboard/cleanup/stats - Get cleanup statistics
router.get('/cleanup/stats', getCleanupStats);

// POST /admin/dashboard/cleanup/schedule - Schedule automatic cleanup
router.post('/cleanup/schedule', scheduleCleanup);

export default router;
