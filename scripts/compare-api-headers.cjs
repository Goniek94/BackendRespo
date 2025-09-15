const fs = require('fs');
const path = require('path');

async function compareAPIHeaders() {
    console.log('🔍 Porównanie konfiguracji tokenów i nagłówków...\n');
    
    const results = {
        frontend: {
            config: null,
            useAdminApi: null,
            authApi: null,
            client: null
        },
        backend: {
            adminAuth: null,
            userAuth: null,
            cookieConfig: null
        }
    };
    
    // Sprawdź frontend config
    try {
        const configPath = '../marketplace-frontend/src/services/api/config.js';
        if (fs.existsSync(configPath)) {
            const config = fs.readFileSync(configPath, 'utf8');
            results.frontend.config = {
                hasHttpOnlyCookies: config.includes('HttpOnly'),
                hasCredentialsInclude: config.includes("credentials: 'include'"),
                hasTokenManagement: config.includes('getAuthToken'),
                apiUrl: config.match(/API_URL.*=.*['"`]([^'"`]+)['"`]/)?.[1] || 'not found'
            };
        }
    } catch (error) {
        console.error('Błąd czytania config.js:', error.message);
    }
    
    // Sprawdź useAdminApi hook
    try {
        const adminApiPath = '../marketplace-frontend/src/components/admin/hooks/useAdminApi.js';
        if (fs.existsSync(adminApiPath)) {
            const adminApi = fs.readFileSync(adminApiPath, 'utf8');
            results.frontend.useAdminApi = {
                baseUrl: adminApi.match(/http:\/\/localhost:\d+\/api\/admin-panel/)?.[0] || 'not found',
                hasCredentialsInclude: adminApi.includes("credentials: 'include'"),
                hasContentType: adminApi.includes("'Content-Type': 'application/json'"),
                defaultHeaders: adminApi.match(/headers:\s*{([^}]+)}/g) || []
            };
        }
    } catch (error) {
        console.error('Błąd czytania useAdminApi.js:', error.message);
    }
    
    // Sprawdź client.js
    try {
        const clientPath = '../marketplace-frontend/src/services/api/client.js';
        if (fs.existsSync(clientPath)) {
            const client = fs.readFileSync(clientPath, 'utf8');
            results.frontend.client = {
                hasAxiosConfig: client.includes('axios'),
                hasCredentials: client.includes('withCredentials'),
                hasInterceptors: client.includes('interceptors'),
                baseURL: client.match(/baseURL.*['"`]([^'"`]+)['"`]/)?.[1] || 'not found'
            };
        }
    } catch (error) {
        console.error('Błąd czytania client.js:', error.message);
    }
    
    // Sprawdź backend admin auth
    try {
        const adminAuthPath = 'admin/middleware/adminAuth.js';
        if (fs.existsSync(adminAuthPath)) {
            const adminAuth = fs.readFileSync(adminAuthPath, 'utf8');
            results.backend.adminAuth = {
                hasCookieAuth: adminAuth.includes('req.cookies'),
                hasJWTVerify: adminAuth.includes('jwt.verify'),
                hasRoleCheck: adminAuth.includes('role'),
                cookieNames: adminAuth.match(/req\.cookies\.(\w+)/g) || []
            };
        }
    } catch (error) {
        console.error('Błąd czytania adminAuth.js:', error.message);
    }
    
    // Sprawdź backend user auth
    try {
        const userAuthPath = 'middleware/auth.js';
        if (fs.existsSync(userAuthPath)) {
            const userAuth = fs.readFileSync(userAuthPath, 'utf8');
            results.backend.userAuth = {
                hasCookieAuth: userAuth.includes('req.cookies'),
                hasJWTVerify: userAuth.includes('jwt.verify'),
                hasRoleCheck: userAuth.includes('role'),
                cookieNames: userAuth.match(/req\.cookies\.(\w+)/g) || []
            };
        }
    } catch (error) {
        console.error('Błąd czytania auth.js:', error.message);
    }
    
    // Sprawdź cookie config
    try {
        const cookieConfigPath = 'config/cookieConfig.js';
        if (fs.existsSync(cookieConfigPath)) {
            const cookieConfig = fs.readFileSync(cookieConfigPath, 'utf8');
            results.backend.cookieConfig = {
                hasHttpOnly: cookieConfig.includes('httpOnly'),
                hasSecure: cookieConfig.includes('secure'),
                hasSameSite: cookieConfig.includes('sameSite'),
                cookieNames: cookieConfig.match(/['"`](\w+)['"`]:\s*{/g) || []
            };
        }
    } catch (error) {
        console.error('Błąd czytania cookieConfig.js:', error.message);
    }
    
    // Wyświetl wyniki
    console.log('📊 WYNIKI PORÓWNANIA:\n');
    
    console.log('🖥️  FRONTEND:');
    console.log('   Config.js:');
    if (results.frontend.config) {
        console.log(`     - API URL: ${results.frontend.config.apiUrl}`);
        console.log(`     - HttpOnly cookies: ${results.frontend.config.hasHttpOnlyCookies ? '✅' : '❌'}`);
        console.log(`     - credentials: 'include': ${results.frontend.config.hasCredentialsInclude ? '✅' : '❌'}`);
        console.log(`     - Token management: ${results.frontend.config.hasTokenManagement ? '✅' : '❌'}`);
    } else {
        console.log('     ❌ Nie można odczytać');
    }
    
    console.log('\n   useAdminApi.js:');
    if (results.frontend.useAdminApi) {
        console.log(`     - Base URL: ${results.frontend.useAdminApi.baseUrl}`);
        console.log(`     - credentials: 'include': ${results.frontend.useAdminApi.hasCredentialsInclude ? '✅' : '❌'}`);
        console.log(`     - Content-Type header: ${results.frontend.useAdminApi.hasContentType ? '✅' : '❌'}`);
        console.log(`     - Default headers: ${results.frontend.useAdminApi.defaultHeaders.length}`);
    } else {
        console.log('     ❌ Nie można odczytać');
    }
    
    console.log('\n   client.js:');
    if (results.frontend.client) {
        console.log(`     - Base URL: ${results.frontend.client.baseURL}`);
        console.log(`     - Axios config: ${results.frontend.client.hasAxiosConfig ? '✅' : '❌'}`);
        console.log(`     - withCredentials: ${results.frontend.client.hasCredentials ? '✅' : '❌'}`);
        console.log(`     - Interceptors: ${results.frontend.client.hasInterceptors ? '✅' : '❌'}`);
    } else {
        console.log('     ❌ Nie można odczytać');
    }
    
    console.log('\n🖥️  BACKEND:');
    console.log('   Admin Auth:');
    if (results.backend.adminAuth) {
        console.log(`     - Cookie auth: ${results.backend.adminAuth.hasCookieAuth ? '✅' : '❌'}`);
        console.log(`     - JWT verify: ${results.backend.adminAuth.hasJWTVerify ? '✅' : '❌'}`);
        console.log(`     - Role check: ${results.backend.adminAuth.hasRoleCheck ? '✅' : '❌'}`);
        console.log(`     - Cookie names: ${results.backend.adminAuth.cookieNames.join(', ') || 'none'}`);
    } else {
        console.log('     ❌ Nie można odczytać');
    }
    
    console.log('\n   User Auth:');
    if (results.backend.userAuth) {
        console.log(`     - Cookie auth: ${results.backend.userAuth.hasCookieAuth ? '✅' : '❌'}`);
        console.log(`     - JWT verify: ${results.backend.userAuth.hasJWTVerify ? '✅' : '❌'}`);
        console.log(`     - Role check: ${results.backend.userAuth.hasRoleCheck ? '✅' : '❌'}`);
        console.log(`     - Cookie names: ${results.backend.userAuth.cookieNames.join(', ') || 'none'}`);
    } else {
        console.log('     ❌ Nie można odczytać');
    }
    
    console.log('\n   Cookie Config:');
    if (results.backend.cookieConfig) {
        console.log(`     - HttpOnly: ${results.backend.cookieConfig.hasHttpOnly ? '✅' : '❌'}`);
        console.log(`     - Secure: ${results.backend.cookieConfig.hasSecure ? '✅' : '❌'}`);
        console.log(`     - SameSite: ${results.backend.cookieConfig.hasSameSite ? '✅' : '❌'}`);
        console.log(`     - Cookie names: ${results.backend.cookieConfig.cookieNames.join(', ') || 'none'}`);
    } else {
        console.log('     ❌ Nie można odczytać');
    }
    
    // Analiza problemów
    console.log('\n🔍 ANALIZA PROBLEMÓW:');
    
    const issues = [];
    
    // Sprawdź czy URL-e się zgadzają
    const frontendApiUrl = results.frontend.config?.apiUrl;
    const adminApiUrl = results.frontend.useAdminApi?.baseUrl;
    const clientBaseUrl = results.frontend.client?.baseURL;
    
    if (frontendApiUrl && adminApiUrl && !adminApiUrl.includes(frontendApiUrl)) {
        issues.push('❌ Niezgodność URL-i między config.js a useAdminApi.js');
    }
    
    // Sprawdź credentials
    if (!results.frontend.config?.hasCredentialsInclude) {
        issues.push('❌ Brak credentials: "include" w config.js');
    }
    
    if (!results.frontend.useAdminApi?.hasCredentialsInclude) {
        issues.push('❌ Brak credentials: "include" w useAdminApi.js');
    }
    
    // Sprawdź backend auth
    if (!results.backend.adminAuth?.hasCookieAuth) {
        issues.push('❌ Admin auth nie sprawdza cookies');
    }
    
    if (!results.backend.userAuth?.hasCookieAuth) {
        issues.push('❌ User auth nie sprawdza cookies');
    }
    
    if (issues.length === 0) {
        console.log('✅ Nie znaleziono oczywistych problemów z konfiguracją');
    } else {
        issues.forEach(issue => console.log(`   ${issue}`));
    }
    
    // Zapisz szczegółowy raport
    fs.writeFileSync('scripts/api-headers-comparison.json', JSON.stringify(results, null, 2));
    console.log('\n📄 Szczegółowy raport zapisany w: scripts/api-headers-comparison.json');
}

compareAPIHeaders().catch(console.error);
