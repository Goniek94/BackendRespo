// app.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import fs from "fs";

import config from "./config/index.js";
import logger from "./utils/logger.js";
import setupRoutes from "./routes/index.js";

// narzędziowe middleware (Twoje)
import headerSizeMonitor from "./middleware/headerSizeMonitor.js";
import { cookieSizeMonitor } from "./middleware/cookieCleanup.js";

const isProd = process.env.NODE_ENV === "production";

const createApp = () => {
  const app = express();

  // Za reverse proxy (NGINX/ELB)
  app.set("trust proxy", 1);

  // --- Parsowanie body ---
  app.use(express.json({ limit: "1mb", strict: true }));
  app.use(
    express.urlencoded({ limit: "1mb", extended: true, parameterLimit: 100 })
  );

  // --- Monitoring nagłówków ---
  app.use(headerSizeMonitor);

  // --- Kompresja / cookies ---
  app.use(compression());
  app.use(cookieParser());

  // --- Monitor rozmiaru cookies (DEV: nagłówki X-Cookie-*) ---
  app.use(cookieSizeMonitor);

  // --- CORS z configu ---
  app.use(
    cors({
      origin: config.security?.cors?.origin ?? false,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Accept",
        "Cache-Control",
        "X-CSRF-Token",
      ],
      exposedHeaders: ["X-Total-Count"],
      maxAge: 86400,
    })
  );
  // gwarantujemy Vary: Origin
  app.use((req, res, next) => {
    res.append("Vary", "Origin");
    next();
  });
  // szybki preflight
  app.options("*", (_req, res) => res.sendStatus(204));

  // --- Helmet (v7) ---
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: isProd
            ? ["'self'", "https://fonts.googleapis.com"]
            : ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "blob:", "https:"],
          connectSrc: [
            "'self'",
            "ws:",
            "wss:",
            ...(Array.isArray(config.security?.cors?.origin)
              ? config.security.cors.origin
              : config.security?.cors?.origin
              ? [config.security.cors.origin]
              : []),
            ...(process.env.SUPABASE_URL ? [process.env.SUPABASE_URL] : []),
          ],
          objectSrc: ["'none'"],
          frameSrc: ["'none'"],
          mediaSrc: ["'self'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: isProd
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
      frameguard: { action: "deny" },
      noSniff: true,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    })
  );

  // ⚠️ Brak globalnego rate-limitera typu: app.use("/api", apiLimiter)
  // Limitery są zakładane granularnie w routes/index.js oraz admin/routes/index.js.

  // --- Statyki /uploads ---
  configureUploads(app);

  // --- DEV/STAGING maintenance (nie włączaj na prod) ---
  if (!isProd) {
    import("./routes/dev-maintenance.routes.js")
      .then((mod) => app.use("/_dev", mod.default))
      .catch((err) =>
        logger.warn("Dev maintenance routes not loaded", { err: err.message })
      );
  }

  // --- Rejestracja tras ---
  setupRoutes(app);

  // --- Root ---
  app.get("/", (_req, res) => res.json({ status: "ok" }));

  // --- 404 ---
  app.use((_req, res) => res.status(404).json({ error: "Not found" }));

  // --- Error handler ---
  app.use((err, req, res, _next) => {
    logger.error("Unhandled error", {
      msg: err?.message,
      stack: err?.stack,
      url: req.originalUrl,
      ip: req.ip,
      method: req.method,
    });
    res.status(500).json({ error: "Server error" });
  });

  return app;
};

function configureUploads(app) {
  const uploadsPath = "./uploads";
  try {
    if (!fs.existsSync(uploadsPath)) {
      fs.mkdirSync(uploadsPath, { recursive: true });
    }
  } catch (e) {
    logger.warn("Upload dir create error", { msg: e.message });
  }

  app.use(
    "/uploads",
    express.static(uploadsPath, {
      maxAge: isProd ? "7d" : "0",
      immutable: isProd,
      setHeaders: (res) => {
        if (isProd) {
          res.setHeader("Cache-Control", "public, max-age=604800, immutable");
        }
      },
    })
  );
}

const app = createApp();
export default app;
