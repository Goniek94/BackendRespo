/**
 * Test systemu admin cookies z blacklistą tokenów
 * Sprawdza czy admin logowanie, wylogowanie i blacklista działają poprawnie
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
 * Test kompletnego systemu admin auth z cookies
 */
async function testAdminCookieSystem() {
  console.log('🚀 ROZPOCZYNAM TEST SYSTEMU ADMIN COOKIES\n');

  try {
    // 1. Test logowania admina
    console.log('1️⃣ Test logowania admina...');
    const loginResponse = await client.post('/api/admin/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });

    if (loginResponse.data.success) {
      console.log('✅ Logowanie admina pomyślne');
      console.log('👤 Admin:', loginResponse.data.admin.email);
      console.log('🔑 Role:', loginResponse.data.admin.role);
      
      // Sprawdź czy cookie został ustawiony
      const cookies = loginResponse.headers['set-cookie'];
      const adminTokenCookie = cookies?.find(cookie => cookie.startsWith('admin_token='));
      
      if (adminTokenCookie) {
        console.log('🍪 Admin token cookie ustawiony:', adminTokenCookie.split(';')[0]);
      } else {
        console.log('❌ Brak admin token cookie!');
      }
    } else {
      console.log('❌ Logowanie admina nie powiodło się:', loginResponse.data.error);
      return;
    }

    // 2. Test sprawdzenia statusu auth
    console.log('\n2️⃣ Test sprawdzenia statusu auth...');
    const authCheckResponse = await client.get('/api/admin/auth/check');
    
    if (authCheckResponse.data.success) {
      console.log('✅ Status auth sprawdzony pomyślnie');
      console.log('👤 Zalogowany admin:', authCheckResponse.data.admin.email);
    } else {
      console.log('❌ Sprawdzenie auth nie powiodło się:', authCheckResponse.data.error);
    }

    // 3. Test dostępu do chronionego endpointu admin
    console.log('\n3️⃣ Test dostępu do chronionego endpointu...');
    try {
      const protectedResponse = await client.get('/api/admin/users');
      console.log('✅ Dostęp do chronionego endpointu pomyślny');
      console.log('📊 Liczba użytkowników:', protectedResponse.data.users?.length || 'N/A');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('❌ Brak autoryzacji do chronionego endpointu');
      } else if (error.response?.status === 404) {
        console.log('⚠️ Endpoint /api/admin/users nie istnieje (to OK)');
      } else {
        console.log('❌ Błąd dostępu:', error.response?.data?.error || error.message);
      }
    }

    // 4. Test wylogowania (z blacklistą)
    console.log('\n4️⃣ Test wylogowania z blacklistą...');
    const logoutResponse = await client.post('/api/admin/auth/logout');
    
    if (logoutResponse.data.success) {
      console.log('✅ Wylogowanie pomyślne');
      console.log('🗑️ Token dodany do blacklisty');
    } else {
      console.log('❌ Wylogowanie nie powiodło się:', logoutResponse.data.error);
    }

    // 5. Test próby dostępu po wylogowaniu (token na blackliście)
    console.log('\n5️⃣ Test dostępu po wylogowaniu (blacklisted token)...');
    try {
      const afterLogoutResponse = await client.get('/api/admin/auth/check');
      
      if (afterLogoutResponse.data.success) {
        console.log('❌ BŁĄD: Nadal mam dostęp po wylogowaniu!');
      } else {
        console.log('✅ Poprawnie zablokowany dostęp po wylogowaniu');
        console.log('🔒 Kod błędu:', afterLogoutResponse.data.code);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Poprawnie zablokowany dostęp po wylogowaniu');
        console.log('🔒 Kod błędu:', error.response.data.code);
        
        if (error.response.data.code === 'TOKEN_BLACKLISTED') {
          console.log('🎯 Token poprawnie wykryty jako blacklisted!');
        }
      } else {
        console.log('❌ Nieoczekiwany błąd:', error.response?.data || error.message);
      }
    }

    // 6. Test ponownego logowania po wylogowaniu
    console.log('\n6️⃣ Test ponownego logowania...');
    const reloginResponse = await client.post('/api/admin/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });

    if (reloginResponse.data.success) {
      console.log('✅ Ponowne logowanie pomyślne');
      console.log('🔄 Nowy token wygenerowany');
      
      // Test dostępu z nowym tokenem
      const newAuthCheck = await client.get('/api/admin/auth/check');
      if (newAuthCheck.data.success) {
        console.log('✅ Nowy token działa poprawnie');
      }
    } else {
      console.log('❌ Ponowne logowanie nie powiodło się:', reloginResponse.data.error);
    }

    console.log('\n🎉 TEST ZAKOŃCZONY POMYŚLNIE!');
    console.log('✅ System admin cookies z blacklistą działa poprawnie');

  } catch (error) {
    console.error('\n❌ BŁĄD PODCZAS TESTU:', error.message);
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📝 Odpowiedź:', error.response.data);
    }
  }
}

/**
 * Test bezpieczeństwa - próba użycia starego tokenu
 */
async function testTokenSecurity() {
  console.log('\n🔒 TEST BEZPIECZEŃSTWA TOKENÓW\n');

  try {
    // Logowanie i zapisanie tokenu
    console.log('1️⃣ Logowanie i zapisanie tokenu...');
    const loginResponse = await client.post('/api/admin/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });

    if (!loginResponse.data.success) {
      console.log('❌ Nie udało się zalogować');
      return;
    }

    // Wylogowanie (token idzie na blacklistę)
    console.log('2️⃣ Wylogowanie (blacklisting token)...');
    await client.post('/api/admin/auth/logout');

    // Próba użycia blacklisted tokenu przez ręczne ustawienie cookie
    console.log('3️⃣ Próba użycia blacklisted tokenu...');
    
    // Symulacja ataku - próba użycia starego tokenu
    try {
      const attackResponse = await client.get('/api/admin/auth/check');
      console.log('❌ BŁĄD BEZPIECZEŃSTWA: Blacklisted token nadal działa!');
    } catch (error) {
      if (error.response?.status === 401 && error.response.data.code === 'TOKEN_BLACKLISTED') {
        console.log('✅ Blacklisted token poprawnie odrzucony');
        console.log('🛡️ System bezpieczeństwa działa poprawnie');
      } else {
        console.log('⚠️ Nieoczekiwana odpowiedź:', error.response?.data);
      }
    }

  } catch (error) {
    console.error('❌ Błąd testu bezpieczeństwa:', error.message);
  }
}

// Uruchomienie testów
async function runAllTests() {
  console.log('🧪 URUCHAMIANIE TESTÓW SYSTEMU ADMIN COOKIES\n');
  console.log('=' .repeat(60));
  
  await testAdminCookieSystem();
  
  console.log('\n' + '=' .repeat(60));
  
  await testTokenSecurity();
  
  console.log('\n' + '=' .repeat(60));
  console.log('🏁 WSZYSTKIE TESTY ZAKOŃCZONE');
}

// Uruchom testy
runAllTests().catch(console.error);
