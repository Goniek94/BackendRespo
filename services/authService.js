/**
 * CENTRALNY SYSTEM ZARZĄDZANIA TOKENAMI I CIASTECZKAMI
 * 
 * JEDEN SYSTEM DLA WSZYSTKIEGO:
 * - Generowanie tokenów JWT
 * - Ustawianie ciasteczek
 * - Czyszczenie ciasteczek
 * - Walidacja tokenów
 * - Odświeżanie sesji
 * 
 * WSZYSTKO W JEDNYM MIEJSCU - KONIEC Z DUPLIKATAMI!
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/user/user.js';
import { addToBlacklist, isBlacklisted } from '../models/security/TokenBlacklist.js';
import logger from '../utils/logger.js';

const isProd = process.env.NODE_ENV === 'production';

// KONFIGURACJA TOKENÓW - JEDEN SYSTEM
const TOKEN_CONFIG = {
  ACCESS_TOKEN_EXPIRY: isProd ? '15m' : '1h',
  REFRESH_TOKEN_EXPIRY: '7d',
  ALGORITHM: 'HS256',
  ISSUER: 'marketplace-backend',
  AUDIENCE: 'marketplace-users'
};

// KONFIGURACJA CIASTECZEK - JEDEN SYSTEM
const COOKIE_CONFIG = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'strict' : 'lax',
  domain: isProd ? process.env.COOKIE_DOMAIN : undefined,
  path: '/',
  // Access token - krótki czas życia
  accessToken: {
    name: 'token',
    maxAge: isProd ? 15 * 60 * 1000 : 3600000 // 15min prod, 1h dev
  },
  // Refresh token - długi czas życia
  refreshToken: {
    name: 'refreshToken',
    maxAge: 7 * 24 * 3600000 // 7 dni
  }
};

/**
 * GENEROWANIE TOKENÓW - JEDEN SYSTEM
 */
class TokenService {
  /**
   * Generuje access token
   */
  static generateAccessToken(payload) {
    const tokenId = crypto.randomBytes(16).toString('hex');
    const currentTime = Math.floor(Date.now() / 1000);
    
    // MINIMALNA ZAWARTOŚĆ - BEZ DUPLIKATÓW
    const minimalPayload = {
      userId: payload.userId,
      role: payload.role || 'user',
      type: 'access',
      iat: currentTime,
      jti: tokenId
    };
    
    return jwt.sign(
      minimalPayload,
      process.env.JWT_SECRET,
      {
        expiresIn: TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY,
        algorithm: TOKEN_CONFIG.ALGORITHM,
        audience: TOKEN_CONFIG.AUDIENCE,
        issuer: TOKEN_CONFIG.ISSUER,
        subject: payload.userId.toString()
      }
    );
  }

  /**
   * Generuje refresh token
   */
  static generateRefreshToken(payload) {
    const tokenId = crypto.randomBytes(32).toString('hex');
    const currentTime = Math.floor(Date.now() / 1000);
    
    // MINIMALNA ZAWARTOŚĆ - BEZ DUPLIKATÓW
    const minimalPayload = {
      userId: payload.userId,
      role: payload.role || 'user',
      type: 'refresh',
      iat: currentTime,
      jti: tokenId
    };
    
    return jwt.sign(
      minimalPayload,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      {
        expiresIn: TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY,
        algorithm: TOKEN_CONFIG.ALGORITHM,
        audience: TOKEN_CONFIG.AUDIENCE,
        issuer: TOKEN_CONFIG.ISSUER,
        subject: payload.userId.toString()
      }
    );
  }

  /**
   * Waliduje token
   */
  static validateToken(token, type = 'access') {
    try {
      const secret = type === 'refresh' 
        ? (process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET)
        : process.env.JWT_SECRET;
      
      const decoded = jwt.verify(token, secret);
      
      // Sprawdź typ tokena
      if (decoded.type !== type) {
        throw new Error(`Invalid token type. Expected: ${type}, got: ${decoded.type}`);
      }
      
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }
}

/**
 * ZARZĄDZANIE CIASTECZKAMI - JEDEN SYSTEM
 */
class CookieService {
  /**
   * Ustawia ciasteczka autoryzacyjne
   */
  static setAuthCookies(res, accessToken, refreshToken) {
    // Access token cookie
    res.cookie(COOKIE_CONFIG.accessToken.name, accessToken, {
      ...COOKIE_CONFIG,
      maxAge: COOKIE_CONFIG.accessToken.maxAge
    });
    
    // Refresh token cookie
    res.cookie(COOKIE_CONFIG.refreshToken.name, refreshToken, {
      ...COOKIE_CONFIG,
      maxAge: COOKIE_CONFIG.refreshToken.maxAge
    });
    
    logger.debug('Auth cookies set', {
      accessTokenExpiry: new Date(Date.now() + COOKIE_CONFIG.accessToken.maxAge),
      refreshTokenExpiry: new Date(Date.now() + COOKIE_CONFIG.refreshToken.maxAge)
    });
  }

  /**
   * Czyści wszystkie ciasteczka autoryzacyjne
   */
  static clearAuthCookies(res) {
    const cookiesToClear = [
      'token',
      'refreshToken',
      'adminToken',
      'sessionId',
      'csrfToken',
      'remember_token',
      'auth_session',
      'user_session',
      'admin_session',
      'temp_token',
      'backup_token',
      'old_token'
    ];

    cookiesToClear.forEach(cookieName => {
      res.clearCookie(cookieName, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'strict' : 'lax',
        path: '/',
        domain: isProd ? process.env.COOKIE_DOMAIN : undefined
      });
    });
    
    logger.debug('All auth cookies cleared');
  }

  /**
   * Pobiera token z ciasteczka lub nagłówka
   */
  static extractToken(req, tokenType = 'access') {
    const cookieName = tokenType === 'refresh' 
      ? COOKIE_CONFIG.refreshToken.name 
      : COOKIE_CONFIG.accessToken.name;
    
    // Priorytet 1: Ciasteczko (bezpieczne)
    let token = req.cookies?.[cookieName];
    
    // Priorytet 2: Authorization header (fallback)
    if (!token && tokenType === 'access') {
      const authHeader = req.headers?.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7).trim();
      }
    }
    
    return token;
  }
}

/**
 * GŁÓWNY SERWIS AUTORYZACJI - JEDEN SYSTEM DLA WSZYSTKIEGO
 */
class AuthService {
  /**
   * Loguje użytkownika - JEDEN SYSTEM
   */
  static async loginUser(user, res) {
    try {
      // Generuj tokeny
      const tokenPayload = {
        userId: user._id,
        role: user.role || 'user'
      };
      
      const accessToken = TokenService.generateAccessToken(tokenPayload);
      const refreshToken = TokenService.generateRefreshToken(tokenPayload);
      
      // Ustaw ciasteczka
      CookieService.setAuthCookies(res, accessToken, refreshToken);
      
      // Aktualizuj dane użytkownika
      await User.findByIdAndUpdate(user._id, {
        lastLogin: new Date(),
        lastActivity: new Date()
      });
      
      logger.info('User logged in successfully', {
        userId: user._id,
        role: user.role
      });
      
      return {
        user: {
          id: user._id,
          name: user.name,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified
        },
        tokens: {
          accessToken,
          refreshToken
        }
      };
    } catch (error) {
      logger.error('Login failed', {
        error: error.message,
        userId: user._id
      });
      throw error;
    }
  }

  /**
   * Wylogowuje użytkownika - JEDEN SYSTEM
   */
  static async logoutUser(req, res) {
    try {
      // Pobierz tokeny
      const accessToken = CookieService.extractToken(req, 'access');
      const refreshToken = CookieService.extractToken(req, 'refresh');
      
      // Dodaj do blacklisty
      if (accessToken) {
        await addToBlacklist(accessToken, {
          reason: 'LOGOUT',
          userId: req.user?.userId
        });
      }
      
      if (refreshToken) {
        await addToBlacklist(refreshToken, {
          reason: 'LOGOUT',
          userId: req.user?.userId
        });
      }
      
      // Wyczyść ciasteczka
      CookieService.clearAuthCookies(res);
      
      logger.info('User logged out successfully', {
        userId: req.user?.userId
      });
      
      return { success: true };
    } catch (error) {
      logger.error('Logout failed', {
        error: error.message,
        userId: req.user?.userId
      });
      throw error;
    }
  }

  /**
   * Odświeża sesję - JEDEN SYSTEM
   */
  static async refreshSession(req, res) {
    try {
      const refreshToken = CookieService.extractToken(req, 'refresh');
      
      if (!refreshToken) {
        throw new Error('No refresh token provided');
      }
      
      // Sprawdź blacklistę
      const isBlacklisted = await isBlacklisted(refreshToken);
      if (isBlacklisted) {
        throw new Error('Refresh token is blacklisted');
      }
      
      // Waliduj token
      const decoded = TokenService.validateToken(refreshToken, 'refresh');
      
      // Sprawdź użytkownika
      const user = await User.findById(decoded.userId);
      if (!user || user.status !== 'active') {
        throw new Error('User not found or inactive');
      }
      
      // Generuj nowe tokeny
      const tokenPayload = {
        userId: user._id,
        role: user.role
      };
      
      const newAccessToken = TokenService.generateAccessToken(tokenPayload);
      const newRefreshToken = TokenService.generateRefreshToken(tokenPayload);
      
      // Blacklistuj stary refresh token
      await addToBlacklist(refreshToken, {
        reason: 'ROTATION',
        userId: user._id
      });
      
      // Ustaw nowe ciasteczka
      CookieService.setAuthCookies(res, newAccessToken, newRefreshToken);
      
      // Aktualizuj aktywność
      await User.findByIdAndUpdate(user._id, {
        lastActivity: new Date()
      });
      
      logger.info('Session refreshed successfully', {
        userId: user._id
      });
      
      return {
        userId: user._id,
        role: user.role,
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        }
      };
    } catch (error) {
      logger.error('Session refresh failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Waliduje autoryzację - JEDEN SYSTEM
   */
  static async validateAuth(req) {
    try {
      const accessToken = CookieService.extractToken(req, 'access');
      
      if (!accessToken) {
        throw new Error('No access token provided');
      }
      
      // Sprawdź blacklistę
      const isTokenBlacklisted = await isBlacklisted(accessToken);
      if (isTokenBlacklisted) {
        throw new Error('Token is blacklisted');
      }
      
      // Waliduj token
      const decoded = TokenService.validateToken(accessToken, 'access');
      
      // Sprawdź użytkownika
      const user = await User.findById(decoded.userId).select('-password');
      if (!user || user.status !== 'active') {
        throw new Error('User not found or inactive');
      }
      
      return {
        user,
        decoded
      };
    } catch (error) {
      logger.debug('Auth validation failed', {
        error: error.message
      });
      throw error;
    }
  }
}

// EKSPORT - JEDEN SYSTEM DLA WSZYSTKIEGO
export default AuthService;
export { TokenService, CookieService };
