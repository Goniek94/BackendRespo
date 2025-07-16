/**
 * Middleware Index
 * 
 * Central export point for all middleware modules in the Marketplace Backend.
 * This provides a clean, organized way to import middleware throughout the application.
 * 
 * @author Marketplace Team
 * @version 2.0.0
 */

// Import middleware categories
const auth = require('./auth');
const validation = require('./validation');
const processing = require('./processing');
const errors = require('./errors');

module.exports = {
  // Authentication & Authorization
  auth,
  
  // Validation
  validation,
  
  // Data Processing
  processing,
  
  // Error Handling
  errors,
  
  // Convenience exports for common middleware
  requireAuth: auth.requireAuth,
  requireAdmin: auth.requireAdmin,
  requireModerator: auth.requireModerator,
  validate: validation.validate,
  processImages: processing.processImages,
  handleErrors: errors.handleErrors,
};
