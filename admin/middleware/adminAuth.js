import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import User from '../../models/user.js';
import AdminActivity from '../models/AdminActivity.js';
import { isBlacklisted } from '../../models/TokenBlacklist.js';
import logger from '../../utils/logger.js';

/**
 * Professional Admin Authentication Middleware
 * Enterprise-grade security for admin panel access
 * Features: JWT validation, rate limiting, activity logging
 * 
 * @author Senior Developer
 * @version 1.0.0
 */

/**
 * Rate limiter for admin login attempts
 * Prevents brute force attacks on admin accounts
 */
export const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 attempts per window
  message: {
    success: false,
    error: 'Too many login attempts. Try again in 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `admin_login:${req.ip}:${req.body.email || 'unknown'}`,
  skipSuccessfulRequests: true,
  handler: async (req, res) => {
    await logSecurityEvent(req, 'rate_limit_exceeded', {
      attempts: req.rateLimit.current,
      windowMs: req.rateLimit.windowMs
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many login attempts. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

/**
 * Rate limiter for admin API requests
 * Prevents API abuse and ensures system stability
 */
export const adminApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Max 100 requests per minute
  message: {
    success: false,
    error: 'Too many API requests. Please slow down.',
    code: 'API_RATE_LIMIT_EXCEEDED'
  },
  keyGenerator: (req) => `admin_api:${req.ip}:${req.user?.id || 'anonymous'}`
});

/**
 * Validates JWT token and extracts admin user information
 * @param {string} token - JWT token to validate
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const validateJwtToken = (token) => {
  try {
    // Używamy tego samego JWT_SECRET co zwykłe logowanie
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Validate basic token structure (userId może być jako userId lub id)
    const userId = decoded.userId || decoded.id;
    if (!userId) {
      throw new Error('Invalid token structure - missing user ID');
    }
    
    // Nie sprawdzamy roli w tokenie - sprawdzimy w bazie danych
    // Token może nie mieć roli lub może być nieaktualna
    
    return {
      ...decoded,
      userId: userId, // Normalizujemy do userId
      id: userId // Zachowujemy też id dla kompatybilności
    };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
};

/**
 * Checks if admin session is still active and valid
 * @param {string} sessionId - Session ID to validate
 * @param {string} userId - User ID associated with session
 * @returns {boolean} True if session is active
 */
const validateAdminSession = async (sessionId, userId) => {
  // Check if user still exists and has admin privileges
  const user = await User.findById(userId);
  if (!user || !['admin', 'moderator'].includes(user.role)) {
    return false;
  }
  
  // Check if user account is active
  if (user.status === 'blocked' || user.status === 'deleted') {
    return false;
  }
  
  // Additional session validation could be implemented here
  // e.g., checking against Redis session store, database session table, etc.
  
  return true;
};

/**
 * Logs security-related events for monitoring and compliance
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
    
    // Use secure logger instead of console.log
    logger.security('Admin security event', securityLog);
    
    // Could also store in database for compliance
    // await SecurityLog.create(securityLog);
  } catch (error) {
    logger.error('Failed to log security event', {
      error: error.message,
      stack: error.stack
    });
  }
};

/**
 * Main admin authentication middleware
 * Validates JWT token, checks session, and sets user context
 */
export const requireAdminAuth = async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    // Używamy tego samego tokenu co zwykłe logowanie (token, nie admin_token)
    let token = req.cookies?.token;
    
    // Fallback do Authorization header (dla kompatybilności wstecznej)
    if (!token) {
      const authHeader = req.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    
    if (!token) {
      await logSecurityEvent(req, 'auth_missing_token');
      return res.status(401).json({
        success: false,
        error: 'Brak tokenu uwierzytelniania',
        code: 'MISSING_TOKEN'
      });
    }
    
    // Check if token is blacklisted
    const isTokenBlacklisted = await isBlacklisted(token);
    if (isTokenBlacklisted) {
      await logSecurityEvent(req, 'auth_blacklisted_token', { 
        tokenPrefix: token.substring(0, 20) 
      });
      
      // Clear the cookie if it's blacklisted
      res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/'
      });
      
      return res.status(401).json({
        success: false,
        error: 'Token został unieważniony. Zaloguj się ponownie.',
        code: 'TOKEN_BLACKLISTED'
      });
    }
    
    // Validate JWT token
    const decoded = validateJwtToken(token);
    
    // Validate session - używamy jti jako sessionId jeśli sessionId nie istnieje
    const sessionId = decoded.sessionId || decoded.jti;
    const userId = decoded.userId || decoded.id;
    const isSessionValid = await validateAdminSession(sessionId, userId);
    if (!isSessionValid) {
      await logSecurityEvent(req, 'auth_invalid_session', { userId: userId });
      return res.status(401).json({
        success: false,
        error: 'Sesja wygasła lub jest nieprawidłowa',
        code: 'INVALID_SESSION'
      });
    }
    
    // Fetch current user data
    const user = await User.findById(userId).select('-password');
    if (!user) {
      await logSecurityEvent(req, 'auth_user_not_found', { userId: userId });
      return res.status(401).json({
        success: false,
        error: 'Użytkownik nie został znaleziony',
        code: 'USER_NOT_FOUND'
      });
    }

    // Sprawdź czy użytkownik ma uprawnienia administratora
    if (!['admin', 'moderator'].includes(user.role)) {
      await logSecurityEvent(req, 'auth_insufficient_privileges', { 
        userId: user._id,
        userRole: user.role,
        endpoint: req.originalUrl
      });
      
      return res.status(403).json({
        success: false,
        error: 'Brak uprawnień administratora',
        code: 'INSUFFICIENT_PRIVILEGES'
      });
    }

    // Sprawdź czy konto nie jest zablokowane
    if (user.status === 'suspended' || user.status === 'banned' || user.accountLocked) {
      await logSecurityEvent(req, 'auth_account_blocked', {
        userId: user._id,
        status: user.status,
        accountLocked: user.accountLocked
      });
      
      return res.status(403).json({
        success: false,
        error: 'Konto zostało zablokowane lub zawieszone',
        code: 'ACCOUNT_BLOCKED'
      });
    }
    
    // Set user context for subsequent middleware/controllers
    req.user = user;
    req.sessionId = sessionId; // Używamy sessionId z wcześniejszej walidacji
    req.authStartTime = startTime;
    
    // Log successful authentication for audit trail (non-blocking)
    try {
      await AdminActivity.create({
        adminId: user._id,
        actionType: 'login_attempt',
        targetResource: {
          resourceType: 'system',
          resourceIdentifier: 'admin_panel'
        },
        actionDetails: {
          metadata: {
            endpoint: req.originalUrl,
            method: req.method
          }
        },
        requestContext: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          sessionId: sessionId, // Używamy sessionId z wcześniejszej walidacji
          requestId: req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        },
        result: {
          status: 'success',
          executionTime: Date.now() - startTime
        }
      });
    } catch (activityLogError) {
      // Don't block authentication if activity logging fails
      logger.warn('Failed to log admin activity', {
        error: activityLogError.message,
        userId: user._id
      });
    }
    
    next();
  } catch (error) {
    await logSecurityEvent(req, 'auth_error', { 
      error: error.message,
      stack: error.stack 
    });
    
    return res.status(401).json({
      success: false,
      error: 'Uwierzytelnianie nie powiodło się',
      code: 'AUTH_FAILED',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Middleware to check specific admin permissions
 * @param {Array} requiredRoles - Array of roles that can access the resource
 * @returns {Function} Express middleware function
 */
export const requireAdminRole = (requiredRoles = ['admin']) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'NOT_AUTHENTICATED'
        });
      }
      
      if (!requiredRoles.includes(req.user.role)) {
        await logSecurityEvent(req, 'access_denied', {
          userId: req.user._id,
          userRole: req.user.role,
          requiredRoles,
          endpoint: req.originalUrl
        });
        
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }
      
      next();
    } catch (error) {
      logger.error('Role check error', {
        error: error.message,
        stack: error.stack,
        userId: req.user?._id
      });
      return res.status(500).json({
        success: false,
        error: 'Permission check failed',
        code: 'PERMISSION_CHECK_FAILED'
      });
    }
  };
};

/**
 * Middleware to log admin activity
 * @param {string} actionType - Type of action being performed
 * @returns {Function} Express middleware function
 */
export const logAdminActivity = (actionType) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    const startTime = Date.now();
    
    // Override res.send to capture response
    res.send = function(data) {
      const executionTime = Date.now() - startTime;
      
      // Log activity after response is sent
      setImmediate(async () => {
        try {
          const isSuccess = res.statusCode >= 200 && res.statusCode < 300;
          
          await AdminActivity.create({
            adminId: req.user._id,
            actionType,
            targetResource: {
              resourceType: req.params.resourceType || 'unknown',
              resourceId: req.params.id || req.params.resourceId,
              resourceIdentifier: req.params.identifier || req.body.identifier
            },
            actionDetails: {
              metadata: {
                endpoint: req.originalUrl,
                method: req.method,
                params: req.params,
                query: req.query
              },
              reason: req.body.reason || req.query.reason
            },
            requestContext: {
              ipAddress: req.ip,
              userAgent: req.get('User-Agent'),
              sessionId: req.sessionId,
              requestId: req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            },
            result: {
              status: isSuccess ? 'success' : 'failure',
              message: isSuccess ? 'Operation completed successfully' : 'Operation failed',
              executionTime
            }
          });
        } catch (error) {
          logger.error('Failed to log admin activity', {
            error: error.message,
            stack: error.stack,
            adminId: req.user?._id,
            actionType
          });
        }
      });
      
      originalSend.call(this, data);
    };
    
    next();
  };
};
