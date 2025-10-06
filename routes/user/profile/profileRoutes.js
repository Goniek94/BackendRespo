/**
 * PROFILE ROUTES
 * Trasy związane z profilem użytkownika
 */

import express from "express";
import auth from "../../../middleware/auth.js";
import {
  getUserProfile,
  updateUserProfile,
  getRecentlyViewed,
  requestEmailChange,
  verifyEmailChange,
  requestPhoneChange,
  verifyPhoneChange,
  requestPasswordReset,
  resetPassword,
} from "../../../controllers/user/index.js";
import { getUserDashboard } from "../../../controllers/user/dashboardController.js";
import trackDailyActive from "../../../middleware/analytics/trackDailyActive.js";
import { asyncHandler as ah } from "../../../utils/asyncHandler.js";

const router = express.Router();

// =================================================================
// PUBLIC ROUTES (no auth required)
// =================================================================

// Request password reset (public - anyone can request)
router.post("/request-password-reset", ah(requestPasswordReset));

// Reset password with token (public - anyone with valid token)
router.post("/reset-password", ah(resetPassword));

// =================================================================
// PROTECTED ROUTES (auth required)
// =================================================================

// Auth + tracking dla wszystkich tras poniżej
router.use(auth, trackDailyActive);

// Pobranie profilu użytkownika
router.get("/profile", ah(getUserProfile));

// Pobranie danych dashboardu użytkownika
router.get("/dashboard", ah(getUserDashboard));

// Pobranie ostatnio oglądanych ogłoszeń użytkownika
router.get("/recently-viewed", ah(getRecentlyViewed));

// Aktualizacja podstawowych danych profilu (imię, nazwisko)
router.put("/profile", ah(updateUserProfile));

// =================================================================
// EMAIL CHANGE ROUTES
// =================================================================

// Request email change - sends verification code to new email
router.post("/request-email-change", ah(requestEmailChange));

// Verify email change with code
router.post("/verify-email-change", ah(verifyEmailChange));

// =================================================================
// PHONE CHANGE ROUTES
// =================================================================

// Request phone change - sends verification code via SMS
router.post("/request-phone-change", ah(requestPhoneChange));

// Verify phone change with code
router.post("/verify-phone-change", ah(verifyPhoneChange));

export default router;
