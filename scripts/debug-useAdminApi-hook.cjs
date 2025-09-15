const fs = require('fs');

function debugUseAdminApiHook() {
    console.log('🔍 Debugowanie hooka useAdminApi...\n');
    
    try {
        // Sprawdź useAdminApi hook
        const hookPath = '../marketplace-frontend/src/components/admin/hooks/useAdminApi.js';
        const hookContent = fs.readFileSync(hookPath, 'utf8');
        
        console.log('📋 Analiza hooka useAdminApi:');
        
        // Sprawdź czy getDashboardStats jest eksportowane
        const hasGetDashboardStats = hookContent.includes('getDashboardStats');
        console.log(`   ✓ Ma getDashboardStats: ${hasGetDashboardStats}`);
        
        // Sprawdź czy używa poprawnego URL
        const hasCorrectURL = hookContent.includes('http://localhost:5000/api/admin-panel');
        console.log(`   ✓ Ma poprawny URL: ${hasCorrectURL}`);
        
        // Sprawdź czy używa credentials: 'include'
        const hasCredentials = hookContent.includes("credentials: 'include'");
        console.log(`   ✓ Ma credentials include: ${hasCredentials}`);
        
        // Sprawdź implementację getDashboardStats
        const getDashboardStatsMatch = hookContent.match(/const getDashboardStats = useCallback\(async \(\) => \{([^}]+)\}/s);
        if (getDashboardStatsMatch) {
            console.log('   ✓ getDashboardStats implementacja znaleziona');
            const implementation = getDashboardStatsMatch[1];
            console.log(`   📝 Implementacja: ${implementation.trim().substring(0, 100)}...`);
            
            // Sprawdź czy wywołuje get('/dashboard')
            const callsGetDashboard = implementation.includes("get('/dashboard')");
            console.log(`   ✓ Wywołuje get('/dashboard'): ${callsGetDashboard}`);
        } else {
            console.log('   ❌ getDashboardStats implementacja NIE ZNALEZIONA!');
        }
        
        // Sprawdź czy hook jest poprawnie eksportowany
        const exportMatch = hookContent.match(/return \{([^}]+)\}/s);
        if (exportMatch) {
            const exports = exportMatch[1];
            const exportsDashboardStats = exports.includes('getDashboardStats');
            console.log(`   ✓ Eksportuje getDashboardStats: ${exportsDashboardStats}`);
        }
        
        console.log('\n📋 Analiza AdminDashboard komponentu:');
        
        // Sprawdź AdminDashboard
        const dashboardPath = '../marketplace-frontend/src/components/admin/sections/Dashboard/AdminDashboard.js';
        const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
        
        // Sprawdź import
        const hasImport = dashboardContent.includes("import useAdminApi from '../../hooks/useAdminApi'");
        console.log(`   ✓ Ma poprawny import: ${hasImport}`);
        
        // Sprawdź destrukturyzację
        const hasDestructuring = dashboardContent.includes('const { getDashboardStats, loading, error } = useAdminApi()');
        console.log(`   ✓ Ma poprawną destrukturyzację: ${hasDestructuring}`);
        
        // Sprawdź czy wywołuje getDashboardStats
        const callsGetDashboardStats = dashboardContent.includes('await getDashboardStats()');
        console.log(`   ✓ Wywołuje getDashboardStats: ${callsGetDashboardStats}`);
        
        // Sprawdź useEffect dependencies
        const useEffectMatch = dashboardContent.match(/useEffect\([^,]+,\s*\[([^\]]*)\]/);
        if (useEffectMatch) {
            const dependencies = useEffectMatch[1];
            console.log(`   📝 useEffect dependencies: [${dependencies}]`);
            
            const hasDashboardStatsDep = dependencies.includes('getDashboardStats');
            console.log(`   ✓ Ma getDashboardStats w dependencies: ${hasDashboardStatsDep}`);
        }
        
        // Sprawdź console.log statements
        const hasDebugLogs = dashboardContent.includes('console.log(\'🔄 Pobieranie danych dashboardu...\')');
        console.log(`   ✓ Ma debug logi: ${hasDebugLogs}`);
        
        console.log('\n🔍 DIAGNOZA:');
        
        if (!hasGetDashboardStats) {
            console.log('❌ PROBLEM: Hook nie ma getDashboardStats!');
        } else if (!hasCorrectURL) {
            console.log('❌ PROBLEM: Hook ma niepoprawny URL!');
        } else if (!hasCredentials) {
            console.log('❌ PROBLEM: Hook nie ma credentials: include!');
        } else if (!callsGetDashboardStats) {
            console.log('❌ PROBLEM: Dashboard nie wywołuje getDashboardStats!');
        } else if (!hasDebugLogs) {
            console.log('❌ PROBLEM: Brak debug logów - może useEffect się nie wykonuje!');
        } else {
            console.log('✅ Konfiguracja wygląda poprawnie');
            console.log('💡 Problem może być w:');
            console.log('   - React nie renderuje dashboardu');
            console.log('   - useEffect się nie wykonuje');
            console.log('   - Hook zwraca błąd');
            console.log('   - Frontend nie jest przebudowany');
        }
        
    } catch (error) {
        console.error('❌ Błąd podczas debugowania:', error.message);
    }
}

debugUseAdminApiHook();
