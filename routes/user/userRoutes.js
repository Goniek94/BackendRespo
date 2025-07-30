import express from 'express';
import { body } from 'express-validator';
import auth from '../../middleware/auth.js';
import { 
  authLimiter, 
  passwordResetLimiter, 
  registrationLimiter 
} from '../../middleware/rateLimiting.js';
import {
  registerUser,
  loginUser,
  logoutUser,
  verify2FACode,
  send2FACode,
  checkAuth,
  getUserProfile,
  updateUserProfile,
  changePassword,
  requestPasswordReset,
  resetPassword,
  checkEmailExists,
  checkPhoneExists,
  verifyEmailCode,
  addToFavorites,
  removeFromFavorites,
  toggleFavorite,
  getUserFavorites,
  checkIsFavorite,
  getFavoritesCount
} from '../../controllers/user/index.js';

const router = express.Router();

// Google Authentication - tymczasowo wyłączone
// router.post('/auth/google', authController.registerGoogleUser);

// Verification routes for phone and email - tymczasowo wyłączone
// Zakomentowane, aby umożliwić uruchomienie serwera
/*
router.post('/verification/send', auth, (req, res) => {
  // TODO: Implementacja wysyłania kodu weryfikacyjnego
  return res.status(200).json({ message: 'Funkcja tymczasowo niedostępna' });
});
router.post('/verification/verify', auth, (req, res) => {
  // TODO: Implementacja weryfikacji kodu
  return res.status(200).json({ message: 'Funkcja tymczasowo niedostępna' });
});
*/

// Complete Google user profile - tymczasowo wyłączone
/*
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
*/

// Sprawdzanie czy email istnieje
router.post('/check-email', checkEmailExists);

// Sprawdzanie czy telefon istnieje
router.post('/check-phone', checkPhoneExists);

// Rejestracja użytkownika
router.post(
  '/register',
  registrationLimiter, // Dodajemy rate limiting
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Imię jest wymagane.')
      .isLength({ min: 2, max: 50 })
      .withMessage('Imię musi zawierać od 2 do 50 znaków.')
      .matches(/^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s-]+$/)
      .withMessage('Imię może zawierać tylko litery, spacje i myślniki.'),

    body('lastName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Nazwisko musi zawierać od 2 do 50 znaków.')
      .matches(/^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s-]+$/)
      .withMessage('Nazwisko może zawierać tylko litery, spacje i myślniki.'),

    body('email')
      .isEmail()
      .withMessage('Podaj prawidłowy adres email.')
      .normalizeEmail()
      .isLength({ max: 100 })
      .withMessage('Email nie może być dłuższy niż 100 znaków.'),

    body('password')
      .isLength({ min: 8, max: 128 })
      .withMessage('Hasło musi mieć od 8 do 128 znaków.')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Hasło musi zawierać co najmniej jedną małą literę, jedną wielką literę i jedną cyfrę.'),

    body('phone')
      .matches(/^\+[1-9]\d{1,14}$/)
      .withMessage('Numer telefonu musi zaczynać się od + i zawierać kod kraju oraz numer (np. +48123456789).')
      .isLength({ min: 9, max: 16 })
      .withMessage('Numer telefonu musi mieć od 9 do 16 znaków.'),

    body('dob')
      .isISO8601()
      .withMessage('Data urodzenia musi być w formacie YYYY-MM-DD.')
      .custom((value) => {
        const birthDate = new Date(value);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        let actualAge = age;
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          actualAge--;
        }
        
        if (actualAge < 16) {
          throw new Error('Musisz mieć co najmniej 16 lat, aby się zarejestrować.');
        }
        
        if (actualAge > 120) {
          throw new Error('Podana data urodzenia jest nieprawidłowa.');
        }
        
        return true;
      })
  ],
  registerUser
);

// Logowanie użytkownika
router.post(
  '/login',
  authLimiter, // Dodajemy rate limiting
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

// Wylogowanie użytkownika
router.post('/logout', logoutUser);

// Sprawdzanie stanu autoryzacji
router.get('/check-auth', auth, checkAuth);

// Wysyłanie kodu SMS 2FA
router.post('/send-2fa', send2FACode);

// Weryfikacja kodu 2FA
router.post('/verify-2fa', verify2FACode);

// Weryfikacja kodu email (legacy)
router.post('/verify-email', verifyEmailCode);

// Advanced verification endpoints for registration process
router.post('/verify-email-advanced', async (req, res) => {
  const { verifyEmailCodeAdvanced } = await import('../../controllers/user/verificationController.js');
  return verifyEmailCodeAdvanced(req, res);
});

router.post('/verify-sms-advanced', async (req, res) => {
  const { verifySMSCodeAdvanced } = await import('../../controllers/user/verificationController.js');
  return verifySMSCodeAdvanced(req, res);
});

// Resend verification codes
router.post('/resend-email-code', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email jest wymagany'
      });
    }

    // Find user
    const User = (await import('../../models/user.js')).default;
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Użytkownik nie został znaleziony'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email jest już zweryfikowany'
      });
    }

    // Generate new code
    const emailVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.emailVerificationCode = emailVerificationCode;
    user.emailVerificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    await user.save();

    // Send email
    try {
      const { sendVerificationEmail } = await import('../../config/nodemailer.js');
      await sendVerificationEmail(user.email, emailVerificationCode, user.name);
    } catch (emailError) {
      console.error('Failed to resend email verification code:', emailError);
    }

    res.status(200).json({
      success: true,
      message: 'Nowy kod weryfikacyjny został wysłany na email',
      devCode: process.env.NODE_ENV !== 'production' ? emailVerificationCode : undefined
    });

  } catch (error) {
    console.error('Resend email code error:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas wysyłania kodu'
    });
  }
});

router.post('/resend-sms-code', async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Numer telefonu jest wymagany'
      });
    }

    // Find user
    const User = (await import('../../models/user.js')).default;
    const user = await User.findOne({ phoneNumber: phone });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Użytkownik nie został znaleziony'
      });
    }

    if (user.isPhoneVerified) {
      return res.status(400).json({
        success: false,
        message: 'Numer telefonu jest już zweryfikowany'
      });
    }

    // Generate new code
    const smsVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.smsVerificationCode = smsVerificationCode;
    user.smsVerificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    await user.save();

    // Send SMS
    try {
      const { sendVerificationCode: sendSMSCode } = await import('../../config/twilio.js');
      await sendSMSCode(user.phoneNumber, smsVerificationCode);
    } catch (smsError) {
      console.error('Failed to resend SMS verification code:', smsError);
    }

    res.status(200).json({
      success: true,
      message: 'Nowy kod weryfikacyjny został wysłany SMS',
      devCode: process.env.NODE_ENV !== 'production' ? smsVerificationCode : undefined
    });

  } catch (error) {
    console.error('Resend SMS code error:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas wysyłania kodu'
    });
  }
});

// Żądanie resetu hasła
router.post(
  '/request-reset-password',
  passwordResetLimiter, // Dodajemy rate limiting
  [
    body('email').isEmail().withMessage('Proszę podać prawidłowy adres email.')
  ],
  requestPasswordReset
);

// Resetowanie hasła
router.post(
  '/reset-password',
  authLimiter, // Dodajemy rate limiting
  [
    body('password')
      .isLength({ min: 8 })
      .withMessage('Hasło musi mieć co najmniej 8 znaków.'),
    body('token').notEmpty().withMessage('Token resetu hasła jest wymagany.')
  ],
  resetPassword
);

// Pobranie profilu użytkownika
router.get('/profile', auth, getUserProfile);

// Aktualizacja profilu użytkownika
router.put('/profile', auth, updateUserProfile);

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

// ===== FAVORITES ROUTES =====

// Get user's favorite ads
router.get('/favorites', auth, getUserFavorites);

// Get favorites count
router.get('/favorites/count', auth, getFavoritesCount);

// Check if ad is in favorites
router.get('/favorites/:adId/check', auth, checkIsFavorite);

// Add ad to favorites
router.post('/favorites/:adId', auth, addToFavorites);

// Toggle favorite status (add/remove)
router.post('/favorites/:adId/toggle', auth, toggleFavorite);

// Remove ad from favorites
router.delete('/favorites/:adId', auth, removeFromFavorites);

export default router;
