import axios from 'axios';

const API_BASE = 'http://localhost:5000';

// Test data - użyj prawdziwego użytkownika z bazy
const testUser = {
  email: 'test@example.com',
  password: 'Password123'
};

async function testProfileAPI() {
  try {
    console.log('🧪 Testowanie API profilu użytkownika...\n');

    // 1. Rejestracja nowego użytkownika
    console.log('1. Rejestracja nowego użytkownika...');
    const registerData = {
      name: 'Test',
      lastName: 'User',
      email: testUser.email,
      password: testUser.password,
      phone: '+48123456789',
      dob: '1990-01-01'
    };

    try {
      const registerResponse = await axios.post(`${API_BASE}/api/users/register`, registerData);
      console.log('✅ Użytkownik zarejestrowany pomyślnie');
    } catch (error) {
      if (error.response?.status === 400 && (
        error.response?.data?.message?.includes('already exists') ||
        error.response?.data?.message?.includes('już przypisany') ||
        error.response?.data?.code === 'PHONE_ALREADY_EXISTS'
      )) {
        console.log('ℹ️ Użytkownik już istnieje, kontynuujemy z logowaniem');
      } else {
        throw error;
      }
    }

    // 2. Login
    console.log('\n2. Logowanie użytkownika...');
    const loginResponse = await axios.post(`${API_BASE}/api/users/login`, testUser);
    const token = loginResponse.data.token;
    console.log('✅ Zalogowano pomyślnie');
    console.log(`   Token: ${token.substring(0, 20)}...`);

    // Headers with auth
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 3. Test profile endpoint
    console.log('\n3. Pobieranie profilu użytkownika...');
    try {
      const profileResponse = await axios.get(`${API_BASE}/api/users/profile`, { headers });
      console.log('✅ Profil pobrany pomyślnie:');
      console.log('   Dane użytkownika:', JSON.stringify(profileResponse.data, null, 2));
      
      // Sprawdź czy wszystkie wymagane pola są obecne
      const requiredFields = ['id', 'name', 'lastName', 'email', 'phoneNumber'];
      const missingFields = requiredFields.filter(field => !profileResponse.data[field]);
      
      if (missingFields.length > 0) {
        console.log('⚠️ Brakujące pola:', missingFields);
      } else {
        console.log('✅ Wszystkie wymagane pola są obecne');
      }
      
    } catch (error) {
      console.log('❌ Błąd pobierania profilu:', error.response?.data?.message || error.message);
      console.log('   Status:', error.response?.status);
      console.log('   URL:', error.config?.url);
    }

    // 4. Test update profile
    console.log('\n4. Aktualizacja profilu...');
    const updateData = {
      name: 'Test Updated',
      lastName: 'User Updated'
    };

    try {
      const updateResponse = await axios.put(`${API_BASE}/api/users/profile`, updateData, { headers });
      console.log('✅ Profil zaktualizowany pomyślnie:');
      console.log('   Odpowiedź:', JSON.stringify(updateResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Błąd aktualizacji profilu:', error.response?.data?.message || error.message);
      console.log('   Status:', error.response?.status);
    }

    // 5. Sprawdź czy zmiany zostały zapisane
    console.log('\n5. Weryfikacja zmian...');
    try {
      const verifyResponse = await axios.get(`${API_BASE}/api/users/profile`, { headers });
      console.log('✅ Weryfikacja pomyślna:');
      console.log('   Aktualne dane:', JSON.stringify(verifyResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Błąd weryfikacji:', error.response?.data?.message || error.message);
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
testProfileAPI();
