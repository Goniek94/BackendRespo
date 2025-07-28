import crypto from 'crypto';

/**
 * Walidacja zmiennych środowiskowych - KRYTYCZNE dla bezpieczeństwa
 */
const validateEnvironment = () => {
  console.log('🔍 Sprawdzam zmienne środowiskowe...');
  
  const required = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET', 
    'MONGO_URI'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error(`❌ KRYTYCZNY BŁĄD: Brakujące zmienne środowiskowe: ${missing.join(', ')}`);
    console.error('');
    console.error('Dodaj te zmienne do pliku .env:');
    missing.forEach(key => {
      if (key.includes('SECRET')) {
        console.error(`${key}=${crypto.randomBytes(64).toString('hex')}`);
      } else {
        console.error(`${key}=your_${key.toLowerCase()}_here`);
      }
    });
    console.error('');
    console.error('Aplikacja nie może zostać uruchomiona bez tych zmiennych!');
    process.exit(1);
  }
  
  // Sprawdź czy sekrety nie są domyślne/słabe
  const weakSecrets = [
    'tajnyKluczJWT123',
    'default_jwt_secret_key', 
    'refreshSecretKey456',
    'default_refresh_secret_key',
    'complex-secure-password-for-cookie-encryption'
  ];
  
  const isWeakJWT = weakSecrets.includes(process.env.JWT_SECRET);
  const isWeakRefresh = weakSecrets.includes(process.env.JWT_REFRESH_SECRET);
  const isShortJWT = process.env.JWT_SECRET.length < 32;
  const isShortRefresh = process.env.JWT_REFRESH_SECRET.length < 32;
  
  if (isWeakJWT || isWeakRefresh || isShortJWT || isShortRefresh) {
    console.error('❌ KRYTYCZNY BŁĄD BEZPIECZEŃSTWA: Używasz słabych sekretów JWT!');
    console.error('');
    console.error('Wygeneruj silne sekrety i dodaj do .env:');
    console.error(`JWT_SECRET=${crypto.randomBytes(64).toString('hex')}`);
    console.error(`JWT_REFRESH_SECRET=${crypto.randomBytes(64).toString('hex')}`);
    console.error('');
    console.error('To jest KATASTROFA BEZPIECZEŃSTWA na produkcji!');
    
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.warn('⚠️ Kontynuuję w trybie deweloperskim, ale MUSISZ to naprawić przed produkcją!');
    }
  }
  
  // Sprawdź połączenie MongoDB URI
  if (!process.env.MONGO_URI.includes('mongodb')) {
    console.error('❌ MONGO_URI nie wygląda na prawidłowy URI MongoDB');
    process.exit(1);
  }
  
  console.log('✅ Wszystkie wymagane zmienne środowiskowe są ustawione');
  console.log('✅ Sekrety JWT są bezpieczne');
};

/**
 * Generuje silne sekrety dla rozwoju
 */
const generateSecrets = () => {
  console.log('🔐 Wygenerowane sekrety dla .env:');
  console.log('');
  console.log(`JWT_SECRET=${crypto.randomBytes(64).toString('hex')}`);
  console.log(`JWT_REFRESH_SECRET=${crypto.randomBytes(64).toString('hex')}`);
  console.log(`ADMIN_COOKIE_SECRET=${crypto.randomBytes(32).toString('hex')}`);
  console.log('');
};

/**
 * Konfiguracja bezpieczeństwa dla różnych środowisk
 */
const getSecurityConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    // JWT Configuration
    jwt: {
      secret: process.env.JWT_SECRET,
      refreshSecret: process.env.JWT_REFRESH_SECRET,
      accessTokenExpiry: isProduction ? '15m' : '1h', // Krótszy czas na produkcji
      refreshTokenExpiry: '7d',
      algorithm: 'HS256'
    },
    
    // Cookie Configuration
    cookies: {
      httpOnly: true,
      secure: isProduction, // HTTPS tylko na produkcji
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: {
        accessToken: isProduction ? 15 * 60 * 1000 : 3600000, // 15min vs 1h
        refreshToken: 7 * 24 * 3600000 // 7 dni
      }
    },
    
    // Rate Limiting
    rateLimiting: {
      global: {
        windowMs: 15 * 60 * 1000, // 15 minut
        max: isProduction ? 1000 : 5000 // Mniej na produkcji
      },
      auth: {
        windowMs: 15 * 60 * 1000,
        max: isProduction ? 20 : 50 // Bardzo restrykcyjne na produkcji
      },
      api: {
        windowMs: 1 * 60 * 1000, // 1 minuta
        max: isProduction ? 100 : 200
      }
    },
    
    // Security Headers
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
          scriptSrc: ["'self'", ...(isDevelopment ? ["'unsafe-inline'", "'unsafe-eval'"] : [])],
          imgSrc: ["'self'", 'data:', 'https://*', 'blob:'],
          connectSrc: ["'self'", ...(isDevelopment ? ['http://localhost:*'] : []), 'https://*'],
          fontSrc: ["'self'", 'https:', 'data:'],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: isProduction ? [] : null
        }
      },
      hsts: isProduction ? {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      } : false
    },
    
    // Environment flags
    isProduction,
    isDevelopment,
    
    // Logging levels
    logging: {
      level: isProduction ? 'error' : 'debug',
      includeStack: isDevelopment,
      includeSensitiveData: isDevelopment
    }
  };
};

export { 
  validateEnvironment, 
  generateSecrets, 
  getSecurityConfig 
};
