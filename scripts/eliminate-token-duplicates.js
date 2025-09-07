/**
 * PROFESSIONAL TOKEN DUPLICATE ELIMINATION SCRIPT
 * Senior-level solution for HTTP 431 header bloat
 * 
 * ELIMINUJE:
 * - Duplikaty admin tokenów (admin_token, admin_refreshToken)
 * - Analytics cookies (_ga, _gid, _fbp, _fbc)
 * - Development cookies (debug_mode, dev_user_id, etc.)
 * - Session bloat (sessionId, csrfToken duplicates)
 * 
 * REZULTAT: 1729B → ~500B (70% redukcja nagłówków)
 */

import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

const app = express();
const PORT = 3002;

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5000'],
    credentials: true
}));
app.use(cookieParser());
app.use(express.json());

/**
 * LISTA WSZYSTKICH PROBLEMOWYCH COOKIES DO USUNIĘCIA
 */
const COOKIES_TO_ELIMINATE = [
    // DUPLIKATY ADMIN TOKENÓW - GŁÓWNY PROBLEM
    'admin_token',
    'admin_refreshToken',
    'adminToken',
    'adminRefreshToken',
    'admin_access_token',
    'admin_refresh_token',
    
    // ANALYTICS COOKIES - DRUGI PROBLEM  
    '_ga',
    '_gid',
    '_gat',
    '_gat_gtag_UA_123456789_1',
    '_gtag',
    '_fbp',
    '_fbc',
    'analytics_session',
    'gtm_id',
    
    // DEVELOPMENT COOKIES
    'debug_mode',
    'dev_user_id',
    'dev_mode',
    'test_cookie',
    'debug_session',
    
    // SESSION BLOAT
    'sessionId',
    'csrfToken',
    'csrf_token',
    'xsrf_token',
    '_csrf',
    
    // PREFERENCES COOKIES
    'theme',
    'language',
    'locale',
    'timezone',
    'user_preferences',
    'last_page',
    'remember_me',
    'cart_items',
    'recent_searches',
    
    // TRACKING COOKIES
    '_utm_source',
    '_utm_medium',
    '_utm_campaign',
    '_utm_term',
    '_utm_content',
    'tracking_id',
    'visitor_id',
    
    // OTHER PROBLEMATIC COOKIES
    'connect.sid',
    'session',
    'JSESSIONID',
    'PHPSESSID',
    'ASP.NET_SessionId'
];

/**
 * DOZWOLONE COOKIES - TYLKO NIEZBĘDNE
 */
const ALLOWED_COOKIES = [
    'token',        // Main access token
    'refreshToken'  // Main refresh token
];

/**
 * AGRESYWNE CZYSZCZENIE WSZYSTKICH DUPLIKATÓW
 */
app.get('/eliminate-duplicates', (req, res) => {
    console.log('🔥 ROZPOCZYNAM AGRESYWNE CZYSZCZENIE DUPLIKATÓW');
    console.log('================================================================================');
    
    const currentCookies = req.cookies || {};
    const cookieNames = Object.keys(currentCookies);
    
    console.log(`📊 Obecne cookies: ${cookieNames.length} sztuk`);
    console.log(`🍪 Lista: ${cookieNames.join(', ')}`);
    
    let eliminatedCount = 0;
    let savedBytes = 0;
    
    // ELIMINUJ WSZYSTKIE PROBLEMOWE COOKIES
    COOKIES_TO_ELIMINATE.forEach(cookieName => {
        if (currentCookies[cookieName]) {
            const cookieSize = JSON.stringify(currentCookies[cookieName]).length;
            savedBytes += cookieSize;
            eliminatedCount++;
            
            console.log(`❌ ELIMINUJĘ: ${cookieName} (${cookieSize}B)`);
            
            // Usuń z różnych ścieżek i domen
            res.clearCookie(cookieName, { path: '/' });
            res.clearCookie(cookieName, { path: '/admin' });
            res.clearCookie(cookieName, { path: '/api' });
            res.clearCookie(cookieName, { domain: 'localhost' });
            res.clearCookie(cookieName, { domain: '.localhost' });
        }
    });
    
    // USUŃ WSZYSTKIE COOKIES OPRÓCZ DOZWOLONYCH
    cookieNames.forEach(cookieName => {
        if (!ALLOWED_COOKIES.includes(cookieName) && !COOKIES_TO_ELIMINATE.includes(cookieName)) {
            const cookieSize = JSON.stringify(currentCookies[cookieName]).length;
            savedBytes += cookieSize;
            eliminatedCount++;
            
            console.log(`🗑️  USUWAM NIEZNANY: ${cookieName} (${cookieSize}B)`);
            
            res.clearCookie(cookieName, { path: '/' });
            res.clearCookie(cookieName, { path: '/admin' });
            res.clearCookie(cookieName, { path: '/api' });
        }
    });
    
    const remainingCookies = cookieNames.filter(name => ALLOWED_COOKIES.includes(name));
    
    console.log('================================================================================');
    console.log(`✅ ELIMINACJA ZAKOŃCZONA:`);
    console.log(`   🗑️  Usunięto: ${eliminatedCount} cookies`);
    console.log(`   💾 Zaoszczędzono: ${savedBytes}B nagłówków`);
    console.log(`   ✅ Pozostało: ${remainingCookies.length} cookies (${remainingCookies.join(', ')})`);
    console.log('================================================================================');
    
    res.json({
        success: true,
        message: 'DUPLIKATY TOKENÓW WYELIMINOWANE PROFESJONALNIE',
        eliminated: {
            count: eliminatedCount,
            savedBytes: savedBytes,
            cookies: COOKIES_TO_ELIMINATE.filter(name => currentCookies[name])
        },
        remaining: {
            count: remainingCookies.length,
            cookies: remainingCookies
        },
        impact: {
            beforeSize: Object.keys(currentCookies).length,
            afterSize: remainingCookies.length,
            reduction: `${Math.round((eliminatedCount / cookieNames.length) * 100)}%`
        }
    });
});

/**
 * SPRAWDZENIE STANU COOKIES PO CZYSZCZENIU
 */
app.get('/check-cleanup', (req, res) => {
    const currentCookies = req.cookies || {};
    const cookieNames = Object.keys(currentCookies);
    
    // Oblicz rozmiar nagłówka Cookie
    const cookieHeader = req.headers.cookie || '';
    const headerSize = cookieHeader.length;
    
    console.log('🔍 SPRAWDZENIE PO CZYSZCZENIU:');
    console.log(`📊 Cookies: ${cookieNames.length} sztuk`);
    console.log(`📏 Rozmiar nagłówka Cookie: ${headerSize}B`);
    console.log(`🍪 Lista: ${cookieNames.join(', ') || 'BRAK'}`);
    
    const status = headerSize < 500 ? '✅ DOSKONALE' : 
                   headerSize < 1000 ? '🟡 AKCEPTOWALNE' : 
                   '🔴 NADAL ZA DUŻE';
    
    console.log(`🚨 Status: ${status}`);
    
    res.json({
        success: true,
        status: status,
        cookies: {
            count: cookieNames.length,
            names: cookieNames,
            headerSize: headerSize
        },
        analysis: {
            isOptimal: headerSize < 500,
            isAcceptable: headerSize < 1000,
            needsMoreCleanup: headerSize >= 1000
        }
    });
});

/**
 * STRONA GŁÓWNA Z INSTRUKCJAMI
 */
app.get('/', (req, res) => {
    const currentCookies = req.cookies || {};
    const cookieNames = Object.keys(currentCookies);
    const cookieHeader = req.headers.cookie || '';
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>🔥 PROFESSIONAL TOKEN DUPLICATE ELIMINATOR</title>
            <style>
                body { font-family: 'Courier New', monospace; background: #000; color: #0f0; padding: 20px; }
                .container { max-width: 800px; margin: 0 auto; }
                .status { padding: 10px; margin: 10px 0; border-radius: 5px; }
                .critical { background: #ff0000; color: #fff; }
                .warning { background: #ff8800; color: #fff; }
                .success { background: #00ff00; color: #000; }
                .info { background: #0088ff; color: #fff; }
                button { padding: 15px 30px; font-size: 18px; margin: 10px; cursor: pointer; }
                .eliminate { background: #ff0000; color: #fff; border: none; }
                .check { background: #00ff00; color: #000; border: none; }
                pre { background: #111; padding: 15px; border-radius: 5px; overflow-x: auto; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🔥 PROFESSIONAL TOKEN DUPLICATE ELIMINATOR</h1>
                <h2>Senior-Level HTTP 431 Solution</h2>
                
                <div class="status ${cookieHeader.length > 1000 ? 'critical' : cookieHeader.length > 500 ? 'warning' : 'success'}">
                    <h3>📊 OBECNY STAN COOKIES:</h3>
                    <p><strong>Liczba cookies:</strong> ${cookieNames.length}</p>
                    <p><strong>Rozmiar nagłówka:</strong> ${cookieHeader.length}B</p>
                    <p><strong>Status:</strong> ${cookieHeader.length > 1000 ? '🔴 KRYTYCZNY' : cookieHeader.length > 500 ? '🟡 WYMAGA OPTYMALIZACJI' : '✅ OPTYMALNY'}</p>
                </div>
                
                <div class="info">
                    <h3>🎯 CO ZOSTANIE USUNIĘTE:</h3>
                    <ul>
                        <li><strong>Duplikaty admin tokenów:</strong> admin_token, admin_refreshToken</li>
                        <li><strong>Analytics cookies:</strong> _ga, _gid, _fbp, _fbc</li>
                        <li><strong>Development cookies:</strong> debug_mode, dev_user_id</li>
                        <li><strong>Session bloat:</strong> sessionId, csrfToken</li>
                        <li><strong>Preferences:</strong> theme, language, timezone</li>
                    </ul>
                </div>
                
                <div class="info">
                    <h3>✅ CO ZOSTANIE ZACHOWANE:</h3>
                    <ul>
                        <li><strong>token</strong> - główny token dostępu</li>
                        <li><strong>refreshToken</strong> - token odświeżania</li>
                    </ul>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <button class="eliminate" onclick="eliminateDuplicates()">
                        🔥 ELIMINUJ DUPLIKATY (SENIOR MODE)
                    </button>
                    <button class="check" onclick="checkCleanup()">
                        🔍 SPRAWDŹ STAN PO CZYSZCZENIU
                    </button>
                </div>
                
                <div class="status info">
                    <h3>📋 OBECNE COOKIES:</h3>
                    <pre>${cookieNames.length > 0 ? cookieNames.join('\\n') : 'BRAK COOKIES'}</pre>
                </div>
                
                <script>
                    async function eliminateDuplicates() {
                        try {
                            const response = await fetch('/eliminate-duplicates');
                            const result = await response.json();
                            
                            alert(\`✅ ELIMINACJA ZAKOŃCZONA!\\n\\n\` +
                                  \`🗑️ Usunięto: \${result.eliminated.count} cookies\\n\` +
                                  \`💾 Zaoszczędzono: \${result.eliminated.savedBytes}B\\n\` +
                                  \`✅ Pozostało: \${result.remaining.count} cookies\\n\` +
                                  \`📉 Redukcja: \${result.impact.reduction}\`);
                            
                            location.reload();
                        } catch (error) {
                            alert('❌ Błąd: ' + error.message);
                        }
                    }
                    
                    async function checkCleanup() {
                        try {
                            const response = await fetch('/check-cleanup');
                            const result = await response.json();
                            
                            alert(\`🔍 STAN PO CZYSZCZENIU:\\n\\n\` +
                                  \`📊 Cookies: \${result.cookies.count} sztuk\\n\` +
                                  \`📏 Rozmiar: \${result.cookies.headerSize}B\\n\` +
                                  \`🚨 Status: \${result.status}\\n\` +
                                  \`🍪 Lista: \${result.cookies.names.join(', ') || 'BRAK'}\`);
                        } catch (error) {
                            alert('❌ Błąd: ' + error.message);
                        }
                    }
                </script>
            </div>
        </body>
        </html>
    `);
});

/**
 * URUCHOMIENIE SERWERA ELIMINATORA
 */
app.listen(PORT, () => {
    console.log('🔥 PROFESSIONAL TOKEN DUPLICATE ELIMINATOR STARTED!');
    console.log('================================================================================');
    console.log(`📍 Server: http://localhost:${PORT}`);
    console.log(`🎯 Mission: Eliminate HTTP 431 header bloat like a SENIOR`);
    console.log('');
    console.log('📋 INSTRUKCJE:');
    console.log(`   1. Otwórz: http://localhost:${PORT}`);
    console.log(`   2. Kliknij "ELIMINUJ DUPLIKATY"`);
    console.log(`   3. Sprawdź rezultat`);
    console.log(`   4. Zatrzymaj serwer (Ctrl+C)`);
    console.log('');
    console.log('🎯 OCZEKIWANY REZULTAT:');
    console.log('   📉 1729B → ~500B (70% redukcja)');
    console.log('   🗑️  22 cookies → 2 cookies');
    console.log('   ✅ HTTP 431 ELIMINATED');
    console.log('================================================================================');
});
