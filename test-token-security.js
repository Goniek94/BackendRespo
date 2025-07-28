/**
 * PRAKTYCZNY TEST BEZPIECZEŃSTWA TOKENÓW
 * Sprawdza czy tokeny są rzeczywiście bezpieczne
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api';

const testUser = {
  email: 'mateusz.goszczycki1994@gmail.com',
  password: 'Neluchu321.'
};

async function testTokenSecurity() {
  console.log('🔍 PRAKTYCZNY TEST BEZPIECZEŃSTWA TOKENÓW\n');
  
  try {
    // ========================================
    // 1. LOGOWANIE I SPRAWDZENIE COOKIES
    // ========================================
    console.log('1️⃣ Logowanie i sprawdzenie cookies...');
    
    const loginResponse = await fetch(`${API_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    
    const loginData = await loginResponse.json();
    const cookies = loginResponse.headers.raw()['set-cookie'];
    
    console.log('   Status logowania:', loginResponse.status);
    console.log('   Sukces:', loginData.success);
    
    if (cookies) {
      console.log('   🍪 OTRZYMANE COOKIES:');
      cookies.forEach((cookie, index) => {
        const cookieName = cookie.split('=')[0];
        const isHttpOnly = cookie.includes('HttpOnly');
        const isSecure = cookie.includes('Secure');
        const sameSite = cookie.includes('SameSite');
        
        console.log(`      Cookie ${index + 1}: ${cookieName}`);
        console.log(`         HttpOnly: ${isHttpOnly ? '✅' : '❌'}`);
        console.log(`         Secure: ${isSecure ? '✅' : '❌'}`);
        console.log(`         SameSite: ${sameSite ? '✅' : '❌'}`);
      });
    } else {
      console.log('   ❌ Brak cookies w odpowiedzi!');
      return;
    }
    
    // ========================================
    // 2. SPRAWDZENIE CZY TOKEN JEST W ODPOWIEDZI JSON
    // ========================================
    console.log('\n2️⃣ Sprawdzenie czy token jest w odpowiedzi JSON...');
    
    const hasTokenInResponse = loginData.token || loginData.accessToken || loginData.jwt;
    
    if (hasTokenInResponse) {
      console.log('   ❌ NIEBEZPIECZNE! Token jest widoczny w odpowiedzi JSON!');
      console.log('   Token:', hasTokenInResponse);
    } else {
      console.log('   ✅ BEZPIECZNE! Token NIE jest widoczny w odpowiedzi JSON');
      console.log('   Odpowiedź zawiera tylko:', Object.keys(loginData));
    }
    
    // ========================================
    // 3. TEST AUTORYZACJI Z COOKIES
    // ========================================
    console.log('\n3️⃣ Test autoryzacji używając cookies...');
    
    const cookieHeader = cookies.map(cookie => cookie.split(';')[0]).join('; ');
    
    const authResponse = await fetch(`${API_URL}/users/check-auth`, {
      method: 'GET',
      headers: { 'Cookie': cookieHeader }
    });
    
    const authData = await authResponse.json();
    
    console.log('   Status autoryzacji:', authResponse.status);
    console.log('   Sukces:', authData.success);
    
    if (authResponse.status === 200) {
      console.log('   ✅ Autoryzacja działa z HttpOnly cookies!');
      console.log('   Zalogowany jako:', authData.user?.name);
    } else {
      console.log('   ❌ Problem z autoryzacją:', authData.message);
    }
    
    // ========================================
    // 4. TEST WYLOGOWANIA I BLACKLISTY
    // ========================================
    console.log('\n4️⃣ Test wylogowania i blacklisty tokenów...');
    
    const logoutResponse = await fetch(`${API_URL}/users/logout`, {
      method: 'POST',
      headers: { 'Cookie': cookieHeader }
    });
    
    const logoutData = await logoutResponse.json();
    
    console.log('   Status wylogowania:', logoutResponse.status);
    console.log('   Sukces:', logoutData.success);
    
    // ========================================
    // 5. TEST CZY TOKEN ZOSTAŁ UNIEWAŻNIONY
    // ========================================
    console.log('\n5️⃣ Test czy token został unieważniony...');
    
    const postLogoutAuth = await fetch(`${API_URL}/users/check-auth`, {
      method: 'GET',
      headers: { 'Cookie': cookieHeader }
    });
    
    const postLogoutData = await postLogoutAuth.json();
    
    console.log('   Status po wylogowaniu:', postLogoutAuth.status);
    
    if (postLogoutAuth.status === 401) {
      console.log('   ✅ Token został prawidłowo unieważniony!');
      console.log('   Powód:', postLogoutData.message);
    } else {
      console.log('   ❌ PROBLEM! Token nadal działa po wylogowaniu!');
    }
    
    // ========================================
    // PODSUMOWANIE BEZPIECZEŃSTWA
    // ========================================
    console.log('\n🔒 PODSUMOWANIE BEZPIECZEŃSTWA:');
    console.log('');
    
    const securityChecks = [
      { check: 'HttpOnly cookies', status: cookies && cookies.some(c => c.includes('HttpOnly')) },
      { check: 'Token nie w JSON response', status: !hasTokenInResponse },
      { check: 'Autoryzacja działa', status: authResponse.status === 200 },
      { check: 'Wylogowanie działa', status: logoutResponse.status === 200 },
      { check: 'Token blacklisting', status: postLogoutAuth.status === 401 }
    ];
    
    securityChecks.forEach(({ check, status }) => {
      console.log(`   ${status ? '✅' : '❌'} ${check}`);
    });
    
    const allSecure = securityChecks.every(({ status }) => status);
    
    console.log('');
    if (allSecure) {
      console.log('🎉 WSZYSTKIE TESTY BEZPIECZEŃSTWA PRZESZŁY!');
      console.log('🔒 SYSTEM JEST BEZPIECZNY NA POZIOMIE ENTERPRISE!');
    } else {
      console.log('⚠️  WYKRYTO PROBLEMY BEZPIECZEŃSTWA!');
    }
    
  } catch (error) {
    console.error('❌ Błąd podczas testowania:', error.message);
  }
}

// Uruchom test
testTokenSecurity();
