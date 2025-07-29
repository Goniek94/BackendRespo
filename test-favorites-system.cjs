const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Test credentials
const testUser = {
  email: 'test@example.com',
  password: 'testpassword123'
};

let authToken = '';
let testAdId = '';

async function testFavoritesSystem() {
  console.log('🧪 Testowanie systemu ulubionych...\n');

  try {
    // 1. Login użytkownika
    console.log('1. Logowanie użytkownika...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, testUser, {
      withCredentials: true
    });
    
    if (loginResponse.data.success) {
      console.log('✅ Użytkownik zalogowany pomyślnie');
      authToken = loginResponse.data.token;
    } else {
      throw new Error('Błąd logowania');
    }

    // 2. Pobierz pierwsze dostępne ogłoszenie
    console.log('\n2. Pobieranie dostępnych ogłoszeń...');
    const adsResponse = await axios.get(`${BASE_URL}/ads?limit=1`);
    
    if (adsResponse.data.ads && adsResponse.data.ads.length > 0) {
      testAdId = adsResponse.data.ads[0]._id;
      console.log(`✅ Znaleziono ogłoszenie do testów: ${testAdId}`);
    } else {
      throw new Error('Brak dostępnych ogłoszeń do testów');
    }

    // 3. Sprawdź początkowy stan ulubionych
    console.log('\n3. Sprawdzanie początkowego stanu ulubionych...');
    const initialFavoritesResponse = await axios.get(`${BASE_URL}/api/users/favorites`, {
      headers: { Authorization: `Bearer ${authToken}` },
      withCredentials: true
    });
    
    console.log('📊 Początkowy stan ulubionych:', {
      success: initialFavoritesResponse.data.success,
      count: initialFavoritesResponse.data.data?.favorites?.length || 0
    });

    // 4. Dodaj ogłoszenie do ulubionych
    console.log('\n4. Dodawanie ogłoszenia do ulubionych...');
    const addFavoriteResponse = await axios.post(`${BASE_URL}/api/users/favorites/${testAdId}`, {}, {
      headers: { Authorization: `Bearer ${authToken}` },
      withCredentials: true
    });
    
    console.log('📊 Odpowiedź dodawania do ulubionych:', {
      success: addFavoriteResponse.data.success,
      message: addFavoriteResponse.data.message
    });

    // 5. Sprawdź, czy ogłoszenie zostało dodane
    console.log('\n5. Sprawdzanie czy ogłoszenie zostało dodane...');
    const checkFavoriteResponse = await axios.get(`${BASE_URL}/api/users/favorites/${testAdId}/check`, {
      headers: { Authorization: `Bearer ${authToken}` },
      withCredentials: true
    });
    
    console.log('📊 Status ulubionego:', {
      success: checkFavoriteResponse.data.success,
      isFavorite: checkFavoriteResponse.data.data?.isFavorite
    });

    // 6. Pobierz wszystkie ulubione
    console.log('\n6. Pobieranie wszystkich ulubionych...');
    const allFavoritesResponse = await axios.get(`${BASE_URL}/api/users/favorites`, {
      headers: { Authorization: `Bearer ${authToken}` },
      withCredentials: true
    });
    
    console.log('📊 Wszystkie ulubione:', {
      success: allFavoritesResponse.data.success,
      count: allFavoritesResponse.data.data?.favorites?.length || 0,
      favorites: allFavoritesResponse.data.data?.favorites?.map(fav => ({
        id: fav._id,
        title: fav.title || `${fav.brand} ${fav.model}`,
        price: fav.price
      })) || []
    });

    console.log('\n✅ Test systemu ulubionych zakończony pomyślnie!');

  } catch (error) {
    console.error('\n❌ Błąd podczas testowania systemu ulubionych:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Uruchom test
testFavoritesSystem();
