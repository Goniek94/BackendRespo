import express from 'express';
import { getDashboardStats } from '../controllers/dashboard/dashboardController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = express.Router();

/**
 * Dashboard Routes
 * Endpoints for admin dashboard data
 * All routes protected by requireAdminAuth middleware
 */

// Apply admin authentication to all routes
router.use(requireAdminAuth);

// GET /admin/dashboard - Get dashboard statistics (main endpoint)
router.get('/', getDashboardStats);

// GET /admin/dashboard/stats - Get dashboard statistics (alias)
router.get('/stats', getDashboardStats);

export default router;
