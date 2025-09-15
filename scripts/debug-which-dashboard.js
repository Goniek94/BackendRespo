import fetch from 'node-fetch';

/**
 * Skrypt do sprawdzenia który dashboard jest używany
 * i czy nasze zmiany zostały zastosowane
 */

async function debugWhichDashboard() {
    console.log('🔍 Sprawdzanie który dashboard jest używany...\n');

    try {
        // Test wszystkich możliwych endpointów dashboard
        const endpoints = [
            '/api/admin-panel/dashboard',
            '/api/admin-panel/dashboard-public',
            '/api/admin-panel/dashboard/stats'
        ];

        for (const endpoint of endpoints) {
            console.log(`\n📡 Test: ${endpoint}`);
            try {
                const response = await fetch(`http://localhost:5000${endpoint}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                console.log(`   Status: ${response.status} ${response.statusText}`);
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data && data.data.stats) {
                        const stats = data.data.stats;
                        console.log(`   📊 Dane: ${stats.totalUsers} użytkowników, ${stats.totalListings} ogłoszeń, ${stats.totalMessages} wiadomości`);
                    }
                } else if (response.status === 401) {
                    console.log('   🔒 Wymaga autoryzacji');
                }
            } catch (error) {
                console.log(`   ❌ Błąd: ${error.message}`);
            }
        }

        console.log('\n🔍 Sprawdzanie czy frontend używa poprawnego endpointu...');
        
        // Sprawdź czy zmiana w useAdminApi została zastosowana
        console.log('\n📄 Sprawdzanie pliku useAdminApi.js...');
        
        // Test bezpośredniego wywołania jak robi frontend
        console.log('\n🎯 Test dokładnie takiego wywołania jak robi frontend:');
        const frontendCall = await fetch('http://localhost:5000/api/admin-panel/dashboard-public', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log(`   Status: ${frontendCall.status} ${frontendCall.statusText}`);
        if (frontendCall.ok) {
            const data = await frontendCall.json();
            if (data.success && data.data && data.data.stats) {
                const stats = data.data.stats;
                console.log(`   ✅ Frontend powinien otrzymać: ${stats.totalUsers} użytkowników, ${stats.totalListings} ogłoszeń`);
                
                if (stats.totalUsers === 0 && stats.totalListings === 0) {
                    console.log('   ❌ PROBLEM: Backend nadal zwraca zera!');
                } else {
                    console.log('   ✅ Backend zwraca poprawne dane');
                }
            }
        }

        console.log('\n💡 Możliwe przyczyny jeśli nadal widać zera:');
        console.log('   1. Cache przeglądarki - spróbuj Ctrl+F5 (hard refresh)');
        console.log('   2. Frontend nie został przeładowany po zmianach');
        console.log('   3. To może być inny dashboard (sprawdź URL)');
        console.log('   4. Błąd JavaScript w konsoli przeglądarki');
        
        console.log('\n🔧 Instrukcje debugowania:');
        console.log('   1. Otwórz konsolę przeglądarki (F12)');
        console.log('   2. Przejdź do zakładki Network');
        console.log('   3. Odśwież stronę (F5)');
        console.log('   4. Sprawdź czy jest wywołanie do /dashboard-public');
        console.log('   5. Sprawdź odpowiedź z tego wywołania');

    } catch (error) {
        console.error('❌ Błąd debugowania:', error.message);
    }
}

debugWhichDashboard();
