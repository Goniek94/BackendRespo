import express from 'express';
import { body } from 'express-validator';
import auth from '../../middleware/auth.js';
import { 
  authLimiter, 
  passwordResetLimiter 
} from '../../middleware/rateLimiting.js';
import {
  changePassword,
  requestPasswordReset,
  resetPassword
} from '../../controllers/user/index.js';

const router = express.Router();

/**
 * PASSWORD ROUTES
 * Trasy związane z zarządzaniem hasłami
 */

// Żądanie resetu hasła
router.post(
  '/request-reset-password',
  passwordResetLimiter, // Rate limiting dla resetowania hasła
  [
    body('email').isEmail().withMessage('Proszę podać prawidłowy adres email.')
  ],
  requestPasswordReset
);

// Resetowanie hasła
router.post(
  '/reset-password',
  authLimiter, // Rate limiting
  [
    body('password')
      .isLength({ min: 8 })
      .withMessage('Hasło musi mieć co najmniej 8 znaków.'),
    body('token').notEmpty().withMessage('Token resetu hasła jest wymagany.')
  ],
  resetPassword
);

// Zmiana hasła (gdy użytkownik jest zalogowany)
router.put(
  '/change-password',
  auth, // Wymagana autoryzacja
  [
    body('oldPassword').notEmpty().withMessage('Stare hasło jest wymagane.'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Nowe hasło musi mieć co najmniej 8 znaków.')
  ],
  changePassword
);

export default router;
