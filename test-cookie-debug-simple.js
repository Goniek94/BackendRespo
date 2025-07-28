/**
 * Prosty test debugowania cookies
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api';

// Test data
const testUser = {
  email: 'mateusz.goszczycki1994@gmail.com',
  password: 'Neluchu321.'
};

async function debugCookieTest() {
  console.log('🔍 DEBUGOWANIE COOKIES');
  console.log('=' .repeat(40));
  
  try {
    // 1. Logowanie
    console.log('\n1. Logowanie...');
    const loginResponse = await fetch(`${API_BASE}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser)
    });

    const loginData = await loginResponse.json();
    
    if (!loginResponse.ok) {
      console.log('❌ Logowanie nieudane:', loginData.message);
      return;
    }
    
    console.log('✅ Logowanie udane');
    
    // 2. Analiza cookies
    const setCookieHeader = loginResponse.headers.get('set-cookie');
    console.log('\n2. Analiza cookies:');
    console.log('Raw Set-Cookie header:', setCookieHeader);
    
    if (!setCookieHeader) {
      console.log('❌ Brak cookies w odpowiedzi');
      return;
    }
    
    // Prostsze parsowanie - podziel na podstawie ", " przed nazwami cookies
    const cookieStrings = setCookieHeader.split(/, (?=\w+=)/);
    
    console.log('Cookie strings:', cookieStrings.length);
    cookieStrings.forEach((str, i) => {
      console.log(`  ${i}: ${str.substring(0, 100)}...`);
    });
    
    // Parsuj każdy cookie
    const cookies = cookieStrings.map(cookieStr => {
      const parts = cookieStr.split(';');
      const [name, value] = parts[0].split('=');
      return { 
        name: name ? name.trim() : '', 
        value: value ? value.trim() : '', 
        full: parts[0] 
      };
    }).filter(cookie => cookie.name && cookie.value);
    
    console.log('Parsed cookies:');
    cookies.forEach(cookie => {
      console.log(`  ${cookie.name}: ${cookie.value.substring(0, 50)}...`);
    });
    
    // 3. Przygotowanie Cookie header
    const cookieHeader = cookies.map(c => c.full).join('; ');
    console.log('\n3. Cookie header do wysłania:');
    console.log(cookieHeader.substring(0, 100) + '...');
    
    // 4. Test autoryzacji
    console.log('\n4. Test autoryzacji...');
    const authResponse = await fetch(`${API_BASE}/users/check-auth`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader
      }
    });
    
    const authData = await authResponse.json();
    
    console.log('Status:', authResponse.status);
    console.log('Response:', authData);
    
    if (authResponse.ok) {
      console.log('✅ Autoryzacja udana');
    } else {
      console.log('❌ Autoryzacja nieudana:', authData.message);
      
      // Debug: sprawdź co middleware otrzymał
      console.log('\n5. Debug informacje:');
      console.log('Response headers:', Object.fromEntries(authResponse.headers.entries()));
    }
    
  } catch (error) {
    console.error('❌ Błąd:', error.message);
  }
}

debugCookieTest();
