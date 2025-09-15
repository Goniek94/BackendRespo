import bcrypt from 'bcryptjs';
import User from '../../../models/user/user.js';
import AdminActivity from '../../models/AdminActivity.js';
import { addToBlacklist } from '../../../models/security/TokenBlacklist.js';
import logger from '../../../utils/logger.js';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  setAuthCookies, 
  clearAuthCookies 
} from '../../../middleware/auth.js';

/**
 * Admin Authentication Controller
 * Secure cookie-based authentication for admin panel
 * Features: HttpOnly cookies, session management, audit logging
 * UPDATED: Używa tego samego systemu cookies co normalny system logowania
 * 
 * @author Senior Developer
 * @version 1.1.0
 */


/**
 * Admin login with cookie-based authentication
 * NAPRAWIONE: Sprawdza czy użytkownik jest już zalogowany zamiast logować ponownie
 */
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // NAPRAWIONE: Nie czyścimy tokenów - pozwalamy na współistnienie user i admin tokenów
    // Admin używa tych samych cookies co zwykli użytkownicy

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email i hasło są wymagane',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Find user by email
    const user = await User.findOne({ 
      email: email.toLowerCase().trim() 
    });

    if (!user) {
      // Log failed login attempt
      await logSecurityEvent(req, 'admin_login_failed', {
        email: email.toLowerCase().trim(),
        reason: 'user_not_found'
      });

      return res.status(401).json({
        success: false,
        error: 'Nieprawidłowy email lub hasło',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check if user has admin privileges
    if (!['admin', 'moderator'].includes(user.role)) {
      // Log unauthorized access attempt
      await logSecurityEvent(req, 'admin_access_denied', {
        userId: user._id,
        email: user.email,
        userRole: user.role,
        reason: 'insufficient_privileges'
      });

      return res.status(403).json({
        success: false,
        error: 'Brak uprawnień administratora',
        code: 'INSUFFICIENT_PRIVILEGES'
      });
    }

    // Check account status
    if (user.status === 'suspended' || user.status === 'banned' || user.accountLocked) {
      await logSecurityEvent(req, 'admin_login_blocked', {
        userId: user._id,
        email: user.email,
        status: user.status,
        accountLocked: user.accountLocked
      });

      return res.status(403).json({
        success: false,
        error: 'Konto zostało zablokowane lub zawieszone',
        code: 'ACCOUNT_BLOCKED'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // Increment failed attempts
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      // Lock account after 3 failed attempts (stricter for admin)
      if (user.failedLoginAttempts >= 3) {
        user.accountLocked = true;
        user.lockUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await user.save();

        await logSecurityEvent(req, 'admin_account_locked', {
          userId: user._id,
          email: user.email,
          failedAttempts: user.failedLoginAttempts
        });

        return res.status(423).json({
          success: false,
          error: 'Konto administratora zostało zablokowane na 1 godzinę',
          code: 'ACCOUNT_LOCKED'
        });
      }

      await user.save();

      await logSecurityEvent(req, 'admin_login_failed', {
        userId: user._id,
        email: user.email,
        failedAttempts: user.failedLoginAttempts,
        reason: 'invalid_password'
      });

      return res.status(401).json({
        success: false,
        error: 'Nieprawidłowy email lub hasło',
        code: 'INVALID_CREDENTIALS',
        attemptsLeft: 3 - user.failedLoginAttempts
      });
    }

    // Reset failed attempts on successful login
    user.failedLoginAttempts = 0;
    user.lastLogin = new Date();
    user.lastActivity = new Date();
    user.lastIP = req.ip;
    await user.save();

    // Generate tokens using unified system - UŻYWA TEGO SAMEGO CO ZWYKLI UŻYTKOWNICY
    const tokenPayload = {
      userId: user._id,
      role: user.role
    };
    
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Set secure HttpOnly cookies - UŻYWA STANDARDOWYCH COOKIES
    setAuthCookies(res, accessToken, refreshToken);

    // TYMCZASOWO WYŁĄCZONE: AdminActivity może powodować duże nagłówki
    if (false) { // WYŁĄCZONE dla debugowania HTTP 431
      await AdminActivity.create({
        adminId: user._id,
        actionType: 'login_attempt',
        targetResource: {
          resourceType: 'system',
          resourceIdentifier: 'admin_panel'
        },
        actionDetails: {
          metadata: {
            loginMethod: 'password',
            sessionId
          }
        },
        requestContext: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          sessionId,
          requestId: `login_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        },
        result: {
          status: 'success',
          message: 'Admin login successful'
        }
      });
    }

    // Return admin user data (without sensitive information)
    const adminData = {
      id: user._id,
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      lastLogin: user.lastLogin,
      sessionId
    };

    res.status(200).json({
      success: true,
      message: 'Logowanie administratora przebiegło pomyślnie',
      admin: adminData
    });

  } catch (error) {
    await logSecurityEvent(req, 'admin_login_error', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Błąd serwera podczas logowania',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * Admin logout with token cleanup
 */
export const logoutAdmin = async (req, res) => {
  try {
    // Get tokens from standard cookies
    const accessToken = req.cookies?.token;
    const refreshToken = req.cookies?.refreshToken;
    const userId = req.user?._id; // Używa _id z req.user

    // Add tokens to blacklist if they exist
    if (accessToken) {
      try {
        await addToBlacklist(accessToken, {
          reason: 'ADMIN_LOGOUT',
          userId: userId,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
      } catch (blacklistError) {
        // Continue with logout even if blacklisting fails
      }
    }

    if (refreshToken) {
      try {
        await addToBlacklist(refreshToken, {
          reason: 'ADMIN_LOGOUT',
          userId: userId,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
      } catch (blacklistError) {
        // Continue with logout even if blacklisting fails
      }
    }

    // Clear standard cookies - UŻYWA STANDARDOWYCH COOKIES
    clearAuthCookies(res);

    // TYMCZASOWO WYŁĄCZONE: AdminActivity może powodować duże nagłówki
    if (false && userId) { // WYŁĄCZONE dla debugowania HTTP 431
      await AdminActivity.create({
        adminId: userId,
        actionType: 'logout',
        targetResource: {
          resourceType: 'system',
          resourceIdentifier: 'admin_panel'
        },
        requestContext: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          sessionId: req.sessionId,
          requestId: `logout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        },
        result: {
          status: 'success',
          message: 'Admin logout successful'
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Wylogowanie administratora przebiegło pomyślnie'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Błąd serwera podczas wylogowania',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * Check admin authentication status
 */
export const checkAdminAuth = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Nie jesteś zalogowany jako administrator',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Get fresh user data from database - używa userId z req.user (z middleware)
    const dbUser = await User.findById(user.userId).select('-password');
    
    if (!dbUser) {
      return res.status(401).json({
        success: false,
        error: 'Administrator nie został znaleziony',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if still has admin privileges
    if (!['admin', 'moderator'].includes(dbUser.role)) {
      // Clear cookies if no longer admin - UŻYWA STANDARDOWYCH COOKIES
      clearAuthCookies(res);
      
      return res.status(403).json({
        success: false,
        error: 'Brak uprawnień administratora',
        code: 'INSUFFICIENT_PRIVILEGES'
      });
    }

    // Check if account is still active
    if (dbUser.status === 'suspended' || dbUser.status === 'banned') {
      // Clear cookies if account suspended - UŻYWA STANDARDOWYCH COOKIES
      clearAuthCookies(res);
      
      return res.status(403).json({
        success: false,
        error: 'Konto administratora zostało zawieszone',
        code: 'ACCOUNT_SUSPENDED'
      });
    }

    // Return current admin data
    const adminData = {
      id: dbUser._id,
      name: dbUser.name,
      lastName: dbUser.lastName,
      email: dbUser.email,
      role: dbUser.role,
      lastLogin: dbUser.lastLogin,
      sessionId: req.sessionId || req.user?.sessionId
    };

    res.status(200).json({
      success: true,
      message: 'Administrator jest zalogowany',
      user: adminData
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Błąd serwera podczas sprawdzania autoryzacji',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * Log security events for admin actions
 * @param {Object} req - Express request object
 * @param {string} eventType - Type of security event
 * @param {Object} details - Additional event details
 */
const logSecurityEvent = async (req, eventType, details = {}) => {
  try {
    const securityLog = {
      eventType,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date(),
      details,
      headers: {
        'x-forwarded-for': req.get('X-Forwarded-For'),
        'x-real-ip': req.get('X-Real-IP')
      }
    };
    
    // In production, send to security monitoring service
    // await SecurityLog.create(securityLog);
    
    // Use secure logger instead of console.log
    logger.security('Admin security event', securityLog);
  } catch (error) {
    logger.error('Failed to log admin security event', {
      error: error.message,
      stack: error.stack
    });
  }
};
