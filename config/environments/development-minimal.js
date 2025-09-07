/**
 * MINIMAL DEVELOPMENT CONFIGURATION - HTTP 431 FIX
 * 
 * Zminimalizowana konfiguracja dla developmentu aby uniknąć błędu HTTP 431
 * - Usunięte długie nagłówki CSP
 * - Minimalne nagłówki bezpieczeństwa
 * - Zachowana funkcjonalność dla developmentu
 */

export default {
  // Podstawowe informacje o środowisku
  environment: 'development',
  isDevelopment: true,
  isProduction: false,
  isStaging: false,

  // Konfiguracja bezpieczeństwa - MINIMALNA dla HTTP 431 fix
  security: {
    // Rate limiting - wyłączony
    rateLimiting: {
      enabled: false,
      windowMs: 15 * 60 * 1000,
      maxRequests: 10000,
      skipSuccessfulRequests: true,
      skipFailedRequests: false,
      standardHeaders: false,           // WYŁĄCZONE - mniej nagłówków
      legacyHeaders: false
    },

    // JWT - podstawowa konfiguracja
    jwt: {
      accessTokenExpiry: '60m', // 60 minut zamiast 1h
      refreshTokenExpiry: '7d',
      algorithm: 'HS256',
      issuer: 'marketplace-dev',
      audience: 'marketplace-users-dev'
    },

    // Cookies - minimalne ustawienia
    cookies: {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      domain: undefined,
      path: '/',
      maxAge: 24 * 60 * 60 * 1000
    },

    // CORS - minimalne nagłówki
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400
    },

    // MINIMALNE nagłówki bezpieczeństwa - FIX dla HTTP 431
    headers: {
      // CSP WYŁĄCZONE - główna przyczyna dużych nagłówków
      contentSecurityPolicy: false,
      
      // HSTS wyłączone na HTTP
      hsts: false,
      
      // TYLKO najważniejsze nagłówki
      additionalHeaders: {
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff'
        // Usunięto X-XSS-Protection - mniej nagłówków
      }
    }
  },

  // Minimalne logowanie
  logging: {
    level: 'info',                      // Mniej szczegółowe logi
    includeStack: false,                // Bez stack traces
    includeSensitiveData: false,        // Bez wrażliwych danych
    colorize: true,
    timestamp: true,
    format: 'simple',                   // Prosty format
    console: {
      enabled: true,
      level: 'info'
    },
    file: {
      enabled: false
    },
    audit: {
      enabled: false                    // Wyłączone audyty
    }
  },

  // Podstawowa konfiguracja bazy danych
  database: {
    connectionTimeout: 10000,
    socketTimeout: 45000,
    serverSelectionTimeout: 5000,
    maxPoolSize: 5,                     // Mniejsza pula
    minPoolSize: 1,
    maxIdleTime: 30000,
    retryWrites: true,
    retryReads: true,
    readPreference: 'primary',
    writeConcern: {
      w: 1,
      j: false,
      wtimeout: 5000
    }
  },

  // Cache wyłączony
  cache: {
    enabled: false,
    ttl: 300,
    maxSize: 50,                        // Mniejszy rozmiar
    checkPeriod: 60
  },

  // Podstawowe sesje
  session: {
    inactivityTimeout: 15 * 60 * 1000,  // 15 minut nieaktywności
    maxSessions: 5,                     // Mniej sesji
    cleanupInterval: 15 * 60 * 1000,
    detectHijacking: false
  },

  // Podstawowe uploady
  uploads: {
    maxFileSize: 10 * 1024 * 1024,      // 10MB zamiast 50MB
    allowedTypes: ['image/jpeg', 'image/png'],
    maxFiles: 10,                       // Mniej plików
    tempDir: 'uploads/temp',
    finalDir: 'uploads/final'
  },

  // Minimalne powiadomienia
  notifications: {
    enabled: true,
    realTime: true,
    email: false,
    sms: false,
    push: false
  },

  // Podstawowy monitoring
  monitoring: {
    enabled: false,                     // Wyłączony monitoring
    healthCheck: {
      enabled: true,
      interval: 60000,                  // Rzadziej
      timeout: 5000
    },
    metrics: {
      enabled: false                    // Wyłączone metryki
    }
  }
};
