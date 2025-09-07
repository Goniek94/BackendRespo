/**
 * MIDDLEWARE DO MONITOROWANIA ROZMIARU NAGŁÓWKÓW HTTP
 *
 * Rozwiązuje problem HTTP 431 "Request Header Fields Too Large" poprzez:
 * - Monitorowanie rozmiaru nagłówków w czasie rzeczywistym
 * - Automatyczne czyszczenie dużych/podejrzanych cookies
 * - Logowanie problemów z nagłówkami
 * - Proaktywne zarządzanie sesjami
 *
 * W DEV/STAGING nie blokuje żądań – tylko ostrzega i czyści cookies.
 * W PRODUKCJI, przy przekroczeniu limitu, zwraca 431.
 */

import logger from '../utils/logger.js';
import { clearAuthCookies } from '../config/cookieConfig.js';

// Konfiguracja limitów (w bajtach) – ULTRA AGRESYWNE dla HTTP 431 fix
const isProd = process.env.NODE_ENV === 'production';
const LIMITS = {
  TOTAL_HEADERS: isProd ? 16384 : 32768, // 16KB prod, 32KB dev (ZMNIEJSZONE)
  SINGLE_HEADER: 4096,                   // 4KB – pojedynczy nagłówek (ZMNIEJSZONE)
  COOKIES_TOTAL: isProd ? 2048 : 4096,   // 2KB prod, 4KB dev (ZMNIEJSZONE)
  SINGLE_COOKIE: isProd ? 1024 : 2048,   // 1KB prod, 2KB dev (ZMNIEJSZONE)
  WARNING_THRESHOLD: isProd ? 12288 : 24576 // 75% limitu (ZMNIEJSZONE)
};

// Oblicz rozmiar nagłówków HTTP w bajtach
const calculateHeadersSize = (headers) => {
  let totalSize = 0;
  for (const [name, value] of Object.entries(headers || {})) {
    if (value) totalSize += Buffer.byteLength(`${name}: ${value}\r\n`, 'utf8');
  }
  return totalSize;
};

// Oblicz rozmiar cookies w bajtach
const calculateCookiesSize = (cookieHeader) => {
  if (!cookieHeader) return 0;
  return Buffer.byteLength(cookieHeader, 'utf8');
};

// Parsuj cookies z nagłówka
const parseCookies = (cookieHeader) => {
  if (!cookieHeader) return {};
  const cookies = {};
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const [name, ...valueParts] = pair.trim().split('=');
    if (name && valueParts.length > 0) {
      const value = valueParts.join('=');
      cookies[name] = {
        value,
        size: Buffer.byteLength(`${name}=${value}`, 'utf8')
      };
    }
  }
  return cookies;
};

// Identyfikuj problematyczne cookies
const identifyProblematicCookies = (cookies) => {
  const problems = { oversized: [], suspicious: [], total: 0 };
  for (const [name, data] of Object.entries(cookies)) {
    problems.total += data.size;
    if (data.size > LIMITS.SINGLE_COOKIE) problems.oversized.push({ name, size: data.size });
    if (name.includes('old_') || name.includes('backup_') || name.includes('temp_') || name.includes('legacy_')) {
      problems.suspicious.push({ name, size: data.size });
    }
  }
  return problems;
};

// Wyczyść problematyczne cookies (działa od kolejnego requestu)
const cleanupProblematicCookies = (res, problems) => {
  let cleanedCount = 0;
  problems.suspicious.forEach(cookie => {
    res.clearCookie(cookie.name, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      path: '/'
    });
    cleanedCount++;
  });

  if (problems.total > LIMITS.COOKIES_TOTAL) {
    const sortedOversized = problems.oversized.sort((a, b) => b.size - a.size);
    for (const cookie of sortedOversized) {
      if (problems.total <= LIMITS.COOKIES_TOTAL) break;
      res.clearCookie(cookie.name, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'strict' : 'lax',
        path: '/'
      });
      cleanedCount++;
      problems.total -= cookie.size;
    }
  }
  return cleanedCount;
};

// Główne middleware
const headerSizeMonitor = (req, res, next) => {
  try {
    const headersSize = calculateHeadersSize(req.headers);
    const cookiesSize = calculateCookiesSize(req.headers.cookie);

    // Metryki do debugowania
    req.headerMetrics = {
      totalSize: headersSize,
      cookiesSize,
      timestamp: new Date().toISOString()
    };

    // Twardy limit – prod blokuje, dev/staging ostrzega i czyści
    if (headersSize > LIMITS.TOTAL_HEADERS) {
      const context = {
        size: headersSize,
        limit: LIMITS.TOTAL_HEADERS,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      };

      if (req.headers.cookie) {
        const cookies = parseCookies(req.headers.cookie);
        const problems = identifyProblematicCookies(cookies);
        cleanupProblematicCookies(res, problems);
      }

      if (isProd) {
        logger.error('Headers size exceeded limit (BLOCKED)', context);
        clearAuthCookies(res);
        return res.status(431).json({
          error: 'Request Header Fields Too Large',
          message: 'Nagłówki żądania są za duże. Cookies zostały wyczyszczone.',
          code: 'HEADERS_TOO_LARGE',
          details: {
            currentSize: headersSize,
            maxSize: LIMITS.TOTAL_HEADERS,
            recommendation: 'Wyloguj się i zaloguj ponownie'
          }
        });
      } else {
        logger.warn('Headers size exceeded limit (DEV ALLOWED)', context);
        res.setHeader('X-Header-Size-Warning', 'too-large-dev-allowed');
        // Kontynuuj bez błędu w dev/staging
      }
    }

    // Ostrzeżenie przy zbliżaniu się do limitu
    if (headersSize > LIMITS.WARNING_THRESHOLD) {
      logger.warn('Headers size approaching limit', {
        size: headersSize,
        limit: LIMITS.TOTAL_HEADERS,
        threshold: LIMITS.WARNING_THRESHOLD,
        url: req.originalUrl,
        ip: req.ip
      });

      if (req.headers.cookie) {
        const cookies = parseCookies(req.headers.cookie);
        const problems = identifyProblematicCookies(cookies);
        if (problems.total > LIMITS.COOKIES_TOTAL || problems.suspicious.length > 0) {
          const cleaned = cleanupProblematicCookies(res, problems);
          if (cleaned > 0) {
            logger.info(`Proactively cleaned ${cleaned} problematic cookies`, {
              originalSize: problems.total,
              url: req.originalUrl,
              ip: req.ip
            });
          }
        }
      }
    }

    // Dodatkowe nagłówki do debugowania w dev
    if (!isProd) {
      res.setHeader('X-Request-Headers-Size', headersSize);
      res.setHeader('X-Request-Cookies-Size', cookiesSize);
    }

    next();
  } catch (error) {
    logger.error('Header size monitor error', {
      error: error.message,
      stack: error.stack,
      url: req.originalUrl,
      ip: req.ip
    });
    next(); // Nigdy nie blokuj na błędzie monitorowania
  }
};

// Middleware do czyszczenia starych sesji (opcjonalny)
const sessionCleanup = (req, res, next) => {
  if (req.headers.cookie) {
    const cookies = parseCookies(req.headers.cookie);
    const authCookies = Object.keys(cookies).filter(name =>
      name.includes('token') || name.includes('session') || name.includes('auth')
    );

    if (authCookies.length > 4) {
      logger.warn('Too many auth cookies detected', {
        count: authCookies.length,
        cookies: authCookies,
        ip: req.ip,
        url: req.originalUrl
      });
      clearAuthCookies(res);
      res.setHeader('X-Session-Cleaned', 'true');
    }
  }
  next();
};

// Funkcja pomocnicza do analizy nagłówków (debug)
const analyzeHeaders = (req) => {
  const analysis = {
    total: calculateHeadersSize(req.headers),
    cookies: calculateCookiesSize(req.headers.cookie),
    breakdown: {}
  };
  for (const [name, value] of Object.entries(req.headers || {})) {
    if (value) analysis.breakdown[name] = Buffer.byteLength(`${name}: ${value}\r\n`, 'utf8');
  }
  analysis.largest = Object.entries(analysis.breakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, size]) => ({ name, size }));
  return analysis;
};

export default headerSizeMonitor;
export { sessionCleanup, analyzeHeaders, LIMITS };
