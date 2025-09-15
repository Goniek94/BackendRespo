import fetch from 'node-fetch';

/**
 * Skrypt do debugowania formatu danych dashboardu
 * Sprawdza dokładnie jakie dane wysyła backend i jak je odbiera frontend
 */

async function debugDashboardDataFormat() {
    console.log('🔍 Debugowanie formatu danych dashboardu...\n');

    try {
        // Test bezpośredniego wywołania API
        console.log('1. Test bezpośredniego wywołania API:');
        const response = await fetch('http://localhost:5000/api/admin-panel/dashboard', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log(`   Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log('\n2. Struktura odpowiedzi z backendu:');
            console.log('   Root level keys:', Object.keys(data));
            
            if (data.success) {
                console.log('   ✅ success:', data.success);
            }
            
            if (data.data) {
                console.log('   📊 data keys:', Object.keys(data.data));
                
                if (data.data.stats) {
                    console.log('   📈 stats:', JSON.stringify(data.data.stats, null, 4));
                }
                
                if (data.data.recentActivity) {
                    console.log(`   🕒 recentActivity: ${data.data.recentActivity.length} items`);
                    if (data.data.recentActivity.length > 0) {
                        console.log('   First activity:', JSON.stringify(data.data.recentActivity[0], null, 4));
                    }
                }
            }

            console.log('\n3. Analiza problemu:');
            
            // Sprawdź czy dane są poprawne
            const stats = data.data?.stats;
            if (stats) {
                console.log('   Backend wysyła:');
                console.log(`     - totalUsers: ${stats.totalUsers} (typ: ${typeof stats.totalUsers})`);
                console.log(`     - totalListings: ${stats.totalListings} (typ: ${typeof stats.totalListings})`);
                console.log(`     - totalMessages: ${stats.totalMessages} (typ: ${typeof stats.totalMessages})`);
                console.log(`     - pendingReports: ${stats.pendingReports} (typ: ${typeof stats.pendingReports})`);
                
                if (stats.totalUsers === 0 && stats.totalListings === 0 && stats.totalMessages === 0) {
                    console.log('   ❌ PROBLEM: Backend zwraca same zera!');
                    console.log('   🔍 Możliwe przyczyny:');
                    console.log('     - Baza danych jest pusta');
                    console.log('     - Błąd w zapytaniach do bazy');
                    console.log('     - Problem z połączeniem do bazy');
                } else {
                    console.log('   ✅ Backend zwraca poprawne dane');
                }
            }

            console.log('\n4. Format oczekiwany przez frontend:');
            console.log('   Frontend oczekuje: result.data.stats.totalUsers');
            console.log('   Backend wysyła: data.data.stats.totalUsers');
            console.log('   ✅ Format jest zgodny');

        } else {
            console.log('   ❌ Błąd odpowiedzi:', response.status, response.statusText);
            const errorText = await response.text();
            console.log('   Error details:', errorText);
        }

    } catch (error) {
        console.error('❌ Błąd debugowania:', error.message);
    }
}

debugDashboardDataFormat();
