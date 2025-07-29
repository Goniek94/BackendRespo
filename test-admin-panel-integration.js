import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Test integracji AdminJS z custom admin panelem
 * Sprawdza czy oba systemy działają poprawnie
 */

const BASE_URL = 'http://localhost:5001';
const ADMIN_EMAIL = 'mateuczgoniek@gmail.com'; // Twój admin email
const ADMIN_PASSWORD = 'test123'; // Hasło testowe

console.log('🧪 Test integracji paneli administracyjnych');
console.log('='.repeat(50));

/**
 * Test 1: Sprawdzenie dostępności endpointów
 */
const testEndpointsAvailability = async () => {
  console.log('\n📡 Test 1: Dostępność endpointów');
  
  try {
    // Test głównego endpointu
    const mainResponse = await axios.get(`${BASE_URL}/`);
    console.log('✅ Główny endpoint:', mainResponse.data.message);
    
    // Test custom admin API
    try {
      const customAdminResponse = await axios.get(`${BASE_URL}/api/admin-panel/dashboard`);
      console.log('❌ Custom admin endpoint dostępny bez autoryzacji (to może być problem)');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Custom admin endpoint wymaga autoryzacji');
      } else {
        console.log('⚠️ Custom admin endpoint:', error.message);
      }
    }
    
    // Test AdminJS endpoint
    try {
      const adminJsResponse = await axios.get(`${BASE_URL}/admin`);
      console.log('✅ AdminJS endpoint dostępny');
    } catch (error) {
      console.log('⚠️ AdminJS endpoint:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Błąd testowania endpointów:', error.message);
  }
};

/**
 * Test 2: Logowanie do custom admin panelu
 */
const testCustomAdminLogin = async () => {
  console.log('\n🔐 Test 2: Logowanie do custom admin panelu');
  
  try {
    const loginResponse = await axios.post(`${BASE_URL}/api/admin-panel/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    }, {
      withCredentials: true
    });
    
    if (loginResponse.data.success) {
      console.log('✅ Logowanie do custom admin panelu udane');
      
      // Pobierz cookie z odpowiedzi
      const cookies = loginResponse.headers['set-cookie'];
      const tokenCookie = cookies?.find(cookie => cookie.startsWith('token='));
      
      if (tokenCookie) {
        console.log('✅ Token cookie otrzymany');
        
        // Test dostępu do dashboard z tokenem
        const dashboardResponse = await axios.get(`${BASE_URL}/api/admin-panel/dashboard`, {
          headers: {
            'Cookie': tokenCookie
          }
        });
        
        if (dashboardResponse.data.success) {
          console.log('✅ Dostęp do dashboard z tokenem udany');
          console.log('📊 Statystyki:', dashboardResponse.data.data.stats);
        }
      }
      
    } else {
      console.log('❌ Logowanie nieudane:', loginResponse.data.error);
    }
    
  } catch (error) {
    console.error('❌ Błąd logowania:', error.response?.data || error.message);
  }
};

/**
 * Test 3: Sprawdzenie AdminJS
 */
const testAdminJS = async () => {
  console.log('\n🎛️ Test 3: AdminJS');
  
  try {
    // Sprawdź czy AdminJS odpowiada
    const response = await axios.get(`${BASE_URL}/admin/login`, {
      maxRedirects: 0,
      validateStatus: (status) => status < 400
    });
    
    if (response.status === 200) {
      console.log('✅ AdminJS login page dostępna');
    }
    
  } catch (error) {
    if (error.response?.status === 302) {
      console.log('✅ AdminJS przekierowuje (normalnie)');
    } else {
      console.log('⚠️ AdminJS problem:', error.message);
    }
  }
};

/**
 * Test 4: Sprawdzenie modeli w bazie danych
 */
const testDatabaseModels = async () => {
  console.log('\n🗄️ Test 4: Modele w bazie danych');
  
  try {
    // Logowanie do custom admin
    const loginResponse = await axios.post(`${BASE_URL}/api/admin-panel/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    }, {
      withCredentials: true
    });
    
    if (loginResponse.data.success) {
      const cookies = loginResponse.headers['set-cookie'];
      const tokenCookie = cookies?.find(cookie => cookie.startsWith('token='));
      
      // Test pobierania użytkowników
      try {
        const usersResponse = await axios.get(`${BASE_URL}/api/admin-panel/users`, {
          headers: {
            'Cookie': tokenCookie
          }
        });
        
        if (usersResponse.data.success) {
          console.log('✅ Pobieranie użytkowników działa');
          console.log(`📊 Liczba użytkowników: ${usersResponse.data.data.pagination.totalCount}`);
        }
      } catch (error) {
        console.log('❌ Błąd pobierania użytkowników:', error.response?.data?.error || error.message);
      }
      
      // Test pobierania ogłoszeń (jeśli endpoint istnieje)
      try {
        const listingsResponse = await axios.get(`${BASE_URL}/api/admin-panel/listings`, {
          headers: {
            'Cookie': tokenCookie
          }
        });
        
        if (listingsResponse.data.success) {
          console.log('✅ Pobieranie ogłoszeń działa');
          console.log(`📊 Liczba ogłoszeń: ${listingsResponse.data.data.pagination.totalCount}`);
        }
      } catch (error) {
        console.log('⚠️ Endpoint ogłoszeń nie istnieje lub błąd:', error.response?.status);
      }
    }
    
  } catch (error) {
    console.error('❌ Błąd testowania modeli:', error.message);
  }
};

/**
 * Główna funkcja testowa
 */
const runTests = async () => {
  console.log('🚀 Rozpoczynanie testów...\n');
  
  await testEndpointsAvailability();
  await testCustomAdminLogin();
  await testAdminJS();
  await testDatabaseModels();
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Testy zakończone');
  console.log('\n💡 Następne kroki:');
  console.log('1. Sprawdź http://localhost:3000/admin - AdminJS panel');
  console.log('2. Sprawdź http://localhost:3000/api/admin-panel - Custom API');
  console.log('3. Frontend może używać obu systemów');
};

// Uruchomienie testów
runTests().catch(console.error);
