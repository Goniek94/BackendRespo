const axios = require('axios');

// Test prostego systemu cookies
async function testSimpleCookies() {
  console.log('🧪 Test prostego systemu cookies');
  console.log('=================================\n');

  const BASE_URL = 'http://localhost:5000';
  
  // Konfiguracja axios z jar cookies
  const cookieJar = {};
  
  const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    timeout: 10000
  });

  // Interceptor do ręcznego zarządzania cookies
  api.interceptors.request.use((config) => {
    if (cookieJar.token) {
      config.headers.Cookie = `token=${cookieJar.token}`;
    }
    return config;
  });

  api.interceptors.response.use((response) => {
    const setCookieHeader = response.headers['set-cookie'];
    if (setCookieHeader) {
      setCookieHeader.forEach(cookie => {
        if (cookie.includes('token=')) {
          const tokenMatch = cookie.match(/token=([^;]+)/);
          if (tokenMatch) {
            cookieJar.token = tokenMatch[1];
            console.log('🍪 Cookie zapisane:', tokenMatch[1].substring(0, 20) + '...');
          }
        }
      });
    }
    return response;
  });

  try {
    // 1. Logowanie
    console.log('1️⃣ Logowanie...');
    const loginResponse = await api.post('/api/v1/users/login', {
      email: 'mateusz.goszczycki1994@gmail.com',
      password: 'Neluchu321.'
    });
    
    console.log('✅ Logowanie udane');
    console.log(`   Token w jar: ${cookieJar.token ? 'TAK' : 'NIE'}`);

    // 2. Test profilu
    console.log('\n2️⃣ Test profilu...');
    const profileResponse = await api.get('/api/v1/users/profile');
    
    console.log('✅ Profil pobrany');
    console.log(`   Użytkownik: ${profileResponse.data.user.email}`);

    // 3. Test wylogowania
    console.log('\n3️⃣ Test wylogowania...');
    await api.post('/api/v1/users/logout');
    console.log('✅ Wylogowanie udane');

  } catch (error) {
    console.error('❌ BŁĄD:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

testSimpleCookies();
