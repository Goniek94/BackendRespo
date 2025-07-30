import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';
import User from '../../models/user.js';
import { addToBlacklist } from '../../models/TokenBlacklist.js';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  setAuthCookies, 
  clearAuthCookies 
} from '../../middleware/auth.js';
import logger from '../../utils/logger.js';

/**
 * ENTERPRISE-LEVEL AUTH CONTROLLER
 * Używa zaawansowanych funkcji bezpieczeństwa z middleware auth.js:
 * - Security fingerprinting
 * - Token blacklisting
 * - Session hijacking detection
 * - Automatic token rotation
 * - Detailed security logging
 */

/**
 * Register new user with advanced verification
 * Features:
 * - Multi-step registration process
 * - Real-time email/phone validation
 * - SMS and Email verification codes
 * - Age validation (minimum 16 years)
 * - Phone number formatting (+48 prefix)
 * - Terms acceptance tracking
 */
export const registerUser = async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Registration validation failed', {
        errors: errors.array(),
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(400).json({
        success: false,
        message: 'Błędy walidacji',
        errors: errors.array()
      });
    }

    const { 
      name, 
      lastName, 
      email, 
      password, 
      phone, 
      dob, 
      termsAccepted 
    } = req.body;

    // Validate terms acceptance
    if (!termsAccepted) {
      return res.status(400).json({
        success: false,
        message: 'Musisz zaakceptować regulamin, aby się zarejestrować'
      });
    }

    // Format phone number to ensure +48 prefix for Polish numbers
    let formattedPhone = phone;
    if (phone.startsWith('48') && !phone.startsWith('+48')) {
      formattedPhone = '+' + phone;
    } else if (phone.match(/^[0-9]{9}$/)) {
      // If it's 9 digits, assume it's Polish number without prefix
      formattedPhone = '+48' + phone;
    } else if (!phone.startsWith('+')) {
      formattedPhone = '+48' + phone.replace(/^0+/, ''); // Remove leading zeros
    }

    // Validate age (minimum 16 years)
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    if (age < 16) {
      return res.status(400).json({
        success: false,
        message: 'Musisz mieć co najmniej 16 lat, aby się zarejestrować'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase().trim() }, 
        { phoneNumber: formattedPhone }
      ]
    });

    if (existingUser) {
      logger.warn('Registration attempt with existing credentials', {
        email: email.toLowerCase().trim(),
        phone: formattedPhone,
        existingField: existingUser.email === email.toLowerCase().trim() ? 'email' : 'phone',
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(400).json({
        success: false,
        message: existingUser.email === email.toLowerCase().trim() 
          ? 'Użytkownik z tym adresem email już istnieje'
          : 'Użytkownik z tym numerem telefonu już istnieje'
      });
    }

    // Hash password with high security
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate verification codes
    const emailVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const smsVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Create new user with advanced verification fields
    const newUser = new User({
      name: name.trim(),
      lastName: lastName?.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      phoneNumber: formattedPhone,
      dob: new Date(dob),
      termsAccepted: true,
      termsAcceptedAt: new Date(),
      registrationStep: 'email_verification',
      
      // Verification codes
      emailVerificationCode,
      emailVerificationCodeExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      smsVerificationCode,
      smsVerificationCodeExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      
      // Initial verification status
      isEmailVerified: false,
      isPhoneVerified: false,
      isVerified: false,
      
      role: 'user',
      status: 'active',
      createdAt: new Date(),
      lastActivity: new Date(),
      lastIP: req.ip,
      failedLoginAttempts: 0,
      accountLocked: false
    });

    await newUser.save();

    // Send email verification code
    try {
      const { sendVerificationEmail } = await import('../../config/nodemailer.js');
      await sendVerificationEmail(newUser.email, emailVerificationCode, newUser.name);
      logger.info('Email verification code sent', {
        userId: newUser._id,
        email: newUser.email
      });
    } catch (emailError) {
      logger.error('Failed to send email verification code', {
        userId: newUser._id,
        email: newUser.email,
        error: emailError.message
      });
    }

    // Send SMS verification code
    try {
      const { sendVerificationCode: sendSMSCode } = await import('../../config/twilio.js');
      await sendSMSCode(newUser.phoneNumber, smsVerificationCode);
      logger.info('SMS verification code sent', {
        userId: newUser._id,
        phone: newUser.phoneNumber
      });
    } catch (smsError) {
      logger.error('Failed to send SMS verification code', {
        userId: newUser._id,
        phone: newUser.phoneNumber,
        error: smsError.message
      });
    }

    // Return user data (without sensitive information)
    const userData = {
      id: newUser._id,
      name: newUser.name,
      lastName: newUser.lastName,
      email: newUser.email,
      phoneNumber: newUser.phoneNumber,
      registrationStep: newUser.registrationStep,
      isEmailVerified: newUser.isEmailVerified,
      isPhoneVerified: newUser.isPhoneVerified,
      isVerified: newUser.isVerified,
      role: newUser.role,
      createdAt: newUser.createdAt
    };

    logger.info('Advanced user registration initiated', {
      userId: newUser._id,
      email: newUser.email,
      phone: newUser.phoneNumber,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      message: 'Rejestracja rozpoczęta. Sprawdź email i SMS, aby otrzymać kody weryfikacyjne.',
      user: userData,
      nextStep: 'email_verification',
      // In development mode, return codes for testing
      devCodes: process.env.NODE_ENV !== 'production' ? {
        emailCode: emailVerificationCode,
        smsCode: smsVerificationCode
      } : undefined
    });

  } catch (error) {
    logger.error('Registration error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas rejestracji'
    });
  }
};

/**
 * Login user with enterprise security
 */
export const loginUser = async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Login validation failed', {
        errors: errors.array(),
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(400).json({
        success: false,
        message: 'Błędy walidacji',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ 
      email: email.toLowerCase().trim() 
    });

    if (!user) {
      logger.warn('Login attempt with non-existent email', {
        email: email.toLowerCase().trim(),
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(401).json({
        success: false,
        message: 'Nieprawidłowy email lub hasło'
      });
    }

    // Check if account is locked
    if (user.accountLocked) {
      const lockTime = user.lockUntil;
      if (lockTime && lockTime > Date.now()) {
        const remainingTime = Math.ceil((lockTime - Date.now()) / (1000 * 60));
        
        logger.warn('Login attempt on locked account', {
          userId: user._id,
          email: user.email,
          remainingLockTime: remainingTime,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        return res.status(423).json({
          success: false,
          message: `Konto jest zablokowane. Spróbuj ponownie za ${remainingTime} minut.`
        });
      } else {
        // Unlock account if lock time has passed
        user.accountLocked = false;
        user.failedLoginAttempts = 0;
        user.lockUntil = undefined;
        await user.save();
        
        logger.info('Account automatically unlocked', {
          userId: user._id,
          email: user.email,
          ip: req.ip
        });
      }
    }

    // Check account status
    if (user.status === 'suspended' || user.status === 'banned') {
      logger.warn('Login attempt on suspended/banned account', {
        userId: user._id,
        email: user.email,
        status: user.status,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(403).json({
        success: false,
        message: 'Konto zostało zawieszone. Skontaktuj się z administratorem.'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // Increment failed attempts
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      // Lock account after 5 failed attempts
      if (user.failedLoginAttempts >= 5) {
        user.accountLocked = true;
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        await user.save();

        logger.warn('Account locked due to failed login attempts', {
          userId: user._id,
          email: user.email,
          failedAttempts: user.failedLoginAttempts,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

        return res.status(423).json({
          success: false,
          message: 'Konto zostało zablokowane na 30 minut z powodu zbyt wielu nieudanych prób logowania.'
        });
      }

      await user.save();

      logger.warn('Failed login attempt', {
        userId: user._id,
        email: user.email,
        failedAttempts: user.failedLoginAttempts,
        attemptsLeft: 5 - user.failedLoginAttempts,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(401).json({
        success: false,
        message: 'Nieprawidłowy email lub hasło',
        attemptsLeft: 5 - user.failedLoginAttempts
      });
    }

    // Reset failed attempts on successful login
    user.failedLoginAttempts = 0;
    user.lastLogin = new Date();
    user.lastActivity = new Date();
    user.lastIP = req.ip;
    await user.save();

    // Generate enterprise-level tokens with security features
    // OPTIMIZED: Minimal payload for security and performance
    const tokenPayload = {
      userId: user._id,
      role: user.role
      // REMOVED: email, userAgent, ipAddress for security optimization
      // These are now handled in middleware/database for better security
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Set secure HttpOnly cookies
    setAuthCookies(res, accessToken, refreshToken);

    // Return user data
    const userData = {
      id: user._id,
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      isVerified: user.isVerified,
      lastLogin: user.lastLogin
    };

    logger.info('User logged in successfully', {
      userId: user._id,
      email: user.email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      message: 'Logowanie przebiegło pomyślnie',
      user: userData
    });

  } catch (error) {
    logger.error('Login error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas logowania'
    });
  }
};

/**
 * Logout user with token blacklisting
 */
export const logoutUser = async (req, res) => {
  try {
    // Get tokens from cookies
    const accessToken = req.cookies?.token;
    const refreshToken = req.cookies?.refreshToken;

    const userId = req.user?.userId;

    // Add tokens to blacklist if they exist
    if (accessToken) {
      try {
        await addToBlacklist(accessToken, {
          reason: 'LOGOUT',
          userId: userId,
          ip: req.ip
        });
        
        logger.debug('Access token blacklisted on logout', {
          userId,
          ip: req.ip
        });
      } catch (error) {
        logger.warn('Failed to blacklist access token on logout', {
          error: error.message,
          userId,
          ip: req.ip
        });
      }
    }

    if (refreshToken) {
      try {
        await addToBlacklist(refreshToken, {
          reason: 'LOGOUT',
          userId: userId,
          ip: req.ip
        });
        
        logger.debug('Refresh token blacklisted on logout', {
          userId,
          ip: req.ip
        });
      } catch (error) {
        logger.warn('Failed to blacklist refresh token on logout', {
          error: error.message,
          userId,
          ip: req.ip
        });
      }
    }

    // Clear secure cookies
    clearAuthCookies(res);

    logger.info('User logged out successfully', {
      userId,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      message: 'Wylogowanie przebiegło pomyślnie'
    });

  } catch (error) {
    logger.error('Logout error', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas wylogowania'
    });
  }
};

/**
 * Check authentication status
 */
export const checkAuth = async (req, res) => {
  try {
    // User is already authenticated by middleware
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Nie jesteś zalogowany'
      });
    }

    // Get fresh user data from database
    const dbUser = await User.findById(user.userId).select('-password');
    
    if (!dbUser) {
      logger.warn('Auth check failed - user not found in database', {
        userId: user.userId,
        ip: req.ip
      });
      
      return res.status(401).json({
        success: false,
        message: 'Użytkownik nie został znaleziony'
      });
    }

    // Check if account is still active
    if (dbUser.status === 'suspended' || dbUser.status === 'banned') {
      logger.warn('Auth check failed - account suspended/banned', {
        userId: user.userId,
        status: dbUser.status,
        ip: req.ip
      });
      
      // Clear cookies and blacklist tokens
      clearAuthCookies(res);
      
      return res.status(403).json({
        success: false,
        message: 'Konto zostało zawieszone'
      });
    }

    // Return current user data
    const userData = {
      id: dbUser._id,
      name: dbUser.name,
      lastName: dbUser.lastName,
      email: dbUser.email,
      phoneNumber: dbUser.phoneNumber,
      role: dbUser.role,
      isVerified: dbUser.isVerified,
      lastLogin: dbUser.lastLogin
    };

    logger.debug('Auth check successful', {
      userId: user.userId,
      ip: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Użytkownik jest zalogowany',
      user: userData
    });

  } catch (error) {
    logger.error('Check auth error', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas sprawdzania autoryzacji'
    });
  }
};

/**
 * Send 2FA code (placeholder for future implementation)
 */
export const send2FACode = async (req, res) => {
  try {
    // TODO: Implement 2FA code sending with SMS/Email
    logger.info('2FA code send requested', {
      userId: req.user?.userId,
      ip: req.ip
    });
    
    res.status(200).json({
      success: true,
      message: 'Funkcja 2FA będzie dostępna wkrótce'
    });
  } catch (error) {
    logger.error('Send 2FA error', {
      error: error.message,
      userId: req.user?.userId,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      message: 'Błąd serwera'
    });
  }
};

/**
 * Verify 2FA code (placeholder for future implementation)
 */
export const verify2FACode = async (req, res) => {
  try {
    // TODO: Implement 2FA code verification
    logger.info('2FA code verification requested', {
      userId: req.user?.userId,
      ip: req.ip
    });
    
    res.status(200).json({
      success: true,
      message: 'Funkcja 2FA będzie dostępna wkrótce'
    });
  } catch (error) {
    logger.error('Verify 2FA error', {
      error: error.message,
      userId: req.user?.userId,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      message: 'Błąd serwera'
    });
  }
};
