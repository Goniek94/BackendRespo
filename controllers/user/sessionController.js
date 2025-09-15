import User from '../../models/user/user.js';
import { clearAuthCookies } from '../../middleware/auth.js';
import logger from '../../utils/logger.js';

/**
 * SESSION CONTROLLER
 * Handles session management and authentication checks
 */

/**
 * Check authentication status - NAPRAWIONE dla optionalAuthMiddleware
 */
export const checkAuth = async (req, res) => {
  try {
    // User może być undefined gdy używamy optionalAuthMiddleware
    const user = req.user;

    if (!user) {
      logger.debug('Auth check - no user in request', {
        ip: req.ip,
        cookies: !!req.cookies?.token
      });
      
      return res.status(200).json({
        success: false,
        authenticated: false,
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
      
      // Clear cookies since user doesn't exist
      clearAuthCookies(res);
      
      return res.status(200).json({
        success: false,
        authenticated: false,
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
      
      // Clear cookies and return error
      clearAuthCookies(res);
      
      return res.status(200).json({
        success: false,
        authenticated: false,
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
      authenticated: true,
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
      authenticated: false,
      message: 'Błąd serwera podczas sprawdzania autoryzacji'
    });
  }
};
