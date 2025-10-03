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
} from "../../../controllers/user/index.js";
import { getUserDashboard } from "../../../controllers/user/dashboardController.js";
import trackDailyActive from "../../../middleware/analytics/trackDailyActive.js";
import { asyncHandler as ah } from "../../../utils/asyncHandler.js";

const router = express.Router();

// Auth + tracking dla wszystkich tras w tym routerze
router.use(auth, trackDailyActive);

// Pobranie profilu użytkownika (auth już zastosowane globalnie)
router.get("/profile", ah(getUserProfile));

// Pobranie danych dashboardu użytkownika
router.get("/dashboard", ah(getUserDashboard));

// Pobranie ostatnio oglądanych ogłoszeń użytkownika
router.get("/recently-viewed", ah(getRecentlyViewed));

// Aktualizacja profilu użytkownika
router.put("/profile", ah(updateUserProfile));

export default router;
