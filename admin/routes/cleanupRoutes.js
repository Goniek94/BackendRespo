import express from 'express';
import { clearAuthCookies } from '../../config/cookieConfig.js';
import logger from '../../utils/logger.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = express.Router();

/**
 * @route GET /api/admin-panel/clear-cookies
 * @desc Clear all authentication cookies to fix HTTP 431 errors (GET method)
 * @access Admin only (SECURED)
 */
router.get('/clear-cookies', requireAdminAuth, (req, res) => {
  try {
    logger.info('Admin cookie cleanup requested via GET', {
      adminId: req.user?.id,
      adminRole: req.user?.role,
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
      message: 'Admin cookies cleared successfully via GET',
      method: 'GET',
      admin: {
        id: req.user?.id,
        role: req.user?.role
      },
      timestamp: new Date().toISOString(),
      instructions: [
        'Refresh the page',
        'Clear browser cache if needed',
        'Login again with fresh session'
      ]
    });

  } catch (error) {
    logger.error('Admin cookie cleanup failed via GET', {
      error: error.message,
      stack: error.stack,
      adminId: req.user?.id,
      ip: req.ip
    });

    res.status(500).json({
      success: false,
      error: 'Cookie cleanup failed',
      method: 'GET',
      message: error.message
    });
  }
});

/**
 * @route POST /api/admin-panel/clear-cookies
 * @desc Clear all authentication cookies to fix HTTP 431 errors (POST method)
 * @access Admin only (SECURED)
 */
const clearCookiesHandler = (req, res) => {
  try {
    logger.info('Admin cookie cleanup requested via POST', {
      adminId: req.user?.id,
      adminRole: req.user?.role,
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
      message: 'Admin cookies cleared successfully',
      admin: {
        id: req.user?.id,
        role: req.user?.role
      },
      timestamp: new Date().toISOString(),
      instructions: [
        'Refresh the page',
        'Clear browser cache if needed',
        'Login again with fresh session'
      ]
    });

  } catch (error) {
    logger.error('Admin cookie cleanup failed', {
      error: error.message,
      stack: error.stack,
      adminId: req.user?.id,
      ip: req.ip
    });

    res.status(500).json({
      success: false,
      error: 'Cookie cleanup failed',
      message: error.message
    });
  }
};

// POST (primary) endpoint - SECURED
router.post('/clear-cookies', requireAdminAuth, clearCookiesHandler);

/**
 * @route POST /api/admin-panel/cleanup-session
 * @desc Advanced session cleanup for authenticated users
 * @access Admin only
 */
router.post('/cleanup-session', requireAdminAuth, (req, res) => {
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
 * @access Admin only (SECURED)
 */
router.get('/session-info', requireAdminAuth, (req, res) => {
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

/**
 * @route POST /api/admin-panel/emergency-cleanup
 * @desc Emergency cleanup - usuwa wszystkie cookies i czyści nagłówki
 * @access Admin only (SECURED - was previously public, now protected)
 */
router.post('/emergency-cleanup', requireAdminAuth, (req, res) => {
  try {
    logger.warn('🚨 EMERGENCY CLEANUP requested - ADMIN ACCESS', {
      adminId: req.user?.id,
      adminRole: req.user?.role,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      headers: Object.keys(req.headers),
      referer: req.get('Referer'),
      xForwardedFor: req.get('X-Forwarded-For'),
      warning: 'SECURED ENDPOINT - Admin authentication required'
    });

    // AGRESYWNE czyszczenie wszystkich możliwych cookies
    const allPossibleCookies = [
      'token', 'refreshToken', 'adminToken', 'sessionId', 'csrfToken',
      'remember_token', 'auth_session', 'user_session', 'admin_session',
      'temp_token', 'backup_token', 'old_token', 'legacy_token',
      'adminjs_session', 'adminjs', 'connect.sid', 'session',
      'jwt', 'access_token', 'refresh_token', 'auth_token',
      'login_token', 'user_token', 'admin_auth', 'panel_auth'
    ];

    allPossibleCookies.forEach(cookieName => {
      // Wyczyść dla różnych ścieżek i domen
      res.clearCookie(cookieName, { path: '/' });
      res.clearCookie(cookieName, { path: '/admin' });
      res.clearCookie(cookieName, { path: '/api' });
      res.clearCookie(cookieName, { 
        path: '/',
        domain: process.env.DOMAIN,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
    });

    // Użyj głównej funkcji czyszczenia
    clearAuthCookies(res);

    // Dodaj nagłówki do wymuszenia odświeżenia
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Emergency-Cleanup', 'true');
    res.setHeader('X-Cleanup-Timestamp', new Date().toISOString());

    res.status(200).json({
      success: true,
      message: 'EMERGENCY CLEANUP completed successfully',
      action: 'All cookies and sessions cleared',
      timestamp: new Date().toISOString(),
      instructions: [
        '🚨 EMERGENCY CLEANUP COMPLETED',
        '1. Close ALL browser tabs',
        '2. Clear browser cache completely',
        '3. Restart browser',
        '4. Try accessing admin panel again',
        '5. If problem persists, contact support'
      ],
      cookiesCleared: allPossibleCookies.length,
      nextSteps: 'Refresh page and login again'
    });

  } catch (error) {
    logger.error('EMERGENCY CLEANUP failed', {
      error: error.message,
      stack: error.stack,
      ip: req.ip
    });

    res.status(500).json({
      success: false,
      error: 'Emergency cleanup failed',
      message: error.message,
      instructions: [
        'Manual cleanup required:',
        '1. Clear all browser cookies manually',
        '2. Clear browser cache',
        '3. Restart browser'
      ]
    });
  }
});

export default router;
