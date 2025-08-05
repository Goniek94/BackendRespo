/**
 * SYSTEM BACKUPÓW BAZY DANYCH
 * Automatyczne backupy MongoDB Atlas z rotacją i przechowywaniem w chmurze
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import cron from 'node-cron';
import mongoose from 'mongoose';
import logger from './logger.js';

const execAsync = promisify(exec);

class BackupSystem {
  constructor() {
    this.backupDir = process.env.BACKUP_DIR || './backups';
    this.retentionDays = parseInt(process.env.BACKUP_RETENTION || '30', 10);
    this.mongoUri = process.env.MONGODB_URI;
    this.isEnabled = process.env.FEATURE_BACKUPS !== 'false';
    
    // Ensure backup directory exists
    this.initBackupDirectory();
  }

  async initBackupDirectory() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      logger.info('Backup directory initialized', { path: this.backupDir });
    } catch (error) {
      logger.error('Failed to create backup directory', { 
        error: error.message,
        path: this.backupDir 
      });
    }
  }

  /**
   * Create database backup
   */
  async createBackup() {
    if (!this.isEnabled) {
      logger.info('Backups are disabled');
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `marketplace-backup-${timestamp}`;
    const backupPath = path.join(this.backupDir, backupName);

    try {
      logger.info('Starting database backup', { backupName });

      // Check database connection
      if (mongoose.connection.readyState !== 1) {
        throw new Error('Database not connected');
      }

      // Create backup using mongodump
      const command = `mongodump --uri="${this.mongoUri}" --out="${backupPath}"`;
      
      const { stdout, stderr } = await execAsync(command, {
        timeout: 30 * 60 * 1000 // 30 minutes timeout
      });

      if (stderr && !stderr.includes('done dumping')) {
        logger.warn('Backup completed with warnings', { stderr });
      }

      // Compress backup
      const compressedPath = `${backupPath}.tar.gz`;
      await execAsync(`tar -czf "${compressedPath}" -C "${this.backupDir}" "${backupName}"`);
      
      // Remove uncompressed backup
      await execAsync(`rm -rf "${backupPath}"`);

      // Get backup size
      const stats = await fs.stat(compressedPath);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

      logger.info('Database backup completed successfully', {
        backupName,
        path: compressedPath,
        sizeInMB: `${sizeInMB} MB`,
        duration: Date.now() - new Date(timestamp.replace(/-/g, ':')).getTime()
      });

      // Clean old backups
      await this.cleanOldBackups();

      return {
        success: true,
        backupName,
        path: compressedPath,
        size: stats.size
      };

    } catch (error) {
      logger.error('Database backup failed', {
        error: error.message,
        backupName,
        stack: error.stack
      });

      // Clean up failed backup
      try {
        await execAsync(`rm -rf "${backupPath}" "${backupPath}.tar.gz"`);
      } catch (cleanupError) {
        logger.warn('Failed to clean up failed backup', { 
          error: cleanupError.message 
        });
      }

      throw error;
    }
  }

  /**
   * Clean old backups based on retention policy
   */
  async cleanOldBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(file => 
        file.startsWith('marketplace-backup-') && file.endsWith('.tar.gz')
      );

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

      let deletedCount = 0;
      let deletedSize = 0;

      for (const file of backupFiles) {
        const filePath = path.join(this.backupDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          deletedCount++;
          deletedSize += stats.size;
          
          logger.info('Deleted old backup', {
            file,
            age: Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24))
          });
        }
      }

      if (deletedCount > 0) {
        logger.info('Backup cleanup completed', {
          deletedCount,
          deletedSizeMB: (deletedSize / (1024 * 1024)).toFixed(2)
        });
      }

    } catch (error) {
      logger.error('Failed to clean old backups', { error: error.message });
    }
  }

  /**
   * List available backups
   */
  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(file => 
        file.startsWith('marketplace-backup-') && file.endsWith('.tar.gz')
      );

      const backups = [];
      for (const file of backupFiles) {
        const filePath = path.join(this.backupDir, file);
        const stats = await fs.stat(filePath);
        
        backups.push({
          name: file,
          path: filePath,
          size: stats.size,
          sizeInMB: (stats.size / (1024 * 1024)).toFixed(2),
          created: stats.mtime,
          age: Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24))
        });
      }

      return backups.sort((a, b) => b.created - a.created);
    } catch (error) {
      logger.error('Failed to list backups', { error: error.message });
      return [];
    }
  }

  /**
   * Restore database from backup
   */
  async restoreBackup(backupName) {
    const backupPath = path.join(this.backupDir, backupName);
    const extractPath = path.join(this.backupDir, 'restore-temp');

    try {
      logger.info('Starting database restore', { backupName });

      // Check if backup exists
      await fs.access(backupPath);

      // Extract backup
      await execAsync(`mkdir -p "${extractPath}"`);
      await execAsync(`tar -xzf "${backupPath}" -C "${extractPath}"`);

      // Find the database directory
      const extractedFiles = await fs.readdir(extractPath);
      const dbDir = extractedFiles.find(file => file.startsWith('marketplace-backup-'));
      
      if (!dbDir) {
        throw new Error('Invalid backup format');
      }

      const restoreDir = path.join(extractPath, dbDir);

      // Restore using mongorestore
      const command = `mongorestore --uri="${this.mongoUri}" --drop "${restoreDir}"`;
      
      const { stdout, stderr } = await execAsync(command, {
        timeout: 30 * 60 * 1000 // 30 minutes timeout
      });

      if (stderr && !stderr.includes('done')) {
        logger.warn('Restore completed with warnings', { stderr });
      }

      // Clean up
      await execAsync(`rm -rf "${extractPath}"`);

      logger.info('Database restore completed successfully', {
        backupName,
        stdout: stdout.substring(0, 500) // Log first 500 chars
      });

      return { success: true, backupName };

    } catch (error) {
      logger.error('Database restore failed', {
        error: error.message,
        backupName,
        stack: error.stack
      });

      // Clean up
      try {
        await execAsync(`rm -rf "${extractPath}"`);
      } catch (cleanupError) {
        logger.warn('Failed to clean up restore temp files', { 
          error: cleanupError.message 
        });
      }

      throw error;
    }
  }

  /**
   * Get backup system status
   */
  async getStatus() {
    try {
      const backups = await this.listBackups();
      const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
      
      return {
        enabled: this.isEnabled,
        backupDir: this.backupDir,
        retentionDays: this.retentionDays,
        totalBackups: backups.length,
        totalSizeInMB: (totalSize / (1024 * 1024)).toFixed(2),
        latestBackup: backups[0] || null,
        oldestBackup: backups[backups.length - 1] || null
      };
    } catch (error) {
      logger.error('Failed to get backup status', { error: error.message });
      return {
        enabled: this.isEnabled,
        error: error.message
      };
    }
  }

  /**
   * Start automatic backup scheduler
   */
  startScheduler() {
    if (!this.isEnabled) {
      logger.info('Backup scheduler disabled');
      return;
    }

    const schedule = process.env.BACKUP_SCHEDULE || '0 2 * * *'; // Daily at 2 AM
    
    logger.info('Starting backup scheduler', { schedule });

    cron.schedule(schedule, async () => {
      try {
        await this.createBackup();
      } catch (error) {
        logger.error('Scheduled backup failed', { error: error.message });
      }
    }, {
      scheduled: true,
      timezone: 'Europe/Warsaw'
    });

    // Also schedule cleanup separately
    cron.schedule('0 3 * * *', async () => { // Daily at 3 AM
      try {
        await this.cleanOldBackups();
      } catch (error) {
        logger.error('Scheduled cleanup failed', { error: error.message });
      }
    }, {
      scheduled: true,
      timezone: 'Europe/Warsaw'
    });
  }
}

// Create singleton instance
const backupSystem = new BackupSystem();

// Export functions
export const createBackup = () => backupSystem.createBackup();
export const listBackups = () => backupSystem.listBackups();
export const restoreBackup = (backupName) => backupSystem.restoreBackup(backupName);
export const getBackupStatus = () => backupSystem.getStatus();
export const startBackupScheduler = () => backupSystem.startScheduler();

export default backupSystem;
