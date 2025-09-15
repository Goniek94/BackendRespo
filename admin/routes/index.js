import express from 'express';
import userRoutes from './userRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import authRoutes from './authRoutes.js';
import listingRoutes from './listingRoutes.js';
import reportRoutes from './reportRoutes.js';
// import promotionRoutes from './promotionRoutes.js'; // TODO: Create this file
import cleanupRoutes from './cleanupRoutes.js';
import { requireAuth } from '../../middleware/auth.js';
import { adminApiLimiter } from '../middleware/adminAuth.js';

// Simple admin role check middleware
const requireAdminRole = (req, res, next) => {
  if (!req.user || !['admin', 'moderator'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: 'Brak uprawnień administratora',
      code: 'INSUFFICIENT_PRIVILEGES'
    });
  }
  next();
};

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

// USUNIĘTE: Cache headers powodowały HTTP 431 - za duże nagłówki
// Minimalne cache control tylko gdy potrzebne
router.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache');
  next();
});

/**
 * API versioning and health check (protected)
 */
router.get('/health', requireAuth, requireAdminRole, (req, res) => {
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
router.use('/dashboard', requireAuth, requireAdminRole, dashboardRoutes);

/**
 * User management routes (protected)
 * All user-related admin operations
 */
router.use('/users', requireAuth, requireAdminRole, userRoutes);

/**
 * Listing management routes (protected)
 * All listing-related admin operations
 */
router.use('/listings', requireAuth, requireAdminRole, listingRoutes);

/**
 * Report management routes (protected)
 * All report-related admin operations
 */
router.use('/reports', requireAuth, requireAdminRole, reportRoutes);

/**
 * Promotion management routes (protected)
 * All promotion-related admin operations
 * TODO: Uncomment when promotionRoutes.js is created
 */
// router.use('/promotions', requireAdminAuth, promotionRoutes);

/**
 * Cleanup and session management routes
 * Cookie cleanup and session management (some public for fixing HTTP 431)
 */
router.use('/', cleanupRoutes);

/**
 * Future route modules will be added here:
 * 
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
      'POST /admin-panel/auth/login',
      'POST /admin-panel/auth/logout',
      'GET /admin-panel/auth/check',
      'GET /admin-panel/dashboard',
      'GET /admin-panel/dashboard/stats',
      'GET /admin-panel/users',
      'GET /admin-panel/users/analytics',
      'GET /admin-panel/users/export',
      'POST /admin-panel/users/bulk-update',
      'GET /admin-panel/users/:id',
      'PUT /admin-panel/users/:id',
      'POST /admin-panel/users/:id/block',
      'DELETE /admin-panel/users/:id',
      'GET /admin-panel/listings',
      'POST /admin-panel/listings',
      'GET /admin-panel/listings/stats',
      'GET /admin-panel/listings/pending',
      'GET /admin-panel/listings/:id',
      'PUT /admin-panel/listings/:id',
      'DELETE /admin-panel/listings/:id',
      'POST /admin-panel/listings/:id/approve',
      'POST /admin-panel/listings/:id/reject',
      'POST /admin-panel/listings/:id/moderate',
      'POST /admin-panel/listings/bulk-discount',
      'GET /admin-panel/reports',
      'GET /admin-panel/clear-cookies',
      'POST /admin-panel/clear-cookies',
      'POST /admin-panel/cleanup-session',
      'GET /admin-panel/session-info'
    ]
  });
});

export default router;
