// middleware/rateLimiting.js
import rateLimit from "express-rate-limit";
import logger from "../utils/logger.js";

/**
 * Jeśli serwer jest za proxy (nginx/cloud), w app.js koniecznie:
 *   app.set('trust proxy', 1);
 */
const isProd = process.env.NODE_ENV === "production";

/* ----------------------------- Helpers ----------------------------- */

const getClientIp = (req) => {
  const xff = req.headers["x-forwarded-for"];
  const fromXff = (Array.isArray(xff) ? xff[0] : xff || "")
    .split(",")[0]
    .trim();
  return fromXff || req.ip || req.connection?.remoteAddress || "unknown";
};

const normEmail = (e = "") => String(e).toLowerCase().trim();
const maskEmail = (e = "") =>
  e ? e.replace(/(^.{2}).*(@.*$)/, "$1***$2") : "unknown";

// globalny skip: dev/test/off switch
const shouldSkip = (req) => {
  // wyłącz całkowicie na DEV/STAGING/TEST lub gdy ustawisz RATE_LIMIT_DISABLED=1
  if (!isProd || process.env.RATE_LIMIT_DISABLED === "1") return true;
  // nie licz preflightów (CORS) i websocketowych "OPTIONS"
  if (req.method === "OPTIONS") return true;
  return false;
};

const makeLimiter = ({ windowMs, max, keyGenerator, code, message }) =>
  rateLimit({
    windowMs,
    max,
    keyGenerator,
    standardHeaders: true, // RateLimit-*
    legacyHeaders: false,
    skip: shouldSkip,
    handler: (req, res) => {
      const ip = getClientIp(req);
      const email = maskEmail(req.body?.email || "");
      // policz pozostały czas do resetu
      const retryAfterSec = Math.max(
        1,
        Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
      );

      logger.warn(
        `${code} exceeded ip=${ip} email=${email} path=${
          req.originalUrl
        } ua=${req.get("User-Agent")}`
      );

      res.setHeader("Retry-After", String(retryAfterSec));
      return res.status(429).json({
        success: false,
        error: message,
        code,
        retryAfter: retryAfterSec,
      });
    },
  });

/* --------------------------- Klucze limiterów --------------------------- */

const emailAwareKey = (req) =>
  `${getClientIp(req)}:${normEmail(req.body?.email)}`;

const ipOnlyKey = (req) => getClientIp(req);

/* ------------------------------ Limitery ------------------------------ */

/** Luźny globalny limiter API (PROD). DEV: wyłączony przez shouldSkip */
export const apiLimiter = makeLimiter({
  windowMs: 60 * 1000, // 1 minuta
  max: 600, // 600 req/min/IP - luźno, nie dławi SPA
  keyGenerator: ipOnlyKey,
  code: "API_RATE_LIMIT_EXCEEDED",
  message: "Too many requests. Please slow down.",
});

/** Login – ciaśniej, na minucie z burstem */
export const authLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000, // 15 min okno
  max: 30, // 30 prób / 15 min na IP+email
  keyGenerator: emailAwareKey,
  code: "RATE_LIMIT_EXCEEDED",
  message: "Zbyt wiele prób logowania. Spróbuj ponownie później.",
});

/** Admin login – jeszcze ciaśniej */
export const adminLoginLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000, // 1 h
  max: 10, // 10 prób / h na IP+email
  keyGenerator: emailAwareKey,
  code: "ADMIN_RATE_LIMIT_EXCEEDED",
  message:
    "Zbyt wiele prób logowania w panelu administracyjnym. Spróbuj ponownie później.",
});

/** Reset hasła */
export const passwordResetLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000, // 1 h
  max: 5,
  keyGenerator: emailAwareKey,
  code: "PASSWORD_RESET_LIMIT_EXCEEDED",
  message: "Zbyt wiele prób resetowania hasła. Spróbuj ponownie później.",
});

/** Rejestracja */
export const registrationLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000, // 1 h
  max: 20,
  keyGenerator: emailAwareKey,
  code: "REGISTRATION_LIMIT_EXCEEDED",
  message: "Zbyt wiele prób rejestracji. Spróbuj ponownie później.",
});

/* ---------------------- Backward compatibility ---------------------- */
export { authLimiter as checkUserRole };

export default {
  authLimiter,
  adminLoginLimiter,
  passwordResetLimiter,
  registrationLimiter,
  apiLimiter,
};
