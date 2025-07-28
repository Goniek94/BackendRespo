#!/usr/bin/env node

/**
 * SECURE SECRETS GENERATOR
 * 
 * Generuje kryptograficznie bezpieczne sekrety dla aplikacji
 * - JWT secrets (access & refresh tokens)
 * - Session secrets
 * - Database encryption keys
 * - API keys i inne sekrety
 * 
 * UŻYCIE:
 * node scripts/generate-secrets.js
 * node scripts/generate-secrets.js --length 64
 * node scripts/generate-secrets.js --type jwt
 * node scripts/generate-secrets.js --env production
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Configuration for different types of secrets
 */
const SECRET_CONFIGS = {
  jwt: {
    length: 64,
    description: 'JWT Access Token Secret',
    charset: 'base64url'
  },
  refresh: {
    length: 64,
    description: 'JWT Refresh Token Secret',
    charset: 'base64url'
  },
  session: {
    length: 32,
    description: 'Session Secret',
    charset: 'alphanumeric'
  },
  database: {
    length: 32,
    description: 'Database Encryption Key',
    charset: 'base64'
  },
  api: {
    length: 48,
    description: 'API Key',
    charset: 'alphanumeric'
  },
  webhook: {
    length: 32,
    description: 'Webhook Secret',
    charset: 'hex'
  }
};

/**
 * Character sets for different secret types
 */
const CHARSETS = {
  alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  base64: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
  base64url: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',
  hex: '0123456789abcdef'
};

/**
 * Generate cryptographically secure random string
 */
const generateSecureSecret = (length = 32, charset = 'alphanumeric') => {
  const chars = CHARSETS[charset] || CHARSETS.alphanumeric;
  const charsLength = chars.length;
  let result = '';
  
  // Use crypto.randomBytes for cryptographic security
  const randomBytes = crypto.randomBytes(length * 2); // Extra bytes for better distribution
  
  for (let i = 0; i < length; i++) {
    // Use two bytes to get better distribution across character set
    const randomIndex = (randomBytes[i * 2] << 8 | randomBytes[i * 2 + 1]) % charsLength;
    result += chars[randomIndex];
  }
  
  return result;
};

/**
 * Generate base64 encoded secret (for binary keys)
 */
const generateBase64Secret = (byteLength = 32) => {
  return crypto.randomBytes(byteLength).toString('base64');
};

/**
 * Generate hex encoded secret
 */
const generateHexSecret = (byteLength = 32) => {
  return crypto.randomBytes(byteLength).toString('hex');
};

/**
 * Validate secret strength
 */
const validateSecretStrength = (secret, minLength = 32) => {
  const issues = [];
  
  if (secret.length < minLength) {
    issues.push(`Secret too short (${secret.length} chars, minimum ${minLength})`);
  }
  
  // Check for common patterns
  const commonPatterns = [
    /^(.)\1+$/, // All same character
    /^(..)\1+$/, // Repeating pairs
    /^(abc|123|qwe|asd)/i, // Common sequences
    /password|secret|key|admin/i // Common words
  ];
  
  commonPatterns.forEach((pattern, index) => {
    if (pattern.test(secret)) {
      issues.push(`Contains common pattern (pattern ${index + 1})`);
    }
  });
  
  // Check character diversity
  const uniqueChars = new Set(secret).size;
  const diversityRatio = uniqueChars / secret.length;
  
  if (diversityRatio < 0.5) {
    issues.push(`Low character diversity (${Math.round(diversityRatio * 100)}%)`);
  }
  
  return {
    isStrong: issues.length === 0,
    issues,
    strength: issues.length === 0 ? 'STRONG' : issues.length <= 2 ? 'MEDIUM' : 'WEAK'
  };
};

/**
 * Generate environment-specific secrets
 */
const generateEnvironmentSecrets = (environment = 'development') => {
  const secrets = {};
  
  // Base secrets for all environments
  secrets.JWT_SECRET = generateSecureSecret(64, 'base64url');
  secrets.JWT_REFRESH_SECRET = generateSecureSecret(64, 'base64url');
  secrets.SESSION_SECRET = generateSecureSecret(32, 'alphanumeric');
  
  // Environment-specific secrets
  if (environment === 'production') {
    // Production needs stronger, longer secrets
    secrets.JWT_SECRET = generateSecureSecret(128, 'base64url');
    secrets.JWT_REFRESH_SECRET = generateSecureSecret(128, 'base64url');
    secrets.SESSION_SECRET = generateSecureSecret(64, 'alphanumeric');
    secrets.DB_ENCRYPTION_KEY = generateBase64Secret(32);
    secrets.WEBHOOK_SECRET = generateHexSecret(32);
    secrets.API_SECRET = generateSecureSecret(64, 'alphanumeric');
  } else if (environment === 'staging') {
    // Staging uses production-like secrets but shorter
    secrets.DB_ENCRYPTION_KEY = generateBase64Secret(24);
    secrets.WEBHOOK_SECRET = generateHexSecret(24);
  }
  
  return secrets;
};

/**
 * Create .env file with generated secrets
 */
const createEnvFile = (secrets, environment = 'development') => {
  const envPath = `.env.${environment}`;
  const examplePath = '.env.example';
  
  let envContent = '';
  
  // Read .env.example if it exists
  if (fs.existsSync(examplePath)) {
    envContent = fs.readFileSync(examplePath, 'utf8');
    
    // Replace placeholder values with generated secrets
    Object.entries(secrets).forEach(([key, value]) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        // Add new secret if not found
        envContent += `\n${key}=${value}`;
      }
    });
  } else {
    // Create basic .env file
    envContent = `# Generated secrets for ${environment} environment\n`;
    envContent += `# Generated on: ${new Date().toISOString()}\n\n`;
    
    Object.entries(secrets).forEach(([key, value]) => {
      envContent += `${key}=${value}\n`;
    });
  }
  
  // Write to file
  fs.writeFileSync(envPath, envContent);
  console.log(`✅ Created ${envPath} with generated secrets`);
  
  return envPath;
};

/**
 * Display secrets with security information
 */
const displaySecrets = (secrets) => {
  console.log('\n🔐 Generated Secrets:');
  console.log('=' .repeat(80));
  
  Object.entries(secrets).forEach(([key, value]) => {
    const validation = validateSecretStrength(value);
    const strengthColor = validation.strength === 'STRONG' ? '\x1b[32m' : 
                         validation.strength === 'MEDIUM' ? '\x1b[33m' : '\x1b[31m';
    
    console.log(`\n${key}:`);
    console.log(`  Value: ${value}`);
    console.log(`  Length: ${value.length} characters`);
    console.log(`  Strength: ${strengthColor}${validation.strength}\x1b[0m`);
    
    if (validation.issues.length > 0) {
      console.log(`  Issues: ${validation.issues.join(', ')}`);
    }
  });
  
  console.log('\n' + '='.repeat(80));
};

/**
 * Main function
 */
const main = () => {
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  const options = {
    length: 32,
    type: 'all',
    environment: 'development',
    output: 'console',
    validate: false
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--length':
      case '-l':
        options.length = parseInt(args[++i]) || 32;
        break;
      case '--type':
      case '-t':
        options.type = args[++i] || 'all';
        break;
      case '--environment':
      case '--env':
      case '-e':
        options.environment = args[++i] || 'development';
        break;
      case '--output':
      case '-o':
        options.output = args[++i] || 'console';
        break;
      case '--validate':
      case '-v':
        options.validate = true;
        break;
      case '--help':
      case '-h':
        console.log(`
🔐 Secure Secrets Generator

USAGE:
  node scripts/generate-secrets.js [options]

OPTIONS:
  -l, --length <number>      Secret length (default: 32)
  -t, --type <type>          Secret type: jwt, refresh, session, database, api, webhook, all
  -e, --environment <env>    Environment: development, staging, production
  -o, --output <format>      Output format: console, file, both
  -v, --validate             Validate existing secrets
  -h, --help                 Show this help

EXAMPLES:
  node scripts/generate-secrets.js
  node scripts/generate-secrets.js --length 64 --type jwt
  node scripts/generate-secrets.js --environment production --output file
  node scripts/generate-secrets.js --validate

SECURITY NOTES:
  - All secrets are cryptographically secure
  - Production secrets are longer and stronger
  - Secrets are validated for common weaknesses
  - Never commit generated .env files to version control
        `);
        return;
    }
  }
  
  console.log('🔐 Marketplace Backend - Secure Secrets Generator');
  console.log(`Environment: ${options.environment.toUpperCase()}`);
  console.log(`Type: ${options.type.toUpperCase()}`);
  console.log('');
  
  let secrets = {};
  
  if (options.type === 'all') {
    // Generate all secrets for environment
    secrets = generateEnvironmentSecrets(options.environment);
  } else if (SECRET_CONFIGS[options.type]) {
    // Generate specific secret type
    const config = SECRET_CONFIGS[options.type];
    const secretValue = generateSecureSecret(
      options.length || config.length,
      config.charset
    );
    secrets[options.type.toUpperCase() + '_SECRET'] = secretValue;
  } else {
    // Generate custom secret
    secrets.CUSTOM_SECRET = generateSecureSecret(options.length);
  }
  
  // Display secrets
  if (options.output === 'console' || options.output === 'both') {
    displaySecrets(secrets);
  }
  
  // Create .env file
  if (options.output === 'file' || options.output === 'both') {
    createEnvFile(secrets, options.environment);
  }
  
  // Security warnings
  console.log('\n⚠️  SECURITY WARNINGS:');
  console.log('   • Store these secrets securely');
  console.log('   • Never commit .env files to version control');
  console.log('   • Use different secrets for each environment');
  console.log('   • Rotate secrets regularly in production');
  console.log('   • Use environment variables in production deployment');
  
  if (options.environment === 'production') {
    console.log('\n🚨 PRODUCTION SECURITY CHECKLIST:');
    console.log('   ✓ Use HTTPS only');
    console.log('   ✓ Set secure cookie flags');
    console.log('   ✓ Configure proper CORS origins');
    console.log('   ✓ Enable rate limiting');
    console.log('   ✓ Set up monitoring and alerts');
    console.log('   ✓ Regular security audits');
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

// Export functions for testing
export {
  generateSecureSecret,
  generateBase64Secret,
  generateHexSecret,
  validateSecretStrength,
  generateEnvironmentSecrets,
  createEnvFile,
  SECRET_CONFIGS,
  CHARSETS
};
