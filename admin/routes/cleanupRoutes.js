import express from 'express';
import { clearAuthCookies } from '../../config/cookieConfig.js';
import logger from '../../utils/logger.js';

const router = express.Router();

/**
 * @route POST /api/admin-panel/clear-cookies
 * @desc Clear all authentication cookies to fix HTTP 431 errors
 * @access Public (no auth required for cleanup)
 */
router.post('/clear-cookies', (req, res) => {
  try {
    logger.info('Cookie cleanup requested', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    // Clear all authentication cookies
    clearAuthCookies(res);
    
    // Clear additional cookies that might accumulate
    const cookiesToClear = [
      'token',
      'refreshToken', 
      'adminToken',
      'sessionId',
      'csrfToken',
      'remember_token',
      'auth_session',
      'user_session',
      'admin_session',
      'temp_token',
      'backup_token',
      'old_token'
    ];

    cookiesToClear.forEach(cookieName => {
      res.clearCookie(cookieName, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/',
        domain: process.env.NODE_ENV === 'production' ? process.env.DOMAIN : undefined
      });
    });

    // Add headers to prevent caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.status(200).json({
      success: true,
      message: 'All cookies cleared successfully',
      timestamp: new Date().toISOString(),
      instructions: [
        'Refresh the page',
        'Clear browser cache if needed',
        'Login again with fresh session'
      ]
    });

  } catch (error) {
    logger.error('Cookie cleanup failed', {
      error: error.message,
      stack: error.stack,
      ip: req.ip
    });

    res.status(500).json({
      success: false,
      error: 'Cookie cleanup failed',
      message: error.message
    });
  }
});

/**
 * @route POST /api/admin-panel/cleanup-session
 * @desc Advanced session cleanup for authenticated users
 * @access Admin only
 */
router.post('/cleanup-session', (req, res) => {
  try {
    // This endpoint can be called by authenticated users to clean their session
    const userId = req.user?.id;
    const userRole = req.user?.role;

    logger.info('Session cleanup requested', {
      userId,
      userRole,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    // Clear all cookies
    clearAuthCookies(res);

    // Add session cleanup headers
    res.setHeader('X-Session-Cleaned', 'true');
    res.setHeader('X-Cleanup-Timestamp', new Date().toISOString());

    res.status(200).json({
      success: true,
      message: 'Session cleaned successfully',
      user: userId ? { id: userId, role: userRole } : null,
      timestamp: new Date().toISOString(),
      nextSteps: [
        'You have been logged out',
        'Please login again',
        'Your session is now clean'
      ]
    });

  } catch (error) {
    logger.error('Session cleanup failed', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(500).json({
      success: false,
      error: 'Session cleanup failed',
      message: error.message
    });
  }
});

/**
 * @route GET /api/admin-panel/session-info
 * @desc Get information about current session and cookies
 * @access Public
 */
router.get('/session-info', (req, res) => {
  try {
    const cookieHeader = req.headers.cookie;
    const cookiesSize = cookieHeader ? Buffer.byteLength(cookieHeader, 'utf8') : 0;
    
    // Parse cookies
    const cookies = {};
    if (cookieHeader) {
      const pairs = cookieHeader.split(';');
      for (const pair of pairs) {
        const [name, ...valueParts] = pair.trim().split('=');
        if (name && valueParts.length > 0) {
          const value = valueParts.join('=');
          cookies[name] = {
            size: Buffer.byteLength(`${name}=${value}`, 'utf8'),
            hasValue: !!value
          };
        }
      }
    }

    // Calculate total headers size
    let totalHeadersSize = 0;
    for (const [name, value] of Object.entries(req.headers)) {
      if (value) {
        totalHeadersSize += Buffer.byteLength(`${name}: ${value}\r\n`, 'utf8');
      }
    }

    const analysis = {
      totalHeadersSize,
      cookiesSize,
      cookieCount: Object.keys(cookies).length,
      cookies,
      limits: {
        maxHeaders: 32768,  // 32KB
        maxCookies: 4096,   // 4KB
        warningThreshold: 24576  // 24KB
      },
      status: {
        headersOk: totalHeadersSize < 32768,
        cookiesOk: cookiesSize < 4096,
        needsCleanup: totalHeadersSize > 24576 || cookiesSize > 3072
      }
    };

    res.status(200).json({
      success: true,
      message: 'Session information retrieved',
      data: analysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Session info retrieval failed', {
      error: error.message,
      stack: error.stack,
      ip: req.ip
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve session info',
      message: error.message
    });
  }
});

export default router;
