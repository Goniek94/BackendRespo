/**
 * EXPRESS APPLICATION CONFIGURATION
 * 
 * Separated from index.js to allow testing without starting the server
 * This file exports the configured Express app for use in tests
 */

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { apiLimiter } from './middleware/rateLimiting.js';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import imageProcessor from './middleware/processing/imageProcessor.js';
import headerSizeMonitor, { sessionCleanup } from './middleware/headerSizeMonitor.js';
import { cookieCleaner, optimizeAdminSession } from './fix-admin-cookies.js';

// Import centralnej konfiguracji
import config from './config/index.js';
import logger from './utils/logger.js';
import healthRoutes from './routes/health.js';

// Import setupRoutes - centralna konfiguracja tras
import setupRoutes from './routes/index.js';

// Konfiguracja z fallbackami
const { server, security, logging } = config;
const isDev = process.env.NODE_ENV === 'development';
const FRONTEND_URL = server.frontendUrl;

/**
 * Create and configure Express application
 */
const createApp = () => {
  const app = express();
  
  // Logger wszystkich żądań HTTP (dla debugowania połączenia frontend-backend)
  app.use((req, res, next) => {
    if (isDev) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    }
    next();
  });

  // Kompresja odpowiedzi (gzip)
  app.use(compression());
  
  // Podstawowa konfiguracja middleware z limitami dla zdjęć i nagłówków
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ limit: '15mb', extended: true }));
  app.use(cookieParser());
  
  // Zwiększenie limitów nagłówków HTTP dla dużych ciasteczek/tokenów
  app.use((req, res, next) => {
    // Zwiększenie limitu nagłówków do 16KB (domyślnie 8KB)
    if (req.connection && req.connection.server) {
      req.connection.server.maxHeadersCount = 0; // Bez limitu liczby nagłówków
    }
    next();
  });
  
  // Użycie security headers z konfiguracji
  app.use(helmet(security.headers));
  
  // Dodatkowe nagłówki bezpieczeństwa
  if (security.headers.additionalHeaders) {
    app.use((req, res, next) => {
      Object.entries(security.headers.additionalHeaders).forEach(([header, value]) => {
        res.setHeader(header, value);
      });
      next();
    });
  }
  
  // Użycie CORS z konfiguracji
  app.use(cors(security.cors));
  
  // NOWY MIDDLEWARE: Monitorowanie rozmiaru nagłówków HTTP (rozwiązuje błąd 431)
  app.use(headerSizeMonitor);
  app.use(sessionCleanup);
  
  // MIDDLEWARE: Czyszczenie problematycznych cookies (rozwiązuje błąd 431)
  app.use(cookieCleaner);
  app.use(optimizeAdminSession);
  
  // Konfiguracja limitów zapytań
  configureRateLimits(app);
  
  // Konfiguracja katalogów na pliki
  configureUploads(app);
  
  // Konfiguracja favicon (optymalizacja dla HTTP 431)
  configureFavicon(app);
  
  // Konfiguracja tras API
  setupRoutes(app);
  
  // Dodanie health check endpoint
  app.use('/health', healthRoutes);
  
  // Podstawowa trasa - status serwera
  app.get('/', (req, res) => {
    res.json({
      status: 'online',
      message: 'Backend Marketplace działa prawidłowo',
      version: process.env.API_VERSION || '1.0.0'
    });
  });
  
  // Konfiguracja obsługi błędów
  configureErrorHandling(app);
  
  return app;
};

/**
 * Konfiguracja limitów zapytań z nowego middleware
 */
const configureRateLimits = (app) => {
  // Zastosowanie globalnego API limitera
  if (!isDev) {
    app.use('/api', apiLimiter); // Tylko w produkcji
    if (isDev) console.log('✅ Rate limiting włączony dla API');
  } else {
    if (isDev) console.log('⚠️ Rate limiting wyłączony w trybie development');
  }
};

/**
 * Konfiguracja katalogów na pliki
 */
const configureUploads = (app) => {
  try {
    const uploadsPath = path.join(path.resolve(), 'uploads');
    
    // Utworzenie katalogów na pliki, jeśli nie istnieją
    if (!fs.existsSync(uploadsPath)) {
      fs.mkdirSync(uploadsPath, { recursive: true });
    }
    
    const attachmentsPath = path.join(uploadsPath, 'attachments');
    if (!fs.existsSync(attachmentsPath)) {
      fs.mkdirSync(attachmentsPath, { recursive: true });
    }
    
    // Dodatkowy middleware do obsługi CORS dla /uploads
    app.use('/uploads', (req, res, next) => {
      // Allow both localhost:3000 and localhost:3001 for development
      if (req.headers.origin === 'http://localhost:3001' || req.headers.origin === 'http://localhost:3000') {
        res.header('Access-Control-Allow-Origin', req.headers.origin);
      } else {
        res.header('Access-Control-Allow-Origin', FRONTEND_URL);
      }
      res.header('Access-Control-Allow-Methods', 'GET');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Cache-Control');
      res.header('Cross-Origin-Resource-Policy', 'cross-origin');
      
      if (isDev) {
        console.log(`📷 Żądanie do /uploads: ${req.url}`);
      }
      
      next();
    });
    
    // Middleware do przetwarzania obrazów
    app.use('/uploads', imageProcessor);
    
    // Udostępnienie katalogu uploads jako statycznego
    app.use('/uploads', express.static(uploadsPath, {
      maxAge: '1y', // Cache na 1 rok
      etag: true,
      lastModified: true
    }));
    
    if (isDev) {
      console.log('✅ Katalog uploads skonfigurowany pomyślnie');
    }
  } catch (error) {
    console.error('❌ Błąd konfiguracji ścieżki uploads:', error);
  }
};

/**
 * Konfiguracja favicon (optymalizacja dla HTTP 431)
 */
const configureFavicon = (app) => {
  try {
    const publicPath = path.join(path.resolve(), 'public');
    
    // Sprawdź czy katalog public istnieje
    if (!fs.existsSync(publicPath)) {
      fs.mkdirSync(publicPath, { recursive: true });
    }
    
    // Zoptymalizowane serwowanie favicon z prawdziwym logo AutoSell
    app.get('/favicon.ico', (req, res) => {
      // Najpierw spróbuj użyć prawdziwego logo AutoSell w PNG
      const autoSellLogoPath = path.join(publicPath, 'autosell-logo.png');
      const faviconPath = path.join(publicPath, 'favicon.ico');
      
      if (fs.existsSync(autoSellLogoPath)) {
        // Użyj prawdziwego logo AutoSell
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 24h cache
        res.sendFile(autoSellLogoPath);
      } else if (fs.existsSync(faviconPath)) {
        // Fallback do standardowego favicon
        res.setHeader('Content-Type', 'image/x-icon');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.sendFile(faviconPath);
      } else {
        res.status(204).end(); // No Content - brak favicon
      }
    });
    
    // Serwowanie favicon PNG (16x16)
    app.get('/favicon-16x16.png', (req, res) => {
      const faviconPath = path.join(publicPath, 'favicon-16x16.png');
      
      if (fs.existsSync(faviconPath)) {
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.sendFile(faviconPath);
      } else {
        res.status(404).end();
      }
    });
    
    // Serwowanie favicon PNG (32x32)
    app.get('/favicon-32x32.png', (req, res) => {
      const faviconPath = path.join(publicPath, 'favicon-32x32.png');
      
      if (fs.existsSync(faviconPath)) {
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.sendFile(faviconPath);
      } else {
        res.status(404).end();
      }
    });
    
    // Serwowanie logo AutoSell PNG
    app.get('/autosell-logo.png', (req, res) => {
      const logoPath = path.join(publicPath, 'autosell-logo.png');
      
      if (fs.existsSync(logoPath)) {
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.sendFile(logoPath);
      } else {
        res.status(404).end();
      }
    });
    
    // Serwowanie logo AutoSell SVG
    app.get('/autosell-logo.svg', (req, res) => {
      const logoPath = path.join(publicPath, 'autosell-logo.svg');
      
      if (fs.existsSync(logoPath)) {
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.sendFile(logoPath);
      } else {
        res.status(404).end();
      }
    });
    
    // Udostępnij katalog public z optymalizacją
    app.use('/public', express.static(publicPath, {
      maxAge: '1d', // Cache na 1 dzień
      etag: false, // Wyłącz ETag (mniej nagłówków)
      lastModified: false, // Wyłącz Last-Modified
      setHeaders: (res, filePath) => {
        // Minimalne nagłówki dla plików statycznych
        if (filePath.endsWith('.ico') || filePath.endsWith('.png')) {
          res.removeHeader('X-Powered-By');
          res.removeHeader('ETag');
          res.removeHeader('Last-Modified');
        }
      }
    }));
    
    if (isDev) {
      console.log('✅ Favicon AutoSell skonfigurowany pomyślnie');
    }
  } catch (error) {
    console.error('❌ Błąd konfiguracji favicon:', error);
  }
};

/**
 * Konfiguracja obsługi błędów
 */
const configureErrorHandling = (app) => {
  // Centralny middleware do obsługi błędów
  app.use((err, req, res, next) => {
    if (isDev) {
      console.error(`❌ Błąd aplikacji: ${err.message}`, err.stack);
    }
    
    const statusCode = err.statusCode || 500;
    const response = {
      status: 'error',
      message: err.message || 'Błąd serwera',
      ...(isDev && { stack: err.stack })
    };
    
    res.status(statusCode).json(response);
  });
  
  // Obsługa błędu 404 - nie znaleziono endpointu
  app.use((req, res) => {
    res.status(404).json({
      status: 'error',
      message: `Endpoint ${req.method} ${req.originalUrl} nie istnieje`
    });
  });
};

// Export the configured app
const app = createApp();
export default app;
