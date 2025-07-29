const axios = require('axios');

// Test systemu panelu administratora z HttpOnly cookies
async function testAdminPanelCookies() {
  console.log('🔍 Test panelu administratora z HttpOnly cookies\n');

  const baseURL = 'http://localhost:5000';
  let cookies = '';

  try {
    // 1. Logowanie jako admin
    console.log('1. Logowanie jako administrator...');
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      email: 'mateusz.goszczycki1994@gmail.com',
      password: 'Neluchu321.'
    }, {
      withCredentials: true,
      validateStatus: () => true
    });

    if (loginResponse.status !== 200) {
      console.error('❌ Błąd logowania:', loginResponse.data);
      return;
    }

    // Pobierz cookies z odpowiedzi
    const setCookieHeader = loginResponse.headers['set-cookie'];
    if (setCookieHeader) {
      cookies = setCookieHeader.map(cookie => cookie.split(';')[0]).join('; ');
      console.log('✅ Zalogowano pomyślnie');
      console.log('🍪 Otrzymane cookies:', cookies);
    } else {
      console.error('❌ Brak cookies w odpowiedzi');
      return;
    }

    // 2. Test dostępu do zarządzania użytkownikami
    console.log('\n2. Test dostępu do zarządzania użytkownikami...');
    const usersResponse = await axios.get(`${baseURL}/api/admin-panel/users`, {
      headers: {
        'Cookie': cookies
      },
      withCredentials: true,
      validateStatus: () => true
    });

    if (usersResponse.status === 200) {
      console.log('✅ Zarządzanie użytkownikami działa');
      console.log('👥 Liczba użytkowników:', usersResponse.data.data?.users?.length || 0);
    } else {
      console.log('❌ Błąd dostępu do użytkowników:', usersResponse.status, usersResponse.data);
    }

    // 4. Test health check panelu admin
    console.log('\n4. Test health check panelu admin...');
    const healthResponse = await axios.get(`${baseURL}/api/admin-panel/health`, {
      headers: {
        'Cookie': cookies
      },
      withCredentials: true,
      validateStatus: () => true
    });

    if (healthResponse.status === 200) {
      console.log('✅ Health check panelu admin działa');
      console.log('💚 Status:', healthResponse.data);
    } else {
      console.log('❌ Błąd health check:', healthResponse.status, healthResponse.data);
    }

    // 5. Test bez cookies (powinien być błąd)
    console.log('\n5. Test dostępu bez cookies (powinien być błąd)...');
    const unauthorizedResponse = await axios.get(`${baseURL}/api/admin-panel/dashboard`, {
      validateStatus: () => true
    });

    if (unauthorizedResponse.status === 401 || unauthorizedResponse.status === 403) {
      console.log('✅ Poprawnie blokuje dostęp bez cookies');
    } else {
      console.log('❌ Niepoprawna odpowiedź bez cookies:', unauthorizedResponse.status);
    }

    // 6. Test wylogowania
    console.log('\n6. Test wylogowania...');
    const logoutResponse = await axios.post(`${baseURL}/api/auth/logout`, {}, {
      headers: {
        'Cookie': cookies
      },
      withCredentials: true,
      validateStatus: () => true
    });

    if (logoutResponse.status === 200) {
      console.log('✅ Wylogowano pomyślnie');
      
      // Test dostępu po wylogowaniu
      const afterLogoutResponse = await axios.get(`${baseURL}/api/admin-panel/dashboard`, {
        headers: {
          'Cookie': cookies
        },
        withCredentials: true,
        validateStatus: () => true
      });

      if (afterLogoutResponse.status === 401 || afterLogoutResponse.status === 403) {
        console.log('✅ Poprawnie blokuje dostęp po wylogowaniu');
      } else {
        console.log('❌ Niepoprawna odpowiedź po wylogowaniu:', afterLogoutResponse.status);
      }
    } else {
      console.log('❌ Błąd wylogowania:', logoutResponse.status, logoutResponse.data);
    }

    console.log('\n🎉 Test zakończony!');

  } catch (error) {
    console.error('❌ Błąd podczas testu:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

// Uruchom test
testAdminPanelCookies();
