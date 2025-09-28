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

const router = express.Router();

// Pobranie profilu użytkownika
router.get("/profile", auth, getUserProfile);

// Pobranie danych dashboardu użytkownika
router.get("/dashboard", auth, getUserDashboard);

// Pobranie ostatnio oglądanych ogłoszeń użytkownika
router.get("/recently-viewed", auth, getRecentlyViewed);

// Aktualizacja profilu użytkownika
router.put("/profile", auth, updateUserProfile);

export default router;
