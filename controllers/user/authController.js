/**
 * Main Auth Controller - Central Import Hub
 *
 * This file serves as the main importer for all authentication-related functions.
 * All actual implementation is in the auth/ subdirectory modules.
 *
 * Structure:
 * - auth/registerController.js - User registration
 * - auth/loginController.js - User login
 * - auth/logoutController.js - User logout with token blacklisting
 * - auth/checkAuthController.js - Authentication check with security fix 🔒
 * - auth/passwordResetController.js - Password reset flow
 * - auth/tokenController.js - Token refresh
 * - auth/twoFactorController.js - 2FA placeholders
 */

// Import and re-export all auth functions
export { registerUser } from "./auth/registerController.js";
export { loginUser } from "./auth/loginController.js";
export { logoutUser } from "./auth/logoutController.js";
export { checkAuth } from "./auth/checkAuthController.js";
export {
  requestPasswordReset,
  resetPassword,
} from "./auth/passwordResetController.js";
export { refreshToken } from "./auth/tokenController.js";
export { send2FACode, verify2FACode } from "./auth/twoFactorController.js";
