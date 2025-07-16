/**
 * Payments Routes Index
 * Exports all payment-related routes
 */

export { default as paymentRoutes } from './paymentRoutes.js';
export { default as transactionRoutes } from './transactionRoutes.js';

// Re-export for backward compatibility
export { default } from './paymentRoutes.js';
