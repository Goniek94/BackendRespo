import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';
import User from '../../models/user/user.js';
import { addToBlacklist } from '../../models/security/TokenBlacklist.js';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  setAuthCookies, 
  clearAuthCookies 
} from '../../middleware/auth.js';
import logger from '../../utils/logger.js';

/**
 * LOGIN CONTROLLER
 * Handles user authentication and session management
 */

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

      // Lock account after 4 failed attempts
      if (user.failedLoginAttempts >= 4) {
        user.accountLocked = true;
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
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
          message: 'Konto zostało zablokowane na 15 minut z powodu zbyt wielu nieudanych prób logowania.',
          isBlocked: true,
          blockDuration: 15 * 60 * 1000
        });
      }

      await user.save();

      logger.warn('Failed login attempt', {
        userId: user._id,
        email: user.email,
        failedAttempts: user.failedLoginAttempts,
        attemptsLeft: 4 - user.failedLoginAttempts,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      const attemptsLeft = 4 - user.failedLoginAttempts;
      return res.status(401).json({
        success: false,
        message: `Błędny login lub hasło. Pozostało ${attemptsLeft} ${attemptsLeft === 1 ? 'próba' : attemptsLeft < 4 ? 'próby' : 'prób'}.`,
        attemptsLeft: attemptsLeft,
        failedAttempts: user.failedLoginAttempts,
        maxAttempts: 4
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
      role: user.role
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
