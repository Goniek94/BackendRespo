// src/routes/userRoutes.js
import express from 'express';
import {
  registerUser,
  loginUser,
  send2FACode,
  verify2FACode,
  requestPasswordReset,
  resetPassword,
  changePassword,
  verifyEmailCode,
  checkEmailExists,
  checkPhoneExists
} from '../controllers/userController.js';
import { body } from 'express-validator';
import auth from '../middleware/auth.js';

const router = express.Router();

// Sprawdzanie czy email istnieje
router.post('/check-email', checkEmailExists);

// Sprawdzanie czy telefon istnieje
router.post('/check-phone', checkPhoneExists);

// Rejestracja użytkownika
router.post(
  '/register',
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Imię jest wymagane.')
      .isLength({ min: 2 })
      .withMessage('Imię musi zawierać co najmniej 2 znaki.'),

    body('email')
      .isEmail()
      .withMessage('Nieprawidłowy format email.'),

    body('password')
      .isLength({ min: 8 })
      .withMessage('Hasło musi mieć co najmniej 8 znaków.'),

    // [ZMIANA!] Regex akceptuje + i 9-14 cyfr
    body('phone')
      .matches(/^\+?[0-9]{9,14}$/)
      .withMessage('Numer telefonu powinien zawierać 9-14 cyfr (opcjonalnie +).'),

    body('dob')
      .isDate()
      .withMessage('Nieprawidłowa data urodzenia.')
  ],
  registerUser
);

// Logowanie użytkownika
router.post(
  '/login',
  [
    body('email')
      .isEmail()
      .withMessage('Nieprawidłowy format email.'),
    body('password')
      .notEmpty()
      .withMessage('Hasło jest wymagane.')
  ],
  loginUser
);

// Wysyłanie kodu SMS 2FA
router.post('/send-2fa', send2FACode);

// Weryfikacja kodu 2FA
router.post('/verify-2fa', verify2FACode);

// Weryfikacja kodu email
router.post('/verify-email', verifyEmailCode);

// Żądanie resetu hasła
router.post(
  '/request-reset-password',
  [
    body('email').isEmail().withMessage('Proszę podać prawidłowy adres email.')
  ],
  requestPasswordReset
);

// Resetowanie hasła
router.post(
  '/reset-password',
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
  auth,
  [
    body('oldPassword').notEmpty().withMessage('Stare hasło jest wymagane.'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Nowe hasło musi mieć co najmniej 8 znaków.')
  ],
  changePassword
);

export default router;