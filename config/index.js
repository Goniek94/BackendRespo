/**
 * MAIN CONFIGURATION LOADER
 * 
 * Automatycznie ładuje odpowiednią konfigurację środowiska na podstawie NODE_ENV
 * - Waliduje zmienne środowiskowe
 * - Zapewnia fallback do development
 * - Eksportuje zunifikowaną konfigurację
 * - Loguje informacje o załadowanym środowisku
 * 
 * UŻYCIE:
 * import config from '../config/index.js';
 * console.log(config.environment); // 'development', 'staging', 'production'
 */

// Załadowanie zmiennych środowiskowych - MUSI BYĆ NA SAMEJ GÓRZE
import dotenv from 'dotenv';
dotenv.config();

import developmentConfig from './environments/development-minimal.js';
import stagingConfig from './environments/staging.js';
import productionConfig from './environments/production.js';

/**
 * Determine current environment
 * Priority: NODE_ENV -> fallback to 'development'
 */
const getCurrentEnvironment = () => {
  const env = process.env.NODE_ENV?.toLowerCase().trim();
  
  // Validate environment value
  const validEnvironments = ['development', 'staging', 'production'];
  
  if (!env) {
    console.warn('⚠️  NODE_ENV not set, defaulting to development');
    return 'development';
  }
  
  if (!validEnvironments.includes(env)) {
    console.warn(`⚠️  Invalid NODE_ENV: "${env}", defaulting to development`);
    return 'development';
  }
  
  return env;
};

/**
 * Load environment-specific configuration
 */
const loadEnvironmentConfig = (environment) => {
  switch (environment) {
    case 'production':
      console.log('🚀 Loading PRODUCTION configuration - Maximum security enabled');
      return productionConfig;
      
    case 'staging':
      console.log('🧪 Loading STAGING configuration - Testing environment');
      return stagingConfig;
      
    case 'development':
    default:
      console.log('🛠️  Loading DEVELOPMENT configuration - Developer-friendly settings');
      return developmentConfig;
  }
};

/**
 * Validate critical environment variables
 */
const validateEnvironmentVariables = (config) => {
  const errors = [];
  const warnings = [];
  
  // Critical variables that must be set
  const criticalVars = [
    'JWT_SECRET',
    'MONGODB_URI'
  ];
  
  // Production-specific critical variables
  if (config.isProduction) {
    criticalVars.push(
      'JWT_REFRESH_SECRET',
      'COOKIE_DOMAIN',
      'ALLOWED_ORIGINS'
    );
  }
  
  // Check critical variables
  criticalVars.forEach(varName => {
    if (!process.env[varName]) {
      errors.push(`Missing critical environment variable: ${varName}`);
    }
  });
  
  // Recommended variables
  const recommendedVars = [
    'PORT',
    'SESSION_SECRET'
  ];
  
  recommendedVars.forEach(varName => {
    if (!process.env[varName]) {
      warnings.push(`Recommended environment variable not set: ${varName}`);
    }
  });
  
  // Production-specific security checks
  if (config.isProduction) {
    // Check JWT secret strength
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters long in production');
    }
    
    // Check if using default secrets (security risk)
    const dangerousDefaults = [
      'your-secret-key',
      'default-secret',
      'change-me',
      'secret',
      '123456'
    ];
    
    if (process.env.JWT_SECRET && dangerousDefaults.includes(process.env.JWT_SECRET.toLowerCase())) {
      errors.push('JWT_SECRET appears to be a default value - this is a security risk!');
    }
    
    // Check HTTPS requirement
    if (!process.env.FORCE_HTTPS && !process.env.HTTPS_ENABLED) {
      warnings.push('HTTPS not explicitly enabled in production environment');
    }
  }
  
  // Log validation results
  if (errors.length > 0) {
    console.error('❌ Environment validation FAILED:');
    errors.forEach(error => console.error(`   • ${error}`));
    
    if (config.isProduction) {
      console.error('🚨 CRITICAL: Cannot start in production with missing variables!');
      process.exit(1);
    } else {
      console.warn('⚠️  Continuing with missing variables (non-production environment)');
    }
  }
  
  if (warnings.length > 0) {
    console.warn('⚠️  Environment validation warnings:');
    warnings.forEach(warning => console.warn(`   • ${warning}`));
  }
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ Environment validation passed');
  }
  
  return { errors, warnings };
};

/**
 * Generate runtime configuration with environment variable overrides
 */
const generateRuntimeConfig = (baseConfig) => {
  const runtimeConfig = { ...baseConfig };
  
  // Override with environment variables where applicable
  if (process.env.PORT) {
    runtimeConfig.server = runtimeConfig.server || {};
    runtimeConfig.server.port = parseInt(process.env.PORT, 10);
  }
  
  if (process.env.MONGODB_URI) {
    runtimeConfig.database = runtimeConfig.database || {};
    runtimeConfig.database.uri = process.env.MONGODB_URI;
  }
  
  if (process.env.REDIS_URL && runtimeConfig.cache?.redis) {
    runtimeConfig.cache.redis.url = process.env.REDIS_URL;
  }
  
  // Security overrides
  if (process.env.JWT_SECRET) {
    runtimeConfig.security = runtimeConfig.security || {};
    runtimeConfig.security.jwt = runtimeConfig.security.jwt || {};
    runtimeConfig.security.jwt.secret = process.env.JWT_SECRET;
  }
  
  if (process.env.JWT_REFRESH_SECRET) {
    runtimeConfig.security.jwt.refreshSecret = process.env.JWT_REFRESH_SECRET;
  }
  
  if (process.env.COOKIE_DOMAIN) {
    runtimeConfig.security.cookies.domain = process.env.COOKIE_DOMAIN;
  }
  
  if (process.env.ALLOWED_ORIGINS) {
    runtimeConfig.security.cors.origin = process.env.ALLOWED_ORIGINS.split(',');
  }
  
  // Logging overrides
  if (process.env.LOG_LEVEL) {
    runtimeConfig.logging.level = process.env.LOG_LEVEL.toLowerCase();
  }
  
  return runtimeConfig;
};

/**
 * Add computed properties to configuration
 */
const addComputedProperties = (config) => {
  return {
    ...config,
    
    // Server configuration
    server: {
      port: process.env.PORT || 5000,
      host: process.env.HOST || '0.0.0.0',
      ...config.server
    },
    
    // Computed security properties
    security: {
      ...config.security,
      
      // JWT secrets with fallbacks
      jwt: {
        ...config.security.jwt,
        secret: process.env.JWT_SECRET || 'your-jwt-secret-change-in-production',
        refreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'your-refresh-secret-change-in-production'
      },
      
      // Cookie configuration with environment overrides
      cookies: {
        ...config.security.cookies,
        domain: process.env.COOKIE_DOMAIN || config.security.cookies.domain,
        // NAPRAWIONE: W development ZAWSZE secure: false (HTTP localhost)
        secure: config.isProduction ? true : false
      },
      
      // CORS with environment overrides
      cors: {
        ...config.security.cors,
        origin: process.env.ALLOWED_ORIGINS ? 
          process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()) : 
          config.security.cors.origin
      }
    },
    
    // Database configuration
    database: {
      ...config.database,
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/marketplace'
    },
    
    // Computed paths
    paths: {
      root: process.cwd(),
      logs: process.env.LOG_DIR || 'logs',
      uploads: process.env.UPLOAD_DIR || 'uploads',
      temp: process.env.TEMP_DIR || 'temp'
    },
    
    // Runtime information
    runtime: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      startTime: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  };
};

/**
 * Main configuration loading and initialization
 */
const initializeConfiguration = () => {
  console.log('🔧 Initializing application configuration...');
  
  // Step 1: Determine environment
  const environment = getCurrentEnvironment();
  
  // Step 2: Load base configuration
  const baseConfig = loadEnvironmentConfig(environment);
  
  // Step 3: Generate runtime configuration
  const runtimeConfig = generateRuntimeConfig(baseConfig);
  
  // Step 4: Add computed properties
  const finalConfig = addComputedProperties(runtimeConfig);
  
  // Step 5: Validate environment variables
  const validation = validateEnvironmentVariables(finalConfig);
  
  // Step 6: Log configuration summary
  console.log(`📋 Configuration loaded successfully:`);
  console.log(`   Environment: ${finalConfig.environment}`);
  console.log(`   Security Level: ${finalConfig.isProduction ? 'MAXIMUM' : finalConfig.isStaging ? 'MEDIUM' : 'DEVELOPMENT'}`);
  console.log(`   Rate Limiting: ${finalConfig.security.rateLimiting.enabled ? 'ENABLED' : 'DISABLED'}`);
  console.log(`   Logging Level: ${finalConfig.logging.level.toUpperCase()}`);
  console.log(`   Database: ${finalConfig.database.uri.replace(/\/\/.*@/, '//***:***@')}`); // Hide credentials
  
  if (finalConfig.isProduction) {
    console.log('🔒 Production mode: Maximum security measures active');
  } else if (finalConfig.isStaging) {
    console.log('🧪 Staging mode: Testing production-like environment');
  } else {
    console.log('🛠️  Development mode: Developer-friendly settings active');
  }
  
  return finalConfig;
};

// Initialize and export configuration
const config = initializeConfiguration();

export default config;

// Named exports for convenience
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
  runtime
} = config;

// Utility functions
export const isEnvironment = (env) => config.environment === env;
export const getConfig = (path) => {
  return path.split('.').reduce((obj, key) => obj?.[key], config);
};

// Configuration validation function for runtime checks
export const validateConfig = () => {
  return validateEnvironmentVariables(config);
};

// Export configuration for testing
export const __testing__ = {
  getCurrentEnvironment,
  loadEnvironmentConfig,
  validateEnvironmentVariables,
  generateRuntimeConfig,
  addComputedProperties
};
