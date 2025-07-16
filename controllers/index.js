/**
 * Controllers Index
 * Central export point for all controllers organized by category
 */

// User Controllers
export * from './user/index.js';

// Media Controllers
export * from './media/index.js';

// Notifications Controllers
export * from './notifications/index.js';

// Payments Controllers
export * from './payments/index.js';

// Communication Controllers
export * from './communication/index.js';

// Listings Controllers (placeholder for future listings controllers)
export * from './listings/index.js';


// User controllers
export { default as authController } from './user/authController.js';
export { default as profileController } from './user/profileController.js';
export { default as passwordController } from './user/passwordController.js';
export { default as settingsController } from './user/settingsController.js';
export { default as validationController } from './user/validationController.js';
export { default as verificationController } from './user/verificationController.js';
export { default as userController } from './user/userController.js';

// Communication sub-controllers
export { default as adMessages } from './communication/adMessages.js';
export { default as conversations } from './communication/conversations.js';
export { default as messageBasics } from './communication/messageBasics.js';
export { default as messageFlags } from './communication/messageFlags.js';
export { default as messageUtils } from './communication/utils.js';
