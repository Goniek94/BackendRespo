/**
 * DEVELOPMENT ENVIRONMENT CONFIGURATION
 * 
 * Konfiguracja dla środowiska deweloperskiego (localhost)
 * - Łagodne zabezpieczenia dla wygody programistów
 * - Szczegółowe logi do debugowania
 * - Permisywne ustawienia CORS
 * - Wyłączony rate limiting
 * 
 * UWAGA: Te ustawienia NIE SĄ bezpieczne na produkcji!
 */

export default {
  // Podstawowe informacje o środowisku
  environment: 'development',
  isDevelopment: true,
  isProduction: false,
  isStaging: false,

  // Konfiguracja bezpieczeństwa - łagodna dla developmentu
  security: {
    // Rate limiting - wyłączony dla wygody
    rateLimiting: {
      enabled: false,                    // Wyłączone - nie przeszkadza w developmencie
      windowMs: 15 * 60 * 1000,         // 15 minut (gdyby było włączone)
      maxRequests: 10000,               // Bardzo wysokie limity
      skipSuccessfulRequests: true,     // Nie licz udanych requestów
      skipFailedRequests: false,        // Licz nieudane requesty
      standardHeaders: true,            // Dodaj standardowe nagłówki
      legacyHeaders: false              // Nie używaj starych nagłówków
    },

    // Konfiguracja JWT - łagodniejsza na dev
    jwt: {
      accessTokenExpiry: '24h',         // Długi czas życia dla wygody
      refreshTokenExpiry: '30d',        // Bardzo długi refresh token
      algorithm: 'HS256',               // Standardowy algorytm
      issuer: 'marketplace-dev',        // Identyfikator dla dev
      audience: 'marketplace-users-dev' // Audience dla dev
    },

    // Konfiguracja cookies - mniej restrykcyjna
    cookies: {
      httpOnly: true,                   // Zawsze HttpOnly dla bezpieczeństwa
      secure: false,                    // HTTP OK na localhost
      sameSite: 'lax',                  // Mniej restrykcyjne niż 'strict'
      domain: undefined,                // Bez ograniczeń domeny
      path: '/',                        // Dostępne dla całej aplikacji
      maxAge: 24 * 60 * 60 * 1000      // 24 godziny
    },

    // CORS - permisywny dla developmentu
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
      credentials: true,                // Pozwól na cookies
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Cache-Control'],
      exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
      maxAge: 86400                     // Cache preflight na 24h
    },

    // Nagłówki bezpieczeństwa - łagodniejsze
    headers: {
      contentSecurityPolicy: {
        enabled: true,
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https:'],
          imgSrc: ["'self'", 'data:', 'http:', 'https:', 'blob:'],
          connectSrc: ["'self'", 'http:', 'https:', 'ws:', 'wss:'],
          fontSrc: ["'self'", 'https:', 'data:'],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'", 'data:', 'blob:'],
          frameSrc: ["'none'"]
        }
      },
      hsts: {
        enabled: false,                 // Wyłączone na HTTP
        maxAge: 0,
        includeSubDomains: false,
        preload: false
      }
    }
  },

  // Konfiguracja logowania - szczegółowa dla debugowania
  logging: {
    level: 'debug',                     // Wszystkie logi
    includeStack: true,                 // Stack traces pomagają w debugowaniu
    includeSensitiveData: true,         // Dane pomagają w developmencie (TYLKO DEV!)
    colorize: true,                     // Kolorowe logi w konsoli
    timestamp: true,                    // Znaczniki czasu
    format: 'detailed',                 // Szczegółowy format
    console: {
      enabled: true,                    // Logi w konsoli
      level: 'debug'                    // Wszystkie poziomy
    },
    file: {
      enabled: false,                   // Bez logów do pliku na dev
      level: 'info',
      filename: 'logs/development.log'
    },
    audit: {
      enabled: true,                    // Logi audytowe włączone
      level: 'info',                    // Średni poziom
      filename: 'logs/audit-dev.log'
    }
  },

  // Konfiguracja bazy danych - optymalizowana dla developmentu
  database: {
    connectionTimeout: 10000,           // 10 sekund timeout
    socketTimeout: 45000,               // 45 sekund socket timeout
    serverSelectionTimeout: 5000,       // 5 sekund server selection
    maxPoolSize: 10,                    // Mała pula połączeń
    minPoolSize: 1,                     // Minimum 1 połączenie
    maxIdleTime: 30000,                 // 30 sekund idle time
    retryWrites: true,                  // Ponów zapisy
    retryReads: true,                   // Ponów odczyty
    readPreference: 'primary',          // Czytaj z primary
    writeConcern: {
      w: 1,                             // Potwierdź zapis na 1 node
      j: false,                         // Bez journal dla szybkości
      wtimeout: 5000                    // 5 sekund timeout
    }
  },

  // Konfiguracja cache - podstawowa
  cache: {
    enabled: false,                     // Wyłączony dla łatwiejszego debugowania
    ttl: 300,                          // 5 minut TTL
    maxSize: 100,                      // Maksymalnie 100 elementów
    checkPeriod: 60                    // Sprawdzaj co minutę
  },

  // Konfiguracja sesji
  session: {
    inactivityTimeout: 60 * 60 * 1000, // 1 godzina nieaktywności
    maxSessions: 10,                   // Maksymalnie 10 sesji na użytkownika
    cleanupInterval: 15 * 60 * 1000    // Czyszczenie co 15 minut
  },

  // Konfiguracja uploadów
  uploads: {
    maxFileSize: 50 * 1024 * 1024,     // 50MB na dev
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxFiles: 20,                      // Maksymalnie 20 plików
    tempDir: 'uploads/temp',           // Katalog tymczasowy
    finalDir: 'uploads/final'          // Katalog docelowy
  },

  // Konfiguracja powiadomień
  notifications: {
    enabled: true,                     // Włączone
    realTime: true,                    // Real-time przez WebSocket
    email: false,                      // Email wyłączony na dev
    sms: false,                        // SMS wyłączony na dev
    push: false                        // Push wyłączony na dev
  },

  // Konfiguracja monitoringu - podstawowa
  monitoring: {
    enabled: true,                     // Podstawowy monitoring
    healthCheck: {
      enabled: true,
      interval: 30000,                 // Co 30 sekund
      timeout: 5000                    // 5 sekund timeout
    },
    metrics: {
      enabled: true,
      collectInterval: 60000,          // Co minutę
      retentionPeriod: 3600000         // 1 godzina retencji
    }
  }
};
