const fs = require('fs');

function fixDashboardAPICalls() {
    console.log('🔧 Naprawiam wywołania API w dashboardzie...\n');
    
    try {
        // Sprawdź AdminDashboard komponent
        const dashboardPath = '../marketplace-frontend/src/components/admin/sections/Dashboard/AdminDashboard.js';
        let dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
        
        console.log('📋 Analiza AdminDashboard:');
        
        // Sprawdź czy ma debug logi
        const hasDebugLogs = dashboardContent.includes('console.log(\'🔄 Pobieranie danych dashboardu...\')');
        console.log(`   Debug logi: ${hasDebugLogs ? '✅' : '❌'}`);
        
        // Sprawdź czy wywołuje getDashboardStats
        const callsAPI = dashboardContent.includes('await getDashboardStats()');
        console.log(`   Wywołuje API: ${callsAPI ? '✅' : '❌'}`);
        
        // Sprawdź useEffect dependencies
        const hasCorrectDeps = dashboardContent.includes('[getDashboardStats]');
        console.log(`   Poprawne dependencies: ${hasCorrectDeps ? '✅' : '❌'}`);
        
        if (!hasDebugLogs || !callsAPI || !hasCorrectDeps) {
            console.log('\n🔧 Naprawiam AdminDashboard...');
            
            // Dodaj więcej debug logów
            if (!dashboardContent.includes('console.log(\'🚀 AdminDashboard renderuje się...\')')) {
                dashboardContent = dashboardContent.replace(
                    'const AdminDashboard = () => {',
                    `const AdminDashboard = () => {
  console.log('🚀 AdminDashboard renderuje się...');`
                );
            }
            
            // Upewnij się że useEffect ma poprawne dependencies i wywołuje API
            const useEffectRegex = /useEffect\(\(\) => \{[\s\S]*?\}, \[([^\]]*)\]\);/;
            const match = dashboardContent.match(useEffectRegex);
            
            if (match) {
                const currentDeps = match[1];
                if (!currentDeps.includes('getDashboardStats')) {
                    console.log('   ✅ Naprawiam dependencies useEffect');
                    dashboardContent = dashboardContent.replace(
                        match[0],
                        match[0].replace(`[${currentDeps}]`, '[getDashboardStats]')
                    );
                }
            }
            
            // Zapisz naprawiony plik
            fs.writeFileSync(dashboardPath, dashboardContent);
            console.log('   ✅ AdminDashboard naprawiony');
        } else {
            console.log('   ✅ AdminDashboard wygląda poprawnie');
        }
        
        // Sprawdź useAdminApi hook
        console.log('\n📋 Analiza useAdminApi hook:');
        const hookPath = '../marketplace-frontend/src/components/admin/hooks/useAdminApi.js';
        const hookContent = fs.readFileSync(hookPath, 'utf8');
        
        // Sprawdź czy getDashboardStats jest eksportowane
        const exportMatch = hookContent.match(/return \{[\s\S]*?getDashboardStats[\s\S]*?\}/);
        const isExported = !!exportMatch;
        console.log(`   getDashboardStats eksportowane: ${isExported ? '✅' : '❌'}`);
        
        if (!isExported) {
            console.log('   ❌ PROBLEM: getDashboardStats nie jest eksportowane!');
            console.log('   💡 Sprawdź czy hook ma getDashboardStats w return statement');
        }
        
        // Sprawdź routing
        console.log('\n📋 Sprawdzam routing admin panel:');
        
        // Sprawdź App.js
        const appPath = '../marketplace-frontend/src/App.js';
        if (fs.existsSync(appPath)) {
            const appContent = fs.readFileSync(appPath, 'utf8');
            const hasAdminRoute = appContent.includes('/admin') || appContent.includes('AdminPanel');
            console.log(`   App.js ma routing admin: ${hasAdminRoute ? '✅' : '❌'}`);
            
            if (!hasAdminRoute) {
                console.log('   ❌ PROBLEM: Brak routingu do /admin w App.js!');
            }
        } else {
            console.log('   ❌ Nie można znaleźć App.js');
        }
        
        console.log('\n🔍 DIAGNOZA:');
        
        if (!isExported) {
            console.log('❌ GŁÓWNY PROBLEM: getDashboardStats nie jest eksportowane z hooka!');
            console.log('💡 ROZWIĄZANIE: Dodaj getDashboardStats do return statement w useAdminApi');
        } else if (!hasDebugLogs) {
            console.log('❌ PROBLEM: Dashboard nie ma debug logów - może się nie renderować');
            console.log('💡 ROZWIĄZANIE: Dodano debug logi do komponentu');
        } else {
            console.log('✅ Konfiguracja wygląda poprawnie');
            console.log('💡 Problem może być w:');
            console.log('   - Routing nie działa (/admin nie prowadzi do AdminPanel)');
            console.log('   - Frontend nie jest przebudowany po zmianach');
            console.log('   - React ma błędy w konsoli');
        }
        
    } catch (error) {
        console.error('❌ Błąd podczas naprawy:', error.message);
    }
}

fixDashboardAPICalls();
