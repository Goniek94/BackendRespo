/**
 * MIDDLEWARE DO MONITOROWANIA ROZMIARU NAGŁÓWKÓW HTTP
 * 
 * Rozwiązuje problem HTTP 431 "Request Header Fields Too Large" poprzez:
 * - Monitorowanie rozmiaru nagłówków w czasie rzeczywistym
 * - Automatyczne czyszczenie dużych cookies
 * - Logowanie problemów z nagłówkami
 * - Proaktywne zarządzanie sesjami
 * 
 * UŻYCIE:
 * import headerSizeMonitor from './middleware/headerSizeMonitor.js';
 * app.use(headerSizeMonitor);
 */

import logger from '../utils/logger.js';
import { clearAuthCookies } from '../config/cookieConfig.js';

// Konfiguracja limitów (w bajtach)
const LIMITS = {
  TOTAL_HEADERS: 32768,      // 32KB - nasz limit serwera
  SINGLE_HEADER: 8192,       // 8KB - limit pojedynczego nagłówka
  COOKIES_TOTAL: 4096,       // 4KB - bezpieczny limit dla wszystkich cookies
  SINGLE_COOKIE: 2048,       // 2KB - limit pojedynczego cookie
  WARNING_THRESHOLD: 24576   // 24KB - próg ostrzeżenia (75% limitu)
};

/**
 * Oblicz rozmiar nagłówków HTTP w bajtach
 */
const calculateHeadersSize = (headers) => {
  let totalSize = 0;
  
  for (const [name, value] of Object.entries(headers)) {
    if (value) {
      // Format: "Header-Name: value\r\n"
      const headerLine = `${name}: ${value}\r\n`;
      totalSize += Buffer.byteLength(headerLine, 'utf8');
    }
  }
  
  return totalSize;
};

/**
 * Oblicz rozmiar cookies w bajtach
 */
const calculateCookiesSize = (cookieHeader) => {
  if (!cookieHeader) return 0;
  return Buffer.byteLength(cookieHeader, 'utf8');
};

/**
 * Parsuj cookies z nagłówka
 */
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

/**
 * Identyfikuj problematyczne cookies
 */
const identifyProblematicCookies = (cookies) => {
  const problems = {
    oversized: [],
    suspicious: [],
    total: 0
  };
  
  for (const [name, data] of Object.entries(cookies)) {
    problems.total += data.size;
    
    // Cookies większe niż limit
    if (data.size > LIMITS.SINGLE_COOKIE) {
      problems.oversized.push({ name, size: data.size });
    }
    
    // Podejrzane cookies (mogą być stare/zduplikowane)
    if (name.includes('old_') || name.includes('backup_') || name.includes('temp_')) {
      problems.suspicious.push({ name, size: data.size });
    }
  }
  
  return problems;
};

/**
 * Wyczyść problematyczne cookies
 */
const cleanupProblematicCookies = (res, problems) => {
  let cleanedCount = 0;
  
  // Wyczyść podejrzane cookies
  problems.suspicious.forEach(cookie => {
    res.clearCookie(cookie.name, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/'
    });
    cleanedCount++;
    logger.info(`Cleaned suspicious cookie: ${cookie.name} (${cookie.size} bytes)`);
  });
  
  // Jeśli nadal za duże, wyczyść największe cookies
  if (problems.total > LIMITS.COOKIES_TOTAL) {
    const sortedOversized = problems.oversized.sort((a, b) => b.size - a.size);
    
    for (const cookie of sortedOversized) {
      if (problems.total <= LIMITS.COOKIES_TOTAL) break;
      
      res.clearCookie(cookie.name, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/'
      });
      
      problems.total -= cookie.size;
      cleanedCount++;
      logger.warn(`Cleaned oversized cookie: ${cookie.name} (${cookie.size} bytes)`);
    }
  }
  
  return cleanedCount;
};

/**
 * Główny middleware do monitorowania nagłówków
 */
const headerSizeMonitor = (req, res, next) => {
  try {
    // Oblicz rozmiar nagłówków
    const headersSize = calculateHeadersSize(req.headers);
    const cookiesSize = calculateCookiesSize(req.headers.cookie);
    
    // Dodaj informacje do obiektu request
    req.headerMetrics = {
      totalSize: headersSize,
      cookiesSize: cookiesSize,
      timestamp: new Date().toISOString()
    };
    
    // Sprawdź czy przekroczono limity
    if (headersSize > LIMITS.TOTAL_HEADERS) {
      logger.error('Headers size exceeded limit', {
        size: headersSize,
        limit: LIMITS.TOTAL_HEADERS,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      // Wyczyść wszystkie cookies i zwróć błąd
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
      
      // Proaktywne czyszczenie cookies
      if (req.headers.cookie) {
        const cookies = parseCookies(req.headers.cookie);
        const problems = identifyProblematicCookies(cookies);
        
        if (problems.total > LIMITS.COOKIES_TOTAL || problems.suspicious.length > 0) {
          const cleanedCount = cleanupProblematicCookies(res, problems);
          
          if (cleanedCount > 0) {
            logger.info(`Proactively cleaned ${cleanedCount} problematic cookies`, {
              originalSize: problems.total,
              url: req.originalUrl,
              ip: req.ip
            });
          }
        }
      }
    }
    
    // Szczegółowe logowanie w trybie debug
    if (process.env.NODE_ENV === 'development' && headersSize > 1024) { // > 1KB
      logger.debug('Header size analysis', {
        totalHeaders: headersSize,
        cookiesSize: cookiesSize,
        url: req.originalUrl,
        headers: Object.keys(req.headers).map(key => ({
          name: key,
          size: Buffer.byteLength(`${key}: ${req.headers[key]}\r\n`, 'utf8')
        })).sort((a, b) => b.size - a.size).slice(0, 5) // Top 5 największych
      });
    }
    
    // Dodaj nagłówek odpowiedzi z informacją o rozmiarze (tylko w dev)
    if (process.env.NODE_ENV === 'development') {
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
    
    // Nie blokuj żądania przy błędzie monitorowania
    next();
  }
};

/**
 * Middleware do czyszczenia starych sesji (opcjonalny)
 */
const sessionCleanup = (req, res, next) => {
  // Sprawdź czy użytkownik ma wiele tokenów/sesji
  if (req.headers.cookie) {
    const cookies = parseCookies(req.headers.cookie);
    const authCookies = Object.keys(cookies).filter(name => 
      name.includes('token') || name.includes('session') || name.includes('auth')
    );
    
    // Jeśli za dużo cookies związanych z autoryzacją
    if (authCookies.length > 4) { // token, refreshToken + ewentualnie 2 backup
      logger.warn('Too many auth cookies detected', {
        count: authCookies.length,
        cookies: authCookies,
        ip: req.ip,
        url: req.originalUrl
      });
      
      // Wyczyść wszystkie cookies autoryzacji i wymuś ponowne logowanie
      clearAuthCookies(res);
      
      // Dodaj nagłówek informujący o czyszczeniu
      res.setHeader('X-Session-Cleaned', 'true');
    }
  }
  
  next();
};

/**
 * Funkcja pomocnicza do analizy nagłówków (do debugowania)
 */
const analyzeHeaders = (req) => {
  const analysis = {
    total: calculateHeadersSize(req.headers),
    cookies: calculateCookiesSize(req.headers.cookie),
    breakdown: {}
  };
  
  // Analiza poszczególnych nagłówków
  for (const [name, value] of Object.entries(req.headers)) {
    if (value) {
      const size = Buffer.byteLength(`${name}: ${value}\r\n`, 'utf8');
      analysis.breakdown[name] = size;
    }
  }
  
  // Sortuj według rozmiaru
  analysis.largest = Object.entries(analysis.breakdown)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([name, size]) => ({ name, size }));
  
  return analysis;
};

export default headerSizeMonitor;
export { sessionCleanup, analyzeHeaders, LIMITS };
