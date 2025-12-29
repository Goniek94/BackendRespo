// Załadowanie zmiennych środowiskowych - MUSI BYĆ NA SAMEJ GÓRZE
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import path from "path";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import { apiLimiter } from "./middleware/rateLimiting.js";
import headerSizeMonitor, {
  sessionCleanup,
} from "./middleware/headerSizeMonitor.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs";
import cookieParser from "cookie-parser";
import http from "http";
import socketService from "./services/socketService.js";
import notificationManager from "./services/notificationManager.js";
import imageProcessor from "./middleware/processing/imageProcessor.js";

// ✅ NOWA KONFIGURACJA - Import centralnej konfiguracji
import config from "./config/index.js";
import logger from "./utils/logger.js";
import healthRoutes from "./routes/health.js";

// Import setupRoutes - centralna konfiguracja tras
import setupRoutes from "./routes/index.js";

// Import skonfigurowanej aplikacji Express
import app from "./app.js";
import User from "./models/user/user.js";
import Ad from "./models/listings/ad.js";
import { initScheduledTasks } from "./utils/scheduledTasks.js";

// ✅ NOWA KONFIGURACJA - Użycie centralnej konfiguracji z fallbackami
const { server, security, logging } = config;
const isDev = process.env.NODE_ENV === "development";
const PORT = server.port;
const FRONTEND_URL = server.frontendUrl;

// USUNIĘTE: Stara konfiguracja - teraz używamy app.js

/**
 * Połączenie z bazą danych MongoDB
 */
const connectToDatabase = async () => {
  try {
    // Próba połączenia z MongoDB Atlas
    console.log("🔄 Próba połączenia z MongoDB Atlas...");
    await mongoose.connect(config.database.uri, {
      serverSelectionTimeoutMS: 5000, // 5 sekund timeout
      connectTimeoutMS: 10000, // 10 sekund timeout połączenia
      socketTimeoutMS: 45000, // 45 sekund timeout socketów
    });

    console.log("✅ Połączono z bazą danych MongoDB Atlas");

    // Operacje na indeksach zostały przeniesione do osobnego skryptu utils/db-maintenance.js
    // Nie wykonujemy ich przy każdym starcie serwera, co przyspiesza uruchomienie
    if (isDev)
      console.log("ℹ️ Operacje na indeksach przeniesione do osobnego skryptu");

    return true;
  } catch (err) {
    console.error("❌ Błąd połączenia z MongoDB Atlas:", err.message);

    // Fallback do lokalnej bazy MongoDB w trybie development
    if (isDev) {
      console.log("🔄 Próba połączenia z lokalną bazą MongoDB...");
      try {
        await mongoose.connect("mongodb://localhost:27017/marketplace-dev", {
          serverSelectionTimeoutMS: 3000,
          connectTimeoutMS: 5000,
          socketTimeoutMS: 30000,
        });

        console.log("✅ Połączono z lokalną bazą danych MongoDB");
        console.log(
          "⚠️  UWAGA: Używasz lokalnej bazy danych - dane mogą się różnić od produkcji"
        );
        return true;
      } catch (localErr) {
        console.error(
          "❌ Błąd połączenia z lokalną MongoDB:",
          localErr.message
        );
        console.log("💡 Aby uruchomić lokalną MongoDB:");
        console.log("   1. Zainstaluj MongoDB Community Server");
        console.log("   2. Uruchom: mongod --dbpath ./data");
        console.log(
          "   3. Lub użyj Docker: docker run -d -p 27017:27017 mongo"
        );
      }
    }

    return false;
  }
};

/**
 * Główna funkcja inicjalizująca aplikację
 */
const startServer = async () => {
  // Zwiększenie limitów Node.js dla nagłówków HTTP - MAKSYMALNE LIMITY
  process.env.NODE_OPTIONS = "--max-http-header-size=131072"; // 128KB zamiast domyślnych 8KB

  // Użyj portu z konfiguracji (bez automatycznego szukania wolnego portu)
  const finalPort = PORT;

  // Połączenie z bazą danych
  const dbConnected = await connectToDatabase();
  if (!dbConnected) {
    console.error("Nie można uruchomić serwera bez połączenia z bazą danych");
    process.exit(1);
  }

  // UŻYWAMY GOTOWEJ APLIKACJI Z app.js (z minimalnymi nagłówkami)
  // const app = configureApp(); // USUNIĘTE - używamy importowanego app

  // Utworzenie serwera HTTP z MAKSYMALNYMI limitami
  const server = http.createServer(
    {
      // MAKSYMALNY limit nagłówków HTTP - ROZWIĄZUJE BŁĄD 431
      maxHeaderSize: 131072, // 128KB (maksymalny możliwy limit)
      headersTimeout: 60000, // 60 sekund
      requestTimeout: 300000, // 5 minut
    },
    app
  );

  // Dodatkowa konfiguracja serwera
  server.maxHeadersCount = 0; // Bez limitu liczby nagłówków

  // Inicjalizacja Socket.IO
  socketService.initialize(server);

  // Inicjalizacja NotificationManager
  notificationManager.initialize();

  // Uruchomienie serwera
  server.listen(finalPort, () => {
    console.log(`
🚀 Serwer uruchomiony na porcie ${finalPort}
🔧 Środowisko: ${process.env.NODE_ENV || "development"}
🔌 Socket.IO: Aktywny
    `);

    // Opóźnione uruchomienie zadań cyklicznych
    setTimeout(() => {
      console.log("� Uruchamianie zadań cyklicznych...");
      initScheduledTasks();
    }, 5000); // Opóźnienie 5 sekund
  });
};

// Uruchomienie serwera
startServer();
