// middleware/cookieCleanup.js
import logger from "../utils/logger.js";
import { clearAuthCookies } from "../config/cookieConfig.js";

const isProd = process.env.NODE_ENV === "production";
const isDev = process.env.NODE_ENV === "development";

// Opcjonalny, kontrolowany cleanup WYŁĄCZNIE własnych auth-cookies
// Włącz przez: ENABLE_TARGETED_COOKIE_CLEANUP=1
const ENABLE_TARGETED_CLEANUP =
  String(process.env.ENABLE_TARGETED_COOKIE_CLEANUP || "0") === "1";

// Lista nazw auth-cookies (możesz nadpisać ENV-em: AUTH_COOKIE_NAMES="token,refreshToken,admin_token,admin_refreshToken")
const AUTH_COOKIE_NAMES = (process.env.AUTH_COOKIE_NAMES || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/**
 * DEV monitor: pokazuje liczbę i rozmiar ciastek; nie robi side-effectów.
 * W PROD nie dokłada nagłówków, tylko działa „no-op".
 */
export const cookieSizeMonitor = (req, res, next) => {
  try {
    const cookieHeader = req.headers?.cookie || "";
    const size = cookieHeader.length;
    const names = Object.keys(req.cookies || {});

    if (isDev) {
      logger.debug("Cookie monitoring", { count: names.length, size, names });
      res.setHeader("X-Cookie-Count", String(names.length));
      res.setHeader("X-Cookie-Size", String(size));
    }
    next();
  } catch (e) {
    logger.error("Cookie size monitor error", {
      msg: e.message,
      stack: e.stack,
    });
    next();
  }
};

/**
 * Targeted cleanup: czyści WYŁĄCZNIE Wasze auth-cookies.
 * NIE podpinać globalnie! Wywołuj świadomie (np. po 431) albo z dedykowanego endpointu admin.
 * Zwraca liczbę usuniętych cookies.
 */
export const targetedAuthCookieCleanup = (req, res) => {
  if (!ENABLE_TARGETED_CLEANUP) return 0;
  let cleared = 0;

  // jeśli podano whitelistę nazw w ENV – czyść konkrety
  if (AUTH_COOKIE_NAMES.length) {
    for (const name of AUTH_COOKIE_NAMES) {
      res.clearCookie(name, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "strict" : "lax",
        path: "/",
        domain: process.env.COOKIE_DOMAIN || undefined,
      });
      cleared++;
    }
    return cleared;
  }

  // inaczej użyj centralnego czyszczenia „pary" tokenów (access/refresh)
  try {
    clearAuthCookies(res);
    cleared += 2;
  } catch {
    // brak helpera – trudno, nic nie czyścimy
  }
  return cleared;
};

// BACKWARD COMPATIBILITY: Zachowaj stare nazwy dla kompatybilności
export const cookieCleanupMiddleware = cookieSizeMonitor;
export const aggressiveCookieCleanup = (req, res, next) => {
  // REMOVED: Agresywne czyszczenie zostało wyłączone dla bezpieczeństwa
  logger.warn("aggressiveCookieCleanup called but disabled for security", {
    url: req.originalUrl,
    note: "Use targetedAuthCookieCleanup instead",
  });
  next();
};

export default {
  cookieSizeMonitor,
  targetedAuthCookieCleanup,
  // Backward compatibility
  cookieCleanupMiddleware,
  aggressiveCookieCleanup,
};
