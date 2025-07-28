/**
 * PROSTY TEST AUTORYZACJI
 * Test bez rotacji tokenów - sprawdza podstawową funkcjonalność
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testSimpleAuth() {
  console.log('🔍 PROSTY TEST AUTORYZACJI');
  console.log('==================================================');
  
  try {
    // 1. Logowanie
    console.log('\n1. 🔐 Logowanie...');
    const loginResponse = await fetch(`${BASE_URL}/api/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'test-client/1.0'
      },
      body: JSON.stringify({
        email: 'mateusz.goszczycki1994@gmail.com',
        password: 'Neluchu321.'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    // Pobierz cookies
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('✅ Logowanie udane');
    console.log('🍪 Cookies:', cookies ? 'TAK' : 'NIE');
    
    if (!cookies) {
      throw new Error('Brak cookies po logowaniu');
    }
    
    // Wyciągnij token z cookies
    const tokenMatch = cookies.match(/token=([^;]+)/);
    if (!tokenMatch) {
      throw new Error('Brak tokenu w cookies');
    }
    
    const token = tokenMatch[1];
    console.log('🔑 Token otrzymany:', token.substring(0, 50) + '...');
    
    // 2. NATYCHMIASTOWY test autoryzacji (bez czekania)
    console.log('\n2. 🔍 Test autoryzacji NATYCHMIAST po logowaniu...');
    const authResponse = await fetch(`${BASE_URL}/api/users/check-auth`, {
      method: 'GET',
      headers: {
        'User-Agent': 'test-client/1.0',
        'Cookie': `token=${token}`
      }
    });
    
    console.log('📊 Status odpowiedzi:', authResponse.status);
    
    if (authResponse.ok) {
      const userData = await authResponse.json();
      console.log('✅ Autoryzacja udana!');
      console.log('👤 Dane użytkownika:', userData);
    } else {
      const errorData = await authResponse.text();
      console.log('❌ Autoryzacja nieudana:', errorData);
    }
    
  } catch (error) {
    console.error('❌ Błąd testu:', error.message);
  }
}

// Uruchom test
testSimpleAuth();
