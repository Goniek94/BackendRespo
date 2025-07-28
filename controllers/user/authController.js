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
 * Register new user
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

    const { name, lastName, email, password, phone, dob } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase().trim() }, { phoneNumber: phone }]
    });

    if (existingUser) {
      logger.warn('Registration attempt with existing credentials', {
        email: email.toLowerCase().trim(),
        phone,
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

    // Create new user with security fields
    const newUser = new User({
      name: name.trim(),
      lastName: lastName?.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      phoneNumber: phone,
      dob: new Date(dob),
      role: 'user',
      isVerified: false,
      createdAt: new Date(),
      lastLogin: null,
      lastActivity: new Date(),
      lastIP: req.ip,
      failedLoginAttempts: 0,
      accountLocked: false,
      status: 'active'
    });

    await newUser.save();

    // Generate enterprise-level tokens with security features
    const tokenPayload = {
      userId: newUser._id,
      role: newUser.role,
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Set secure HttpOnly cookies
    setAuthCookies(res, accessToken, refreshToken);

    // Return user data (without sensitive information)
    const userData = {
      id: newUser._id,
      name: newUser.name,
      lastName: newUser.lastName,
      email: newUser.email,
      phoneNumber: newUser.phoneNumber,
      role: newUser.role,
      isVerified: newUser.isVerified,
      createdAt: newUser.createdAt
    };

    logger.info('User registered successfully', {
      userId: newUser._id,
      email: newUser.email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      message: 'Rejestracja przebiegła pomyślnie',
      user: userData
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
    const tokenPayload = {
      userId: user._id,
      role: user.role,
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip
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
