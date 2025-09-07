/**
 * EXPRESS APPLICATION CONFIGURATION - ULTRA MINIMAL HEADERS
 * 
 * EMERGENCY FIX dla HTTP 431 - usunięte wszystkie niepotrzebne nagłówki
 * Tylko najważniejsze funkcjonalności dla działania aplikacji
 */

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
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
  
  // ZWIĘKSZONE LIMITY dla HTTP 431 fix
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  
  // DEBUGGING nagłówków - monitorowanie rozmiaru
  app.use((req, res, next) => {
    const headerSize = JSON.stringify(req.headers).length;
    const cookieSize = req.headers.cookie?.length || 0;
    
    if (headerSize > 8192) { // 8KB warning threshold
      console.warn(`⚠️  Large headers detected: ${headerSize} bytes`);
      console.warn(`   Cookie size: ${cookieSize} bytes`);
      console.warn(`   URL: ${req.originalUrl}`);
    }
    
    // Dodaj nagłówek z informacją o rozmiarze (tylko development)
    if (isDev) {
      res.setHeader('X-Header-Size', headerSize);
      res.setHeader('X-Cookie-Size', cookieSize);
    }
    
    next();
  });
  
  // TYLKO podstawowe middleware - bez dodatkowych nagłówków
  app.use(compression());
  app.use(cookieParser());
  
  // COOKIE CLEANUP - usuwa niepotrzebne cookies powodujące HTTP 431
  app.use(cookieSizeMonitor);      // Monitoruje rozmiar cookies
  app.use(cookieCleanupMiddleware); // Usuwa niepotrzebne cookies
  
  // MINIMAL CORS - tylko najważniejsze nagłówki
  app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'] // TYLKO te nagłówki
  }));
  
  // USUNIĘTE: helmet, headerSizeMonitor, sessionCleanup - powodują duże nagłówki
  // USUNIĘTE: rate limiting - dodaje nagłówki
  // USUNIĘTE: wszystkie dodatkowe nagłówki bezpieczeństwa
  
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
