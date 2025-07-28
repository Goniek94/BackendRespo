/**
 * STAGING ENVIRONMENT CONFIGURATION
 * 
 * Konfiguracja dla środowiska testowego/staging
 * - Pośrednie zabezpieczenia między dev a production
 * - Testowanie funkcji produkcyjnych w bezpiecznym środowisku
 * - Więcej logów niż na produkcji, ale mniej niż na dev
 * - Podobne do produkcji, ale z łagodniejszymi limitami
 * 
 * UWAGA: To środowisko służy do testowania przed wdrożeniem na produkcję!
 */

export default {
  // Podstawowe informacje o środowisku
  environment: 'staging',
  isDevelopment: false,
  isProduction: false,
  isStaging: true,

  // Konfiguracja bezpieczeństwa - ŚREDNIE zabezpieczenia
  security: {
    // Rate limiting - włączony ale z wyższymi limitami niż produkcja
    rateLimiting: {
      enabled: true,                    // Włączone dla testowania
      windowMs: 15 * 60 * 1000,         // 15 minut okno
      maxRequests: 500,                 // Wyższe limity niż produkcja - 500 req/15min
      skipSuccessfulRequests: false,    // Licz wszystkie requesty
      skipFailedRequests: false,        // Licz wszystkie requesty
      standardHeaders: true,            // Standardowe nagłówki rate limit
      legacyHeaders: false,             // Bez starych nagłówków
      
      // Specjalne limity dla różnych endpointów - łagodniejsze niż produkcja
      endpoints: {
        '/api/users/login': {
          windowMs: 15 * 60 * 1000,     // 15 minut
          maxRequests: 20,              // Więcej prób logowania dla testów
          blockDuration: 30 * 60 * 1000 // Blokada na 30 minut
        },
        '/api/users/register': {
          windowMs: 60 * 60 * 1000,     // 1 godzina
          maxRequests: 10,              // Więcej rejestracji dla testów
          blockDuration: 2 * 60 * 60 * 1000 // Blokada na 2h
        },
        '/api/users/forgot-password': {
          windowMs: 60 * 60 * 1000,     // 1 godzina
          maxRequests: 5,               // Więcej prób resetowania
          blockDuration: 60 * 60 * 1000 // Blokada na 1h
        }
      }
    },

    // Konfiguracja JWT - pośrednie czasy życia
    jwt: {
      accessTokenExpiry: '1h',          // Dłuższy niż produkcja - 1 godzina
      refreshTokenExpiry: '14d',        // 14 dni refresh token
      algorithm: 'HS256',               // Bezpieczny algorytm
      issuer: 'marketplace-staging',    // Identyfikator staging
      audience: 'marketplace-users-staging', // Audience staging
      
      // Dodatkowe zabezpieczenia JWT
      clockTolerance: 60,               // 60 sekund tolerancji zegara
      ignoreExpiration: false,          // NIE ignoruj wygaśnięcia
      ignoreNotBefore: false,           // NIE ignoruj notBefore
      maxAge: '1h'                      // Maksymalny wiek tokenu
    },

    // Konfiguracja cookies - zabezpieczenia produkcyjne ale z dłuższym czasem życia
    cookies: {
      httpOnly: true,                   // KRYTYCZNE: HttpOnly zawsze
      secure: true,                     // HTTPS wymagane (staging powinien mieć SSL)
      sameSite: 'strict',               // Wysokie zabezpieczenie CSRF
      domain: process.env.STAGING_COOKIE_DOMAIN || undefined,
      path: '/',                        // Dostępne dla całej aplikacji
      maxAge: 60 * 60 * 1000,          // 1 godzina - dłużej niż produkcja
      
      // Dodatkowe zabezpieczenia cookies
      priority: 'high',                 // Wysoki priorytet
      partitioned: false                // Wyłączone dla łatwiejszego testowania
    },

    // CORS - mniej restrykcyjny niż produkcja dla testowania
    cors: {
      origin: process.env.STAGING_ALLOWED_ORIGINS ? 
        process.env.STAGING_ALLOWED_ORIGINS.split(',') : 
        ['https://staging.yourdomain.com', 'https://test.yourdomain.com'],
      credentials: true,                // Pozwól na cookies
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'], // Wszystkie metody
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
      exposedHeaders: ['X-Total-Count'], // Niektóre nagłówki dla testowania
      maxAge: 7200,                     // Cache preflight na 2h
      optionsSuccessStatus: 204,        // Status dla starszych przeglądarek
      preflightContinue: false          // Nie kontynuuj po preflight
    },

    // Nagłówki bezpieczeństwa - podobne do produkcji ale mniej restrykcyjne
    headers: {
      contentSecurityPolicy: {
        enabled: true,
        directives: {
          defaultSrc: ["'self'"],                    // Tylko własna domena
          styleSrc: ["'self'", "'unsafe-inline'"],  // Pozwól inline styles dla testów
          scriptSrc: ["'self'", "'unsafe-inline'"], // Pozwól inline scripts dla testów
          imgSrc: ["'self'", 'data:', 'https:', 'http:'], // Więcej źródeł obrazów
          connectSrc: ["'self'", 'https:', 'wss:'], // WebSocket dla testów
          fontSrc: ["'self'", 'https:', 'data:'],   // Więcej źródeł fontów
          objectSrc: ["'none'"],                     // Bez obiektów
          mediaSrc: ["'self'", 'data:', 'blob:'],   // Więcej źródeł media
          frameSrc: ["'self'"],                      // Pozwól ramki z własnej domeny
          baseUri: ["'self'"],                       // Tylko własna domena
          formAction: ["'self'"],                    // Tylko własne formularze
          frameAncestors: ["'self'"],                // Może być w ramce z własnej domeny
          upgradeInsecureRequests: []                // Wymuszaj HTTPS
        },
        reportOnly: false,              // Egzekwuj politykę
        reportUri: '/api/csp-report'    // Endpoint do raportowania naruszeń
      },
      
      // HTTP Strict Transport Security - włączone ale krótsze
      hsts: {
        enabled: true,                  // Włączone
        maxAge: 86400,                 // 1 dzień (krócej niż produkcja)
        includeSubDomains: false,      // Bez subdomen dla łatwiejszego testowania
        preload: false                 // Bez preload dla staging
      },
      
      // Dodatkowe nagłówki bezpieczeństwa - łagodniejsze
      additionalHeaders: {
        'X-Content-Type-Options': 'nosniff',           // Zapobiegaj MIME sniffing
        'X-Frame-Options': 'SAMEORIGIN',               // Pozwól ramki z tej samej domeny
        'X-XSS-Protection': '1; mode=block',           // Ochrona XSS
        'Referrer-Policy': 'strict-origin-when-cross-origin', // Kontrola referrer
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()', // Wyłącz API
        'Cross-Origin-Embedder-Policy': 'unsafe-none', // Łagodniejsze dla testów
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups', // Pozwól popupy
        'Cross-Origin-Resource-Policy': 'same-site'    // Same-site zamiast same-origin
      }
    },

    // Walidacja danych wejściowych - średnio ścisła
    inputValidation: {
      enabled: true,                    // Włączone
      strictMode: false,                // Tryb mniej ścisły dla testów
      sanitizeInput: true,              // Sanityzuj dane wejściowe
      maxRequestSize: '50mb',           // Większy rozmiar dla testów
      maxFieldSize: '10mb',             // Większy rozmiar pola
      maxFields: 200,                   // Więcej pól
      allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      maxFileSize: 20 * 1024 * 1024    // 20MB dla testów
    }
  },

  // Konfiguracja logowania - ŚREDNIE dla debugowania testów
  logging: {
    level: 'info',                      // Więcej logów niż produkcja
    includeStack: true,                 // Stack traces dla debugowania
    includeSensitiveData: false,        // Nie loguj wrażliwych danych
    colorize: false,                    // Bez kolorów
    timestamp: true,                    // Znaczniki czasu
    format: 'json',                     // Format JSON
    
    console: {
      enabled: true,                    // Włączone dla monitorowania
      level: 'info'                     // Poziom info
    },
    
    file: {
      enabled: true,                    // Logi do pliku
      level: 'info',                    // Poziom info
      filename: 'logs/staging.log',
      maxSize: '200mb',                 // Większy rozmiar
      maxFiles: 20,                     // Więcej plików
      compress: true                    // Kompresuj stare logi
    },
    
    audit: {
      enabled: true,                    // Logi audytowe
      level: 'info',                    // Wszystkie akcje
      filename: 'logs/audit-staging.log',
      maxSize: '300mb',                 // Większy rozmiar
      maxFiles: 30,                     // Więcej plików
      compress: true,                   // Kompresuj
      encrypt: false                    // Bez szyfrowania na staging
    }
  },

  // Konfiguracja bazy danych - podobna do produkcji
  database: {
    connectionTimeout: 10000,           // 10 sekund timeout
    socketTimeout: 45000,               // 45 sekund socket timeout
    serverSelectionTimeout: 5000,       // 5 sekund server selection
    maxPoolSize: 30,                    // Średnia pula połączeń
    minPoolSize: 3,                     // Minimum 3 połączenia
    maxIdleTime: 20000,                 // 20 sekund idle time
    retryWrites: true,                  // Ponów zapisy
    retryReads: true,                   // Ponów odczyty
    readPreference: 'primaryPreferred', // Preferuj primary
    
    writeConcern: {
      w: 1,                             // Potwierdź zapis na 1 node (szybciej)
      j: true,                          // Wymagaj journal
      wtimeout: 15000                   // 15 sekund timeout
    },
    
    readConcern: {
      level: 'local'                    // Lokalne odczyty (szybciej)
    },
    
    // Szyfrowanie wyłączone dla łatwiejszego testowania
    encryption: {
      enabled: false                    // Wyłączone na staging
    }
  },

  // Konfiguracja cache - włączona dla testowania wydajności
  cache: {
    enabled: true,                      // Włączony
    ttl: 1800,                         // 30 minut TTL
    maxSize: 5000,                     // Średni cache
    checkPeriod: 120,                  // Sprawdzaj co 2 minuty
    
    // Redis configuration dla staging
    redis: {
      enabled: false,                   // Wyłączony - używaj memory cache
      host: process.env.STAGING_REDIS_HOST,
      port: process.env.STAGING_REDIS_PORT || 6379,
      password: process.env.STAGING_REDIS_PASSWORD,
      db: 1,                           // Inna baza niż produkcja
      keyPrefix: 'marketplace-staging:',
      retryDelayOnFailover: 200,
      maxRetriesPerRequest: 2,
      lazyConnect: true,
      keepAlive: 15000
    }
  },

  // Konfiguracja sesji - podobna do produkcji ale łagodniejsza
  session: {
    inactivityTimeout: 30 * 60 * 1000,  // 30 minut nieaktywności
    maxSessions: 5,                     // Więcej sesji dla testów
    cleanupInterval: 10 * 60 * 1000,    // Czyszczenie co 10 minut
    
    // Dodatkowe zabezpieczenia sesji
    regenerateOnLogin: true,            // Regeneruj ID sesji
    destroyOnLogout: true,              // Zniszcz sesję
    trackUserAgent: true,               // Śledź User-Agent
    trackIpAddress: true,               // Śledź IP
    detectHijacking: false              // Wyłączone dla łatwiejszego testowania
  },

  // Konfiguracja uploadów - łagodniejsza dla testów
  uploads: {
    maxFileSize: 20 * 1024 * 1024,     // 20MB dla testów
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxFiles: 20,                      // Więcej plików
    tempDir: 'uploads/staging/temp',   // Katalog staging
    finalDir: 'uploads/staging/final',
    
    // Skanowanie antywirusowe wyłączone
    virusScanning: {
      enabled: false,                  // Wyłączone na staging
      quarantineDir: '/tmp/quarantine-staging',
      deleteInfected: false
    },
    
    // Walidacja obrazów - łagodniejsza
    imageValidation: {
      enabled: true,                   // Włączona
      maxWidth: 8192,                  // Większa szerokość
      maxHeight: 8192,                 // Większa wysokość
      allowedFormats: ['jpeg', 'png', 'gif', 'webp'],
      stripMetadata: false             // Zachowaj metadane dla testów
    }
  },

  // Konfiguracja powiadomień - testowa
  notifications: {
    enabled: true,                     // Włączone
    realTime: true,                    // Real-time
    email: true,                       // Email włączony (testowy)
    sms: false,                        // SMS wyłączony (kosztowne)
    push: true,                        // Push włączony
    
    // Wyższe limity dla testów
    rateLimits: {
      email: {
        perHour: 50,                   // 50 emaili na godzinę
        perDay: 200                    // 200 emaili dziennie
      },
      sms: {
        perHour: 0,                    // SMS wyłączony
        perDay: 0
      }
    }
  },

  // Konfiguracja monitoringu - pełna dla testowania
  monitoring: {
    enabled: true,                     // Pełny monitoring
    
    healthCheck: {
      enabled: true,
      interval: 15000,                 // Co 15 sekund
      timeout: 5000,                   // 5 sekund timeout
      endpoints: ['/health', '/ready', '/live']
    },
    
    metrics: {
      enabled: true,
      collectInterval: 60000,          // Co minutę
      retentionPeriod: 3 * 24 * 3600000, // 3 dni retencji
      
      // Wszystkie metryki dla testowania
      collect: {
        cpu: true,
        memory: true,
        disk: true,
        network: true,
        database: true,
        requests: true,
        errors: true,
        responseTime: true
      }
    },
    
    // Alerty - łagodniejsze progi
    alerts: {
      enabled: true,
      
      thresholds: {
        cpuUsage: 90,                  // Alert przy 90% CPU
        memoryUsage: 90,               // Alert przy 90% RAM
        diskUsage: 95,                 // Alert przy 95% dysku
        errorRate: 10,                 // Alert przy 10% błędów
        responseTime: 5000             // Alert przy 5s response time
      },
      
      channels: {
        email: process.env.STAGING_ALERT_EMAIL,
        slack: process.env.STAGING_SLACK_WEBHOOK,
        sms: null                      // Bez SMS na staging
      }
    }
  },

  // Konfiguracja backupów - uproszczona
  backup: {
    enabled: true,                     // Włącz backupy
    schedule: '0 4 * * *',            // Codziennie o 4:00
    retention: 7,                      // Zachowaj 7 dni
    compression: true,                 // Kompresuj
    encryption: false,                 // Bez szyfrowania
    
    destinations: {
      local: {
        enabled: true,
        path: 'backups/staging'
      },
      s3: {
        enabled: false                 // S3 wyłączone na staging
      }
    }
  }
};
