const axios = require('axios');

const API_BASE = 'http://localhost:5000';

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'password123'
};

async function testFavorites() {
  try {
    console.log('🧪 Testowanie funkcjonalności ulubionych...\n');

    // 1. Login
    console.log('1. Logowanie użytkownika...');
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, testUser);
    const token = loginResponse.data.token;
    const userId = loginResponse.data.user._id;
    console.log('✅ Zalogowano pomyślnie');
    console.log(`   Token: ${token.substring(0, 20)}...`);
    console.log(`   User ID: ${userId}\n`);

    // Headers with auth
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 2. Get some ads to test with
    console.log('2. Pobieranie ogłoszeń do testów...');
    const adsResponse = await axios.get(`${API_BASE}/api/listings/ads?limit=3`);
    const ads = adsResponse.data.ads || adsResponse.data.data || adsResponse.data;
    
    if (!ads || ads.length === 0) {
      console.log('❌ Brak ogłoszeń w bazie danych');
      return;
    }
    
    const testAdId = ads[0]._id;
    console.log(`✅ Znaleziono ${ads.length} ogłoszeń`);
    console.log(`   Test Ad ID: ${testAdId}\n`);

    // 3. Get current favorites
    console.log('3. Pobieranie aktualnych ulubionych...');
    try {
      const favoritesResponse = await axios.get(`${API_BASE}/api/user/favorites`, { headers });
      console.log('✅ Pobrano ulubione:', favoritesResponse.data);
    } catch (error) {
      console.log('⚠️  Błąd pobierania ulubionych:', error.response?.data || error.message);
    }

    // 4. Add to favorites
    console.log('\n4. Dodawanie do ulubionych...');
    try {
      const addResponse = await axios.post(`${API_BASE}/api/user/favorites/${testAdId}`, {}, { headers });
      console.log('✅ Dodano do ulubionych:', addResponse.data);
    } catch (error) {
      console.log('❌ Błąd dodawania do ulubionych:', error.response?.data || error.message);
      console.log('   Status:', error.response?.status);
      console.log('   Headers sent:', headers);
    }

    // 5. Check favorites again
    console.log('\n5. Sprawdzanie ulubionych po dodaniu...');
    try {
      const favoritesResponse = await axios.get(`${API_BASE}/api/user/favorites`, { headers });
      console.log('✅ Aktualne ulubione:', favoritesResponse.data);
    } catch (error) {
      console.log('❌ Błąd pobierania ulubionych:', error.response?.data || error.message);
    }

    // 6. Remove from favorites
    console.log('\n6. Usuwanie z ulubionych...');
    try {
      const removeResponse = await axios.delete(`${API_BASE}/api/user/favorites/${testAdId}`, { headers });
      console.log('✅ Usunięto z ulubionych:', removeResponse.data);
    } catch (error) {
      console.log('❌ Błąd usuwania z ulubionych:', error.response?.data || error.message);
    }

    // 7. Final check
    console.log('\n7. Finalne sprawdzenie ulubionych...');
    try {
      const favoritesResponse = await axios.get(`${API_BASE}/api/user/favorites`, { headers });
      console.log('✅ Finalne ulubione:', favoritesResponse.data);
    } catch (error) {
      console.log('❌ Błąd pobierania ulubionych:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Błąd testu:', error.response?.data || error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Headers:', error.response.headers);
    }
  }
}

// Run test
testFavorites();
