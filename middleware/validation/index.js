/**
 * Validation Middleware
 * 
 * This module exports all validation related middleware
 * for the Marketplace Backend application.
 * 
 * @author Marketplace Team
 * @version 2.0.0
 */

const validate = require('./validate');

module.exports = {
  // Main validation middleware
  validate,
  
  // Convenience exports
  validateRequest: validate,
  
  // Specific validation helpers (can be extended)
  validateBody: (schema) => validate(schema, 'body'),
  validateQuery: (schema) => validate(schema, 'query'),
  validateParams: (schema) => validate(schema, 'params'),
};
