/**
 * Listings Routes Index
 * Exports all listing-related routes
 */

export { default as adRoutes } from './adRoutes.js';
export { default as commentRoutes } from './commentRoutes.js';
export { default as favoriteRoutes } from './favoriteRoutes.js';
export { default as statsRoutes } from './statsRoutes.js';

// Re-export for backward compatibility
export { default } from './adRoutes.js';
