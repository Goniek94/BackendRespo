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
  checkAuth
} from './authController.js';

// Profile Controller
export {
  getUserProfile,
  updateUserProfile
} from './profileController.js';

// Password Controller
export {
  changePassword,
  requestPasswordReset,
  verifyResetToken,
  resetPassword
} from './passwordController.js';

// Validation Controller
export {
  checkEmailExists,
  checkPhoneExists,
  verifyEmailCode
} from './validationController.js';
