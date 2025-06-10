import express from 'express';
import { body } from 'express-validator';
import auth from '../middleware/auth.js';
import {
  authController,
  profileController,
  verificationController,
  passwordController,
  validationController,
  settingsController
} from '../controllers/user/index.js';

const router = express.Router();

// Google Authentication
router.post('/auth/google', authController.registerGoogleUser);

// Verification routes for phone and email
router.post('/verification/send', auth, verificationController.sendVerificationCode);
router.post('/verification/verify', auth, verificationController.verifyVerificationCode);

// Complete Google user profile (requiring phone, name, and last name verification)
router.put(
  '/complete-google-profile',
  auth,
  [
    body('phoneNumber')
      .matches(/^\+?[0-9]{9,14}$/)
      .withMessage('Numer telefonu powinien zawierać 9-14 cyfr (opcjonalnie +).'),
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Imię jest wymagane.')
      .isLength({ min: 2 })
      .withMessage('Imię musi zawierać co najmniej 2 znaki.'),
    body('lastName')
      .trim()
      .notEmpty()
      .withMessage('Nazwisko jest wymagane.')
      .isLength({ min: 2 })
      .withMessage('Nazwisko musi zawierać co najmniej 2 znaki.')
  ],
  authController.completeGoogleUserProfile
);

// Sprawdzanie czy email istnieje
router.post('/check-email', validationController.checkEmailExists);

// Sprawdzanie czy telefon istnieje
router.post('/check-phone', validationController.checkPhoneExists);

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

    body('phone')
      .matches(/^\+?[0-9]{9,14}$/)
      .withMessage('Numer telefonu powinien zawierać 9-14 cyfr (opcjonalnie +).'),

    body('dob')
      .isDate()
      .withMessage('Nieprawidłowa data urodzenia.')
  ],
  authController.registerUser
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
  authController.loginUser
);

// Wylogowanie użytkownika
router.post('/logout', authController.logout);

// Sprawdzanie stanu autoryzacji
router.get('/check-auth', auth, authController.checkAuth);

// Wysyłanie kodu SMS 2FA
router.post('/send-2fa', verificationController.send2FACode);

// Weryfikacja kodu 2FA
router.post('/verify-2fa', verificationController.verify2FACode);

// Weryfikacja kodu email
router.post('/verify-email', verificationController.verifyEmailCode);

// Weryfikacja kodu podczas rejestracji
router.post('/verify-code', authController.verifyCode);

// Żądanie resetu hasła
router.post(
  '/request-reset-password',
  [
    body('email').isEmail().withMessage('Proszę podać prawidłowy adres email.')
  ],
  passwordController.requestPasswordReset
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
  passwordController.resetPassword
);

// Pobranie profilu użytkownika
router.get('/profile', auth, profileController.getUserProfile);

// Aktualizacja profilu użytkownika
router.put('/profile', auth, profileController.updateUserProfile);

/**
 * User settings endpoints
 */
router.get('/settings', auth, settingsController.getUserSettings);
router.put('/settings', auth, settingsController.updateUserSettings);

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
  passwordController.changePassword
);

export default router;
