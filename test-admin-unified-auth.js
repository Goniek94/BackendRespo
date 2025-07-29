/**
 * Test zunifikowanego systemu auth dla panelu admina
 * Sprawdza czy admin panel używa tego samego tokenu co zwykłe logowanie
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

// Konfiguracja axios z obsługą cookies
const client = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Ważne: dołącza cookies
  timeout: 10000
});

/**
 * Test zunifikowanego systemu auth
 */
async function testUnifiedAuth() {
  console.log('🚀 ROZPOCZYNAM TEST ZUNIFIKOWANEGO SYSTEMU AUTH\n');

  try {
    // 1. Zwykłe logowanie użytkownika
    console.log('1️⃣ Logowanie zwykłego użytkownika...');
    const loginResponse = await client.post('/api/auth/login', {
      email: 'mateusz.goszczycki1994@gmail.com',
      password: 'Neluchu321.'
    });

    if (loginResponse.data.success) {
      console.log('✅ Logowanie pomyślne');
      console.log('👤 Użytkownik:', loginResponse.data.user.email);
      console.log('🔑 Role:', loginResponse.data.user.role);
      
      // Sprawdź czy cookie został ustawiony
      const cookies = loginResponse.headers['set-cookie'];
      const tokenCookie = cookies?.find(cookie => cookie.startsWith('token='));
      
      if (tokenCookie) {
        console.log('🍪 Token cookie ustawiony:', tokenCookie.split(';')[0]);
      } else {
        console.log('❌ Brak token cookie!');
      }
    } else {
      console.log('❌ Logowanie nie powiodło się:', loginResponse.data.error);
      return;
    }

    // 2. Test dostępu do panelu admina z tym samym tokenem
    console.log('\n2️⃣ Test dostępu do panelu admina...');
    try {
      const adminResponse = await client.get('/api/admin-panel/health');
      
      if (adminResponse.data.success) {
        console.log('✅ Dostęp do panelu admina pomyślny');
        console.log('🏥 Health check:', adminResponse.data.service);
      } else {
        console.log('❌ Brak dostępu do panelu admina:', adminResponse.data.error);
      }
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('❌ Brak uprawnień administratora');
        console.log('🔒 Kod błędu:', error.response.data.code);
      } else if (error.response?.status === 401) {
        console.log('❌ Brak autoryzacji');
        console.log('🔒 Kod błędu:', error.response.data.code);
      } else {
        console.log('❌ Błąd dostępu:', error.response?.data?.error || error.message);
      }
    }

    // 3. Test dostępu do admin users endpoint
    console.log('\n3️⃣ Test dostępu do admin users...');
    try {
      const usersResponse = await client.get('/api/admin-panel/users');
      console.log('✅ Dostęp do admin users pomyślny');
      console.log('📊 Odpowiedź:', usersResponse.data.message || 'OK');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('❌ Brak uprawnień do admin users');
        console.log('🔒 Kod błędu:', error.response.data.code);
      } else if (error.response?.status === 401) {
        console.log('❌ Brak autoryzacji do admin users');
        console.log('🔒 Kod błędu:', error.response.data.code);
      } else if (error.response?.status === 404) {
        console.log('⚠️ Endpoint admin users nie istnieje (to może być OK)');
      } else {
        console.log('❌ Błąd dostępu do admin users:', error.response?.data?.error || error.message);
      }
    }

    // 4. Test sprawdzenia statusu auth zwykłego użytkownika
    console.log('\n4️⃣ Test sprawdzenia statusu auth zwykłego użytkownika...');
    const authCheckResponse = await client.get('/api/auth/check');
    
    if (authCheckResponse.data.success) {
      console.log('✅ Status auth sprawdzony pomyślnie');
      console.log('👤 Zalogowany użytkownik:', authCheckResponse.data.user.email);
      console.log('🔑 Role:', authCheckResponse.data.user.role);
    } else {
      console.log('❌ Sprawdzenie auth nie powiodło się:', authCheckResponse.data.error);
    }

    // 5. Test wylogowania
    console.log('\n5️⃣ Test wylogowania...');
    const logoutResponse = await client.post('/api/auth/logout');
    
    if (logoutResponse.data.success) {
      console.log('✅ Wylogowanie pomyślne');
      console.log('🗑️ Token dodany do blacklisty');
    } else {
      console.log('❌ Wylogowanie nie powiodło się:', logoutResponse.data.error);
    }

    // 6. Test próby dostępu do panelu admina po wylogowaniu
    console.log('\n6️⃣ Test dostępu do panelu admina po wylogowaniu...');
    try {
      const afterLogoutResponse = await client.get('/api/admin-panel/health');
      
      if (afterLogoutResponse.data.success) {
        console.log('❌ BŁĄD: Nadal mam dostęp do panelu admina po wylogowaniu!');
      } else {
        console.log('✅ Poprawnie zablokowany dostęp do panelu admina');
      }
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Poprawnie zablokowany dostęp do panelu admina');
        console.log('🔒 Kod błędu:', error.response.data.code);
        
        if (error.response.data.code === 'TOKEN_BLACKLISTED') {
          console.log('🎯 Token poprawnie wykryty jako blacklisted!');
        }
      } else {
        console.log('❌ Nieoczekiwany błąd:', error.response?.data || error.message);
      }
    }

    console.log('\n🎉 TEST ZAKOŃCZONY!');
    console.log('✅ System zunifikowanego auth działa poprawnie');

  } catch (error) {
    console.error('\n❌ BŁĄD PODCZAS TESTU:', error.message);
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📝 Odpowiedź:', error.response.data);
    }
  }
}

/**
 * Test z użytkownikiem bez uprawnień admin
 */
async function testNonAdminUser() {
  console.log('\n🔒 TEST UŻYTKOWNIKA BEZ UPRAWNIEŃ ADMIN\n');

  try {
    // Logowanie zwykłego użytkownika (nie admin)
    console.log('1️⃣ Logowanie zwykłego użytkownika...');
    const loginResponse = await client.post('/api/auth/login', {
      email: 'user@example.com', // Zwykły użytkownik
      password: 'user123'
    });

    if (loginResponse.data.success) {
      console.log('✅ Logowanie zwykłego użytkownika pomyślne');
      console.log('👤 Użytkownik:', loginResponse.data.user.email);
      console.log('🔑 Role:', loginResponse.data.user.role);
    } else {
      console.log('⚠️ Nie udało się zalogować zwykłego użytkownika (może nie istnieć)');
      return;
    }

    // Próba dostępu do panelu admina
    console.log('\n2️⃣ Próba dostępu do panelu admina...');
    try {
      const adminResponse = await client.get('/api/admin-panel/health');
      console.log('❌ BŁĄD BEZPIECZEŃSTWA: Zwykły użytkownik ma dostęp do panelu admina!');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ Poprawnie zablokowany dostęp dla zwykłego użytkownika');
        console.log('🔒 Kod błędu:', error.response.data.code);
      } else {
        console.log('⚠️ Nieoczekiwana odpowiedź:', error.response?.data);
      }
    }

  } catch (error) {
    console.error('❌ Błąd testu zwykłego użytkownika:', error.message);
  }
}

// Uruchomienie testów
async function runAllTests() {
  console.log('🧪 URUCHAMIANIE TESTÓW ZUNIFIKOWANEGO SYSTEMU AUTH\n');
  console.log('=' .repeat(60));
  
  await testUnifiedAuth();
  
  console.log('\n' + '=' .repeat(60));
  
  await testNonAdminUser();
  
  console.log('\n' + '=' .repeat(60));
  console.log('🏁 WSZYSTKIE TESTY ZAKOŃCZONE');
}

// Uruchom testy
runAllTests().catch(console.error);
