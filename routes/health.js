/**
 * ADVANCED HEALTH CHECK ROUTES
 * Endpoints for comprehensive application monitoring with backup and system status
 */

import express from 'express';
import mongoose from 'mongoose';
import { getHealthStatus, getMetrics } from '../utils/monitoring-system.js';
import { getBackupStatus, listBackups, createBackup } from '../utils/backup-system.js';
import logger from '../utils/logger.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

/**
 * Basic health check endpoint
 * GET /api/health
 */
router.get('/', async (req, res) => {
  try {
    const healthStatus = await getHealthStatus();
    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * Liveness probe - sprawdza czy aplikacja żyje
 * GET /api/health/live
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime())
  });
});

/**
 * Readiness probe - sprawdza czy aplikacja jest gotowa
 * GET /api/health/ready
 */
router.get('/ready', async (req, res) => {
  try {
    const checks = {
      database: mongoose.connection.readyState === 1,
      environment: !!process.env.JWT_SECRET && !!process.env.MONGODB_URI,
      secrets: !!process.env.JWT_REFRESH_SECRET && !!process.env.SESSION_SECRET
    };
    
    const isReady = Object.values(checks).every(check => check === true);
    
    if (isReady) {
      res.status(200).json({ 
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks
      });
    } else {
      res.status(503).json({ 
        status: 'not ready',
        timestamp: new Date().toISOString(),
        checks,
        message: 'Some services are not ready'
      });
    }
  } catch (error) {
    logger.error('Readiness check failed', { error: error.message });
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * Detailed system metrics (requires authentication)
 * GET /api/health/metrics
 */
router.get('/metrics', authMiddleware, async (req, res) => {
  try {
    // Only allow admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied. Admin privileges required.'
      });
    }

    const metrics = getMetrics();
    const healthStatus = await getHealthStatus();
    
    res.json({
      ...healthStatus,
      detailed_metrics: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Metrics endpoint failed', { error: error.message });
    res.status(500).json({ 
      error: 'Failed to collect metrics',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Backup system status (requires admin authentication)
 * GET /api/health/backups
 */
router.get('/backups', authMiddleware, async (req, res) => {
  try {
    // Only allow admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied. Admin privileges required.'
      });
    }

    const backupStatus = await getBackupStatus();
    const backupList = await listBackups();
    
    res.json({
      status: backupStatus,
      backups: backupList.slice(0, 10), // Last 10 backups
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Backup status endpoint failed', { error: error.message });
    res.status(500).json({ 
      error: 'Failed to get backup status',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Create manual backup (requires admin authentication)
 * POST /api/health/backups/create
 */
router.post('/backups/create', authMiddleware, async (req, res) => {
  try {
    // Only allow admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied. Admin privileges required.'
      });
    }

    logger.info('Manual backup initiated', { 
      userId: req.user.userId,
      ip: req.ip 
    });

    const result = await createBackup();
    
    res.json({
      message: 'Backup created successfully',
      backup: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Manual backup failed', { 
      error: error.message,
      userId: req.user.userId,
      ip: req.ip 
    });
    res.status(500).json({ 
      error: 'Failed to create backup',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Security status check (requires admin authentication)
 * GET /api/health/security
 */
router.get('/security', authMiddleware, async (req, res) => {
  try {
    // Only allow admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied. Admin privileges required.'
      });
    }

    const securityStatus = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      security_features: {
        https_enabled: process.env.FORCE_HTTPS === 'true',
        jwt_secrets_configured: !!(process.env.JWT_SECRET && process.env.JWT_REFRESH_SECRET),
        session_secret_configured: !!process.env.SESSION_SECRET,
        rate_limiting_enabled: true, // Always enabled
        cors_configured: !!process.env.ALLOWED_ORIGINS,
        helmet_enabled: true, // Always enabled
        sanitization_enabled: true // Always enabled
      },
      database: {
        connection_encrypted: process.env.MONGODB_URI?.includes('ssl=true') || 
                             process.env.MONGODB_URI?.includes('mongodb+srv://'),
        atlas_connection: process.env.MONGODB_URI?.includes('mongodb+srv://'),
        local_fallback: !process.env.MONGODB_URI?.includes('mongodb+srv://')
      },
      cookies: {
        http_only: true, // Always true in our implementation
        secure: process.env.NODE_ENV === 'production',
        same_site: 'strict'
      },
      monitoring: {
        enabled: process.env.FEATURE_MONITORING !== 'false',
        backup_system: process.env.FEATURE_BACKUPS !== 'false',
        logging_level: process.env.LOG_LEVEL || 'info'
      }
    };

    // Calculate security score
    const securityFeatures = Object.values(securityStatus.security_features);
    const enabledFeatures = securityFeatures.filter(Boolean).length;
    const securityScore = Math.round((enabledFeatures / securityFeatures.length) * 100);

    securityStatus.security_score = securityScore;
    securityStatus.status = securityScore >= 80 ? 'secure' : 
                           securityScore >= 60 ? 'warning' : 'insecure';

    res.json(securityStatus);
  } catch (error) {
    logger.error('Security status check failed', { error: error.message });
    res.status(500).json({ 
      error: 'Failed to check security status',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Production readiness check (requires admin authentication)
 * GET /api/health/production-ready
 */
router.get('/production-ready', authMiddleware, async (req, res) => {
  try {
    // Only allow admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied. Admin privileges required.'
      });
    }

    const checks = {
      // Critical requirements
      mongodb_atlas: process.env.MONGODB_URI?.includes('mongodb+srv://'),
      https_enforced: process.env.FORCE_HTTPS === 'true',
      strong_jwt_secrets: process.env.JWT_SECRET?.length >= 64 && 
                         process.env.JWT_REFRESH_SECRET?.length >= 64,
      session_secret: process.env.SESSION_SECRET?.length >= 32,
      
      // Important requirements
      cors_configured: !!process.env.ALLOWED_ORIGINS,
      environment_production: process.env.NODE_ENV === 'production',
      backup_enabled: process.env.FEATURE_BACKUPS !== 'false',
      monitoring_enabled: process.env.FEATURE_MONITORING !== 'false',
      
      // Optional but recommended
      alert_email_configured: !!process.env.ALERT_EMAIL,
      log_level_appropriate: ['error', 'warn', 'info'].includes(process.env.LOG_LEVEL),
      supabase_configured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
    };

    const criticalChecks = [
      'mongodb_atlas', 'https_enforced', 'strong_jwt_secrets', 'session_secret'
    ];
    
    const importantChecks = [
      'cors_configured', 'environment_production', 'backup_enabled', 'monitoring_enabled'
    ];

    const criticalPassed = criticalChecks.every(check => checks[check]);
    const importantPassed = importantChecks.filter(check => checks[check]).length;
    const totalPassed = Object.values(checks).filter(Boolean).length;
    
    const readinessScore = Math.round((totalPassed / Object.keys(checks).length) * 100);

    const status = {
      production_ready: criticalPassed && importantPassed >= 3,
      readiness_score: readinessScore,
      critical_requirements: {
        passed: criticalPassed,
        details: criticalChecks.reduce((acc, check) => {
          acc[check] = checks[check];
          return acc;
        }, {})
      },
      important_requirements: {
        passed: importantPassed,
        total: importantChecks.length,
        details: importantChecks.reduce((acc, check) => {
          acc[check] = checks[check];
          return acc;
        }, {})
      },
      all_checks: checks,
      recommendations: []
    };

    // Add recommendations
    if (!checks.mongodb_atlas) {
      status.recommendations.push('Configure MongoDB Atlas connection');
    }
    if (!checks.https_enforced) {
      status.recommendations.push('Enable HTTPS enforcement (FORCE_HTTPS=true)');
    }
    if (!checks.strong_jwt_secrets) {
      status.recommendations.push('Generate stronger JWT secrets (64+ characters)');
    }
    if (!checks.alert_email_configured) {
      status.recommendations.push('Configure alert email for monitoring');
    }

    res.json({
      ...status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Production readiness check failed', { error: error.message });
    res.status(500).json({ 
      error: 'Failed to check production readiness',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
