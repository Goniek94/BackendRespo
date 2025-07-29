import express from 'express';
import { getDashboardStats } from '../controllers/dashboard/dashboardController.js';

const router = express.Router();

/**
 * Dashboard Routes
 * Endpoints for admin dashboard data
 */

// GET /admin/dashboard - Get dashboard statistics (main endpoint)
router.get('/', getDashboardStats);

// GET /admin/dashboard/stats - Get dashboard statistics (alias)
router.get('/stats', getDashboardStats);

export default router;
