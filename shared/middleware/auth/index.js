/**
 * Authentication & Authorization Middleware
 * 
 * This module exports all authentication and authorization related middleware
 * for the Marketplace Backend application.
 * 
 * @author Marketplace Team
 * @version 2.0.0
 */

const auth = require('./auth');
const roleMiddleware = require('./roleMiddleware');

module.exports = {
  // Main authentication middleware
  auth,
  
  // Role-based access control
  roleMiddleware,
  
  // Convenience exports for common use cases
  requireAuth: auth,
  requireRole: roleMiddleware,
  
  // Admin specific middleware (if needed)
  requireAdmin: (req, res, next) => roleMiddleware(['admin'])(req, res, next),
  requireModerator: (req, res, next) => roleMiddleware(['admin', 'moderator'])(req, res, next),
};
