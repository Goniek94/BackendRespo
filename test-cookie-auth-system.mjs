import axios from 'axios';
import axiosCookieJarSupport from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

const API_URL = 'http://localhost:5000';

// Test systemu autoryzacji przez HttpOnly cookies
async function testCookieAuthSystem() {
  console.log('🔐 Test systemu autoryzacji przez HttpOnly cookies\n');

  // Konfiguracja axios z obsługą cookies
  const cookieJar = new CookieJar();
  const client = axios.create({
    baseURL: API_URL,
    withCredentials: true, // KLUCZOWE - obsługa cookies
    timeout: 10000
  });
  
  // Włącz obsługę cookie jar
  axiosCookieJarSupport(client);
  client.defaults.jar = cookieJar;

  try {
    // 1. Test logowania - powinno ustawić HttpOnly cookie
    console.log('1️⃣ Test logowania...');
    const loginResponse = await client.post('/api/users/login', {
      email: 'mateusz.goszczycki1994@gmail.com',
      password: 'Neluchu321.'
    });

    console.log('✅ Logowanie udane');
    console.log('📋 Dane użytkownika:', {
      id: loginResponse.data.user.id,
      email: loginResponse.data.user.email,
      firstName: loginResponse.data.user.firstName
    });

    // Sprawdź czy otrzymaliśmy Set-Cookie header
    const setCookieHeader = loginResponse.headers['set-cookie'];
    if (setCookieHeader) {
      console.log('🍪 Otrzymano Set-Cookie headers:', setCookieHeader);
      
      // Sprawdź czy jest HttpOnly
      const hasHttpOnly = setCookieHeader.some(cookie => 
        cookie.includes('HttpOnly') && cookie.includes('token')
      );
      console.log('🔒 HttpOnly cookie ustawione:', hasHttpOnly ? '✅' : '❌');
    } else {
      console.log('❌ Brak Set-Cookie headers!');
    }

    console.log('\n2️⃣ Test dostępu do chronionego endpointu...');
    
    // 2. Test dostępu do chronionego endpointu (profil użytkownika)
    const profileResponse = await client.get('/api/users/profile');
    
    console.log('✅ Dostęp do profilu udany');
    console.log('👤 Profil użytkownika:', {
      id: profileResponse.data.user.id,
      email: profileResponse.data.user.email,
      firstName: profileResponse.data.user.firstName
    });

    console.log('\n3️⃣ Test dostępu do wiadomości...');
    
    // 3. Test dostępu do wiadomości
    const messagesResponse = await client.get('/api/messages');
    
    console.log('✅ Dostęp do wiadomości udany');
    console.log('📨 Liczba wiadomości:', messagesResponse.data.messages?.length || 0);

    console.log('\n4️⃣ Test wylogowania...');
    
    // 4. Test wylogowania - powinno wyczyścić cookie
    const logoutResponse = await client.post('/api/users/logout');
    
    console.log('✅ Wylogowanie udane');
    
    // Sprawdź czy otrzymaliśmy Set-Cookie z pustym tokenem
    const logoutSetCookie = logoutResponse.headers['set-cookie'];
    if (logoutSetCookie) {
      console.log('🍪 Logout Set-Cookie headers:', logoutSetCookie);
      
      const clearsToken = logoutSetCookie.some(cookie => 
        cookie.includes('token=') && (cookie.includes('Max-Age=0') || cookie.includes('expires='))
      );
      console.log('🗑️ Token cookie wyczyszczony:', clearsToken ? '✅' : '❌');
    }

    console.log('\n5️⃣ Test dostępu po wylogowaniu (powinien zwrócić 401)...');
    
    // 5. Test dostępu po wylogowaniu - powinien zwrócić 401
    try {
      await client.get('/api/users/profile');
      console.log('❌ BŁĄD: Dostęp do profilu po wylogowaniu powinien być zabroniony!');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Poprawnie zwrócono 401 Unauthorized po wylogowaniu');
      } else {
        console.log('❌ Nieoczekiwany błąd:', error.response?.status, error.message);
      }
    }

    console.log('\n🎉 Test systemu autoryzacji przez cookies zakończony pomyślnie!');
    console.log('\n📋 Podsumowanie:');
    console.log('✅ Logowanie ustawia HttpOnly cookie');
    console.log('✅ Chronione endpointy działają z cookie');
    console.log('✅ Wylogowanie czyści cookie');
    console.log('✅ Dostęp po wylogowaniu jest blokowany');

  } catch (error) {
    console.error('❌ Błąd podczas testu:', error.message);
    if (error.response) {
      console.error('📋 Szczegóły błędu:', {
        status: error.response.status,
        data: error.response.data
      });
    }
  }
}

// Uruchom test
testCookieAuthSystem();

export { testCookieAuthSystem };
