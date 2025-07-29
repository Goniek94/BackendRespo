const axios = require('axios');

async function testAdminDebug() {
  console.log('🔍 Debug testu admin panelu\n');

  const baseURL = 'http://localhost:5000';

  try {
    // 1. Logowanie
    console.log('1. Logowanie...');
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      email: 'mateusz.goszczycki1994@gmail.com',
      password: 'Neluchu321.'
    }, {
      withCredentials: true,
      validateStatus: () => true
    });

    console.log('Status logowania:', loginResponse.status);
    console.log('Dane logowania:', JSON.stringify(loginResponse.data, null, 2));

    if (loginResponse.status !== 200) {
      console.error('❌ Błąd logowania');
      return;
    }

    // Pobierz cookies
    const setCookieHeader = loginResponse.headers['set-cookie'];
    if (!setCookieHeader) {
      console.error('❌ Brak cookies');
      return;
    }

    const cookies = setCookieHeader.map(cookie => cookie.split(';')[0]).join('; ');
    console.log('🍪 Cookies:', cookies);

    // 2. Test health check (bez autoryzacji)
    console.log('\n2. Test health check...');
    const healthResponse = await axios.get(`${baseURL}/api/admin-panel/health`, {
      validateStatus: () => true
    });

    console.log('Status health:', healthResponse.status);
    console.log('Dane health:', JSON.stringify(healthResponse.data, null, 2));

    // 3. Test users endpoint z cookies
    console.log('\n3. Test users endpoint z cookies...');
    const usersResponse = await axios.get(`${baseURL}/api/admin-panel/users`, {
      headers: {
        'Cookie': cookies
      },
      withCredentials: true,
      validateStatus: () => true
    });

    console.log('Status users:', usersResponse.status);
    console.log('Dane users:', JSON.stringify(usersResponse.data, null, 2));

    // 4. Test z Authorization header
    console.log('\n4. Test z Authorization header...');
    const token = cookies.split('token=')[1]?.split(';')[0];
    if (token) {
      const authResponse = await axios.get(`${baseURL}/api/admin-panel/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        validateStatus: () => true
      });

      console.log('Status auth header:', authResponse.status);
      console.log('Dane auth header:', JSON.stringify(authResponse.data, null, 2));
    }

  } catch (error) {
    console.error('❌ Błąd:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testAdminDebug();
