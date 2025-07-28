import axios from 'axios';

const API_BASE = 'http://localhost:5000';

// Test data
const testUser = {
  email: 'mateusz.goszczycki1994@gmail.com',
  password: 'password123'
};

async function testProfileEndpoint() {
  try {
    console.log('🧪 Testowanie endpointu profilu użytkownika...\n');

    // 1. Login
    console.log('1. Logowanie użytkownika...');
    const loginResponse = await axios.post(`${API_BASE}/api/users/login`, testUser);
    const token = loginResponse.data.token;
    console.log('✅ Zalogowano pomyślnie');
    console.log(`   Token: ${token.substring(0, 20)}...\n`);

    // Headers with auth
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 2. Test profile endpoint
    console.log('2. Pobieranie profilu użytkownika...');
    try {
      const profileResponse = await axios.get(`${API_BASE}/api/users/profile`, { headers });
      console.log('✅ Profil pobrany pomyślnie:');
      console.log('   Dane użytkownika:', JSON.stringify(profileResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Błąd pobierania profilu:', error.response?.data?.message || error.message);
      console.log('   Status:', error.response?.status);
      console.log('   URL:', error.config?.url);
    }

    // 3. Test alternative endpoints
    console.log('\n3. Testowanie alternatywnych endpointów...');
    
    const endpoints = [
      '/api/v1/users/profile',
      '/users/profile',
      '/api/user/profile'
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`   Testowanie: ${API_BASE}${endpoint}`);
        const response = await axios.get(`${API_BASE}${endpoint}`, { headers });
        console.log(`   ✅ ${endpoint} - działa!`);
        console.log(`      Dane:`, JSON.stringify(response.data, null, 2));
      } catch (error) {
        console.log(`   ❌ ${endpoint} - błąd:`, error.response?.status, error.response?.data?.message || error.message);
      }
    }

    console.log('\n🎉 Test zakończony!');

  } catch (error) {
    console.error('❌ Błąd testu:', error.response?.data?.message || error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// Run test
testProfileEndpoint();
