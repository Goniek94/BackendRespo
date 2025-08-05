/**
 * Error Handling Middleware
 * 
 * This module exports all error handling related middleware
 * for the Marketplace Backend application.
 * 
 * @author Marketplace Team
 * @version 2.0.0
 */

const errorHandler = require('./errorHandler');

module.exports = {
  // Main error handler middleware
  errorHandler,
  
  // Convenience exports
  handleErrors: errorHandler,
  
  // Future error handling middleware can be added here
  // notFoundHandler: require('./notFoundHandler'),
  // validationErrorHandler: require('./validationErrorHandler'),
};
