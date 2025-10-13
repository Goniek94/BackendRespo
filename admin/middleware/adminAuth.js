// admin/middleware/adminAuth.js
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import User from "../../models/user/user.js";
import AdminActivity from "../models/AdminActivity.js";
import { isBlacklisted } from "../../models/security/TokenBlacklist.js";
import logger from "../../utils/logger.js";
import { refreshUserSession } from "../../middleware/auth.js";
import { generateSecureToken } from "../../utils/securityTokens.js";
import config from "../../config/index.js";

/**
 * Professional Admin Authentication Middleware
 * Enterprise-grade security for admin panel access
 * Features: JWT validation, rate limiting, activity logging
 *


/**
 * Rate limiter for admin login attempts
 * Prevents brute force attacks on admin accounts
 */
export const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 attempts per window
  message: {
    success: false,
    error: "Too many login attempts. Try again in 15 minutes.",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `admin_login:${req.ip}:${req.body.email || "unknown"}`,
  skipSuccessfulRequests: true,
  handler: async (req, res) => {
    await logSecurityEvent(req, "rate_limit_exceeded", {
      attempts: req.rateLimit.current,
      windowMs: req.rateLimit.windowMs,
    });

    res.status(429).json({
      success: false,
      error: "Too many login attempts. Please try again later.",
      code: "RATE_LIMIT_EXCEEDED",
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },
});

/**
 * Rate limiter for admin API requests
 * Prevents API abuse and ensures system stability
 *
 * ✅ ZMIANA: w środowisku innym niż 'production' limiter jest wyłączony (przepuszcza żądania),
 *            żeby na DEV nie było 429. Na produkcji ustawiony wyższy próg.
 */
export const adminApiLimiter =
  process.env.NODE_ENV !== "production"
    ? (req, res, next) => next() // DEV / STAGING: brak limitu
    : rateLimit({
        windowMs: 60 * 1000, // 1 minuta
        max: 300, // wyższy próg na produkcji
        message: {
          success: false,
          error: "Too many API requests. Please slow down.",
          code: "API_RATE_LIMIT_EXCEEDED",
        },
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) =>
          `admin_api:${req.ip}:${req.user?.id || "anonymous"}`,
      });

/**
 * Validates JWT token and extracts admin user information
 * UPDATED: Obsługuje minimalne tokeny z polami 'id' i 'r'
 * @param {string} token - JWT token to validate
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const validateJwtToken = (token) => {
  try {
    // NAPRAWIONE: Używamy spójnej konfiguracji JWT z config.security.jwt
    const jwtCfg = config.security?.jwt || {};

    // Weryfikacja z issuer/audience dla spójności z Socket.IO
    const decoded = jwt.verify(token, jwtCfg.secret || process.env.JWT_SECRET, {
      issuer: jwtCfg.issuer || "marketplace-app",
      audience: jwtCfg.audience || "marketplace-users",
      algorithms: [jwtCfg.algorithm || "HS256"],
    });

    // Validate basic token structure - obsługuje minimalne tokeny z polem 'u'
    const userId = decoded.u || decoded.userId || decoded.id; // 'u' to nowe ultra-minimalne pole
    if (!userId) {
      throw new Error("Invalid token structure - missing user ID");
    }

    // Obsługuj skróconą rolę 'r' lub pełną 'role'
    const role = decoded.r || decoded.role;

    return {
      ...decoded,
      userId: userId, // Normalizujemy do userId
      id: userId, // Zachowujemy też id dla kompatybilności
      u: userId, // Zachowujemy też u dla kompatybilności
      role: role, // Dodajemy rolę jeśli jest dostępna
    };
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new Error("Token has expired");
    } else if (error.name === "JsonWebTokenError") {
      throw new Error("Invalid token");
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
  try {
    // Check if user still exists and has admin privileges
    const user = await User.findById(userId);
    if (!user || !["admin", "moderator"].includes(user.role)) {
      logger.warn(
        "Admin session validation failed - user not found or insufficient role",
        {
          userId,
          userExists: !!user,
          userRole: user?.role,
        }
      );
      return false;
    }

    // Check if user account is active - poprawione nazwy statusów
    if (
      user.status === "suspended" ||
      user.status === "banned" ||
      user.status === "blocked" ||
      user.status === "deleted"
    ) {
      logger.warn("Admin session validation failed - account inactive", {
        userId,
        status: user.status,
      });
      return false;
    }

    // Additional session validation could be implemented here
    // e.g., checking against Redis session store, database session table, etc.

    logger.debug("Admin session validation successful", {
      userId,
      userRole: user.role,
      sessionId,
    });

    return true;
  } catch (error) {
    logger.error("Admin session validation error", {
      error: error.message,
      userId,
      sessionId,
    });
    return false;
  }
};

/**
 * NAPRAWIONE: Uproszczone logowanie bezpieczeństwa - zapobiega HTTP 431
 * @param {Object} req - Express request object
 * @param {string} eventType - Type of security event
 * @param {Object} details - Additional event details
 */
const logSecurityEvent = async (req, eventType, details = {}) => {
  try {
    // NAPRAWIONE: Minimalne logowanie aby uniknąć HTTP 431
    logger.warn(`Admin security: ${eventType}`, {
      ip: req.ip,
      userId: details.userId || "unknown",
    });
  } catch {
    // ignore
  }
};

/**
 * Main admin authentication middleware
 * Validates JWT token, checks session, and sets user context
 */
export const requireAdminAuth = async (req, res, next) => {
  const startTime = Date.now();

  try {
    // Używamy standardowych cookies jak w kontrolerze admina
    let token = req.cookies?.token; // Używamy tylko standardowego 'token'

    // Fallback do Authorization header (dla kompatybilności wstecznej)
    if (!token) {
      const authHeader = req.get("Authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      await logSecurityEvent(req, "auth_missing_token");
      return res.status(401).json({
        success: false,
        error: "Brak tokenu uwierzytelniania",
        code: "MISSING_TOKEN",
      });
    }

    // Check if token is blacklisted
    const isTokenBlacklisted = await isBlacklisted(token);
    if (isTokenBlacklisted) {
      await logSecurityEvent(req, "auth_blacklisted_token", {
        tokenPrefix: token.substring(0, 20),
      });

      // Clear the cookies if token is blacklisted - używa standardowej konfiguracji
      const { clearAuthCookies } = await import("../../config/cookieConfig.js");
      clearAuthCookies(res);

      return res.status(401).json({
        success: false,
        error: "Token został unieważniony. Zaloguj się ponownie.",
        code: "TOKEN_BLACKLISTED",
      });
    }

    // Validate JWT token (with graceful refresh on expiry)
    let decoded;
    try {
      decoded = validateJwtToken(token);
    } catch (e) {
      if (e.message === "Token has expired" || e.name === "TokenExpiredError") {
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken) {
          await logSecurityEvent(req, "auth_token_expired_no_refresh");
          const { clearAuthCookies } = await import(
            "../../config/cookieConfig.js"
          );
          clearAuthCookies(res);
          return res.status(401).json({
            success: false,
            error: "Session expired",
            code: "SESSION_EXPIRED",
          });
        }
        try {
          const userData = await refreshUserSession(refreshToken, req, res);
          // Recreate a minimal decoded-like structure for downstream checks
          decoded = {
            userId: userData.userId,
            role: userData.role,
            sessionId: userData.sessionId,
          };
          await logSecurityEvent(req, "auth_refreshed_after_expiry", {
            userId: userData.userId,
          });
        } catch (refreshErr) {
          const { clearAuthCookies } = await import(
            "../../config/cookieConfig.js"
          );
          clearAuthCookies(res);
          return res.status(401).json({
            success: false,
            error: "Session refresh failed",
            code: "REFRESH_FAILED",
          });
        }
      } else {
        throw e;
      }
    }

    // Validate session - używamy jti jako sessionId jeśli sessionId nie istnieje
    const sessionId = decoded.sessionId || decoded.jti || decoded.j; // 'j' to nowe ultra-minimalne pole
    const userId = decoded.userId || decoded.u || decoded.id; // 'u' to nowe ultra-minimalne pole
    const isSessionValid = await validateAdminSession(sessionId, userId);
    if (!isSessionValid) {
      await logSecurityEvent(req, "auth_invalid_session", { userId: userId });
      return res.status(401).json({
        success: false,
        error: "Sesja wygasła lub jest nieprawidłowa",
        code: "INVALID_SESSION",
      });
    }

    // Fetch current user data
    const user = await User.findById(userId).select("-password");
    if (!user) {
      await logSecurityEvent(req, "auth_user_not_found", { userId: userId });
      return res.status(401).json({
        success: false,
        error: "Użytkownik nie został znaleziony",
        code: "USER_NOT_FOUND",
      });
    }

    // Sprawdź czy użytkownik ma uprawnienia administratora
    if (!["admin", "moderator"].includes(user.role)) {
      await logSecurityEvent(req, "auth_insufficient_privileges", {
        userId: user._id,
        userRole: user.role,
        endpoint: req.originalUrl,
      });

      return res.status(403).json({
        success: false,
        error: "Brak uprawnień administratora",
        code: "INSUFFICIENT_PRIVILEGES",
      });
    }

    // Sprawdź czy konto nie jest zablokowane
    if (
      user.status === "suspended" ||
      user.status === "banned" ||
      user.accountLocked
    ) {
      await logSecurityEvent(req, "auth_account_blocked", {
        userId: user._id,
        status: user.status,
        accountLocked: user.accountLocked,
      });

      return res.status(403).json({
        success: false,
        error: "Konto zostało zablokowane lub zawieszone",
        code: "ACCOUNT_BLOCKED",
      });
    }

    // Set user context for subsequent middleware/controllers
    req.user = user;
    req.sessionId = sessionId; // Używamy sessionId z wcześniejszej walidacji
    req.authStartTime = startTime;

    // TYMCZASOWO WYŁĄCZONE: AdminActivity logging może powodować duże nagłówki
    if (false) {
      try {
        await AdminActivity.create({
          adminId: user._id,
          actionType: "login_attempt",
          targetResource: {
            resourceType: "system",
            resourceIdentifier: "admin_panel",
          },
          actionDetails: {
            metadata: {
              endpoint: req.originalUrl,
              method: req.method,
            },
          },
          requestContext: {
            ipAddress: req.ip,
            userAgent: req.get("User-Agent"),
            sessionId: sessionId,
            requestId: req.id || `req_${Date.now()}_${generateSecureToken(9)}`,
          },
          result: {
            status: "success",
            executionTime: Date.now() - startTime,
          },
        });
      } catch (activityLogError) {
        logger.warn("Failed to log admin activity", {
          error: activityLogError.message,
          userId: user._id,
        });
      }
    }

    next();
  } catch (error) {
    await logSecurityEvent(req, "auth_error", {
      error: error.message,
      stack: error.stack,
    });

    return res.status(401).json({
      success: false,
      error: "Uwierzytelnianie nie powiodło się",
      code: "AUTH_FAILED",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Middleware to check specific admin permissions
 * @param {Array} requiredRoles - Array of roles that can access the resource
 * @returns {Function} Express middleware function
 */
export const requireAdminRole = (requiredRoles = ["admin"]) => {
  return async (req, res, next) => {
    try {
      console.log("🟣 requireAdminRole MIDDLEWARE CALLED");
      console.log("🟣 Required roles:", requiredRoles);
      console.log("🟣 req.user exists:", !!req.user);
      console.log("🟣 req.user.role:", req.user?.role);
      console.log("🟣 req.user._id:", req.user?._id);

      if (!req.user) {
        console.log("❌ No req.user - returning 401");
        return res.status(401).json({
          success: false,
          error: "Authentication required",
          code: "NOT_AUTHENTICATED",
        });
      }

      if (!requiredRoles.includes(req.user.role)) {
        console.log("❌ Role not in required roles - returning 403");
        console.log("❌ User role:", req.user.role);
        console.log("❌ Required roles:", requiredRoles);

        await logSecurityEvent(req, "access_denied", {
          userId: req.user._id,
          userRole: req.user.role,
          requiredRoles,
          endpoint: req.originalUrl,
        });

        return res.status(403).json({
          success: false,
          error: "Insufficient permissions",
          code: "INSUFFICIENT_PERMISSIONS",
        });
      }

      console.log("✅ Role check passed - proceeding");
      next();
    } catch (error) {
      console.error("❌ requireAdminRole error:", error);
      logger.error("Role check error", {
        error: error.message,
        stack: error.stack,
        userId: req.user?._id,
      });
      return res.status(500).json({
        success: false,
        error: "Permission check failed",
        code: "PERMISSION_CHECK_FAILED",
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
    res.send = function (data) {
      const executionTime = Date.now() - startTime;

      // Log activity after response is sent
      setImmediate(async () => {
        try {
          const isSuccess = res.statusCode >= 200 && res.statusCode < 300;

          // Determine resource type based on action type or URL
          let resourceType = "system";
          if (
            actionType.includes("user") ||
            req.originalUrl.includes("/users")
          ) {
            resourceType = "user";
          } else if (
            actionType.includes("listing") ||
            req.originalUrl.includes("/listings")
          ) {
            resourceType = "listing";
          } else if (
            actionType.includes("promotion") ||
            req.originalUrl.includes("/promotions")
          ) {
            resourceType = "promotion";
          } else if (
            actionType.includes("report") ||
            req.originalUrl.includes("/reports")
          ) {
            resourceType = "report";
          } else if (actionType.includes("bulk")) {
            resourceType = "bulk";
          }

          await AdminActivity.create({
            adminId: req.user._id,
            actionType,
            targetResource: {
              resourceType,
              resourceId: req.params.id || req.params.resourceId || null,
              resourceIdentifier:
                req.params.identifier || req.body.identifier || req.originalUrl,
            },
            actionDetails: {
              metadata: {
                endpoint: req.originalUrl,
                method: req.method,
                params: req.params,
                query: req.query,
              },
              reason: req.body.reason || req.query.reason,
            },
            requestContext: {
              ipAddress: req.ip || req.connection.remoteAddress || "127.0.0.1",
              userAgent: req.get("User-Agent") || "Unknown",
              sessionId: req.sessionId || req.user._id.toString(),
              requestId:
                req.id || `req_${Date.now()}_${generateSecureToken(9)}`,
            },
            result: {
              status: isSuccess ? "success" : "failure",
              message: isSuccess
                ? "Operation completed successfully"
                : "Operation failed",
              executionTime,
            },
          });
        } catch (error) {
          logger.error("Failed to log admin activity", {
            error: error.message,
            stack: error.stack,
            adminId: req.user?._id,
            actionType,
          });
        }
      });

      originalSend.call(this, data);
    };

    next();
  };
};
