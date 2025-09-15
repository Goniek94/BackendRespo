const fetch = require('node-fetch');

console.log('🔍 PEŁNA DIAGNOZA DASHBOARDU');
console.log('================================');

async function testBackendEndpoint() {
  console.log('\n1. 🔧 Test endpointu backendu:');
  try {
    const response = await fetch('http://localhost:5000/api/admin-panel/dashboard-public', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('   Status:', response.status);
    console.log('   Headers:', Object.fromEntries(response.headers));
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Dane z API:');
      console.log('   - Użytkownicy:', data.stats?.totalUsers || 'N/A');
      console.log('   - Ogłoszenia:', data.stats?.totalListings || 'N/A');
      console.log('   - Wiadomości:', data.stats?.totalMessages || 'N/A');
      console.log('   - Struktura:', Object.keys(data));
      return true;
    } else {
      const errorText = await response.text();
      console.log('   ❌ Błąd:', errorText);
      return false;
    }
  } catch (err) {
    console.log('   ❌ Błąd połączenia:', err.message);
    return false;
  }
}

async function testServerRunning() {
  console.log('\n2. 🌐 Test czy serwer działa:');
  try {
    const response = await fetch('http://localhost:5000/api/health', {
      method: 'GET'
    });
    console.log('   Status health:', response.status);
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Serwer działa:', data);
      return true;
    }
  } catch (err) {
    console.log('   ❌ Serwer nie odpowiada:', err.message);
    return false;
  }
}

async function testAdminRoutes() {
  console.log('\n3. 🔐 Test routingu admin:');
  try {
    const response = await fetch('http://localhost:5000/api/admin-panel/', {
      method: 'GET'
    });
    console.log('   Status admin base:', response.status);
    console.log('   Headers:', Object.fromEntries(response.headers));
    
    if (response.status === 404) {
      console.log('   ⚠️  Admin routes mogą nie być poprawnie skonfigurowane');
    }
  } catch (err) {
    console.log('   ❌ Błąd admin routes:', err.message);
  }
}

async function main() {
  const serverRunning = await testServerRunning();
  if (!serverRunning) {
    console.log('\n❌ PROBLEM: Serwer backend nie działa na porcie 5000!');
    console.log('   Uruchom: npm start lub node index.js');
    return;
  }
  
  await testAdminRoutes();
  const backendWorking = await testBackendEndpoint();
  
  console.log('\n📋 PODSUMOWANIE:');
  console.log('================');
  console.log('- Serwer backend:', serverRunning ? '✅ Działa' : '❌ Nie działa');
  console.log('- Endpoint dashboard:', backendWorking ? '✅ Działa' : '❌ Nie działa');
  
  if (!backendWorking) {
    console.log('\n🔧 MOŻLIWE PRZYCZYNY:');
    console.log('1. Serwer nie jest uruchomiony');
    console.log('2. Admin routes nie są poprawnie skonfigurowane');
    console.log('3. Dashboard controller ma błąd');
    console.log('4. Baza danych nie jest połączona');
  }
}

main().catch(console.error);
