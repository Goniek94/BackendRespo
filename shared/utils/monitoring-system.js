/**
 * SYSTEM MONITORINGU I ALERTÓW
 * Monitorowanie stanu aplikacji, błędów i wydajności z alertami
 */

import os from 'os';
import mongoose from 'mongoose';
import logger from './logger.js';

class MonitoringSystem {
  constructor() {
    this.isEnabled = process.env.FEATURE_MONITORING !== 'false';
    this.alertEmail = process.env.ALERT_EMAIL;
    this.alertThresholds = {
      memoryUsage: parseFloat(process.env.MEMORY_ALERT_THRESHOLD || '0.85'), // 85%
      cpuUsage: parseFloat(process.env.CPU_ALERT_THRESHOLD || '0.80'), // 80%
      diskUsage: parseFloat(process.env.DISK_ALERT_THRESHOLD || '0.90'), // 90%
      responseTime: parseInt(process.env.RESPONSE_TIME_THRESHOLD || '5000', 10), // 5s
      errorRate: parseFloat(process.env.ERROR_RATE_THRESHOLD || '0.05'), // 5%
      dbConnectionTime: parseInt(process.env.DB_CONNECTION_THRESHOLD || '1000', 10) // 1s
    };
    
    this.metrics = {
      requests: { total: 0, errors: 0, responseTimes: [] },
      system: { lastCheck: null, alerts: [] },
      database: { lastCheck: null, connectionTime: 0 },
      errors: { count: 0, lastError: null }
    };

    this.startTime = Date.now();
    this.lastAlertTime = {};
    this.alertCooldown = 15 * 60 * 1000; // 15 minutes cooldown
  }

  /**
   * Get system health status
   */
  async getHealthStatus() {
    try {
      const now = Date.now();
      const uptime = now - this.startTime;
      
      // System metrics
      const memUsage = process.memoryUsage();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const memoryUsagePercent = usedMem / totalMem;

      // CPU usage (simplified)
      const loadAvg = os.loadavg();
      const cpuCount = os.cpus().length;
      const cpuUsagePercent = loadAvg[0] / cpuCount;

      // Database status
      const dbStatus = await this.checkDatabaseHealth();

      // Request metrics
      const avgResponseTime = this.metrics.requests.responseTimes.length > 0
        ? this.metrics.requests.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.requests.responseTimes.length
        : 0;

      const errorRate = this.metrics.requests.total > 0
        ? this.metrics.requests.errors / this.metrics.requests.total
        : 0;

      const status = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: {
          milliseconds: uptime,
          human: this.formatUptime(uptime)
        },
        system: {
          memory: {
            used: Math.round(usedMem / 1024 / 1024), // MB
            total: Math.round(totalMem / 1024 / 1024), // MB
            percentage: Math.round(memoryUsagePercent * 100),
            heap: {
              used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
              total: Math.round(memUsage.heapTotal / 1024 / 1024) // MB
            }
          },
          cpu: {
            usage: Math.round(cpuUsagePercent * 100),
            cores: cpuCount,
            loadAverage: loadAvg
          },
          platform: os.platform(),
          arch: os.arch(),
          nodeVersion: process.version
        },
        database: dbStatus,
        requests: {
          total: this.metrics.requests.total,
          errors: this.metrics.requests.errors,
          errorRate: Math.round(errorRate * 100),
          avgResponseTime: Math.round(avgResponseTime)
        },
        alerts: this.metrics.system.alerts
      };

      // Determine overall status
      if (memoryUsagePercent > this.alertThresholds.memoryUsage ||
          cpuUsagePercent > this.alertThresholds.cpuUsage ||
          errorRate > this.alertThresholds.errorRate ||
          !dbStatus.connected) {
        status.status = 'unhealthy';
      } else if (memoryUsagePercent > 0.7 ||
                 cpuUsagePercent > 0.6 ||
                 errorRate > 0.02) {
        status.status = 'warning';
      }

      // Check for alerts
      await this.checkAlerts(status);

      return status;
    } catch (error) {
      logger.error('Health check failed', { error: error.message });
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Check database health
   */
  async checkDatabaseHealth() {
    const startTime = Date.now();
    
    try {
      const dbState = mongoose.connection.readyState;
      const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
      
      if (dbState === 1) {
        // Test database operation
        await mongoose.connection.db.admin().ping();
        const connectionTime = Date.now() - startTime;
        
        this.metrics.database = {
          lastCheck: new Date(),
          connectionTime
        };

        return {
          connected: true,
          state: states[dbState],
          connectionTime,
          host: mongoose.connection.host,
          name: mongoose.connection.name
        };
      } else {
        return {
          connected: false,
          state: states[dbState] || 'unknown',
          connectionTime: -1
        };
      }
    } catch (error) {
      logger.error('Database health check failed', { error: error.message });
      return {
        connected: false,
        state: 'error',
        error: error.message,
        connectionTime: -1
      };
    }
  }

  /**
   * Record request metrics
   */
  recordRequest(responseTime, isError = false) {
    this.metrics.requests.total++;
    if (isError) {
      this.metrics.requests.errors++;
    }
    
    this.metrics.requests.responseTimes.push(responseTime);
    
    // Keep only last 1000 response times
    if (this.metrics.requests.responseTimes.length > 1000) {
      this.metrics.requests.responseTimes = this.metrics.requests.responseTimes.slice(-1000);
    }
  }

  /**
   * Record error
   */
  recordError(error, context = {}) {
    this.metrics.errors.count++;
    this.metrics.errors.lastError = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date()
    };

    logger.error('Application error recorded', {
      error: error.message,
      context,
      totalErrors: this.metrics.errors.count
    });
  }

  /**
   * Check for alerts and send notifications
   */
  async checkAlerts(status) {
    const alerts = [];
    const now = Date.now();

    // Memory usage alert
    if (status.system.memory.percentage > this.alertThresholds.memoryUsage * 100) {
      const alertKey = 'memory_high';
      if (!this.lastAlertTime[alertKey] || now - this.lastAlertTime[alertKey] > this.alertCooldown) {
        alerts.push({
          type: 'memory_high',
          severity: 'critical',
          message: `High memory usage: ${status.system.memory.percentage}%`,
          threshold: `${this.alertThresholds.memoryUsage * 100}%`,
          current: `${status.system.memory.percentage}%`
        });
        this.lastAlertTime[alertKey] = now;
      }
    }

    // CPU usage alert
    if (status.system.cpu.usage > this.alertThresholds.cpuUsage * 100) {
      const alertKey = 'cpu_high';
      if (!this.lastAlertTime[alertKey] || now - this.lastAlertTime[alertKey] > this.alertCooldown) {
        alerts.push({
          type: 'cpu_high',
          severity: 'warning',
          message: `High CPU usage: ${status.system.cpu.usage}%`,
          threshold: `${this.alertThresholds.cpuUsage * 100}%`,
          current: `${status.system.cpu.usage}%`
        });
        this.lastAlertTime[alertKey] = now;
      }
    }

    // Error rate alert
    if (status.requests.errorRate > this.alertThresholds.errorRate * 100) {
      const alertKey = 'error_rate_high';
      if (!this.lastAlertTime[alertKey] || now - this.lastAlertTime[alertKey] > this.alertCooldown) {
        alerts.push({
          type: 'error_rate_high',
          severity: 'critical',
          message: `High error rate: ${status.requests.errorRate}%`,
          threshold: `${this.alertThresholds.errorRate * 100}%`,
          current: `${status.requests.errorRate}%`
        });
        this.lastAlertTime[alertKey] = now;
      }
    }

    // Database connection alert
    if (!status.database.connected) {
      const alertKey = 'database_disconnected';
      if (!this.lastAlertTime[alertKey] || now - this.lastAlertTime[alertKey] > this.alertCooldown) {
        alerts.push({
          type: 'database_disconnected',
          severity: 'critical',
          message: 'Database connection lost',
          current: status.database.state
        });
        this.lastAlertTime[alertKey] = now;
      }
    }

    // Response time alert
    if (status.requests.avgResponseTime > this.alertThresholds.responseTime) {
      const alertKey = 'response_time_high';
      if (!this.lastAlertTime[alertKey] || now - this.lastAlertTime[alertKey] > this.alertCooldown) {
        alerts.push({
          type: 'response_time_high',
          severity: 'warning',
          message: `High response time: ${status.requests.avgResponseTime}ms`,
          threshold: `${this.alertThresholds.responseTime}ms`,
          current: `${status.requests.avgResponseTime}ms`
        });
        this.lastAlertTime[alertKey] = now;
      }
    }

    // Send alerts if any
    if (alerts.length > 0) {
      this.metrics.system.alerts = alerts;
      await this.sendAlerts(alerts);
    }
  }

  /**
   * Send alert notifications
   */
  async sendAlerts(alerts) {
    for (const alert of alerts) {
      logger.warn('System alert triggered', alert);
      
      // Here you could integrate with external services:
      // - Email notifications
      // - Slack webhooks
      // - SMS alerts
      // - Push notifications
      
      if (this.alertEmail) {
        // Email alert implementation would go here
        logger.info('Alert email would be sent', {
          to: this.alertEmail,
          alert: alert.type,
          severity: alert.severity
        });
      }
    }
  }

  /**
   * Format uptime in human readable format
   */
  formatUptime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get detailed metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      thresholds: this.alertThresholds,
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      requests: { total: 0, errors: 0, responseTimes: [] },
      system: { lastCheck: null, alerts: [] },
      database: { lastCheck: null, connectionTime: 0 },
      errors: { count: 0, lastError: null }
    };
    
    logger.info('Monitoring metrics reset');
  }

  /**
   * Start periodic health checks
   */
  startPeriodicChecks() {
    if (!this.isEnabled) {
      logger.info('Monitoring system disabled');
      return;
    }

    const interval = parseInt(process.env.HEALTH_CHECK_INTERVAL || '60000', 10); // 1 minute
    
    logger.info('Starting periodic health checks', { 
      interval: `${interval}ms`,
      thresholds: this.alertThresholds
    });

    setInterval(async () => {
      try {
        await this.getHealthStatus();
      } catch (error) {
        logger.error('Periodic health check failed', { error: error.message });
      }
    }, interval);
  }
}

// Create singleton instance
const monitoringSystem = new MonitoringSystem();

// Export functions
export const getHealthStatus = () => monitoringSystem.getHealthStatus();
export const recordRequest = (responseTime, isError) => monitoringSystem.recordRequest(responseTime, isError);
export const recordError = (error, context) => monitoringSystem.recordError(error, context);
export const getMetrics = () => monitoringSystem.getMetrics();
export const resetMetrics = () => monitoringSystem.resetMetrics();
export const startPeriodicChecks = () => monitoringSystem.startPeriodicChecks();

export default monitoringSystem;
