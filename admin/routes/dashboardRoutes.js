import express from 'express';
import { getDashboardStats } from '../controllers/dashboard/dashboardController.js';

const router = express.Router();

/**
 * Dashboard Routes
 * Endpoints for admin dashboard data
 */

// GET /admin/dashboard/stats - Get dashboard statistics
router.get('/stats', getDashboardStats);

export default router;
