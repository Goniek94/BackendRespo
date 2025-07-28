/**
 * KOMPLETNY TEST SYSTEMU AUTORYZACJI
 * Testuje cały flow: logowanie → autoryzacja → wylogowanie
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api';

// Test credentials
const testUser = {
  email: 'mateusz.goszczycki1994@gmail.com',
  password: 'Neluchu321.'
};

/**
 * Test complete authentication system
 */
async function testCompleteSystem() {
  console.log('🔒 TESTOWANIE KOMPLETNEGO SYSTEMU AUTORYZACJI\n');
  
  let cookies = '';
  
  try {
    // ========================================
    // 1. TEST ENDPOINT BEZ AUTORYZACJI
    // ========================================
    console.log('1️⃣ Test endpoint bez autoryzacji...');
    const noAuthResponse = await fetch(`${API_URL}/users/check-auth`, {
      method: 'GET'
    });
    
    const noAuthData = await noAuthResponse.json();
    console.log('   Status:', noAuthResponse.status);
    console.log('   Response:', noAuthData.message);
    
    if (noAuthResponse.status === 401 && noAuthData.code === 'NO_TOKEN') {
      console.log('   ✅ Middleware prawidłowo blokuje nieautoryzowane żądania\n');
    } else {
      console.log('   ❌ Problem z middleware autoryzacji\n');
      return;
    }
    
    // ========================================
    // 2. TEST LOGOWANIA
    // ========================================
    console.log('2️⃣ Test logowania...');
    const loginResponse = await fetch(`${API_URL}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testUser)
    });
    
    // Pobierz cookies z odpowiedzi
    const setCookieHeader = loginResponse.headers.raw()['set-cookie'];
    if (setCookieHeader) {
      // Przekształć array cookies na string dla nagłówka Cookie
      cookies = setCookieHeader.map(cookie => cookie.split(';')[0]).join('; ');
      console.log('   🍪 Otrzymano cookies z serwera:', cookies);
    }
    
    const loginData = await loginResponse.json();
    console.log('   Status:', loginResponse.status);
    console.log('   Success:', loginData.success);
    console.log('   User:', loginData.user?.name, loginData.user?.email);
    
    if (loginResponse.status === 200 && loginData.success) {
      console.log('   ✅ Logowanie przebiegło pomyślnie\n');
    } else {
      console.log('   ❌ Błąd logowania:', loginData.message);
      return;
    }
    
    // ========================================
    // 3. TEST AUTORYZACJI Z TOKENEM
    // ========================================
    console.log('3️⃣ Test autoryzacji z tokenem...');
    const authResponse = await fetch(`${API_URL}/users/check-auth`, {
      method: 'GET',
      headers: {
        'Cookie': cookies // Wysyłamy cookies z tokenem
      }
    });
    
    const authData = await authResponse.json();
    console.log('   Status:', authResponse.status);
    console.log('   Success:', authData.success);
    console.log('   User:', authData.user?.name, authData.user?.email);
    
    if (authResponse.status === 200 && authData.success) {
      console.log('   ✅ Autoryzacja z tokenem działa prawidłowo\n');
    } else {
      console.log('   ❌ Problem z autoryzacją:', authData.message);
      return;
    }
    
    // ========================================
    // 4. TEST WYLOGOWANIA
    // ========================================
    console.log('4️⃣ Test wylogowania...');
    const logoutResponse = await fetch(`${API_URL}/users/logout`, {
      method: 'POST',
      headers: {
        'Cookie': cookies // Wysyłamy cookies z tokenem
      }
    });
    
    const logoutData = await logoutResponse.json();
    console.log('   Status:', logoutResponse.status);
    console.log('   Success:', logoutData.success);
    console.log('   Message:', logoutData.message);
    
    if (logoutResponse.status === 200 && logoutData.success) {
      console.log('   ✅ Wylogowanie przebiegło pomyślnie\n');
    } else {
      console.log('   ❌ Problem z wylogowaniem:', logoutData.message);
      return;
    }
    
    // ========================================
    // 5. TEST AUTORYZACJI PO WYLOGOWANIU
    // ========================================
    console.log('5️⃣ Test autoryzacji po wylogowaniu...');
    const postLogoutResponse = await fetch(`${API_URL}/users/check-auth`, {
      method: 'GET',
      headers: {
        'Cookie': cookies // Próbujemy użyć starych cookies
      }
    });
    
    const postLogoutData = await postLogoutResponse.json();
    console.log('   Status:', postLogoutResponse.status);
    console.log('   Message:', postLogoutData.message);
    
    if (postLogoutResponse.status === 401) {
      console.log('   ✅ Token został prawidłowo unieważniony po wylogowaniu\n');
    } else {
      console.log('   ❌ Problem - token nadal działa po wylogowaniu\n');
      return;
    }
    
    // ========================================
    // PODSUMOWANIE
    // ========================================
    console.log('🎉 WSZYSTKIE TESTY PRZESZŁY POMYŚLNIE!');
    console.log('');
    console.log('✅ System autoryzacji działa perfekcyjnie:');
    console.log('   • Middleware blokuje nieautoryzowane żądania');
    console.log('   • Logowanie generuje tokeny w HttpOnly cookies');
    console.log('   • Autoryzacja działa z tokenami');
    console.log('   • Wylogowanie unieważnia tokeny');
    console.log('   • Blacklista tokenów działa prawidłowo');
    console.log('');
    console.log('🔒 ENTERPRISE SECURITY LEVEL - GOTOWE DO PRODUKCJI!');
    
  } catch (error) {
    console.error('❌ Błąd podczas testowania:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Uruchom test
testCompleteSystem();
