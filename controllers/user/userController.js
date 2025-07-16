/**
 * User Controller - Backward Compatibility Layer
 * This file maintains backward compatibility by re-exporting all user functions
 * from the new modular structure in controllers/user/
 */

// Re-export all functions from the new modular structure
export * from './user/index.js';
