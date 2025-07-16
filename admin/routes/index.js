import express from 'express';
import userRoutes from './userRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';

/**
 * Main Admin Routes Index
 * Central routing hub for all admin panel endpoints
 * Features: Modular routing, versioning, middleware organization
 * 
 * @author Senior Developer
 * @version 1.0.0
 */

const router = express.Router();

/**
 * API versioning and health check
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Admin Panel API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * Dashboard routes
 * Dashboard statistics and data
 */
router.use('/dashboard', dashboardRoutes);

/**
 * User management routes
 * All user-related admin operations
 */
router.use('/users', userRoutes);

/**
 * Future route modules will be added here:
 * 
 * router.use('/listings', listingRoutes);
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
      'GET /admin/health',
      'GET /admin/users',
      'GET /admin/users/analytics',
      'GET /admin/users/export',
      'POST /admin/users/bulk-update',
      'GET /admin/users/:id',
      'PUT /admin/users/:id',
      'POST /admin/users/:id/block',
      'DELETE /admin/users/:id'
    ]
  });
});

export default router;
