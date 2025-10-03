/**
 * Async Handler Wrapper
 * Catches errors from async route handlers and passes them to Express error handler
 *
 * Usage:
 * router.get('/route', asyncHandler(async (req, res, next) => {
 *   // Your async code here
 * }));
 */

/**
 * Wraps async route handlers to catch errors and pass them to next()
 * @param {Function} fn - Async route handler function
 * @returns {Function} Express middleware function
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Shorter alias
export const ah = asyncHandler;

export default asyncHandler;
