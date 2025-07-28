// Załadowanie zmiennych środowiskowych - MUSI BYĆ NA SAMEJ GÓRZE
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import { apiLimiter } from './middleware/rateLimiting.js';
import AdminJS from 'adminjs';
import AdminJSExpress from '@adminjs/express';
import * as AdminJSMongoose from '@adminjs/mongoose';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import http from 'http';
import socketService from './services/socketService.js';
import imageProcessor from './middleware/imageProcessor.js';

// ✅ NOWA KONFIGURACJA - Import centralnej konfiguracji
import config from './config/index.js';
import logger from './utils/logger.js';
import healthRoutes from './routes/health.js';

// Import setupRoutes - centralna konfiguracja tras
import setupRoutes from './routes/index.js';
import User from './models/user.js';
import { initScheduledTasks } from './utils/scheduledTasks.js';

// ✅ NOWA KONFIGURACJA - Użycie centralnej konfiguracji z fallbackami
const { server, security, logging } = config;
const isDev = process.env.NODE_ENV === 'development';
const PORT = server.port;
const FRONTEND_URL = server.frontendUrl;

/**
 * Konfiguracja aplikacji Express
 */
const configureApp = () => {
  const app = express();
  
  // Logger wszystkich żądań HTTP (dla debugowania połączenia frontend-backend)
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });

  // Podstawowa konfiguracja middleware z limitami dla zdjęć
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ limit: '15mb', extended: true }));
  app.use(cookieParser());
  
  // ✅ NOWA KONFIGURACJA - Użycie security headers z konfiguracji
  app.use(helmet(security.headers));
  
  // Logger dla zapytań HTTP (tylko w trybie deweloperskim)
  if (isDev) {
    app.use((req, res, next) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
      next();
    });
  }
  
  // ✅ NOWA KONFIGURACJA - Użycie CORS z konfiguracji
  app.use(cors(security.cors));
  
  // Konfiguracja limitów zapytań
  configureRateLimits(app);
  
  return app;
};

/**
 * ✅ NOWA KONFIGURACJA - Konfiguracja limitów zapytań z nowego middleware
 */
const configureRateLimits = (app) => {
  // Zastosowanie globalnego API limitera
  if (!isDev) {
    app.use('/api', apiLimiter); // Tylko w produkcji
    console.log('✅ Rate limiting włączony dla API');
  } else {
    console.log('⚠️ Rate limiting wyłączony w trybie development');
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
 * Konfiguracja panelu administracyjnego
 */
const configureAdminPanel = (app) => {
  AdminJS.registerAdapter(AdminJSMongoose);
  
  const adminJs = new AdminJS({
    databases: [mongoose],
    rootPath: '/admin',
    branding: {
      companyName: 'Marketplace Admin',
      logo: false,
      softwareBrothers: false
    },
    dashboard: {
      component: './admin/dashboard'
    }
  });
  
  // Uwierzytelnianie dla panelu administracyjnego
  const adminRouter = AdminJSExpress.buildAuthenticatedRouter(adminJs, {
    authenticate: async (email, password) => {
      const user = await User.findOne({ email });
      if (user && (user.role === 'admin' || user.role === 'moderator')) {
        const validPassword = await bcrypt.compare(password, user.password);
        if (validPassword) {
          return user;
        }
      }
      return null;
    },
    cookiePassword: process.env.ADMIN_COOKIE_SECRET || 'complex-secure-password-for-cookie-encryption',
  });
  
  // Dodanie panelu AdminJS do aplikacji
  app.use(adminJs.options.rootPath, adminRouter);
};

/**
 * Konfiguracja obsługi błędów
 */
const configureErrorHandling = (app) => {
  // Centralny middleware do obsługi błędów
  app.use((err, req, res, next) => {
    console.error(`❌ Błąd aplikacji: ${err.message}`, err.stack);
    
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
  
  // Obsługa nieprzechwyconych wyjątków
  process.on('uncaughtException', (err) => {
    console.error('❌ Nieprzechwycony wyjątek:', err);
  });
  
  // Obsługa nieprzechwyconych odrzuceń Promise
  process.on('unhandledRejection', (reason) => {
    console.error('❌ Nieobsłużone odrzucenie Promise:', reason);
  });
};

/**
 * Połączenie z bazą danych MongoDB
 */
const connectToDatabase = async () => {
  try {
    // Próba połączenia z MongoDB Atlas
    console.log('🔄 Próba połączenia z MongoDB Atlas...');
    await mongoose.connect(config.database.uri, {
      serverSelectionTimeoutMS: 5000, // 5 sekund timeout
      connectTimeoutMS: 10000,        // 10 sekund timeout połączenia
      socketTimeoutMS: 45000,         // 45 sekund timeout socketów
    });
    
    console.log('✅ Połączono z bazą danych MongoDB Atlas');
    
    // Operacje na indeksach zostały przeniesione do osobnego skryptu utils/db-maintenance.js
    // Nie wykonujemy ich przy każdym starcie serwera, co przyspiesza uruchomienie
    if (isDev) console.log('ℹ️ Operacje na indeksach przeniesione do osobnego skryptu');
    
    return true;
  } catch (err) {
    console.error('❌ Błąd połączenia z MongoDB Atlas:', err.message);
    
    // Fallback do lokalnej bazy MongoDB w trybie development
    if (isDev) {
      console.log('🔄 Próba połączenia z lokalną bazą MongoDB...');
      try {
        await mongoose.connect('mongodb://localhost:27017/marketplace-dev', {
          serverSelectionTimeoutMS: 3000,
          connectTimeoutMS: 5000,
          socketTimeoutMS: 30000,
        });
        
        console.log('✅ Połączono z lokalną bazą danych MongoDB');
        console.log('⚠️  UWAGA: Używasz lokalnej bazy danych - dane mogą się różnić od produkcji');
        return true;
      } catch (localErr) {
        console.error('❌ Błąd połączenia z lokalną MongoDB:', localErr.message);
        console.log('💡 Aby uruchomić lokalną MongoDB:');
        console.log('   1. Zainstaluj MongoDB Community Server');
        console.log('   2. Uruchom: mongod --dbpath ./data');
        console.log('   3. Lub użyj Docker: docker run -d -p 27017:27017 mongo');
      }
    }
    
    return false;
  }
};

/**
 * Główna funkcja inicjalizująca aplikację
 */
const startServer = async () => {
  // Funkcja do znajdowania wolnego portu
  const findFreePort = (startPort) => {
    return new Promise((resolve, reject) => {
      let port = startPort;
      const tryPort = () => {
        const server = http.createServer();
        server.listen(port, () => {
          server.close(() => resolve(port));
        });
        server.on('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            console.warn(`⚠️ Port ${port} jest zajęty, sprawdzam następny...`);
            port++;
            tryPort();
          } else {
            reject(err);
          }
        });
      };
      tryPort();
    });
  };

  // Znajdź wolny port, zaczynając od domyślnego
  const finalPort = await findFreePort(PORT);
  if (finalPort !== PORT) {
    console.log(`✅ Znaleziono wolny port: ${finalPort}`);
  }

  // Połączenie z bazą danych
  const dbConnected = await connectToDatabase();
  if (!dbConnected) {
    console.error('Nie można uruchomić serwera bez połączenia z bazą danych');
    process.exit(1);
  }
  
  // Konfiguracja aplikacji
  const app = configureApp();
  
  // Utworzenie serwera HTTP
  const server = http.createServer(app);
  
  // Inicjalizacja Socket.IO
  socketService.initialize(server);
  
  // Konfiguracja katalogów na pliki
  configureUploads(app);
  
  // Konfiguracja tras API
  setupRoutes(app);
  
  // ✅ NOWA KONFIGURACJA - Dodanie health check endpoint
  app.use('/health', healthRoutes);
  
  // Podstawowa trasa - status serwera
  app.get('/', (req, res) => {
    res.json({
      status: 'online',
      message: 'Backend Marketplace działa prawidłowo',
      version: process.env.API_VERSION || '1.0.0'
    });
  });
  
  // Leniwe ładowanie panelu administracyjnego - tylko gdy ktoś wejdzie na ścieżkę /admin
  app.use('/admin*', (req, res, next) => {
    if (!app.adminJsConfigured) {
      configureAdminPanel(app);
      app.adminJsConfigured = true;
      console.log('✅ Panel administracyjny załadowany na żądanie');
    }
    next();
  });
  
  // Konfiguracja obsługi błędów
  configureErrorHandling(app);
  
  // Uruchomienie serwera
  server.listen(finalPort, () => {
    console.log(`
🚀 Serwer uruchomiony na porcie ${finalPort}
📝 Panel administratora: http://localhost:${finalPort}/admin
🔧 Środowisko: ${process.env.NODE_ENV || 'development'}
🔌 Socket.IO: Aktywny
    `);
    
    // Opóźnione uruchomienie zadań cyklicznych
    setTimeout(() => {
      console.log("🕒 Uruchamianie zadań cyklicznych...");
      initScheduledTasks();
    }, 5000); // Opóźnienie 5 sekund
  });
};

// Uruchomienie serwera
startServer();
