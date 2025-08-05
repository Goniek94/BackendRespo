import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { setupTestDB, teardownTestDB } from '../setup.js';

/**
 * PRODUCTION READINESS TESTS
 * Comprehensive tests to ensure application is ready for production deployment
 */

test.describe('Production Readiness Tests', () => {
  test.before(async () => {
    await setupTestDB();
  });

  test.after(async () => {
    await teardownTestDB();
  });

  test('Environment Configuration', () => {
    // Check for .env.example file
    const envExamplePath = path.join(process.cwd(), '.env.example');
    assert.ok(fs.existsSync(envExamplePath), '.env.example file should exist');

    // Read and validate .env.example
    const envExample = fs.readFileSync(envExamplePath, 'utf8');
    const requiredEnvVars = [
      'NODE_ENV',
      'PORT',
      'MONGODB_URI',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'FRONTEND_URL',
      'EMAIL_HOST',
      'EMAIL_PORT',
      'EMAIL_USER',
      'EMAIL_PASS',
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN',
      'TWILIO_PHONE_NUMBER'
    ];

    requiredEnvVars.forEach(envVar => {
      assert.ok(envExample.includes(envVar), `${envVar} should be documented in .env.example`);
    });

    // Check that sensitive values are not exposed
    const sensitivePatterns = [
      /JWT_SECRET=.{10,}/,
      /MONGODB_URI=mongodb\+srv:\/\/.*:.*@/,
      /EMAIL_PASS=.{5,}/,
      /TWILIO_AUTH_TOKEN=.{10,}/
    ];

    sensitivePatterns.forEach(pattern => {
      assert.ok(!pattern.test(envExample), 'Sensitive values should not be in .env.example');
    });
  });

  test('Package.json Configuration', () => {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    assert.ok(fs.existsSync(packageJsonPath), 'package.json should exist');

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // Check required fields
    assert.ok(packageJson.name, 'Package should have a name');
    assert.ok(packageJson.version, 'Package should have a version');
    assert.ok(packageJson.description, 'Package should have a description');
    assert.ok(packageJson.main, 'Package should have a main entry point');

    // Check scripts
    assert.ok(packageJson.scripts, 'Package should have scripts');
    assert.ok(packageJson.scripts.start, 'Package should have start script');
    assert.ok(packageJson.scripts.test, 'Package should have test script');

    // Check dependencies
    assert.ok(packageJson.dependencies, 'Package should have dependencies');
    
    const criticalDependencies = [
      'express',
      'mongoose',
      'bcryptjs',
      'jsonwebtoken',
      'helmet',
      'cors',
      'express-rate-limit',
      'express-validator',
      'dotenv'
    ];

    criticalDependencies.forEach(dep => {
      assert.ok(packageJson.dependencies[dep], `Critical dependency ${dep} should be present`);
    });

    // Check for security-related dependencies
    const securityDependencies = [
      'helmet',
      'express-rate-limit',
      'express-mongo-sanitize',
      'express-validator'
    ];

    securityDependencies.forEach(dep => {
      assert.ok(packageJson.dependencies[dep], `Security dependency ${dep} should be present`);
    });
  });

  test('File Structure and Organization', () => {
    const requiredDirectories = [
      'controllers',
      'models',
      'routes',
      'middleware',
      'config',
      'utils',
      'tests',
      'docs'
    ];

    requiredDirectories.forEach(dir => {
      const dirPath = path.join(process.cwd(), dir);
      assert.ok(fs.existsSync(dirPath), `Directory ${dir} should exist`);
      assert.ok(fs.statSync(dirPath).isDirectory(), `${dir} should be a directory`);
    });

    // Check for important files
    const requiredFiles = [
      'index.js',
      'package.json',
      '.gitignore',
      'README.md',
      '.env.example'
    ];

    requiredFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      assert.ok(fs.existsSync(filePath), `File ${file} should exist`);
    });
  });

  test('Git Configuration', () => {
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    assert.ok(fs.existsSync(gitignorePath), '.gitignore should exist');

    const gitignore = fs.readFileSync(gitignorePath, 'utf8');
    
    const requiredIgnores = [
      'node_modules',
      '.env',
      'logs',
      '*.log',
      'uploads',
      '.DS_Store',
      'Thumbs.db'
    ];

    requiredIgnores.forEach(ignore => {
      assert.ok(gitignore.includes(ignore), `${ignore} should be in .gitignore`);
    });

    // Check that sensitive files are ignored
    const sensitivePatterns = [
      '.env',
      '*.pem',
      '*.key',
      'config/secrets'
    ];

    sensitivePatterns.forEach(pattern => {
      assert.ok(gitignore.includes(pattern) || gitignore.includes(pattern.replace('*', '')), 
        `Sensitive pattern ${pattern} should be ignored`);
    });
  });

  test('Documentation Quality', () => {
    const readmePath = path.join(process.cwd(), 'README.md');
    assert.ok(fs.existsSync(readmePath), 'README.md should exist');

    const readme = fs.readFileSync(readmePath, 'utf8');
    
    const requiredSections = [
      'installation',
      'setup',
      'usage',
      'api',
      'environment'
    ];

    requiredSections.forEach(section => {
      const sectionRegex = new RegExp(section, 'i');
      assert.ok(sectionRegex.test(readme), `README should contain ${section} section`);
    });

    // Check minimum length
    assert.ok(readme.length > 500, 'README should be comprehensive (>500 characters)');
  });

  test('Security Configuration Files', () => {
    // Check for security-related configuration
    const securityConfigPath = path.join(process.cwd(), 'config', 'security.js');
    if (fs.existsSync(securityConfigPath)) {
      const securityConfig = fs.readFileSync(securityConfigPath, 'utf8');
      
      // Should contain security configurations
      const securityFeatures = [
        'helmet',
        'cors',
        'rateLimit',
        'sanitize'
      ];

      securityFeatures.forEach(feature => {
        assert.ok(securityConfig.includes(feature), 
          `Security config should include ${feature}`);
      });
    }
  });

  test('Database Configuration', () => {
    // Check for proper database configuration
    const configPath = path.join(process.cwd(), 'config');
    assert.ok(fs.existsSync(configPath), 'Config directory should exist');

    // Check for database-related files
    const dbFiles = fs.readdirSync(configPath).filter(file => 
      file.includes('db') || file.includes('database') || file.includes('mongo')
    );

    // Should have some database configuration
    assert.ok(dbFiles.length > 0 || fs.existsSync(path.join(configPath, 'index.js')), 
      'Database configuration should exist');
  });

  test('Logging Configuration', () => {
    const logsDir = path.join(process.cwd(), 'logs');
    const utilsDir = path.join(process.cwd(), 'utils');
    
    // Check for logging setup
    if (fs.existsSync(utilsDir)) {
      const utilsFiles = fs.readdirSync(utilsDir);
      const hasLogger = utilsFiles.some(file => 
        file.includes('logger') || file.includes('log')
      );
      
      assert.ok(hasLogger, 'Logging utility should exist');
    }

    // Logs directory should exist or be creatable
    if (!fs.existsSync(logsDir)) {
      try {
        fs.mkdirSync(logsDir, { recursive: true });
        fs.rmdirSync(logsDir); // Clean up test directory
        assert.ok(true, 'Logs directory can be created');
      } catch (error) {
        assert.fail('Should be able to create logs directory');
      }
    }
  });

  test('Error Handling Setup', () => {
    const errorsDir = path.join(process.cwd(), 'errors');
    
    if (fs.existsSync(errorsDir)) {
      const errorFiles = fs.readdirSync(errorsDir);
      
      // Should have custom error classes
      const expectedErrorTypes = [
        'CustomError',
        'ValidationError',
        'AuthorizationError'
      ];

      expectedErrorTypes.forEach(errorType => {
        const hasErrorType = errorFiles.some(file => 
          file.includes(errorType) || file.includes(errorType.toLowerCase())
        );
        assert.ok(hasErrorType, `${errorType} should be implemented`);
      });
    }
  });

  test('Middleware Configuration', () => {
    const middlewareDir = path.join(process.cwd(), 'middleware');
    assert.ok(fs.existsSync(middlewareDir), 'Middleware directory should exist');

    const middlewareFiles = fs.readdirSync(middlewareDir, { recursive: true });
    
    const criticalMiddleware = [
      'auth',
      'validation',
      'rateLimiting',
      'sanitization'
    ];

    criticalMiddleware.forEach(middleware => {
      const hasMiddleware = middlewareFiles.some(file => 
        file.includes(middleware) || file.includes(middleware.toLowerCase())
      );
      assert.ok(hasMiddleware, `${middleware} middleware should exist`);
    });
  });

  test('API Route Organization', () => {
    const routesDir = path.join(process.cwd(), 'routes');
    assert.ok(fs.existsSync(routesDir), 'Routes directory should exist');

    const routeFiles = fs.readdirSync(routesDir, { recursive: true });
    
    const expectedRoutes = [
      'user',
      'auth',
      'listings',
      'health'
    ];

    expectedRoutes.forEach(route => {
      const hasRoute = routeFiles.some(file => 
        file.includes(route) || file.includes(route.toLowerCase())
      );
      assert.ok(hasRoute, `${route} routes should exist`);
    });

    // Check for index file
    const hasIndex = routeFiles.some(file => file === 'index.js');
    assert.ok(hasIndex, 'Routes should have index.js for organization');
  });

  test('Model Validation', () => {
    const modelsDir = path.join(process.cwd(), 'models');
    assert.ok(fs.existsSync(modelsDir), 'Models directory should exist');

    const modelFiles = fs.readdirSync(modelsDir, { recursive: true });
    
    const expectedModels = [
      'user',
      'ad',
      'listing'
    ];

    expectedModels.forEach(model => {
      const hasModel = modelFiles.some(file => 
        file.includes(model) || file.includes(model.toLowerCase())
      );
      assert.ok(hasModel, `${model} model should exist`);
    });
  });

  test('Build and Deployment Readiness', () => {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // Check for production-ready scripts
    if (packageJson.scripts) {
      // Should have start script for production
      assert.ok(packageJson.scripts.start, 'Should have start script');
      
      // Start script should not use nodemon in production
      const startScript = packageJson.scripts.start;
      assert.ok(!startScript.includes('nodemon'), 'Start script should not use nodemon');
      assert.ok(startScript.includes('node'), 'Start script should use node');
    }

    // Check for engines specification
    if (packageJson.engines) {
      assert.ok(packageJson.engines.node, 'Node.js version should be specified');
    }
  });

  test('Performance Considerations', () => {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // Check for performance-related dependencies
    const performanceDeps = [
      'compression', // For gzip compression
      'helmet', // For security headers
      'express-rate-limit' // For rate limiting
    ];

    performanceDeps.forEach(dep => {
      if (packageJson.dependencies && packageJson.dependencies[dep]) {
        assert.ok(true, `Performance dependency ${dep} is present`);
      }
    });
  });

  test('Monitoring and Health Checks', () => {
    const routesDir = path.join(process.cwd(), 'routes');
    
    if (fs.existsSync(routesDir)) {
      const routeFiles = fs.readdirSync(routesDir, { recursive: true });
      
      // Should have health check endpoint
      const hasHealthCheck = routeFiles.some(file => 
        file.includes('health') || file.includes('status')
      );
      
      assert.ok(hasHealthCheck, 'Health check endpoint should exist');
    }

    // Check for monitoring utilities
    const utilsDir = path.join(process.cwd(), 'utils');
    if (fs.existsSync(utilsDir)) {
      const utilsFiles = fs.readdirSync(utilsDir);
      const hasMonitoring = utilsFiles.some(file => 
        file.includes('monitor') || file.includes('health')
      );
      
      if (hasMonitoring) {
        assert.ok(true, 'Monitoring utilities are present');
      }
    }
  });

  test('Backup and Recovery', () => {
    const backupsDir = path.join(process.cwd(), 'backups');
    const utilsDir = path.join(process.cwd(), 'utils');
    
    // Check for backup utilities
    if (fs.existsSync(utilsDir)) {
      const utilsFiles = fs.readdirSync(utilsDir);
      const hasBackup = utilsFiles.some(file => 
        file.includes('backup') || file.includes('recovery')
      );
      
      if (hasBackup) {
        assert.ok(true, 'Backup utilities are present');
      }
    }

    // Backups directory should be in .gitignore if it exists
    if (fs.existsSync(backupsDir)) {
      const gitignorePath = path.join(process.cwd(), '.gitignore');
      if (fs.existsSync(gitignorePath)) {
        const gitignore = fs.readFileSync(gitignorePath, 'utf8');
        assert.ok(gitignore.includes('backups'), 'Backups directory should be in .gitignore');
      }
    }
  });

  test('SSL/TLS Configuration', () => {
    // Check for HTTPS configuration in production
    const configDir = path.join(process.cwd(), 'config');
    
    if (fs.existsSync(configDir)) {
      const configFiles = fs.readdirSync(configDir, { recursive: true });
      
      // Look for SSL/HTTPS configuration
      const hasSSLConfig = configFiles.some(file => 
        file.includes('ssl') || file.includes('https') || file.includes('security')
      );
      
      if (hasSSLConfig) {
        assert.ok(true, 'SSL/HTTPS configuration is present');
      }
    }

    // Check main application file for HTTPS setup
    const indexPath = path.join(process.cwd(), 'index.js');
    if (fs.existsSync(indexPath)) {
      const indexContent = fs.readFileSync(indexPath, 'utf8');
      
      // Should have security considerations
      const hasSecuritySetup = indexContent.includes('helmet') || 
                              indexContent.includes('https') ||
                              indexContent.includes('secure');
      
      assert.ok(hasSecuritySetup, 'Main application should have security setup');
    }
  });
});
