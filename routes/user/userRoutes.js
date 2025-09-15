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
  getRecentlyViewed,
  changePassword,
  requestPasswordReset,
  resetPassword,
  checkEmailExists,
  checkPhoneExists,
  verifyEmailCode
} from '../../controllers/user/index.js';

// Import Socket.IO auth routes
import socketAuthRoutes from '../auth/socketAuth.js';

const router = express.Router();

// Socket.IO authentication routes
router.use('/auth', socketAuthRoutes);

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

    body('confirmEmail')
      .isEmail()
      .withMessage('Podaj prawidłowy adres email w potwierdzeniu.')
      .normalizeEmail()
      .custom((value, { req }) => {
        if (value !== req.body.email) {
          throw new Error('Adresy email nie są identyczne.');
        }
        return true;
      }),

    body('password')
      .isLength({ min: 8, max: 128 })
      .withMessage('Hasło musi mieć od 8 do 128 znaków.')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Hasło musi zawierać co najmniej jedną małą literę, jedną wielką literę i jedną cyfrę.'),

    body('confirmPassword')
      .isLength({ min: 8, max: 128 })
      .withMessage('Potwierdzenie hasła musi mieć od 8 do 128 znaków.')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Hasła nie są identyczne.');
        }
        return true;
      }),

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

// Weryfikacja emaila przez token z linku
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { email } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token weryfikacyjny jest wymagany'
      });
    }

    // Find user by token and email
    const User = (await import('../../models/user/user.js')).default;
    const user = await User.findOne({
      emailVerificationToken: token,
      email: email ? email.toLowerCase().trim() : undefined,
      emailVerificationTokenExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token weryfikacyjny jest nieprawidłowy lub wygasł'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email jest już zweryfikowany'
      });
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.emailVerified = true;
    user.isVerified = user.isEmailVerified && user.isPhoneVerified;
    user.registrationStep = user.isVerified ? 'completed' : 'sms_verification';
    user.emailVerificationToken = null;
    user.emailVerificationTokenExpires = null;

    await user.save();

    const logger = (await import('../../utils/logger.js')).default;
    logger.info('Email verified successfully', {
      userId: user._id,
      email: user.email,
      ip: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Email został pomyślnie zweryfikowany!',
      user: {
        id: user._id,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        isVerified: user.isVerified,
        registrationStep: user.registrationStep
      }
    });

  } catch (error) {
    const logger = (await import('../../utils/logger.js')).default;
    logger.error('Email verification error', {
      error: error.message,
      stack: error.stack,
      token: req.params.token,
      ip: req.ip
    });

    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas weryfikacji emaila'
    });
  }
});

// Advanced verification endpoints for registration process
router.post('/verify-email-advanced', async (req, res) => {
  const { verifyEmailCodeAdvanced } = await import('../../controllers/user/verificationController.js');
  return verifyEmailCodeAdvanced(req, res);
});

router.post('/verify-sms-advanced', async (req, res) => {
  const { verifySMSCodeAdvanced } = await import('../../controllers/user/verificationController.js');
  return verifySMSCodeAdvanced(req, res);
});

// Send email verification link - prawdziwe wysyłanie przez Brevo
router.post('/send-email-verification-link', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email jest wymagany'
      });
    }

    const User = (await import('../../models/user/user.js')).default;
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

    // Generate new verification token
    const emailVerificationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    user.emailVerificationToken = emailVerificationToken;
    user.emailVerificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    await user.save();

    // Send real email via Brevo
    try {
      const { sendVerificationLinkEmail } = await import('../../config/nodemailer.js');
      const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/verify-email?token=${emailVerificationToken}&email=${encodeURIComponent(email)}`;
      
      const emailSent = await sendVerificationLinkEmail(user.email, verificationLink, user.name);
      
      if (!emailSent) {
        return res.status(500).json({
          success: false,
          message: 'Błąd wysyłania linku weryfikacyjnego'
        });
      }

      const logger = (await import('../../utils/logger.js')).default;
      logger.info('Email verification link resent successfully', {
        userId: user._id,
        email: user.email,
        ip: req.ip
      });

    } catch (emailError) {
      const logger = (await import('../../utils/logger.js')).default;
      logger.error('Failed to send email verification link', {
        error: emailError.message,
        userId: user._id,
        email: user.email,
        ip: req.ip
      });
      
      return res.status(500).json({
        success: false,
        message: 'Błąd wysyłania linku weryfikacyjnego'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Link weryfikacyjny został wysłany na email',
      tokenExpires: user.emailVerificationTokenExpires
    });

  } catch (error) {
    const logger = (await import('../../utils/logger.js')).default;
    logger.error('Send email verification link error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas wysyłania linku'
    });
  }
});

// Verify SMS code - SYMULACJA: akceptuje kod "123456"
router.post('/verify-sms-code', async (req, res) => {
  try {
    const { phone, code } = req.body;
    
    if (!phone || !code) {
      return res.status(400).json({
        success: false,
        message: 'Numer telefonu i kod są wymagane'
      });
    }

    // SYMULACJA: W trybie deweloperskim akceptujemy kod "123456"
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔧 MOCK MODE: Weryfikacja kodu SMS:', phone, 'Kod:', code);
      
      if (code === '123456') {
        // Znajdź użytkownika i oznacz telefon jako zweryfikowany
        const User = (await import('../../models/user/user.js')).default;
        const user = await User.findOne({ phoneNumber: phone });
        
        if (user && !user.isPhoneVerified) {
          user.isPhoneVerified = true;
          user.smsVerificationCode = null;
          user.smsVerificationCodeExpires = null;
          await user.save();
          console.log('✅ Telefon automatycznie zweryfikowany:', phone);
        }
        
        return res.status(200).json({
          success: true,
          message: 'Numer telefonu został zweryfikowany (tryb deweloperski)',
          verified: true
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Nieprawidłowy kod weryfikacyjny. Użyj kodu: 123456'
        });
      }
    }

    // W trybie produkcyjnym - normalna weryfikacja kodu
    const User = (await import('../../models/user/user.js')).default;
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

    // Sprawdź kod i czas wygaśnięcia
    if (!user.smsVerificationCode || user.smsVerificationCode !== code) {
      return res.status(400).json({
        success: false,
        message: 'Nieprawidłowy kod weryfikacyjny'
      });
    }

    if (user.smsVerificationCodeExpires && user.smsVerificationCodeExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Kod weryfikacyjny wygasł'
      });
    }

    // Oznacz telefon jako zweryfikowany
    user.isPhoneVerified = true;
    user.smsVerificationCode = null;
    user.smsVerificationCodeExpires = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Numer telefonu został zweryfikowany',
      verified: true
    });

  } catch (error) {
    console.error('Verify SMS code error:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas weryfikacji kodu'
    });
  }
});

// Send SMS code to any phone number (for testing/development)
router.post('/send-sms-code', async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Numer telefonu jest wymagany'
      });
    }

    // W trybie deweloperskim zawsze zwracamy kod "123456"
    const smsVerificationCode = process.env.NODE_ENV !== 'production' ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();

    // Send SMS - SYMULACJA W TRYBIE DEWELOPERSKIM
    if (process.env.NODE_ENV !== 'production') {
      // W trybie deweloperskim tylko symulujemy wysyłanie
      console.log('MOCK MODE: Symulacja wysyłania kodu SMS na numer:', phone, 'Kod:', smsVerificationCode);
    } else {
      // W trybie produkcyjnym wysyłamy prawdziwy SMS
      try {
        const { sendVerificationCode: sendSMSCode } = await import('../../config/twilio.js');
        await sendSMSCode(phone, smsVerificationCode);
      } catch (smsError) {
        console.error('Failed to send SMS verification code:', smsError);
        return res.status(500).json({
          success: false,
          message: 'Błąd wysyłania kodu SMS'
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Kod weryfikacyjny został wysłany SMS',
      devCode: process.env.NODE_ENV !== 'production' ? smsVerificationCode : undefined
    });

  } catch (error) {
    console.error('Send SMS code error:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas wysyłania kodu'
    });
  }
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
    const User = (await import('../../models/user/user.js')).default;
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

    // Send email - SYMULACJA W TRYBIE DEWELOPERSKIM
    if (process.env.NODE_ENV !== 'production') {
      // W trybie deweloperskim tylko symulujemy wysyłanie
      console.log('MOCK MODE: Symulacja wysyłania kodu weryfikacyjnego na email:', user.email, 'Kod:', emailVerificationCode);
    } else {
      // W trybie produkcyjnym wysyłamy prawdziwy email
      try {
        const { sendVerificationEmail } = await import('../../config/nodemailer.js');
        await sendVerificationEmail(user.email, emailVerificationCode, user.name);
      } catch (emailError) {
        console.error('Failed to resend email verification code:', emailError);
      }
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
    const User = (await import('../../models/user/user.js')).default;
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

    // Generate new code - w trybie deweloperskim zawsze "123456"
    const smsVerificationCode = process.env.NODE_ENV !== 'production' ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();
    user.smsVerificationCode = smsVerificationCode;
    user.smsVerificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    await user.save();

    // Send SMS - SYMULACJA W TRYBIE DEWELOPERSKIM
    if (process.env.NODE_ENV !== 'production') {
      // W trybie deweloperskim tylko symulujemy wysyłanie
      console.log('MOCK MODE: Symulacja wysyłania kodu SMS na numer:', user.phoneNumber, 'Kod:', smsVerificationCode);
    } else {
      // W trybie produkcyjnym wysyłamy prawdziwy SMS
      try {
        const { sendVerificationCode: sendSMSCode } = await import('../../config/twilio.js');
        await sendSMSCode(user.phoneNumber, smsVerificationCode);
      } catch (smsError) {
        console.error('Failed to resend SMS verification code:', smsError);
      }
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

// Pobranie ostatnio oglądanych ogłoszeń użytkownika
router.get('/recently-viewed', auth, getRecentlyViewed);

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


export default router;
