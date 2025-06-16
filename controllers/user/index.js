import * as authController from './authController.js';
  import * as profileController from './profileController.js';
  import * as verificationController from './verificationController.js';
  import * as passwordController from './passwordController.js';
  import * as validationController from './validationController.js';
import * as settingsController from './settingsController.js';

  export {
    authController,
    profileController,
    verificationController,
    passwordController,
    validationController,
    settingsController
  };

  // Eksportowanie wszystkich funkcji bezpośrednio (alternatywny sposób importu)
  export const {
    registerUser,
    loginUser,
    logoutUser,
    checkAuth,
    registerGoogleUser,
    completeGoogleUserProfile
  } = authController;

  export const {
    getUserProfile,
    updateUserProfile
  } = profileController;

  export const {
    send2FACode,
    verify2FACode,
    verifyEmailCode
  } = verificationController;

  export const {
    requestPasswordReset,
    verifyResetToken,
    resetPassword,
    changePassword
  } = passwordController;

  export const {
    checkEmailExists,
    checkPhoneExists
  } = validationController;
