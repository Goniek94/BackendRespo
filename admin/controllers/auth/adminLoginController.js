/**
 * ADMIN LOGIN CONTROLLER
 * 
 * Controller do logowania administratorów
 * Obsługuje standardowe logowanie email + hasło
 */

import bcrypt from 'bcryptjs';
import User from '../../../models/user.js';
import { generateAccessToken, generateRefreshToken } from '../../../middleware/auth.js';
import { setAdminCookies, clearAdminCookies } from '../../../config/cookieConfig.js';
import logger from '../../../utils/logger.js';

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email i hasło są wymagane'
      });
    }

    // Find user with admin/moderator role
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      role: { $in: ['admin', 'moderator'] }
    }).select('+password');

    if (!user) {
      logger.warn('Admin login attempt with invalid email', { 
        email: email.toLowerCase(),
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(401).json({
        success: false,
        message: 'Nieprawidłowy email lub hasło'
      });
    }

    // Check if user is banned or inactive
    if (user.status === 'banned') {
      logger.warn('Banned admin attempted login', { 
        userId: user._id,
        email: user.email,
        ip: req.ip
      });
      
      return res.status(403).json({
        success: false,
        message: 'Konto zostało zablokowane'
      });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: 'Konto jest nieaktywne'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      logger.warn('Admin login attempt with invalid password', { 
        userId: user._id,
        email: user.email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(401).json({
        success: false,
        message: 'Nieprawidłowy email lub hasło'
      });
    }

    // Check if password change is required
    if (user.mustChangePassword) {
      return res.status(200).json({
        success: false,
        requirePasswordChange: true,
        message: 'Wymagana zmiana hasła',
        userId: user._id
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user._id,
      role: user.role,
      type: 'admin'
    });

    const refreshToken = generateRefreshToken({
      userId: user._id,
      role: user.role,
      type: 'admin'
    });

    // Set admin cookies using centralized secure configuration
    setAdminCookies(res, accessToken, refreshToken);

    // Update last login
    user.lastLogin = new Date();
    user.lastLoginIP = req.ip;
    await user.save();

    // Log successful login
    logger.info('Admin login successful', {
      userId: user._id,
      email: user.email,
      role: user.role,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Logowanie pomyślne',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {
    logger.error('Admin login error', {
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

export const adminLogout = async (req, res) => {
  try {
    // Clear admin cookies using centralized secure configuration
    clearAdminCookies(res);

    // Log logout
    if (req.user) {
      logger.info('Admin logout', {
        userId: req.user.userId,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    }

    res.status(200).json({
      success: true,
      message: 'Wylogowano pomyślnie'
    });

  } catch (error) {
    logger.error('Admin logout error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip
    });

    res.status(500).json({
      success: false,
      message: 'Błąd podczas wylogowywania'
    });
  }
};

export const checkAdminSession = async (req, res) => {
  try {
    // This endpoint is protected by admin auth middleware
    // If we reach here, the session is valid
    
    const user = await User.findById(req.user.userId)
      .select('firstName lastName email role lastLogin');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Sesja nieważna'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {
    logger.error('Admin session check error', {
      error: error.message,
      userId: req.user?.userId,
      ip: req.ip
    });

    res.status(500).json({
      success: false,
      message: 'Błąd sprawdzania sesji'
    });
  }
};

export const changeAdminPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Obecne i nowe hasło są wymagane'
      });
    }

    // Find user
    const user = await User.findById(req.user.userId).select('+password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Użytkownik nie znaleziony'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Nieprawidłowe obecne hasło'
      });
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Nowe hasło musi mieć co najmniej 8 znaków'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    user.password = hashedNewPassword;
    user.passwordChangedAt = new Date();
    user.mustChangePassword = false;
    await user.save();

    // Log password change
    logger.info('Admin password changed', {
      userId: user._id,
      email: user.email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      message: 'Hasło zostało zmienione pomyślnie'
    });

  } catch (error) {
    logger.error('Admin password change error', {
      error: error.message,
      userId: req.user?.userId,
      ip: req.ip
    });

    res.status(500).json({
      success: false,
      message: 'Błąd podczas zmiany hasła'
    });
  }
};
