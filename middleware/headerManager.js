/**
 * CENTRALNY SYSTEM ZARZĄDZANIA NAGŁÓWKAMI HTTP
 * 
 * Rozwiązuje problem HTTP 431 poprzez:
 * - Centralizację wszystkich nagłówków w jednym miejscu
 * - Automatyczne wykrywanie i usuwanie duplikatów
 * - Inteligentne zarządzanie rozmiarem nagłówków
 * - Optymalizację dla różnych środowisk (dev/staging/prod)
 * 
 * FEATURES:
 * - Smart header deduplication
 * - Size monitoring and optimization
 * - Environment-specific header sets
 * - Performance optimization
 */

import logger from '../utils/logger.js';

const isProd = process.env.NODE_ENV === 'production';
const isDev = process.env.NODE_ENV === 'development';

// Limity rozmiaru nagłówków (w bajtach)
const HEADER_LIMITS = {
  TOTAL_MAX: isProd ? 28672 : 49152, // 28KB prod, 48KB dev (bezpieczny margines)
  WARNING_THRESHOLD: isProd ? 20480 : 32768, // 20KB prod, 32KB dev
  SINGLE_HEADER_MAX: 4096 // 4KB dla pojedynczego nagłówka
};

/**
 * Oblicz rozmiar nagłówków HTTP w bajtach
 */
const calculateHeadersSize = (headers) => {
  let totalSize = 0;
  for (const [name, value] of Object.entries(headers || {})) {
    if (value) {
      totalSize += Buffer.byteLength(`${name}: ${value}\r\n`, 'utf8');
    }
  }
  return totalSize;
};

/**
 * Zoptymalizowane nagłówki bezpieczeństwa - bez duplikatów
 */
const getSecurityHeaders = () => {
  const baseHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': isProd ? 'DENY' : 'SAMEORIGIN',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };

  // Dodaj HSTS tylko w produkcji
  if (isProd) {
    baseHeaders['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
  }

  return baseHeaders;
};

/**
 * Zoptymalizowane nagłówki CORS - minimalne, ale funkcjonalne
 */
const getCORSHeaders = (req) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    process.env.FRONTEND_URL
  ].filter(Boolean);

  const corsHeaders = {};

  // Ustaw Origin tylko jeśli jest w dozwolonych
  if (allowedOrigins.includes(origin)) {
    corsHeaders['Access-Control-Allow-Origin'] = origin;
  } else if (isDev) {
    corsHeaders['Access-Control-Allow-Origin'] = 'http://localhost:3000';
  }

  // Minimalne nagłówki CORS
  corsHeaders['Access-Control-Allow-Credentials'] = 'true';
  corsHeaders['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS';
  corsHeaders['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,X-Requested-With';

  return corsHeaders;
};

/**
 * Nagłówki cache - zoptymalizowane
 */
const getCacheHeaders = (type = 'default') => {
  switch (type) {
    case 'static':
      return {
        'Cache-Control': 'public, max-age=31536000', // 1 rok
        'Expires': new Date(Date.now() + 31536000000).toUTCString()
      };
    case 'api':
      return {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      };
    case 'admin':
      return {
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache'
      };
    default:
      return {};
  }
};

/**
 * Nagłówki debugowania - tylko w development
 */
const getDebugHeaders = (req, size) => {
  if (!isDev) return {};

  return {
    'X-Environment': 'development',
    'X-Headers-Size': size.toString(),
    'X-Request-ID': req.id || 'unknown'
  };
};

/**
 * Usuń duplikaty nagłówków
 */
const deduplicateHeaders = (headers) => {
  const deduplicated = {};
  const seen = new Set();

  for (const [name, value] of Object.entries(headers)) {
    const normalizedName = name.toLowerCase();
    
    if (!seen.has(normalizedName)) {
      deduplicated[name] = value;
      seen.add(normalizedName);
    } else {
      logger.debug('Duplicate header removed', { header: name, value });
    }
  }

  return deduplicated;
};

/**
 * Skróć nagłówki jeśli przekraczają limit
 */
const truncateHeaders = (headers, maxSize) => {
  const truncated = { ...headers };
  let currentSize = calculateHeadersSize(truncated);

  if (currentSize <= maxSize) return truncated;

  // Lista nagłówków do usunięcia w kolejności priorytetów (najmniej ważne pierwsze)
  const removalPriority = [
    'X-Request-ID',
    'X-Headers-Size',
    'X-Environment',
    'Expires',
    'X-Cache',
    'Referrer-Policy',
    'X-XSS-Protection'
  ];

  for (const headerName of removalPriority) {
    if (currentSize <= maxSize) break;

    const headerToRemove = Object.keys(truncated).find(
      key => key.toLowerCase() === headerName.toLowerCase()
    );

    if (headerToRemove) {
      delete truncated[headerToRemove];
      currentSize = calculateHeadersSize(truncated);
      logger.warn('Header removed due to size limit', { 
        header: headerToRemove, 
        newSize: currentSize 
      });
    }
  }

  return truncated;
};

/**
 * Główny middleware zarządzania nagłówkami
 */
const headerManager = (options = {}) => {
  const {
    includeDebug = isDev,
    cacheType = 'default',
    skipCORS = false,
    customHeaders = {}
  } = options;

  return (req, res, next) => {
    try {
      // Zbierz wszystkie nagłówki
      let allHeaders = {};

      // 1. Nagłówki bezpieczeństwa (zawsze)
      Object.assign(allHeaders, getSecurityHeaders());

      // 2. Nagłówki CORS (jeśli nie pominięte)
      if (!skipCORS) {
        Object.assign(allHeaders, getCORSHeaders(req));
      }

      // 3. Nagłówki cache (jeśli określone)
      if (cacheType !== 'default') {
        Object.assign(allHeaders, getCacheHeaders(cacheType));
      }

      // 4. Niestandardowe nagłówki
      Object.assign(allHeaders, customHeaders);

      // 5. Usuń duplikaty
      allHeaders = deduplicateHeaders(allHeaders);

      // 6. Sprawdź rozmiar i obetnij jeśli potrzeba
      const initialSize = calculateHeadersSize(allHeaders);
      
      if (initialSize > HEADER_LIMITS.TOTAL_MAX) {
        logger.warn('Headers size exceeded limit, truncating', {
          initialSize,
          limit: HEADER_LIMITS.TOTAL_MAX,
          url: req.originalUrl
        });
        allHeaders = truncateHeaders(allHeaders, HEADER_LIMITS.TOTAL_MAX);
      }

      // 7. Dodaj nagłówki debugowania (jeśli włączone)
      if (includeDebug) {
        const finalSize = calculateHeadersSize(allHeaders);
        Object.assign(allHeaders, getDebugHeaders(req, finalSize));
      }

      // 8. Ustaw wszystkie nagłówki jednocześnie
      for (const [name, value] of Object.entries(allHeaders)) {
        res.setHeader(name, value);
      }

      // 9. Loguj ostrzeżenia o rozmiarze
      const finalSize = calculateHeadersSize(allHeaders);
      if (finalSize > HEADER_LIMITS.WARNING_THRESHOLD) {
        logger.warn('Headers size approaching limit', {
          size: finalSize,
          threshold: HEADER_LIMITS.WARNING_THRESHOLD,
          url: req.originalUrl
        });
      }

      // 10. Dodaj informacje do request dla innych middleware
      req.headerMetrics = {
        totalSize: finalSize,
        headerCount: Object.keys(allHeaders).length,
        optimized: initialSize !== finalSize
      };

      next();

    } catch (error) {
      logger.error('Header manager error', {
        error: error.message,
        stack: error.stack,
        url: req.originalUrl
      });
      next(); // Kontynuuj mimo błędu
    }
  };
};

/**
 * Middleware dla różnych typów endpointów
 */
const apiHeaders = () => headerManager({
  cacheType: 'api',
  includeDebug: isDev
});

const staticHeaders = () => headerManager({
  cacheType: 'static',
  includeDebug: false,
  skipCORS: true
});

const adminHeaders = () => headerManager({
  cacheType: 'admin',
  includeDebug: isDev,
  customHeaders: {
    'X-Admin-Panel': 'true'
  }
});

const uploadHeaders = () => headerManager({
  cacheType: 'static',
  includeDebug: false,
  customHeaders: {
    'Cross-Origin-Resource-Policy': 'cross-origin'
  }
});

export default headerManager;
export { 
  apiHeaders, 
  staticHeaders, 
  adminHeaders, 
  uploadHeaders,
  calculateHeadersSize,
  HEADER_LIMITS
};
