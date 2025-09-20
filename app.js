/**
 * EXPRESS APPLICATION CONFIGURATION - PRODUCTION SECURITY
 * 
 * SECURITY FIXES APPLIED:
 * ✅ Fixed double password hashing (admin auth now uses model method)
 * ✅ Fixed default phone verification (changed from true to false)
 * ✅ Protected CSRF cookies from cleanup middleware
 * ✅ Replaced Math.random with crypto.randomInt for SMS codes
 * ✅ Added production-grade Helmet security headers
 * 
 * PRODUCTION SECURITY FEATURES:
 * - Content Security Policy (CSP) - XSS protection
 * - HTTP Strict Transport Security (HSTS) - HTTPS enforcement
 * - X-Frame-Options - Clickjacking protection
 * - X-Content-Type-Options - MIME sniffing protection
 * - Referrer Policy - Referer header control
 * - Certificate Transparency (Expect-CT)
 */

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import fs from 'fs';

// Import centralnej konfiguracji
import config from './config/index.js';
import logger from './utils/logger.js';

// Import setupRoutes - centralna konfiguracja tras
import setupRoutes from './routes/index.js';

// Import cookie cleanup middleware
import { cookieCleanupMiddleware, cookieSizeMonitor } from './middleware/cookieCleanup.js';

// Konfiguracja z fallbackami
const { server } = config;
const isDev = process.env.NODE_ENV === 'development';
const FRONTEND_URL = server.frontendUrl;

/**
 * Create and configure Express application - MINIMAL VERSION
 */
const createApp = () => {
  const app = express();
  
  // FIXED: Zwiększone limity dla HTTP 431 fix - rozsądne wartości produkcyjne
  app.use(express.json({ 
    limit: '50mb',
    parameterLimit: 50000,  // Zwiększony limit parametrów
    extended: true
  }));
  app.use(express.urlencoded({ 
    limit: '50mb', 
    extended: true,
    parameterLimit: 50000   // Zwiększony limit parametrów
  }));
  
  // FIXED: Zwiększone progi monitorowania nagłówków
  app.use((req, res, next) => {
    const headerSize = JSON.stringify(req.headers).length;
    const cookieSize = req.headers.cookie?.length || 0;
    
    // FIXED: Zwiększony próg z 8KB do 32KB (zgodnie z Node.js defaults)
    if (headerSize > 32768) { // 32KB warning threshold
      logger.warn('Large headers detected', {
        headerSize: headerSize,
        cookieSize: cookieSize,
        url: req.originalUrl,
        threshold: '32KB'
      });
    }
    
    // Dodaj nagłówki informacyjne (tylko development)
    if (isDev) {
      res.setHeader('X-Header-Size', headerSize);
      res.setHeader('X-Cookie-Size', cookieSize);
      res.setHeader('X-Header-Threshold', '32KB');
    }
    
    next();
  });
  
  // TYLKO podstawowe middleware - bez dodatkowych nagłówków
  app.use(compression());
  app.use(cookieParser());
  
  // COOKIE CLEANUP - usuwa niepotrzebne cookies powodujące HTTP 431
  app.use(cookieSizeMonitor);      // Monitoruje rozmiar cookies
  app.use(cookieCleanupMiddleware); // Usuwa niepotrzebne cookies
  
  // FIXED: Rozszerzone CORS - dodano potrzebne nagłówki
  app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization',
      'X-Requested-With',    // Potrzebne dla AJAX
      'Accept',              // Potrzebne dla content negotiation
      'Cache-Control',       // Potrzebne dla cache control
      'X-CSRF-Token',        // Potrzebne dla CSRF protection
      'X-Header-Size',       // Nasze custom nagłówki
      'X-Cookie-Size'        // Nasze custom nagłówki
    ],
    exposedHeaders: [
      'X-Total-Count',       // Potrzebne dla paginacji
      'X-Header-Size',       // Nasze monitoring nagłówki
      'X-Cookie-Size'        // Nasze monitoring nagłówki
    ],
    maxAge: 86400 // 24h cache dla preflight requests
  }));
  
  // PRODUCTION SECURITY: Helmet z pełnymi zabezpieczeniami
  app.use(helmet({
    // Content Security Policy - ochrona przed XSS
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", "ws:", "wss:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    // Cross Origin Embedder Policy
    crossOriginEmbedderPolicy: false, // Wyłączone dla kompatybilności
    // HTTP Strict Transport Security - wymusza HTTPS
    hsts: {
      maxAge: 31536000, // 1 rok
      includeSubDomains: true,
      preload: true
    },
    // X-Frame-Options - ochrona przed clickjacking
    frameguard: { action: 'deny' },
    // X-Content-Type-Options - zapobiega MIME sniffing
    noSniff: true,
    // X-XSS-Protection - ochrona przed XSS (legacy)
    xssFilter: true,
    // Referrer Policy - kontroluje nagłówek Referer
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    // X-Permitted-Cross-Domain-Policies - Adobe Flash/PDF
    permittedCrossDomainPolicies: false,
    // X-DNS-Prefetch-Control - kontroluje DNS prefetching
    dnsPrefetchControl: { allow: false },
    // Expect-CT - Certificate Transparency
    expectCt: {
      maxAge: 86400,
      enforce: true
    }
  }));
  
  // Konfiguracja katalogów na pliki - MINIMAL
  configureUploads(app);
  
  // Konfiguracja favicon - MINIMAL (204 No Content)
  configureFavicon(app);
  
  // Konfiguracja tras API
  setupRoutes(app);
  
  // Podstawowa trasa - MINIMAL response
  app.get('/', (req, res) => {
    res.json({ status: 'ok' }); // Minimalna odpowiedź
  });
  
  // MINIMAL error handling
  app.use((err, req, res, next) => {
    res.status(500).json({ error: 'Server error' });
  });
  
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
  
  return app;
};

/**
 * MINIMAL uploads configuration
 */
const configureUploads = (app) => {
  try {
    const uploadsPath = './uploads';
    
    if (!fs.existsSync(uploadsPath)) {
      fs.mkdirSync(uploadsPath, { recursive: true });
    }
    
    // MINIMAL CORS dla uploads
    app.use('/uploads', (req, res, next) => {
      res.header('Access-Control-Allow-Origin', FRONTEND_URL);
      next();
    });
    
    app.use('/uploads', express.static(uploadsPath, {
      maxAge: '1d', // Krótszy cache
      etag: false,  // Bez ETag nagłówków
      lastModified: false // Bez Last-Modified nagłówków
    }));
    
  } catch (error) {
    console.error('Upload config error:', error.message);
  }
};

/**
 * MINIMAL favicon configuration - wszystkie zwracają 204
 */
const configureFavicon = (app) => {
  const faviconPaths = [
    '/favicon.ico',
    '/favicon-16x16.png', 
    '/favicon-32x32.png',
    '/autosell-logo.png',
    '/autosell-logo.svg'
  ];
  
  faviconPaths.forEach(path => {
    app.get(path, (req, res) => {
      res.status(204).end(); // No Content - brak nagłówków
    });
  });
};

// Export the configured app
const app = createApp();
export default app;
