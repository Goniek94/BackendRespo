const axios = require('axios');

const API_URL = 'http://localhost:5000';

async function testCookieDebug() {
  console.log('🔐 DEBUG COOKIES - SZCZEGÓŁOWY TEST\n');

  // Konfiguracja axios z obsługą cookies
  const client = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    timeout: 10000
  });

  try {
    console.log('1️⃣ Test logowania...');
    const loginResponse = await client.post('/api/users/login', {
      email: 'mateusz.goszczycki1994@gmail.com',
      password: 'Neluchu321.'
    });

    console.log('✅ Logowanie udane');
    console.log('📋 Status:', loginResponse.status);
    console.log('👤 Dane użytkownika:', {
      id: loginResponse.data.user?.id,
      email: loginResponse.data.user?.email
    });

    // KLUCZOWE: Sprawdź nagłówki Set-Cookie
    const setCookieHeaders = loginResponse.headers['set-cookie'];
    console.log('\n🍪 ANALIZA COOKIES:');
    console.log('Set-Cookie headers:', setCookieHeaders);
    
    if (setCookieHeaders) {
      setCookieHeaders.forEach((cookie, index) => {
        console.log(`Cookie ${index + 1}:`, cookie);
        
        // Sprawdź czy to token
        if (cookie.includes('token=')) {
          console.log('  ✅ Znaleziono token cookie');
          console.log('  🔒 HttpOnly:', cookie.includes('HttpOnly'));
          console.log('  🔒 Secure:', cookie.includes('Secure'));
          console.log('  🔒 SameSite:', cookie.includes('SameSite'));
        }
      });
    } else {
      console.log('❌ BRAK Set-Cookie headers!');
    }

    console.log('\n2️⃣ Test dostępu do profilu (z cookies)...');
    
    // Sprawdź jakie cookies axios wysyła
    const profileResponse = await client.get('/api/users/profile');
    
    console.log('✅ Dostęp do profilu udany');
    console.log('👤 Profil:', {
      id: profileResponse.data.id,
      email: profileResponse.data.email
    });

  } catch (error) {
    console.error('❌ Błąd:', error.message);
    
    if (error.response) {
      console.error('📋 Status:', error.response.status);
      console.error('📋 Data:', error.response.data);
      console.error('📋 Headers:', error.response.headers);
    }
    
    if (error.config) {
      console.error('📋 Request headers:', error.config.headers);
    }
  }
}

testCookieDebug();
