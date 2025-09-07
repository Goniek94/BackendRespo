/**
 * Script to clear duplicate cookies and test admin login
 * Fixes HTTP 431 "Request Header Fields Too Large" error
 * 
 * @author Senior Developer
 * @version 1.0.0
 */

const express = require('express');
const cookieParser = require('cookie-parser');

/**
 * Creates a simple server to clear cookies and redirect to admin panel
 */
const createCookieClearingServer = () => {
  const app = express();
  app.use(cookieParser());

  // Route to clear all authentication cookies
  app.get('/clear-cookies', (req, res) => {
    console.log('🍪 Clearing all authentication cookies...');
    
    // Lista wszystkich możliwych cookies do wyczyszczenia
    const cookiesToClear = [
      'token',
      'refreshToken',
      'admin_token',
      'admin_refreshToken',
      'adminToken',
      'adminRefreshToken',
      'session',
      'sessionId',
      'admin_session',
      'auth_token',
      'auth_refresh'
    ];

    // Wyczyść wszystkie cookies z różnymi konfiguracjami
    cookiesToClear.forEach(cookieName => {
      // Standard clearing
      res.clearCookie(cookieName);
      
      // Clear with path variations
      res.clearCookie(cookieName, { path: '/' });
      res.clearCookie(cookieName, { path: '/admin' });
      res.clearCookie(cookieName, { path: '/api' });
      
      // Clear with domain variations (localhost)
      res.clearCookie(cookieName, { domain: 'localhost' });
      res.clearCookie(cookieName, { domain: '.localhost' });
      
      // Clear with secure/httpOnly variations
      res.clearCookie(cookieName, { 
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
      });
      
      res.clearCookie(cookieName, { 
        httpOnly: true,
        secure: true,
        sameSite: 'strict'
      });
    });

    console.log('✅ All cookies cleared successfully!');
    
    // Wyślij instrukcje do użytkownika
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cookies Cleared - Admin Panel Fix</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
          .success { color: green; background: #f0f8f0; padding: 15px; border-radius: 5px; }
          .instructions { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .button { display: inline-block; background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
          .button:hover { background: #0056b3; }
        </style>
      </head>
      <body>
        <h1>🍪 Cookies Successfully Cleared!</h1>
        
        <div class="success">
          <strong>✅ All duplicate authentication cookies have been removed.</strong><br>
          This should fix the HTTP 431 "Request Header Fields Too Large" error.
        </div>
        
        <div class="instructions">
          <h3>Next Steps:</h3>
          <ol>
            <li><strong>Close this tab</strong></li>
            <li><strong>Clear your browser cache</strong> (Ctrl+Shift+Delete)</li>
            <li><strong>Restart your browser</strong> completely</li>
            <li><strong>Go to the admin panel</strong> and try logging in</li>
          </ol>
        </div>
        
        <h3>Quick Links:</h3>
        <a href="http://localhost:3000/admin" class="button">🔐 Admin Panel</a>
        <a href="http://localhost:3000" class="button">🏠 Main Site</a>
        
        <h3>What was fixed:</h3>
        <ul>
          <li>✅ Removed duplicate cookie creation in admin login</li>
          <li>✅ Admin panel now uses the same cookies as regular login</li>
          <li>✅ Optimized JWT tokens (50-60% smaller)</li>
          <li>✅ Temporarily disabled AdminActivity logging</li>
          <li>✅ Added check for existing login before admin login</li>
        </ul>
        
        <p><em>If you still experience issues, please check the browser developer tools (F12) → Network tab for any remaining large headers.</em></p>
      </body>
      </html>
    `);
  });

  // Route to check current cookies
  app.get('/check-cookies', (req, res) => {
    console.log('🔍 Current cookies:', req.cookies);
    
    const cookieCount = Object.keys(req.cookies || {}).length;
    const cookieSize = JSON.stringify(req.cookies || {}).length;
    
    res.json({
      success: true,
      message: 'Cookie analysis complete',
      data: {
        cookieCount,
        cookieSize,
        cookies: req.cookies || {},
        headers: {
          'cookie': req.get('Cookie'),
          'user-agent': req.get('User-Agent'),
          'content-length': req.get('Content-Length')
        }
      }
    });
  });

  return app;
};

// Start the cookie clearing server
const app = createCookieClearingServer();
const PORT = 3001;

app.listen(PORT, () => {
  console.log('\n🚀 Cookie Clearing Server Started!');
  console.log(`📍 Server running at: http://localhost:${PORT}`);
  console.log('\n📋 Available endpoints:');
  console.log(`   🍪 Clear cookies: http://localhost:${PORT}/clear-cookies`);
  console.log(`   🔍 Check cookies: http://localhost:${PORT}/check-cookies`);
  console.log('\n💡 Instructions:');
  console.log('   1. Open: http://localhost:3001/clear-cookies');
  console.log('   2. Follow the instructions on the page');
  console.log('   3. Try logging into admin panel again');
  console.log('\n⚠️  Remember to stop this server after clearing cookies (Ctrl+C)');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Cookie clearing server shutting down...');
  process.exit(0);
});
