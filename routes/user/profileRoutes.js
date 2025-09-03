import express from 'express';
import auth from '../../middleware/auth.js';
import {
  getUserProfile,
  updateUserProfile,
  getRecentlyViewed,
  getUserDashboard
} from '../../controllers/user/index.js';

const router = express.Router();

/**
 * PROFILE ROUTES
 * Trasy związane z profilem użytkownika i dashboard
 */

// Pobranie profilu użytkownika
router.get('/profile', auth, getUserProfile);

// Pobranie danych dashboard z realnymi statystykami
router.get('/dashboard', auth, getUserDashboard);

// Pobranie ostatnio oglądanych ogłoszeń użytkownika
router.get('/recently-viewed', auth, getRecentlyViewed);

// Aktualizacja profilu użytkownika
router.put('/profile', auth, updateUserProfile);

export default router;
