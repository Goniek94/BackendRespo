import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../../../models/user.js';
import AdminActivity from '../../models/AdminActivity.js';
import { addToBlacklist } from '../../../models/TokenBlacklist.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Admin Authentication Controller
 * Secure cookie-based authentication for admin panel
 * Features: HttpOnly cookies, session management, audit logging
 * 
 * @author Senior Developer
 * @version 1.0.0
 */

/**
 * Cookie configuration for admin tokens
 */
const getCookieConfig = () => ({
  httpOnly: true, // Prevents XSS attacks
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  path: '/' // Available for entire domain
});

/**
 * Generate admin JWT token with session ID
 * @param {Object} user - User object
 * @returns {Object} Token and session info
 */
const generateAdminToken = (user) => {
  const sessionId = uuidv4();
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role,
    sessionId,
    type: 'admin',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };

  const token = jwt.sign(payload, process.env.JWT_ADMIN_SECRET || process.env.JWT_SECRET);
  
  return { token, sessionId };
};

/**
 * Admin login with cookie-based authentication
 */
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

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

    // Generate admin token with session
    const { token, sessionId } = generateAdminToken(user);

    // Set secure HttpOnly cookie
    res.cookie('admin_token', token, getCookieConfig());

    // Log successful admin login
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
    console.error('Admin login error:', error);
    
    await logSecurityEvent(req, 'admin_login_error', {
      error: error.message,
      stack: error.stack
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
    const adminToken = req.cookies?.admin_token;
    const userId = req.user?.id;

    // Add admin token to blacklist if it exists
    if (adminToken) {
      try {
        await addToBlacklist(adminToken, {
          reason: 'ADMIN_LOGOUT',
          userId: userId,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        console.log('Admin token added to blacklist on logout');
      } catch (blacklistError) {
        console.error('Failed to blacklist admin token:', blacklistError);
        // Continue with logout even if blacklisting fails
      }
    }

    // Clear admin cookie
    res.clearCookie('admin_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/'
    });

    // Log admin logout
    if (userId) {
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
    console.error('Admin logout error:', error);
    
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

    // Get fresh user data from database
    const dbUser = await User.findById(user.id).select('-password');
    
    if (!dbUser) {
      return res.status(401).json({
        success: false,
        error: 'Administrator nie został znaleziony',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if still has admin privileges
    if (!['admin', 'moderator'].includes(dbUser.role)) {
      // Clear cookie if no longer admin
      res.clearCookie('admin_token', getCookieConfig());
      
      return res.status(403).json({
        success: false,
        error: 'Brak uprawnień administratora',
        code: 'INSUFFICIENT_PRIVILEGES'
      });
    }

    // Check if account is still active
    if (dbUser.status === 'suspended' || dbUser.status === 'banned') {
      // Clear cookie if account suspended
      res.clearCookie('admin_token', getCookieConfig());
      
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
      sessionId: req.sessionId
    };

    res.status(200).json({
      success: true,
      message: 'Administrator jest zalogowany',
      admin: adminData
    });

  } catch (error) {
    console.error('Check admin auth error:', error);
    
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
    
    console.log('ADMIN SECURITY EVENT:', JSON.stringify(securityLog, null, 2));
    
    // In production, send to security monitoring service
    // await SecurityLog.create(securityLog);
  } catch (error) {
    console.error('Failed to log admin security event:', error);
  }
};
