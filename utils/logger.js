/**
 * LOGGER UTILITY
 * 
 * Centralized logging system for the application
 * Provides different log levels and formatting
 */

import fs from 'fs';
import path from 'path';

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Current log level (can be set via environment variable)
const CURRENT_LOG_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Format log message with timestamp and level
 */
const formatMessage = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const metaString = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaString}`;
};

/**
 * Write log to file
 */
const writeToFile = (level, message, meta = {}) => {
  const logFile = path.join(logsDir, `${level}.log`);
  const formattedMessage = formatMessage(level, message, meta);
  
  try {
    fs.appendFileSync(logFile, formattedMessage + '\n');
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
};

/**
 * Logger class
 */
class Logger {
  error(message, meta = {}) {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.ERROR) {
      console.error(formatMessage('error', message, meta));
      writeToFile('error', message, meta);
    }
  }

  warn(message, meta = {}) {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.WARN) {
      console.warn(formatMessage('warn', message, meta));
      writeToFile('warn', message, meta);
    }
  }

  info(message, meta = {}) {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.INFO) {
      console.log(formatMessage('info', message, meta));
      writeToFile('info', message, meta);
    }
  }

  debug(message, meta = {}) {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.DEBUG) {
      console.log(formatMessage('debug', message, meta));
      writeToFile('debug', message, meta);
    }
  }
}

// Export singleton instance
const logger = new Logger();
export default logger;
