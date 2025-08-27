/**
 * PRODUCTION ENVIRONMENT CONFIGURATION
 * 
 * Konfiguracja dla środowiska produkcyjnego
 * - MAKSYMALNE zabezpieczenia dla ochrony danych użytkowników
 * - Restrykcyjne limity i timeouty
 * - Minimalne logowanie dla wydajności
 * - Twarde ustawienia CORS i headers
 * 
 * UWAGA: Te ustawienia są WYMAGANE na produkcji!
 * Nie zmieniaj bez konsultacji z zespołem bezpieczeństwa.
 */

export default {
  // Podstawowe informacje o środowisku
  environment: 'production',
  isDevelopment: false,
  isProduction: true,
  isStaging: false,

  // Konfiguracja bezpieczeństwa - MAKSYMALNE zabezpieczenia
  security: {
    // Rate limiting - ZAWSZE włączony na produkcji
    rateLimiting: {
      enabled: true,                    // KRYTYCZNE: Zawsze włączone
      windowMs: 15 * 60 * 1000,         // 15 minut okno
      maxRequests: 100,                 // Restrykcyjny limit - 100 req/15min
      skipSuccessfulRequests: false,    // Licz wszystkie requesty
      skipFailedRequests: false,        // Licz wszystkie requesty
      standardHeaders: true,            // Standardowe nagłówki rate limit
      legacyHeaders: false,             // Bez starych nagłówków
      
      // Specjalne limity dla różnych endpointów
      endpoints: {
        '/api/users/login': {
          windowMs: 15 * 60 * 1000,     // 15 minut
          maxRequests: 5,               // Tylko 5 prób logowania
          blockDuration: 60 * 60 * 1000 // Blokada na 1 godzinę po przekroczeniu
        },
        '/api/users/register': {
          windowMs: 60 * 60 * 1000,     // 1 godzina
          maxRequests: 3,               // Tylko 3 rejestracje na godzinę
          blockDuration: 24 * 60 * 60 * 1000 // Blokada na 24h
        },
        '/api/users/forgot-password': {
          windowMs: 60 * 60 * 1000,     // 1 godzina
          maxRequests: 2,               // Tylko 2 próby resetowania hasła
          blockDuration: 2 * 60 * 60 * 1000 // Blokada na 2h
        }
      }
    },

    // Konfiguracja JWT - krótkie czasy życia dla bezpieczeństwa
    jwt: {
      accessTokenExpiry: '15m',         // KRÓTKI czas życia - 15 minut
      refreshTokenExpiry: '7d',         // 7 dni refresh token
      algorithm: 'HS256',               // Bezpieczny algorytm
      issuer: 'marketplace-prod',       // Identyfikator produkcyjny
      audience: 'marketplace-users',    // Audience produkcyjne
      
      // Dodatkowe zabezpieczenia JWT
      clockTolerance: 30,               // 30 sekund tolerancji zegara
      ignoreExpiration: false,          // NIE ignoruj wygaśnięcia
      ignoreNotBefore: false,           // NIE ignoruj notBefore
      maxAge: '15m'                     // Maksymalny wiek tokenu
    },

    // Konfiguracja cookies - MAKSYMALNE zabezpieczenia
    cookies: {
      httpOnly: true,                   // KRYTYCZNE: HttpOnly zawsze
      secure: true,                     // KRYTYCZNE: Tylko HTTPS
      sameSite: 'strict',               // KRYTYCZNE: Najwyższe zabezpieczenie CSRF
      domain: process.env.COOKIE_DOMAIN || undefined, // Tylko określona domena
      path: '/',                        // Dostępne dla całej aplikacji
      maxAge: 15 * 60 * 1000,          // 15 minut - krótki czas życia
      
      // Dodatkowe zabezpieczenia cookies
      priority: 'high',                 // Wysoki priorytet
      partitioned: true                 // Partitioned cookies dla lepszej izolacji
    },

    // CORS - RESTRYKCYJNY dla produkcji
    cors: {
      origin: process.env.ALLOWED_ORIGINS ? 
        process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()) : 
        [
          'https://marketplace-frontend.vercel.app', 
          'https://your-production-domain.com',
          'http://localhost:3000',      // Dodano dla development
          'http://localhost:3001',      // Dodano dla development
          'http://127.0.0.1:3000',      // Dodano dla development
          'http://127.0.0.1:3001'       // Dodano dla development
        ],
      credentials: true,                // Pozwól na cookies
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'], // Dodano OPTIONS i PATCH
      allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With', 
        'Accept',
        'Origin',
        'Cache-Control',
        'X-File-Name'
      ], // Rozszerzone nagłówki
      exposedHeaders: ['X-Total-Count'], // Podstawowe nagłówki
      maxAge: 3600,                     // Cache preflight na 1h
      optionsSuccessStatus: 204,        // Status dla starszych przeglądarek
      preflightContinue: false          // Nie kontynuuj po preflight
    },

    // Nagłówki bezpieczeństwa - MAKSYMALNE zabezpieczenia
    headers: {
      contentSecurityPolicy: {
        enabled: true,
        directives: {
          defaultSrc: ["'self'"],                    // Tylko własna domena
          styleSrc: ["'self'"],                      // Bez inline styles
          scriptSrc: ["'self'"],                     // Bez inline scripts
          imgSrc: ["'self'", 'data:', 'https:'],    // Tylko bezpieczne źródła
          connectSrc: ["'self'"],                    // Tylko własna domena
          fontSrc: ["'self'"],                       // Tylko własne fonty
          objectSrc: ["'none'"],                     // Bez obiektów
          mediaSrc: ["'self'"],                      // Tylko własne media
          frameSrc: ["'none'"],                      // Bez ramek
          baseUri: ["'self'"],                       // Tylko własna domena
          formAction: ["'self'"],                    // Tylko własne formularze
          frameAncestors: ["'none'"],                // Nie może być w ramce
          upgradeInsecureRequests: []                // Wymuszaj HTTPS
        },
        reportOnly: false,              // Egzekwuj politykę (nie tylko raportuj)
        reportUri: '/api/csp-report'    // Endpoint do raportowania naruszeń
      },
      
      // HTTP Strict Transport Security - WYMAGANE
      hsts: {
        enabled: true,                  // KRYTYCZNE: Zawsze włączone
        maxAge: 31536000,              // 1 rok
        includeSubDomains: true,       // Włącz subdomeny
        preload: true                  // Dodaj do preload list
      },
      
      // Dodatkowe nagłówki bezpieczeństwa
      additionalHeaders: {
        'X-Content-Type-Options': 'nosniff',           // Zapobiegaj MIME sniffing
        'X-Frame-Options': 'DENY',                     // Zapobiegaj clickjacking
        'X-XSS-Protection': '1; mode=block',           // Ochrona XSS
        'Referrer-Policy': 'strict-origin-when-cross-origin', // Kontrola referrer
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()', // Wyłącz API
        'Cross-Origin-Embedder-Policy': 'require-corp', // Izolacja cross-origin
        'Cross-Origin-Opener-Policy': 'same-origin',   // Izolacja okien
        'Cross-Origin-Resource-Policy': 'same-origin'  // Izolacja zasobów
      }
    },

    // Walidacja danych wejściowych - ŚCISŁA
    inputValidation: {
      enabled: true,                    // KRYTYCZNE: Zawsze włączone
      strictMode: true,                 // Tryb ścisły
      sanitizeInput: true,              // Sanityzuj dane wejściowe
      maxRequestSize: '10mb',           // Maksymalny rozmiar requestu
      maxFieldSize: '1mb',              // Maksymalny rozmiar pola
      maxFields: 100,                   // Maksymalna liczba pól
      allowedFileTypes: ['image/jpeg', 'image/png'], // Tylko bezpieczne typy
      maxFileSize: 5 * 1024 * 1024     // 5MB maksymalny rozmiar pliku
    }
  },

  // Konfiguracja logowania - MINIMALNE dla wydajności
  logging: {
    level: 'error',                     // Tylko błędy
    includeStack: false,                // Bez stack traces (bezpieczeństwo)
    includeSensitiveData: false,        // NIGDY nie loguj wrażliwych danych
    colorize: false,                    // Bez kolorów (wydajność)
    timestamp: true,                    // Znaczniki czasu
    format: 'json',                     // Format JSON dla parsowania
    
    console: {
      enabled: false,                   // Wyłączone w produkcji
      level: 'error'
    },
    
    file: {
      enabled: true,                    // Logi do pliku
      level: 'error',                   // Tylko błędy
      filename: 'logs/production.log',
      maxSize: '100mb',                 // Maksymalny rozmiar pliku
      maxFiles: 10,                     // Maksymalnie 10 plików
      compress: true                    // Kompresuj stare logi
    },
    
    audit: {
      enabled: true,                    // KRYTYCZNE: Logi audytowe
      level: 'info',                    // Wszystkie akcje bezpieczeństwa
      filename: 'logs/audit-prod.log',
      maxSize: '500mb',                 // Większy rozmiar dla audytu
      maxFiles: 50,                     // Więcej plików audytowych
      compress: true,                   // Kompresuj
      encrypt: true                     // Szyfruj logi audytowe
    }
  },

  // Konfiguracja bazy danych - OPTYMALIZOWANA dla produkcji
  database: {
    connectionTimeout: 5000,            // 5 sekund timeout (szybko)
    socketTimeout: 30000,               // 30 sekund socket timeout
    serverSelectionTimeout: 3000,       // 3 sekundy server selection
    maxPoolSize: 50,                    // Duża pula połączeń
    minPoolSize: 5,                     // Minimum 5 połączeń
    maxIdleTime: 10000,                 // 10 sekund idle time
    retryWrites: true,                  // Ponów zapisy
    retryReads: true,                   // Ponów odczyty
    readPreference: 'primaryPreferred', // Preferuj primary
    
    writeConcern: {
      w: 'majority',                    // Potwierdź zapis na większości nodes
      j: true,                          // Wymagaj journal
      wtimeout: 10000                   // 10 sekund timeout
    },
    
    readConcern: {
      level: 'majority'                 // Czytaj z większości nodes
    },
    
    // Szyfrowanie w spoczynku
    encryption: {
      enabled: true,                    // Włącz szyfrowanie
      keyVaultNamespace: 'encryption.__keyVault',
      kmsProviders: {
        local: {
          key: process.env.DB_ENCRYPTION_KEY
        }
      }
    }
  },

  // Konfiguracja cache - AGRESYWNA dla wydajności
  cache: {
    enabled: true,                      // Włączony dla wydajności
    ttl: 3600,                         // 1 godzina TTL
    maxSize: 10000,                    // Duży cache
    checkPeriod: 300,                  // Sprawdzaj co 5 minut
    
    // Redis configuration dla produkcji
    redis: {
      enabled: true,
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      db: 0,
      keyPrefix: 'marketplace:',
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000
    }
  },

  // Konfiguracja sesji - BEZPIECZNA
  session: {
    inactivityTimeout: 15 * 60 * 1000,  // 15 minut nieaktywności
    maxSessions: 3,                     // Maksymalnie 3 sesje na użytkownika
    cleanupInterval: 5 * 60 * 1000,     // Czyszczenie co 5 minut
    
    // Dodatkowe zabezpieczenia sesji
    regenerateOnLogin: true,            // Regeneruj ID sesji przy logowaniu
    destroyOnLogout: true,              // Zniszcz sesję przy wylogowaniu
    trackUserAgent: true,               // Śledź User-Agent
    trackIpAddress: true,               // Śledź adres IP
    detectHijacking: true               // Wykrywaj przejęcie sesji
  },

  // Konfiguracja uploadów - RESTRYKCYJNA
  uploads: {
    maxFileSize: 5 * 1024 * 1024,      // 5MB maksymalnie
    allowedTypes: ['image/jpeg', 'image/png'], // Tylko bezpieczne typy
    maxFiles: 10,                      // Maksymalnie 10 plików
    tempDir: '/tmp/uploads',           // Bezpieczny katalog tymczasowy
    finalDir: process.env.UPLOAD_DIR || 'uploads/production',
    
    // Skanowanie antywirusowe
    virusScanning: {
      enabled: true,                   // Włącz skanowanie
      quarantineDir: '/tmp/quarantine',
      deleteInfected: true             // Usuń zainfekowane pliki
    },
    
    // Walidacja obrazów
    imageValidation: {
      enabled: true,                   // Waliduj obrazy
      maxWidth: 4096,                  // Maksymalna szerokość
      maxHeight: 4096,                 // Maksymalna wysokość
      allowedFormats: ['jpeg', 'png'], // Dozwolone formaty
      stripMetadata: true              // Usuń metadane EXIF
    }
  },

  // Konfiguracja powiadomień - PEŁNA
  notifications: {
    enabled: true,                     // Włączone
    realTime: true,                    // Real-time przez WebSocket
    email: true,                       // Email włączony
    sms: true,                         // SMS włączony
    push: true,                        // Push włączony
    
    // Limity powiadomień
    rateLimits: {
      email: {
        perHour: 10,                   // 10 emaili na godzinę
        perDay: 50                     // 50 emaili dziennie
      },
      sms: {
        perHour: 5,                    // 5 SMS-ów na godzinę
        perDay: 20                     // 20 SMS-ów dziennie
      }
    }
  },

  // Konfiguracja monitoringu - ZAAWANSOWANA
  monitoring: {
    enabled: true,                     // Pełny monitoring
    
    healthCheck: {
      enabled: true,
      interval: 10000,                 // Co 10 sekund
      timeout: 3000,                   // 3 sekundy timeout
      endpoints: ['/health', '/ready', '/live']
    },
    
    metrics: {
      enabled: true,
      collectInterval: 30000,          // Co 30 sekund
      retentionPeriod: 7 * 24 * 3600000, // 7 dni retencji
      
      // Metryki do zbierania
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
    
    // Alerty
    alerts: {
      enabled: true,
      
      thresholds: {
        cpuUsage: 80,                  // Alert przy 80% CPU
        memoryUsage: 85,               // Alert przy 85% RAM
        diskUsage: 90,                 // Alert przy 90% dysku
        errorRate: 5,                  // Alert przy 5% błędów
        responseTime: 2000             // Alert przy 2s response time
      },
      
      channels: {
        email: process.env.ALERT_EMAIL,
        slack: process.env.SLACK_WEBHOOK,
        sms: process.env.ALERT_PHONE
      }
    }
  },

  // Konfiguracja backupów
  backup: {
    enabled: true,                     // Włącz backupy
    schedule: '0 2 * * *',            // Codziennie o 2:00
    retention: 30,                     // Zachowaj 30 dni
    compression: true,                 // Kompresuj backupy
    encryption: true,                  // Szyfruj backupy
    
    destinations: {
      s3: {
        enabled: true,
        bucket: process.env.BACKUP_S3_BUCKET,
        region: process.env.BACKUP_S3_REGION,
        accessKeyId: process.env.BACKUP_S3_ACCESS_KEY,
        secretAccessKey: process.env.BACKUP_S3_SECRET_KEY
      }
    }
  }
};
