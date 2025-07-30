import express from 'express';
import userRoutes from './userRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import authRoutes from './authRoutes.js';
import listingRoutes from './listingRoutes.js';
import { requireAdminAuth, adminApiLimiter } from '../middleware/adminAuth.js';

/**
 * Main Admin Routes Index
 * Central routing hub for all admin panel endpoints
 * Features: Modular routing, versioning, middleware organization
 * 
 * @author Senior Developer
 * @version 1.0.0
 */

const router = express.Router();

// Apply rate limiting to all admin API routes
router.use(adminApiLimiter);

/**
 * API versioning and health check (protected)
 */
router.get('/health', requireAdminAuth, (req, res) => {
  res.json({
    success: true,
    service: 'Admin Panel API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    user: {
      id: req.user._id,
      role: req.user.role,
      email: req.user.email
    }
  });
});

/**
 * Authentication routes
 * Admin login, logout, and auth check
 */
router.use('/auth', authRoutes);

/**
 * Dashboard routes (protected)
 * Dashboard statistics and data
 */
router.use('/dashboard', requireAdminAuth, dashboardRoutes);

/**
 * User management routes (protected)
 * All user-related admin operations
 */
router.use('/users', requireAdminAuth, userRoutes);

/**
 * Listing management routes (protected)
 * All listing-related admin operations
 */
router.use('/listings', requireAdminAuth, listingRoutes);

/**
 * Future route modules will be added here:
 * 
 * router.use('/promotions', promotionRoutes);
 * router.use('/reports', reportRoutes);
 * router.use('/comments', commentRoutes);
 * router.use('/analytics', analyticsRoutes);
 * router.use('/settings', settingsRoutes);
 */

/**
 * 404 handler for admin routes
 */
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Admin endpoint not found',
    code: 'ADMIN_ENDPOINT_NOT_FOUND',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      'GET /admin-panel/health',
      'GET /admin-panel/dashboard',
      'GET /admin-panel/dashboard/stats',
      'GET /admin-panel/users',
      'GET /admin-panel/users/analytics',
      'GET /admin-panel/users/export',
      'POST /admin-panel/users/bulk-update',
      'GET /admin-panel/users/:id',
      'PUT /admin-panel/users/:id',
      'POST /admin-panel/users/:id/block',
      'DELETE /admin-panel/users/:id'
    ]
  });
});

export default router;
