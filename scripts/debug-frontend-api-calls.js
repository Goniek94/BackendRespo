const puppeteer = require('puppeteer');
const fs = require('fs');

async function debugFrontendAPICalls() {
    console.log('🔍 Debugowanie wywołań API z frontendu...\n');
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false,
            devtools: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Przechwytywanie wszystkich requestów
        const requests = [];
        const responses = [];
        const consoleMessages = [];
        
        page.on('request', request => {
            const url = request.url();
            const method = request.method();
            const headers = request.headers();
            
            requests.push({
                timestamp: new Date().toISOString(),
                method,
                url,
                headers,
                postData: request.postData()
            });
            
            console.log(`📤 REQUEST: ${method} ${url}`);
            if (url.includes('admin') || url.includes('dashboard')) {
                console.log(`   🎯 ADMIN REQUEST DETECTED!`);
                console.log(`   Headers:`, JSON.stringify(headers, null, 2));
            }
        });
        
        page.on('response', response => {
            const url = response.url();
            const status = response.status();
            
            responses.push({
                timestamp: new Date().toISOString(),
                url,
                status,
                headers: response.headers()
            });
            
            console.log(`📥 RESPONSE: ${status} ${url}`);
            if (url.includes('admin') || url.includes('dashboard')) {
                console.log(`   🎯 ADMIN RESPONSE: ${status}`);
            }
        });
        
        page.on('console', msg => {
            const text = msg.text();
            consoleMessages.push({
                timestamp: new Date().toISOString(),
                type: msg.type(),
                text
            });
            
            console.log(`🖥️  CONSOLE [${msg.type()}]: ${text}`);
            if (text.includes('dashboard') || text.includes('admin') || text.includes('API')) {
                console.log(`   🎯 RELEVANT CONSOLE MESSAGE!`);
            }
        });
        
        // Przejdź do panelu admina
        console.log('\n🌐 Nawigacja do panelu admina...');
        await page.goto('http://localhost:3000/admin', { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        // Czekaj na załadowanie
        await page.waitForTimeout(5000);
        
        // Sprawdź czy są jakieś błędy w konsoli
        console.log('\n📊 Analiza wywołań API:');
        
        const adminRequests = requests.filter(req => 
            req.url.includes('admin') || 
            req.url.includes('dashboard') ||
            req.url.includes('api')
        );
        
        const adminResponses = responses.filter(res => 
            res.url.includes('admin') || 
            res.url.includes('dashboard') ||
            res.url.includes('api')
        );
        
        console.log(`\n🔢 Statystyki:`);
        console.log(`   Wszystkie requesty: ${requests.length}`);
        console.log(`   Admin/API requesty: ${adminRequests.length}`);
        console.log(`   Wszystkie response: ${responses.length}`);
        console.log(`   Admin/API response: ${adminResponses.length}`);
        
        if (adminRequests.length === 0) {
            console.log('\n❌ PROBLEM: Frontend NIE WYSYŁA żadnych requestów do API admin!');
        } else {
            console.log('\n✅ Frontend wysyła requesty do API admin:');
            adminRequests.forEach((req, index) => {
                console.log(`   ${index + 1}. ${req.method} ${req.url}`);
            });
        }
        
        if (adminResponses.length > 0) {
            console.log('\n📥 Odpowiedzi z API admin:');
            adminResponses.forEach((res, index) => {
                console.log(`   ${index + 1}. ${res.status} ${res.url}`);
            });
        }
        
        // Sprawdź localStorage i sessionStorage
        const localStorage = await page.evaluate(() => {
            const storage = {};
            for (let i = 0; i < window.localStorage.length; i++) {
                const key = window.localStorage.key(i);
                storage[key] = window.localStorage.getItem(key);
            }
            return storage;
        });
        
        const sessionStorage = await page.evaluate(() => {
            const storage = {};
            for (let i = 0; i < window.sessionStorage.length; i++) {
                const key = window.sessionStorage.key(i);
                storage[key] = window.sessionStorage.getItem(key);
            }
            return storage;
        });
        
        console.log('\n💾 LocalStorage:', JSON.stringify(localStorage, null, 2));
        console.log('\n💾 SessionStorage:', JSON.stringify(sessionStorage, null, 2));
        
        // Sprawdź cookies
        const cookies = await page.cookies();
        console.log('\n🍪 Cookies:');
        cookies.forEach(cookie => {
            console.log(`   ${cookie.name}: ${cookie.value}`);
        });
        
        // Zapisz szczegółowy raport
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalRequests: requests.length,
                adminRequests: adminRequests.length,
                totalResponses: responses.length,
                adminResponses: adminResponses.length
            },
            requests: adminRequests,
            responses: adminResponses,
            consoleMessages: consoleMessages.filter(msg => 
                msg.text.includes('dashboard') || 
                msg.text.includes('admin') || 
                msg.text.includes('API') ||
                msg.text.includes('error') ||
                msg.text.includes('Error')
            ),
            localStorage,
            sessionStorage,
            cookies
        };
        
        fs.writeFileSync('scripts/frontend-api-debug-report.json', JSON.stringify(report, null, 2));
        console.log('\n📄 Szczegółowy raport zapisany w: scripts/frontend-api-debug-report.json');
        
        // Sprawdź czy dashboard się załadował
        try {
            await page.waitForSelector('[data-testid="admin-dashboard"], .admin-dashboard, .dashboard', { timeout: 5000 });
            console.log('\n✅ Dashboard się załadował');
        } catch (error) {
            console.log('\n❌ Dashboard się NIE załadował lub nie ma odpowiednich selektorów');
        }
        
        // Sprawdź czy są jakieś liczby na dashboardzie
        const dashboardText = await page.evaluate(() => {
            return document.body.innerText;
        });
        
        const hasNumbers = /\d+/.test(dashboardText);
        const hasZeros = dashboardText.includes('0');
        
        console.log(`\n🔢 Dashboard zawiera liczby: ${hasNumbers}`);
        console.log(`🔢 Dashboard zawiera zera: ${hasZeros}`);
        
        if (hasZeros && !hasNumbers) {
            console.log('❌ PROBLEM: Dashboard pokazuje tylko zera!');
        }
        
        console.log('\n🔍 Analiza zakończona. Sprawdź raport w scripts/frontend-api-debug-report.json');
        
    } catch (error) {
        console.error('❌ Błąd podczas debugowania:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Uruchom debugowanie
debugFrontendAPICalls().catch(console.error);
