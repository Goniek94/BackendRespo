/**
 * User Controllers Index
 * Main export file for all user-related controllers
 * Maintains backward compatibility with existing imports
 */

// Authentication Controller
export {
  registerUser,
  loginUser,
  logoutUser,
  verify2FACode,
  send2FACode,
  checkAuth,
  requestPasswordReset,
  resetPassword
} from './authController.js';

// Profile Controller
export {
  getUserProfile,
  updateUserProfile,
  getRecentlyViewed
} from './profileController.js';

// Password Controller
export {
  changePassword,
  verifyResetToken
} from './passwordController.js';

// Validation Controller
export {
  checkEmailExists,
  checkPhoneExists,
  verifyEmailCode
} from './validationController.js';
