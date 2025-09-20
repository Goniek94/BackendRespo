/**
 * SECURE CRYPTOGRAPHIC TOKEN GENERATOR
 * 
 * Enterprise-grade security token generation using Node.js crypto module
 * Replaces all Math.random() usage with cryptographically secure alternatives
 * 
 * SECURITY FEATURES:
 * - Uses crypto.randomBytes() for maximum entropy
 * - Configurable token lengths and formats
 * - Built-in validation and entropy checking
 * - Performance optimized for high-volume usage
 * 
 * @author Senior Security Developer
 * @version 1.0.0
 */

import crypto from 'crypto';
import logger from './logger.js';

/**
 * Generate cryptographically secure alphanumeric token
 * @param {number} length - Token length (default: 32)
 * @returns {string} Secure random token
 */
export const generateSecureToken = (length = 32) => {
  try {
    // Use crypto.randomBytes for maximum security
    const buffer = crypto.randomBytes(Math.ceil(length * 3 / 4));
    return buffer
      .toString('base64')
      .replace(/[+/]/g, '') // Remove special characters
      .slice(0, length);
  } catch (error) {
    logger.error('Failed to generate secure token', {
      error: error.message,
      length
    });
    throw new Error('Token generation failed');
  }
};

/**
 * Generate cryptographically secure numeric code
 * @param {number} digits - Number of digits (default: 6)
 * @returns {string} Secure random numeric code
 */
export const generateSecureCode = (digits = 6) => {
  try {
    if (digits < 4 || digits > 10) {
      throw new Error('Code length must be between 4 and 10 digits');
    }
    
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    
    // Use crypto.randomInt for secure integer generation
    const code = crypto.randomInt(min, max + 1);
    return code.toString().padStart(digits, '0');
  } catch (error) {
    logger.error('Failed to generate secure code', {
      error: error.message,
      digits
    });
    throw new Error('Code generation failed');
  }
};

/**
 * Generate secure session ID
 * @returns {string} Secure session identifier
 */
export const generateSessionId = () => {
  try {
    const timestamp = Date.now().toString(36);
    const randomPart = crypto.randomBytes(16).toString('hex');
    return `session_${timestamp}_${randomPart}`;
  } catch (error) {
    logger.error('Failed to generate session ID', {
      error: error.message
    });
    throw new Error('Session ID generation failed');
  }
};

/**
 * Generate secure email verification token
 * @returns {string} Secure email verification token
 */
export const generateEmailVerificationToken = () => {
  try {
    const timestamp = Date.now().toString(36);
    const randomPart1 = crypto.randomBytes(12).toString('hex');
    const randomPart2 = crypto.randomBytes(12).toString('hex');
    return `${randomPart1}${randomPart2}${timestamp}`;
  } catch (error) {
    logger.error('Failed to generate email verification token', {
      error: error.message
    });
    throw new Error('Email verification token generation failed');
  }
};

/**
 * Generate secure password reset token
 * @returns {string} Secure password reset token
 */
export const generatePasswordResetToken = () => {
  try {
    const timestamp = Date.now().toString(36);
    const randomPart1 = crypto.randomBytes(15).toString('hex');
    const randomPart2 = crypto.randomBytes(15).toString('hex');
    return `${randomPart1}${randomPart2}${timestamp}`;
  } catch (error) {
    logger.error('Failed to generate password reset token', {
      error: error.message
    });
    throw new Error('Password reset token generation failed');
  }
};

/**
 * Generate secure admin request ID
 * @returns {string} Secure admin request identifier
 */
export const generateAdminRequestId = () => {
  try {
    const timestamp = Date.now().toString(36);
    const randomPart = crypto.randomBytes(9).toString('hex');
    return `admin_${timestamp}_${randomPart}`;
  } catch (error) {
    logger.error('Failed to generate admin request ID', {
      error: error.message
    });
    throw new Error('Admin request ID generation failed');
  }
};

/**
 * Generate secure file upload name
 * @param {string} originalExtension - Original file extension
 * @returns {string} Secure filename
 */
export const generateSecureFilename = (originalExtension = '') => {
  try {
    const timestamp = Date.now();
    const randomPart = crypto.randomBytes(8).toString('hex');
    const extension = originalExtension.startsWith('.') ? originalExtension : `.${originalExtension}`;
    return `${timestamp}-${randomPart}${extension}`;
  } catch (error) {
    logger.error('Failed to generate secure filename', {
      error: error.message,
      originalExtension
    });
    throw new Error('Secure filename generation failed');
  }
};

/**
 * Generate secure temporary password
 * @param {number} length - Password length (default: 12)
 * @returns {string} Secure temporary password
 */
export const generateSecurePassword = (length = 12) => {
  try {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charset.length);
      password += charset[randomIndex];
    }
    
    // Ensure password contains at least one uppercase, lowercase, digit, and special char
    if (!/[A-Z]/.test(password)) password = password.slice(0, -1) + 'A';
    if (!/[a-z]/.test(password)) password = password.slice(0, -2) + 'a' + password.slice(-1);
    if (!/[0-9]/.test(password)) password = password.slice(0, -3) + '1' + password.slice(-2);
    if (!/[!@#$%^&*]/.test(password)) password = password.slice(0, -4) + '!' + password.slice(-3);
    
    return password;
  } catch (error) {
    logger.error('Failed to generate secure password', {
      error: error.message,
      length
    });
    throw new Error('Secure password generation failed');
  }
};

/**
 * Validate token entropy and security
 * @param {string} token - Token to validate
 * @returns {Object} Validation result
 */
export const validateTokenEntropy = (token) => {
  try {
    if (!token || typeof token !== 'string') {
      return { valid: false, reason: 'Invalid token format' };
    }
    
    if (token.length < 8) {
      return { valid: false, reason: 'Token too short' };
    }
    
    // Check for sufficient character variety
    const hasNumbers = /[0-9]/.test(token);
    const hasLetters = /[a-zA-Z]/.test(token);
    const uniqueChars = new Set(token).size;
    
    if (uniqueChars < token.length * 0.5) {
      return { valid: false, reason: 'Insufficient character variety' };
    }
    
    if (!hasNumbers || !hasLetters) {
      return { valid: false, reason: 'Token should contain both letters and numbers' };
    }
    
    return { 
      valid: true, 
      entropy: uniqueChars / token.length,
      length: token.length
    };
  } catch (error) {
    logger.error('Token validation failed', {
      error: error.message
    });
    return { valid: false, reason: 'Validation error' };
  }
};

/**
 * Generate secure issue/audit ID
 * @param {string} category - Issue category
 * @returns {string} Secure issue identifier
 */
export const generateSecureIssueId = (category = 'GENERAL') => {
  try {
    const timestamp = Date.now();
    const randomPart = crypto.randomBytes(9).toString('hex');
    const categoryClean = category.replace(/\s+/g, '_').toUpperCase();
    return `${categoryClean}_${timestamp}_${randomPart}`;
  } catch (error) {
    logger.error('Failed to generate secure issue ID', {
      error: error.message,
      category
    });
    throw new Error('Issue ID generation failed');
  }
};

// Export all functions for easy importing
export default {
  generateSecureToken,
  generateSecureCode,
  generateSessionId,
  generateEmailVerificationToken,
  generatePasswordResetToken,
  generateAdminRequestId,
  generateSecureFilename,
  generateSecurePassword,
  validateTokenEntropy,
  generateSecureIssueId
};
