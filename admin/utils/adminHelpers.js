/**
 * Professional Admin Utility Functions
 * Helper functions for common admin panel operations
 * Features: Data formatting, validation, security, performance
 * 
 * @author Senior Developer
 * @version 1.0.0
 */

/**
 * Format user data for admin display
 * @param {Object} user - User object from database
 * @returns {Object} Formatted user data
 */
export const formatUserForAdmin = (user) => {
  if (!user) return null;

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    isVerified: user.isVerified,
    phone: user.phone || null,
    location: user.location || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLogin: user.lastLogin || null,
    preferences: user.preferences || {},
    statistics: user.statistics || {}
  };
};

/**
 * Generate secure admin session ID
 * @returns {string} Unique session identifier
 */
export const generateSessionId = () => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  const randomPart2 = Math.random().toString(36).substring(2, 15);
  return `admin_${timestamp}_${randomPart}${randomPart2}`;
};

/**
 * Validate MongoDB ObjectId format
 * @param {string} id - ID to validate
 * @returns {boolean} True if valid ObjectId
 */
export const isValidObjectId = (id) => {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Sanitize string for safe database storage
 * @param {string} input - Input string to sanitize
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized string
 */
export const sanitizeString = (input, maxLength = 1000) => {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .trim()
    .substring(0, maxLength)
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
};

/**
 * Generate pagination metadata
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} totalCount - Total items count
 * @returns {Object} Pagination metadata
 */
export const generatePaginationMeta = (page, limit, totalCount) => {
  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    currentPage: parseInt(page),
    totalPages,
    totalCount,
    limit: parseInt(limit),
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null
  };
};

/**
 * Format date for admin display
 * @param {Date} date - Date to format
 * @param {string} locale - Locale for formatting (default: 'pl-PL')
 * @returns {string} Formatted date string
 */
export const formatDateForAdmin = (date, locale = 'pl-PL') => {
  if (!date) return null;
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return null;

  return dateObj.toLocaleString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

/**
 * Calculate time difference in human readable format
 * @param {Date} date - Date to compare with now
 * @returns {string} Human readable time difference
 */
export const getTimeAgo = (date) => {
  if (!date) return null;
  
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return `${diffSec} sekund temu`;
  if (diffMin < 60) return `${diffMin} minut temu`;
  if (diffHour < 24) return `${diffHour} godzin temu`;
  if (diffDay < 30) return `${diffDay} dni temu`;
  
  return formatDateForAdmin(date);
};

/**
 * Generate CSV from array of objects
 * @param {Array} data - Array of objects to convert
 * @param {Array} headers - Array of header names
 * @returns {string} CSV string
 */
export const generateCSV = (data, headers) => {
  if (!Array.isArray(data) || data.length === 0) return '';
  
  const csvHeaders = headers.join(',');
  const csvRows = data.map(row => 
    headers.map(header => {
      const value = row[header] || '';
      // Escape commas and quotes in CSV
      return typeof value === 'string' && (value.includes(',') || value.includes('"'))
        ? `"${value.replace(/"/g, '""')}"` 
        : value;
    }).join(',')
  );
  
  return [csvHeaders, ...csvRows].join('\n');
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 100;
};

/**
 * Validate Polish phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid Polish phone
 */
export const isValidPolishPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  
  const phoneRegex = /^(\+48)?[0-9]{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Generate random password
 * @param {number} length - Password length (default: 12)
 * @returns {string} Random password
 */
export const generateRandomPassword = (length = 12) => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  return password;
};

/**
 * Check if user has specific permission
 * @param {Object} user - User object
 * @param {string} permission - Permission to check
 * @returns {boolean} True if user has permission
 */
export const hasPermission = (user, permission) => {
  if (!user || !user.role) return false;
  
  const rolePermissions = {
    admin: ['*'], // Admin has all permissions
    moderator: [
      'users.read',
      'users.update',
      'users.block',
      'listings.read',
      'listings.update',
      'comments.read',
      'comments.moderate',
      'reports.read'
    ],
    user: []
  };
  
  const userPermissions = rolePermissions[user.role] || [];
  return userPermissions.includes('*') || userPermissions.includes(permission);
};

/**
 * Log security event for monitoring
 * @param {string} eventType - Type of security event
 * @param {Object} details - Event details
 * @param {Object} context - Request context
 */
export const logSecurityEvent = (eventType, details = {}, context = {}) => {
  const securityLog = {
    timestamp: new Date().toISOString(),
    eventType,
    severity: getSeverityLevel(eventType),
    details,
    context: {
      ipAddress: context.ip || 'unknown',
      userAgent: context.userAgent || 'unknown',
      userId: context.userId || null,
      sessionId: context.sessionId || null
    }
  };
  
  // In production, send to security monitoring service
  console.log('SECURITY EVENT:', JSON.stringify(securityLog, null, 2));
  
  // Could also store in database or send to external service
  // await SecurityLog.create(securityLog);
  // await sendToSecurityService(securityLog);
};

/**
 * Get severity level for security events
 * @param {string} eventType - Type of security event
 * @returns {string} Severity level
 */
const getSeverityLevel = (eventType) => {
  const severityMap = {
    'auth_failed': 'medium',
    'auth_missing_token': 'low',
    'rate_limit_exceeded': 'medium',
    'access_denied': 'high',
    'user_deleted': 'high',
    'bulk_operation': 'medium',
    'data_export': 'medium',
    'suspicious_activity': 'high'
  };
  
  return severityMap[eventType] || 'low';
};

/**
 * Mask sensitive data for logging
 * @param {Object} data - Data to mask
 * @returns {Object} Masked data
 */
export const maskSensitiveData = (data) => {
  if (!data || typeof data !== 'object') return data;
  
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'email'];
  const masked = { ...data };
  
  Object.keys(masked).forEach(key => {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      if (typeof masked[key] === 'string') {
        masked[key] = '*'.repeat(masked[key].length);
      }
    }
  });
  
  return masked;
};

/**
 * Calculate system performance metrics
 * @returns {Object} Performance metrics
 */
export const getSystemMetrics = () => {
  const memUsage = process.memoryUsage();
  
  return {
    uptime: process.uptime(),
    memory: {
      used: Math.round(memUsage.heapUsed / 1024 / 1024),
      total: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    },
    cpu: process.cpuUsage(),
    version: process.version,
    platform: process.platform
  };
};
