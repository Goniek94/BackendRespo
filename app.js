// app.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import fs from "fs";
import mongoSanitize from "express-mongo-sanitize";

import config from "./config/index.js";
import logger from "./utils/logger.js";
import setupRoutes from "./routes/index.js";

// narzędziowe middleware (Twoje)
import headerSizeMonitor from "./middleware/headerSizeMonitor.js";
import { cookieSizeMonitor } from "./middleware/cookieCleanup.js";
import { apiLimiter } from "./middleware/rateLimiting.js";

const isProd = process.env.NODE_ENV === "production";

const createApp = () => {
  const app = express();

  // Za reverse proxy (NGINX/ELB)
  app.set("trust proxy", 1);

  // --- Parsowanie body (SKIP dla route'ów z file upload!) ---
  app.use((req, res, next) => {
    const contentType = req.get("Content-Type") || "";
    const url = req.originalUrl || req.url;

    console.log("🔍 Request Content-Type:", contentType);
    console.log("🔍 Request URL:", url);
    console.log("🔍 Request Method:", req.method);

    // ZAWSZE pomijaj parsowanie dla multipart/form-data (file upload)
    if (contentType.includes("multipart/form-data")) {
      console.log("✅✅✅ POMIJAM PARSOWANIE - multipart/form-data detected!");
      return next();
    }

    // Dodatkowa ochrona: sprawdź URL dla endpointów z uploadem plików
    // Comment upload: POST /api/comments/:adId
    if (req.method === "POST" && url.match(/^\/api\/comments\/[^\/]+$/)) {
      console.log("✅ POMIJAM PARSOWANIE - comment upload endpoint");
      return next();
    }

    console.log("📝 Parsowanie JSON/urlencoded");
    // Parsuj tylko gdy NIE jest multipart
    express.json({
      limit: "50mb", // Increased limit for large payloads (e.g., base64 images)
      strict: true,
      type: "application/json", // Parsuj TYLKO JSON
    })(req, res, () => {
      express.urlencoded({
        limit: "50mb", // Increased limit for large payloads
        extended: true,
        parameterLimit: 100,
        type: "application/x-www-form-urlencoded", // Parsuj TYLKO urlencoded
      })(req, res, next);
    });
  });

  // --- Sanitizacja NoSQL operators ($, .) w body/query/params ---
  app.use(
    mongoSanitize({
      allowDots: false,
      replaceWith: "_",
    })
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
      preflightContinue: false,
      optionsSuccessStatus: 204,
    })
  );
  // gwarantujemy Vary: Origin
  app.use((_req, res, next) => {
    res.append("Vary", "Origin");
    next();
  });
  // szybki preflight
  app.options("*", (_req, res) => res.sendStatus(204));

  // --- Globalny rate limiting dla wszystkich tras API ---
  app.use("/api", apiLimiter);
  app.use("/api/v1", apiLimiter);

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

  // --- Global Error Handler ---
  app.use((err, req, res, next) => {
    // Log the error
    logger.error("Unhandled error", {
      msg: err?.message,
      stack: err?.stack,
      url: req.originalUrl,
      ip: req.ip,
      method: req.method,
    });

    // If headers were already sent, delegate to Express default error handler
    if (res.headersSent) {
      return next(err);
    }

    // Send error response
    const status = err.status || err.statusCode || 500;
    const message =
      isProd && status === 500 ? "Internal Server Error" : err.message;

    res.status(status).json({
      success: false,
      error: message,
      ...(isProd ? {} : { stack: err.stack }),
    });
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
