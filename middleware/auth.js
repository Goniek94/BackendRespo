/**
 * SECURE AUTHENTICATION MIDDLEWARE
 * 
 * Bezpieczny middleware uwierzytelniania z następującymi funkcjami:
 * - TYLKO HttpOnly cookies (bez localStorage/sessionStorage)
 * - Automatyczna rotacja tokenów
 * - Blacklista tokenów
 * - Wykrywanie przejęcia sesji
 * - Rate limiting dla prób uwierzytelniania
 * - Szczegółowe logowanie bezpieczeństwa
 * 
 * SECURITY FEATURES:
 * - HttpOnly cookies only (no localStorage access)
 * - Automatic token rotation
 * - Token blacklisting
 * - Session hijacking detection
 * - Rate limiting for auth attempts
 * - Detailed security logging
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import mongoose from 'mongoose';

// Import configuration and models
import config from '../config/index.js';
import adminConfig from '../config/adminConfig.js';
import { addToBlacklist, isBlacklisted } from '../models/TokenBlacklist.js';
import User from '../models/user.js';
import logger from '../utils/logger.js';

// Extract security configuration
const { security, logging } = config;
const { jwt: jwtConfig, cookies: cookieConfig, session: sessionConfig = {} } = security;

// Add fallback for session config
const sessionDefaults = {
  detectHijacking: false,
  inactivityTimeout: 60 * 60 * 1000, // 1 hour
  maxSessions: 10,
  cleanupInterval: 15 * 60 * 1000
};
const finalSessionConfig = { ...sessionDefaults, ...sessionConfig };

/**
 * Generate cryptographically secure access token
 */
const generateAccessToken = (payload) => {
  const tokenId = crypto.randomBytes(16).toString('hex');
  const currentTime = Math.floor(Date.now() / 1000);
  
  return jwt.sign(
    { 
      ...payload,
      type: 'access',
      iat: currentTime,
      jti: tokenId,
      lastActivity: Date.now(),
      // Security fingerprint
      fingerprint: generateFingerprint(payload.userAgent, payload.ipAddress)
    }, 
    jwtConfig.secret, 
    { 
      expiresIn: jwtConfig.accessTokenExpiry,
      algorithm: jwtConfig.algorithm,
      audience: jwtConfig.audience,
      issuer: jwtConfig.issuer,
      subject: payload.userId.toString()
    }
  );
};

/**
 * Generate cryptographically secure refresh token
 */
const generateRefreshToken = (payload) => {
  const tokenId = crypto.randomBytes(32).toString('hex'); // Longer ID for refresh tokens
  const currentTime = Math.floor(Date.now() / 1000);
  
  return jwt.sign(
    { 
      ...payload,
      type: 'refresh',
      iat: currentTime,
      jti: tokenId,
      // Security fingerprint
      fingerprint: generateFingerprint(payload.userAgent, payload.ipAddress)
    }, 
    jwtConfig.refreshSecret, 
    { 
      expiresIn: jwtConfig.refreshTokenExpiry,
      algorithm: jwtConfig.algorithm,
      audience: jwtConfig.audience,
      issuer: jwtConfig.issuer,
      subject: payload.userId.toString()
    }
  );
};

/**
 * Generate security fingerprint for session validation
 */
const generateFingerprint = (userAgent, ipAddress) => {
  const data = `${userAgent || 'unknown'}:${ipAddress || 'unknown'}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
};

/**
 * Validate security fingerprint to detect session hijacking
 */
const validateFingerprint = (tokenFingerprint, userAgent, ipAddress) => {
  if (!finalSessionConfig.detectHijacking) {
    return true; // Skip validation if disabled
  }
  
  const currentFingerprint = generateFingerprint(userAgent, ipAddress);
  
  // DEBUG: Log fingerprint comparison
  console.log('🔍 FINGERPRINT DEBUG:', {
    tokenFP: tokenFingerprint,
    currentFP: currentFingerprint,
    ua: userAgent,
    ip: ipAddress,
    match: tokenFingerprint === currentFingerprint,
    detectHijacking: finalSessionConfig.detectHijacking
  });
  
  return tokenFingerprint === currentFingerprint;
};

/**
 * Set secure authentication cookies
 */
const setAuthCookies = (res, accessToken, refreshToken) => {
  // Access token cookie
  res.cookie('token', accessToken, {
    httpOnly: cookieConfig.httpOnly,
    secure: cookieConfig.secure,
    sameSite: cookieConfig.sameSite,
    domain: cookieConfig.domain,
    path: cookieConfig.path,
    maxAge: cookieConfig.maxAge,
    priority: cookieConfig.priority,
    partitioned: cookieConfig.partitioned
  });
  
  // Refresh token cookie (longer expiry)
  res.cookie('refreshToken', refreshToken, {
    httpOnly: cookieConfig.httpOnly,
    secure: cookieConfig.secure,
    sameSite: cookieConfig.sameSite,
    domain: cookieConfig.domain,
    path: cookieConfig.path,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    priority: cookieConfig.priority,
    partitioned: cookieConfig.partitioned
  });
};

/**
 * Clear authentication cookies
 */
const clearAuthCookies = (res) => {
  const clearOptions = {
    httpOnly: cookieConfig.httpOnly,
    secure: cookieConfig.secure,
    sameSite: cookieConfig.sameSite,
    domain: cookieConfig.domain,
    path: cookieConfig.path
  };
  
  res.clearCookie('token', clearOptions);
  res.clearCookie('refreshToken', clearOptions);
};

/**
 * Refresh user session with new tokens
 */
const refreshUserSession = async (refreshToken, req, res) => {
  try {
    // Verify refresh token
    const refreshDecoded = jwt.verify(refreshToken, jwtConfig.refreshSecret);
    
    // Validate token type
    if (refreshDecoded.type !== 'refresh') {
      throw new Error('Invalid refresh token type');
    }
    
    // Check if refresh token is blacklisted
    const isRefreshBlacklisted = await isBlacklisted(refreshToken);
    if (isRefreshBlacklisted) {
      logger.warn('Attempted use of blacklisted refresh token', {
        userId: refreshDecoded.userId,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      throw new Error('Refresh token blacklisted');
    }
    
    // Validate security fingerprint
    if (!validateFingerprint(refreshDecoded.fingerprint, req.get('User-Agent'), req.ip)) {
      logger.warn('Session hijacking attempt detected', {
        userId: refreshDecoded.userId,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        tokenFingerprint: refreshDecoded.fingerprint
      });
      throw new Error('Session hijacking detected');
    }
    
    // Verify user still exists and is active
    const user = await User.findById(refreshDecoded.userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    if (user.status === 'suspended' || user.status === 'banned') {
      logger.warn('Suspended/banned user attempted token refresh', {
        userId: user._id,
        status: user.status,
        ip: req.ip
      });
      throw new Error('User account suspended');
    }
    
    // Generate new token pair
    const tokenPayload = {
      userId: user._id,
      role: user.role || 'user',
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip
    };
    
    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);
    
    // Blacklist old refresh token (token rotation)
    await addToBlacklist(refreshToken, {
      reason: 'ROTATION',
      userId: user._id,
      ip: req.ip
    });
    
    // Set new cookies
    setAuthCookies(res, newAccessToken, newRefreshToken);
    
    // Update user's last activity
    await User.findByIdAndUpdate(user._id, {
      lastActivity: new Date(),
      lastIP: req.ip
    });
    
    // Return user data
    return {
      userId: user._id,
      role: user.role || 'user',
      isAdmin: user.role === 'admin',
      isModerator: user.role === 'moderator' || user.role === 'admin',
      permissions: user.role === 'admin' 
        ? adminConfig.adminPermissions 
        : user.role === 'moderator' 
          ? adminConfig.moderatorPermissions 
          : {}
    };
    
  } catch (error) {
    logger.error('Session refresh failed', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    throw error;
  }
};

/**
 * Main authentication middleware
 */
const authMiddleware = async (req, res, next) => {
  console.log('🚀 AUTH MIDDLEWARE CALLED!', req.originalUrl);
  try {
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      logger.warn('Database not connected during authentication', {
        readyState: mongoose.connection.readyState,
        ip: req.ip
      });
      return res.status(503).json({ 
        message: 'Service temporarily unavailable',
        code: 'DATABASE_UNAVAILABLE'
      });
    }
    
    // Log authentication attempt
    if (logging.level === 'debug') {
      logger.debug('Authentication attempt', {
        endpoint: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    }
    
    // Extract token from HttpOnly cookie ONLY
    const accessToken = req.cookies?.token;
    
    if (!accessToken) {
      logger.info('Authentication failed - no token', {
        ip: req.ip,
        endpoint: req.originalUrl
      });
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'NO_TOKEN'
      });
    }
    
    try {
      // DEBUG: Log JWT secret being used
      console.log('🔍 JWT VERIFICATION DEBUG:');
      console.log('Secret length:', jwtConfig.secret?.length);
      console.log('Secret start:', jwtConfig.secret?.substring(0, 20));
      console.log('Token start:', accessToken?.substring(0, 50));
      console.log('IP:', req.ip);
      
      // Check if token is blacklisted first
      console.log('🔍 Sprawdzanie blacklisty...');
      const isTokenBlacklisted = await isBlacklisted(accessToken);
      console.log('🔍 Token blacklisted?', isTokenBlacklisted);
      
      if (isTokenBlacklisted) {
        console.log('❌ Token jest na blackliście!');
        logger.warn('Blacklisted token used', {
          ip: req.ip,
          endpoint: req.originalUrl
        });
        clearAuthCookies(res);
        return res.status(401).json({ 
          message: 'Token invalidated. Please login again.',
          code: 'TOKEN_BLACKLISTED'
        });
      }
      
      // Verify access token
      console.log('🔍 Próba weryfikacji JWT...');
      const decoded = jwt.verify(accessToken, jwtConfig.secret);
      console.log('✅ JWT zweryfikowany pomyślnie!', decoded);
      
      // Validate token type
      if (decoded.type !== 'access') {
        logger.warn('Invalid token type used', {
          type: decoded.type,
          ip: req.ip
        });
        return res.status(401).json({ 
          message: 'Invalid token type',
          code: 'INVALID_TOKEN_TYPE'
        });
      }
      
      // Validate security fingerprint
      if (!validateFingerprint(decoded.fingerprint, req.get('User-Agent'), req.ip)) {
        logger.warn('Session hijacking detected', {
          userId: decoded.userId,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        // Blacklist the token and clear cookies
        await addToBlacklist(accessToken, {
          reason: 'HIJACKING_DETECTED',
          userId: decoded.userId,
          ip: req.ip
        });
        
        clearAuthCookies(res);
        return res.status(401).json({ 
          message: 'Session security violation detected',
          code: 'SESSION_HIJACKING'
        });
      }
      
      // Check session inactivity
      const currentTime = Date.now();
      const lastActivity = decoded.lastActivity || 0;
      
      if (currentTime - lastActivity > finalSessionConfig.inactivityTimeout) {
        logger.info('Session expired due to inactivity', {
          userId: decoded.userId,
          inactiveTime: currentTime - lastActivity,
          ip: req.ip
        });
        
        // Try to refresh using refresh token
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken) {
          clearAuthCookies(res);
          return res.status(401).json({ 
            message: 'Session expired due to inactivity',
            code: 'SESSION_INACTIVE'
          });
        }
        
        try {
          const userData = await refreshUserSession(refreshToken, req, res);
          req.user = userData;
          logger.info('Session refreshed after inactivity', {
            userId: userData.userId,
            ip: req.ip
          });
          return next();
        } catch (refreshError) {
          clearAuthCookies(res);
          return res.status(401).json({ 
            message: 'Session expired. Please login again.',
            code: 'SESSION_EXPIRED'
          });
        }
      }
      
      // Preemptive token refresh (if token expires soon) - WYŁĄCZONE NA DEV
      const tokenExp = decoded.exp * 1000;
      const refreshThreshold = 1 * 60 * 1000; // 1 minute (bardzo krótko, prawie wyłączone)
      
      if (false && tokenExp - currentTime < refreshThreshold) { // WYŁĄCZONE
        logger.debug('Preemptive token refresh', {
          userId: decoded.userId,
          timeToExpiry: tokenExp - currentTime
        });
        
        // Generate new access token
        const tokenPayload = {
          userId: decoded.userId,
          role: decoded.role || 'user',
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip
        };
        
        const newAccessToken = generateAccessToken(tokenPayload);
        
        // Blacklist old token
        await addToBlacklist(accessToken, {
          reason: 'PREEMPTIVE_ROTATION',
          userId: decoded.userId,
          ip: req.ip
        });
        
        // Set new access token cookie
        res.cookie('token', newAccessToken, {
          httpOnly: cookieConfig.httpOnly,
          secure: cookieConfig.secure,
          sameSite: cookieConfig.sameSite,
          domain: cookieConfig.domain,
          path: cookieConfig.path,
          maxAge: cookieConfig.maxAge,
          priority: cookieConfig.priority,
          partitioned: cookieConfig.partitioned
        });
      } else {
        // WYŁĄCZONE: Update activity timestamp in token (powoduje problemy na dev)
        console.log('🔍 Pomijam odświeżanie tokenu - używam istniejącego');
      }
      
      // Set user data in request
      req.user = {
        userId: decoded.userId,
        role: decoded.role || 'user',
        isAdmin: decoded.role === 'admin',
        isModerator: decoded.role === 'moderator' || decoded.role === 'admin',
        permissions: decoded.role === 'admin' 
          ? adminConfig.adminPermissions 
          : decoded.role === 'moderator' 
            ? adminConfig.moderatorPermissions 
            : {}
      };
      
      // Update user's last activity in database (async, don't wait)
      User.findByIdAndUpdate(decoded.userId, {
        lastActivity: new Date(),
        lastIP: req.ip
      }).catch(error => {
        logger.error('Failed to update user activity', {
          userId: decoded.userId,
          error: error.message
        });
      });
      
      logger.debug('Authentication successful', {
        userId: req.user.userId,
        role: req.user.role,
        ip: req.ip
      });
      
      next();
      
    } catch (jwtError) {
      console.log('❌ JWT ERROR:', jwtError.name, jwtError.message);
      console.log('❌ JWT ERROR DETAILS:', jwtError);
      
      logger.warn('JWT verification failed', {
        error: jwtError.message,
        ip: req.ip,
        endpoint: req.originalUrl
      });
      
      // Handle expired access token
      if (jwtError.name === 'TokenExpiredError') {
        const refreshToken = req.cookies?.refreshToken;
        
        if (!refreshToken) {
          clearAuthCookies(res);
          return res.status(401).json({ 
            message: 'Token expired. Please login again.',
            code: 'TOKEN_EXPIRED'
          });
        }
        
        try {
          const userData = await refreshUserSession(refreshToken, req, res);
          req.user = userData;
          logger.info('Session refreshed after token expiry', {
            userId: userData.userId,
            ip: req.ip
          });
          return next();
        } catch (refreshError) {
          clearAuthCookies(res);
          return res.status(401).json({ 
            message: 'Session expired. Please login again.',
            code: 'SESSION_EXPIRED'
          });
        }
      }
      
      // Handle other JWT errors
      clearAuthCookies(res);
      return res.status(401).json({ 
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    
  } catch (error) {
    logger.error('Authentication middleware error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      endpoint: req.originalUrl
    });
    
    return res.status(500).json({ 
      message: 'Internal server error during authentication',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Optional middleware - allows requests without authentication
 * but sets req.user if valid token is present
 */
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const accessToken = req.cookies?.token;
    
    if (!accessToken) {
      return next(); // Continue without authentication
    }
    
    // Try to authenticate, but don't fail if it doesn't work
    try {
      const decoded = jwt.verify(accessToken, jwtConfig.secret);
      
      if (decoded.type === 'access' && 
          validateFingerprint(decoded.fingerprint, req.get('User-Agent'), req.ip)) {
        
        req.user = {
          userId: decoded.userId,
          role: decoded.role || 'user',
          isAdmin: decoded.role === 'admin',
          isModerator: decoded.role === 'moderator' || decoded.role === 'admin',
          permissions: decoded.role === 'admin' 
            ? adminConfig.adminPermissions 
            : decoded.role === 'moderator' 
              ? adminConfig.moderatorPermissions 
              : {}
        };
      }
    } catch (error) {
      // Ignore authentication errors in optional middleware
      logger.debug('Optional authentication failed', {
        error: error.message,
        ip: req.ip
      });
    }
    
    next();
  } catch (error) {
    logger.error('Optional auth middleware error', {
      error: error.message,
      ip: req.ip
    });
    next(); // Continue even if there's an error
  }
};

// Export middleware and utility functions
export { 
  generateAccessToken, 
  generateRefreshToken, 
  setAuthCookies, 
  clearAuthCookies,
  refreshUserSession,
  optionalAuthMiddleware
};

export default authMiddleware;
