const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

/**
 * Szczegółowa analiza nagłówków HTTP
 */
async function analyzeHeaders() {
    console.log('🔍 SZCZEGÓŁOWA ANALIZA NAGŁÓWKÓW HTTP\n');
    
    try {
        // Test 1: Podstawowe żądanie bez cookies
        console.log('1️⃣ ŻĄDANIE BEZ COOKIES (baseline)');
        console.log('=' .repeat(50));
        
        const baselineResponse = await axios.get(`${BASE_URL}/api/health`, {
            validateStatus: () => true,
            timeout: 10000
        });
        
        console.log(`Status: ${baselineResponse.status}`);
        console.log('Nagłówki żądania (wysłane):');
        if (baselineResponse.config.headers) {
            Object.entries(baselineResponse.config.headers).forEach(([key, value]) => {
                const size = Buffer.byteLength(`${key}: ${value}\r\n`, 'utf8');
                console.log(`  ${key}: ${value} (${size} bajtów)`);
            });
        }
        
        console.log('\nNagłówki odpowiedzi (otrzymane):');
        let totalResponseSize = 0;
        Object.entries(baselineResponse.headers).forEach(([key, value]) => {
            const size = Buffer.byteLength(`${key}: ${value}\r\n`, 'utf8');
            totalResponseSize += size;
            console.log(`  ${key}: ${value} (${size} bajtów)`);
        });
        console.log(`\nCałkowity rozmiar nagłówków odpowiedzi: ${totalResponseSize} bajtów\n`);
        
        // Test 2: Żądanie z symulowanymi cookies
        console.log('2️⃣ ŻĄDANIE Z SYMULOWANYMI COOKIES');
        console.log('=' .repeat(50));
        
        // Symuluj typowe cookies z aplikacji
        const simulatedCookies = [
            'token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzQxYjI4ZjU4YzQyZjAwMTIzNDU2NzgiLCJyb2xlIjoidXNlciIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3MzI0NzI5NzUsImp0aSI6IjEyMzQ1Njc4OTBhYmNkZWYifQ.abcdefghijklmnopqrstuvwxyz1234567890',
            'refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzQxYjI4ZjU4YzQyZjAwMTIzNDU2NzgiLCJyb2xlIjoidXNlciIsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzMyNDcyOTc1LCJqdGkiOiIwOTg3NjU0MzIxZmVkY2JhIn0.zyxwvutsrqponmlkjihgfedcba0987654321',
            'sessionId=sess_1732472975_abc123def456',
            'csrfToken=csrf_token_1234567890abcdef',
            'preferences={"theme":"dark","language":"pl"}',
            'lastActivity=1732472975000'
        ];
        
        const cookieHeader = simulatedCookies.join('; ');
        console.log(`Cookie header: ${cookieHeader.substring(0, 100)}... (${cookieHeader.length} bajtów)`);
        
        const cookieResponse = await axios.get(`${BASE_URL}/api/health`, {
            headers: {
                'Cookie': cookieHeader,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'pl-PL,pl;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Cache-Control': 'max-age=0'
            },
            validateStatus: () => true,
            timeout: 10000
        });
        
        console.log(`\nStatus: ${cookieResponse.status}`);
        
        // Analiza nagłówków żądania
        console.log('\nNagłówki żądania (wysłane):');
        let totalRequestSize = 0;
        const requestHeaders = {
            'Cookie': cookieHeader,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'pl-PL,pl;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Host': 'localhost:3000'
        };
        
        Object.entries(requestHeaders).forEach(([key, value]) => {
            const size = Buffer.byteLength(`${key}: ${value}\r\n`, 'utf8');
            totalRequestSize += size;
            if (key === 'Cookie') {
                console.log(`  ${key}: ${value.substring(0, 50)}... (${size} bajtów) ⚠️ DUŻY`);
            } else {
                console.log(`  ${key}: ${value} (${size} bajtów)`);
            }
        });
        
        console.log(`\nCałkowity rozmiar nagłówków żądania: ${totalRequestSize} bajtów`);
        
        // Sprawdź limity
        const limits = {
            'Typowy limit serwera HTTP': 8192,
            'Nasz zwiększony limit': 65536,
            'Middleware limit (stary)': 32768,
            'Middleware limit (nowy)': 65536
        };
        
        console.log('\n📊 PORÓWNANIE Z LIMITAMI:');
        Object.entries(limits).forEach(([name, limit]) => {
            const percentage = ((totalRequestSize / limit) * 100).toFixed(2);
            const status = totalRequestSize > limit ? '❌ PRZEKROCZONY' : 
                         totalRequestSize > limit * 0.8 ? '⚠️ BLISKO LIMITU' : '✅ OK';
            console.log(`  ${name}: ${limit} bajtów - ${percentage}% ${status}`);
        });
        
        // Test 3: Analiza poszczególnych cookies
        console.log('\n3️⃣ ANALIZA POSZCZEGÓLNYCH COOKIES');
        console.log('=' .repeat(50));
        
        simulatedCookies.forEach((cookie, index) => {
            const [name, value] = cookie.split('=');
            const size = Buffer.byteLength(cookie, 'utf8');
            console.log(`Cookie ${index + 1}: ${name}`);
            console.log(`  Wartość: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
            console.log(`  Rozmiar: ${size} bajtów`);
            console.log('');
        });
        
        // Test 4: Sprawdź czy problem jest w middleware
        if (cookieResponse.status === 431) {
            console.log('4️⃣ ANALIZA BŁĘDU HTTP 431');
            console.log('=' .repeat(50));
            console.log('❌ Serwer zwrócił błąd HTTP 431 - Request Header Fields Too Large');
            console.log('');
            console.log('Możliwe przyczyny:');
            console.log('1. Middleware headerSizeMonitor blokuje żądanie');
            console.log('2. Serwer Express ma zbyt niski limit');
            console.log('3. Proxy/load balancer ma ograniczenia');
            console.log('4. Nagłówki są rzeczywiście za duże');
            
            if (cookieResponse.data) {
                console.log('\nOdpowiedź serwera:');
                console.log(JSON.stringify(cookieResponse.data, null, 2));
            }
        }
        
        // Test 5: Sprawdź endpoint panelu admina
        console.log('\n5️⃣ TEST ENDPOINTU PANELU ADMINA');
        console.log('=' .repeat(50));
        
        const adminResponse = await axios.get(`${BASE_URL}/api/admin-panel`, {
            headers: {
                'Cookie': cookieHeader
            },
            validateStatus: () => true,
            timeout: 10000
        });
        
        console.log(`Status panelu admina: ${adminResponse.status}`);
        if (adminResponse.status === 431) {
            console.log('❌ Panel admina również zwraca HTTP 431');
            if (adminResponse.data) {
                console.log('Odpowiedź:', JSON.stringify(adminResponse.data, null, 2));
            }
        } else {
            console.log('✅ Panel admina odpowiada poprawnie');
        }
        
    } catch (error) {
        console.error('❌ Błąd podczas analizy:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Serwer nie jest uruchomiony. Uruchom go komendą: npm start');
        } else if (error.code === 'ETIMEDOUT') {
            console.log('\n💡 Timeout - serwer może być przeciążony lub zawieszony');
        }
    }
}

console.log('🚀 ANALIZA NAGŁÓWKÓW HTTP - DIAGNOSTYKA BŁĘDU 431\n');
analyzeHeaders();
