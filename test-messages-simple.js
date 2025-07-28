/**
 * Prosty test endpointu konwersacji
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

async function testSimple() {
  console.log('=== PROSTY TEST ENDPOINTU ===\n');
  
  try {
    // 1. Test czy serwer działa
    console.log('1. Test czy serwer działa...');
    const healthResponse = await axios.get(`${API_BASE_URL}/api/health`);
    console.log('✅ Serwer działa:', healthResponse.status);
    
    // 2. Test API info
    console.log('\n2. Test API info...');
    const apiResponse = await axios.get(`${API_BASE_URL}/api`);
    console.log('✅ API info:', apiResponse.status);
    console.log('Dostępne endpointy:', Object.keys(apiResponse.data.endpoints.core));
    
    // 3. Test endpointu logowania (bez danych)
    console.log('\n3. Test endpointu logowania...');
    try {
      await axios.post(`${API_BASE_URL}/api/users/login`, {});
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Endpoint logowania istnieje (błąd walidacji)');
      } else {
        console.log('❌ Endpoint logowania:', error.response?.status);
      }
    }
    
    // 4. Test endpointu konwersacji (bez autoryzacji)
    console.log('\n4. Test endpointu konwersacji...');
    try {
      await axios.get(`${API_BASE_URL}/api/messages/conversations`);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Endpoint konwersacji istnieje (wymaga autoryzacji)');
        console.log('Kod błędu:', error.response?.data?.code);
      } else {
        console.log('❌ Endpoint konwersacji:', error.response?.status);
        console.log('Błąd:', error.response?.data);
      }
    }
    
    // 5. Sprawdź czy istnieje użytkownik testowy
    console.log('\n5. Sprawdzanie użytkownika testowego...');
    try {
      const loginResponse = await axios.post(`${API_BASE_URL}/api/users/login`, {
        email: 'test@example.com',
        password: 'TestPassword123!'
      }, {
        withCredentials: true
      });
      
      console.log('✅ Logowanie udane!');
      console.log('Status:', loginResponse.status);
      
      // Wyciągnij cookies
      const cookies = loginResponse.headers['set-cookie'];
      let cookieHeader = '';
      if (cookies) {
        cookieHeader = cookies.map(cookie => cookie.split(';')[0]).join('; ');
      }
      
      // Test konwersacji z tokenem
      console.log('\n6. Test konwersacji z tokenem...');
      const conversationsResponse = await axios.get(`${API_BASE_URL}/api/messages/conversations`, {
        withCredentials: true,
        headers: {
          'Cookie': cookieHeader
        }
      });
      
      console.log('✅ Konwersacje pobrane!');
      console.log('Status:', conversationsResponse.status);
      console.log('Liczba konwersacji:', Array.isArray(conversationsResponse.data) ? conversationsResponse.data.length : 'nie jest tablicą');
      
    } catch (loginError) {
      console.log('❌ Błąd logowania:', loginError.response?.status);
      console.log('Szczegóły:', loginError.response?.data);
      
      if (loginError.response?.status === 401) {
        console.log('\n🔧 Użytkownik testowy nie istnieje lub hasło jest nieprawidłowe');
        console.log('Sprawdź bazę danych lub stwórz użytkownika testowego');
      }
    }
    
  } catch (error) {
    console.error('💥 Błąd ogólny:', error.message);
  }
}

testSimple().catch(console.error);
