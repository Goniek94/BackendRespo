import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import AdminJS from 'adminjs';
import AdminJSExpress from '@adminjs/express';
import * as AdminJSMongoose from '@adminjs/mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import http from 'http';
import socketService from './services/socketService.js';
import imageProcessor from './middleware/imageProcessor.js';

// Załadowanie zmiennych środowiskowych
dotenv.config();

// Import setupRoutes - centralna konfiguracja tras
import setupRoutes from './routes/index.js';
import User from './models/user.js';
import { initScheduledTasks } from './utils/scheduledTasks.js';

// Konfiguracja środowiska
const isDev = process.env.NODE_ENV === 'development';
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

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

  // Podstawowa konfiguracja middleware
  app.use(express.json());
  app.use(cookieParser());
  
  // Konfiguracja zabezpieczeń z Helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
        scriptSrc: ["'self'", 'https:', "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com', 'http://localhost:*'],
        connectSrc: ["'self'", 'https://api.cloudinary.com'],
        fontSrc: ["'self'", 'https:', 'data:'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    referrerPolicy: { policy: 'no-referrer' },
    xssFilter: true,
    hidePoweredBy: true,
    frameGuard: { action: 'deny' },
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));
  
  // Logger dla zapytań HTTP (tylko w trybie deweloperskim)
  if (isDev) {
    app.use((req, res, next) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
      next();
    });
  }
  
  // Konfiguracja CORS
  app.use(cors({
    origin: [FRONTEND_URL, 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Cache-Control']
  }));
  
  // Konfiguracja limitów zapytań
  configureRateLimits(app);
  
  return app;
};

/**
 * Konfiguracja limitów zapytań
 */
const configureRateLimits = (app) => {
  // Globalny limit zapytań
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minut
    max: 5000,                // limit na IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: 429,
      message: 'Przekroczono limit zapytań, spróbuj ponownie później.'
    }
  });
  
  // Specjalny limit dla tras uwierzytelniania
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minut
    max: 500,                 // limit na IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: 429,
      message: 'Przekroczono limit zapytań dla autoryzacji, spróbuj ponownie za 15 minut.'
    }
  });
  
  // app.use(globalLimiter); // WYŁĄCZONY na czas debugowania
  app.use('/api/users', authLimiter);
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
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Połączono z bazą danych MongoDB');
    
    // Usunięcie indeksów unikalnych, które mogą powodować problemy
    try {
      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();
      
      // Sprawdź, czy kolekcja ads istnieje
      if (collections.some(col => col.name === 'ads')) {
        try {
          await db.collection('ads').dropIndex('registrationNumber_1');
        } catch (err) {
          if (isDev) console.log('ℹ️ Indeks registrationNumber_1:', err.message);
        }
        
        try {
          await db.collection('ads').dropIndex('vin_1');
        } catch (err) {
          if (isDev) console.log('ℹ️ Indeks vin_1:', err.message);
        }
      }
    } catch (error) {
      if (isDev) console.log('ℹ️ Informacja o indeksach:', error.message);
    }
    
    return true;
  } catch (err) {
    console.error('❌ Błąd połączenia z MongoDB:', err);
    return false;
  }
};

/**
 * Główna funkcja inicjalizująca aplikację
 */
const startServer = async () => {
  // Połączenie z bazą danych - ZAKOMENTOWANE NA CZAS TESTÓW
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
  
  // Podstawowa trasa - status serwera
  app.get('/', (req, res) => {
    res.json({
      status: 'online',
      message: 'Backend Marketplace działa prawidłowo',
      version: process.env.API_VERSION || '1.0.0'
    });
  });
  
  // Konfiguracja panelu administracyjnego
  configureAdminPanel(app);
  
  // Konfiguracja obsługi błędów
  configureErrorHandling(app);
  
  // Uruchomienie serwera
  server.listen(PORT, () => {
    console.log(`
🚀 Serwer uruchomiony na porcie ${PORT}
📝 Panel administratora: http://localhost:${PORT}/admin
🔧 Środowisko: ${process.env.NODE_ENV || 'development'}
🔌 Socket.IO: Aktywny
    `);
    
    // Inicjalizacja zadań cyklicznych
    initScheduledTasks();
  });
};

// Uruchomienie serwera
startServer();
