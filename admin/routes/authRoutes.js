import express from 'express';
import { loginAdmin, logoutAdmin, checkAdminAuth } from '../controllers/auth/authController.js';
import { requireAdminAuth, adminLoginLimiter } from '../middleware/adminAuth.js';

/**
 * Admin Authentication Routes
 * Secure cookie-based authentication endpoints
 * Features: Rate limiting, security logging, session management
 * 
 * @author Senior Developer
 * @version 1.0.0
 */

const router = express.Router();

/**
 * POST /api/admin-panel/auth/login
 * Admin login with cookie-based authentication
 * 
 * Body:
 * - email: string (required) - Admin email address
 * - password: string (required) - Admin password
 * 
 * Response:
 * - Sets HttpOnly cookie 'admin_token'
 * - Returns admin user data
 */
router.post('/login', adminLoginLimiter, loginAdmin);

/**
 * POST /api/admin-panel/auth/logout
 * Admin logout with token cleanup
 * 
 * Response:
 * - Clears HttpOnly cookie 'admin_token'
 * - Logs logout activity
 */
router.post('/logout', requireAdminAuth, logoutAdmin);

/**
 * GET /api/admin-panel/auth/check
 * Check admin authentication status
 * 
 * Response:
 * - Returns current admin user data if authenticated
 * - Returns 401 if not authenticated
 */
router.get('/check', requireAdminAuth, checkAdminAuth);

/**
 * GET /api/admin-panel/auth/me
 * Alias for auth check (common pattern)
 */
router.get('/me', requireAdminAuth, checkAdminAuth);

/**
 * GET /api/admin-panel/auth/session
 * Check admin session status (frontend compatibility)
 */
router.get('/session', requireAdminAuth, checkAdminAuth);

export default router;
