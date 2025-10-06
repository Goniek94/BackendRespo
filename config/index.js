// src/config/index.js
import dotenv from "dotenv";
dotenv.config();

import { randomBytes } from "node:crypto";

import developmentConfig from "./environments/development-minimal.js";
import stagingConfig from "./environments/staging.js";
import productionConfig from "./environments/production.js";

// --- Helpers ---------------------------------------------------------------

const validEnvironments = ["development", "staging", "production"];

const getCurrentEnvironment = () => {
  const env = (process.env.NODE_ENV || "").toLowerCase().trim();
  if (!validEnvironments.includes(env)) {
    console.warn("⚠️  NODE_ENV not set/invalid, defaulting to 'development'");
    return "development";
  }
  return env;
};

const loadEnvironmentConfig = (environment) => {
  switch (environment) {
    case "production":
      console.log("🚀 Loading PRODUCTION configuration");
      return productionConfig;
    case "staging":
      console.log("🧪 Loading STAGING configuration");
      return stagingConfig;
    case "development":
    default:
      console.log("🛠️  Loading DEVELOPMENT configuration");
      return developmentConfig;
  }
};

const parseOrigins = (v) => {
  if (!v) return undefined;
  const trimmed = v.trim();
  if (trimmed === "*") return "*";
  return trimmed
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

// --- Validation ------------------------------------------------------------

const validateEnvironmentVariables = (cfg) => {
  const errors = [];
  const warnings = [];

  const must = ["JWT_SECRET", "MONGODB_URI"];
  if (cfg.isProduction || cfg.isStaging) {
    must.push("JWT_REFRESH_SECRET", "COOKIE_DOMAIN", "ALLOWED_ORIGINS");
  }

  for (const name of must) {
    if (!process.env[name]) errors.push(`Missing critical ENV: ${name}`);
  }

  // Strength & defaults
  if ((cfg.isProduction || cfg.isStaging) && process.env.JWT_SECRET) {
    if (process.env.JWT_SECRET.length < 32) {
      errors.push("JWT_SECRET must be at least 32 characters in prod/staging");
    }
    const dangerousDefaults = [
      "your-secret-key",
      "default-secret",
      "change-me",
      "secret",
      "123456",
    ];
    const js = process.env.JWT_SECRET;
    if (dangerousDefaults.includes(js.toLowerCase?.())) {
      errors.push("JWT_SECRET appears to be a default value");
    }
  }

  if (
    (cfg.isProduction || cfg.isStaging) &&
    !process.env.FORCE_HTTPS &&
    !process.env.HTTPS_ENABLED
  ) {
    warnings.push("HTTPS not explicitly enabled (FORCE_HTTPS/HTTPS_ENABLED)");
  }

  if (errors.length) {
    console.error("❌ Environment validation FAILED:");
    for (const e of errors) console.error("   •", e);
    if (cfg.isProduction || cfg.isStaging) {
      console.error("🚨 Cannot start without required ENV in prod/staging");
      process.exit(1);
    } else {
      console.warn("⚠️  Continuing (non-production/staging env)");
    }
  }

  if (warnings.length) {
    console.warn("⚠️  Environment warnings:");
    for (const w of warnings) console.warn("   •", w);
  }

  if (!errors.length && !warnings.length) {
    console.log("✅ Environment validation passed");
  }

  return { errors, warnings };
};

// --- Runtime overrides -----------------------------------------------------

const ensure = (obj, path, initVal) => {
  // ensures nested path exists (mutates obj)
  const keys = path.split(".");
  let cur = obj;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (cur[k] == null) cur[k] = i === keys.length - 1 ? initVal ?? {} : {};
    cur = cur[k];
  }
  return cur;
};

const generateRuntimeConfig = (baseConfig) => {
  const rc = { ...baseConfig };

  if (process.env.PORT) {
    ensure(rc, "server");
    rc.server.port = parseInt(process.env.PORT, 10);
  }

  if (process.env.MONGODB_URI) {
    ensure(rc, "database");
    rc.database.uri = process.env.MONGODB_URI;
  }

  if (process.env.REDIS_URL) {
    ensure(rc, "cache.redis");
    rc.cache.redis.url = process.env.REDIS_URL;
  }

  if (process.env.JWT_SECRET) {
    ensure(rc, "security.jwt");
    rc.security.jwt.secret = process.env.JWT_SECRET;
  }
  if (process.env.JWT_REFRESH_SECRET) {
    ensure(rc, "security.jwt");
    rc.security.jwt.refreshSecret = process.env.JWT_REFRESH_SECRET;
  }

  if (process.env.COOKIE_DOMAIN) {
    ensure(rc, "security.cookies");
    rc.security.cookies.domain = process.env.COOKIE_DOMAIN;
  }

  if (process.env.ALLOWED_ORIGINS) {
    ensure(rc, "security.cors");
    rc.security.cors.origin = parseOrigins(process.env.ALLOWED_ORIGINS);
  }

  if (process.env.LOG_LEVEL) {
    ensure(rc, "logging");
    rc.logging.level = String(process.env.LOG_LEVEL).toLowerCase();
  }

  return rc;
};

// --- Computed config -------------------------------------------------------

const addComputedProperties = (cfg) => {
  const computed = {
    ...cfg,
    server: {
      host: process.env.HOST || "0.0.0.0",
      port: process.env.PORT || 5000,
      ...cfg.server,
    },
    email: {
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_PORT || "587", 10),
      secure: process.env.EMAIL_SECURE === "true",
      user: process.env.EMAIL_USER || "",
      password: process.env.EMAIL_PASSWORD || "",
      from: process.env.EMAIL_FROM || "noreply@autosell.pl",
      ...cfg.email,
    },
    app: {
      name: "AutoSell",
      frontendUrl:
        process.env.FRONTEND_URL ||
        (cfg.isProduction ? "https://autosell.pl" : "http://localhost:3000"),
      ...cfg.app,
    },
    security: {
      ...cfg.security,
      jwt: {
        ...cfg.security?.jwt,
        secret:
          process.env.JWT_SECRET ||
          (() => {
            if (cfg.isProduction || cfg.isStaging) {
              console.error("🚨 JWT_SECRET not set (prod/staging)");
              process.exit(1);
            }
            return randomBytes(64).toString("hex"); // dev-only
          })(),
        refreshSecret:
          process.env.JWT_REFRESH_SECRET ||
          (() => {
            if (cfg.isProduction || cfg.isStaging) {
              console.error("🚨 JWT_REFRESH_SECRET not set (prod/staging)");
              process.exit(1);
            }
            return randomBytes(64).toString("hex"); // dev-only
          })(),
      },
      cookies: {
        ...cfg.security?.cookies,
        domain: process.env.COOKIE_DOMAIN || cfg.security?.cookies?.domain,
        secure: cfg.isProduction ? true : process.env.DEV_HTTPS === "1",
      },
      cors: {
        ...cfg.security?.cors,
        origin:
          parseOrigins(process.env.ALLOWED_ORIGINS) ??
          cfg.security?.cors?.origin,
      },
      rateLimiting: {
        enabled: cfg.security?.rateLimiting?.enabled ?? true,
        ...cfg.security?.rateLimiting,
      },
    },
    database: {
      uri: process.env.MONGODB_URI || "mongodb://localhost:27017/marketplace",
      ...cfg.database,
    },
    logging: {
      level: (cfg.logging?.level || "info").toLowerCase(),
      ...cfg.logging,
    },
    paths: {
      root: process.cwd(),
      logs: process.env.LOG_DIR || "logs",
      uploads: process.env.UPLOAD_DIR || "uploads",
      temp: process.env.TEMP_DIR || "temp",
      ...cfg.paths,
    },
    runtime: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      startTime: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      ...cfg.runtime,
    },
  };

  return computed;
};

// --- Bootstrap -------------------------------------------------------------

const initializeConfiguration = () => {
  console.log("🔧 Initializing application configuration...");
  const environment = getCurrentEnvironment();
  const baseConfig = loadEnvironmentConfig(environment);
  const runtimeConfig = generateRuntimeConfig(baseConfig);
  const finalConfig = addComputedProperties(runtimeConfig);

  const validation = validateEnvironmentVariables(finalConfig);

  console.log("📋 Configuration loaded:");
  console.log(`   Environment: ${finalConfig.environment}`);
  console.log(
    `   Security Level: ${
      finalConfig.isProduction
        ? "MAXIMUM"
        : finalConfig.isStaging
        ? "MEDIUM"
        : "DEVELOPMENT"
    }`
  );
  const rlEnabled = finalConfig.security?.rateLimiting?.enabled
    ? "ENABLED"
    : "DISABLED";
  console.log(`   Rate Limiting: ${rlEnabled}`);
  console.log(
    `   Logging Level: ${(finalConfig.logging.level || "info").toUpperCase()}`
  );
  const safeDb = String(finalConfig.database.uri || "").replace(
    /\/\/.*@/,
    "//***:***@"
  );
  console.log(`   Database: ${safeDb}`);

  if (finalConfig.isProduction) {
    console.log("🔒 Production mode: Maximum security measures active");
  } else if (finalConfig.isStaging) {
    console.log("🧪 Staging mode: Production-like testing");
  } else {
    console.log("🛠️  Development mode: Dev-friendly settings");
  }

  return finalConfig;
};

const config = initializeConfiguration();
export default config;

export const {
  environment,
  isDevelopment,
  isProduction,
  isStaging,
  security,
  logging,
  database,
  server,
  paths,
  runtime,
} = config;

export const isEnvironment = (env) => config.environment === env;
export const getConfig = (path) =>
  path.split(".").reduce((obj, k) => obj?.[k], config);

export const validateConfig = () => validateEnvironmentVariables(config);

// For testing
export const __testing__ = {
  getCurrentEnvironment,
  loadEnvironmentConfig,
  validateEnvironmentVariables,
  generateRuntimeConfig,
  addComputedProperties,
};
