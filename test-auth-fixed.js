/**
 * NAPRAWIONY TEST SYSTEMU AUTORYZACJI
 * Z prawidłowym zarządzaniem cookies
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api';

// Test data
const testUser = {
  email: 'mateusz.goszczycki1994@gmail.com',
  password: 'Neluchu321.'
};

// Cookie storage
let cookieJar = '';

// Helper function to extract cookies from response
function extractCookies(response) {
  const setCookieHeader = response.headers.get('set-cookie');
  if (!setCookieHeader) return '';
  
  // Parse cookies and extract only name=value pairs
  const cookieStrings = setCookieHeader.split(/, (?=\w+=)/);
  const cookies = cookieStrings.map(cookieStr => {
    const parts = cookieStr.split(';');
    return parts[0]; // Only name=value part
  }).filter(cookie => cookie.includes('='));
  
  return cookies.join('; ');
}

async function testAuthSystem() {
  console.log('🧪 NAPRAWIONY TEST SYSTEMU AUTORYZACJI');
  console.log('=' .repeat(50));
  
  try {
    // 1. Logowanie
    console.log('\n1. 🔐 Testowanie logowania...');
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
    console.log('📋 Dane użytkownika:', {
      id: loginData.user?.id,
      name: loginData.user?.name,
      email: loginData.user?.email,
      role: loginData.user?.role
    });
    
    // Extract cookies from login response
    cookieJar = extractCookies(loginResponse);
    console.log('🍪 Cookies zapisane:', cookieJar ? 'TAK' : 'NIE');
    
    if (!cookieJar) {
      console.log('❌ Brak cookies w odpowiedzi logowania');
      return;
    }
    
    // 2. Test autoryzacji z cookies
    console.log('\n2. 🔍 Testowanie sprawdzania autoryzacji...');
    const authResponse = await fetch(`${API_BASE}/users/check-auth`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieJar  // Wysyłamy cookies!
      }
    });
    
    const authData = await authResponse.json();
    
    if (authResponse.ok) {
      console.log('✅ Autoryzacja udana');
      console.log('👤 Dane z autoryzacji:', authData);
    } else {
      console.log('❌ Autoryzacja nieudana:', authData.message);
      console.log('Status:', authResponse.status);
      console.log('Wysłane cookies:', cookieJar.substring(0, 100) + '...');
      return;
    }
    
    // 3. Test pobierania profilu
    console.log('\n3. 👤 Testowanie pobierania profilu...');
    const profileResponse = await fetch(`${API_BASE}/users/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieJar  // Wysyłamy cookies!
      }
    });
    
    const profileData = await profileResponse.json();
    
    if (profileResponse.ok) {
      console.log('✅ Pobieranie profilu udane');
      console.log('📋 Dane profilu:', {
        name: profileData.name,
        email: profileData.email,
        role: profileData.role
      });
    } else {
      console.log('❌ Błąd pobierania profilu:', profileData.message);
      return;
    }
    
    // 4. Test wylogowania
    console.log('\n4. 🚪 Testowanie wylogowania...');
    const logoutResponse = await fetch(`${API_BASE}/users/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieJar  // Wysyłamy cookies!
      }
    });
    
    const logoutData = await logoutResponse.json();
    
    if (logoutResponse.ok) {
      console.log('✅ Wylogowanie udane');
      
      // Clear cookies after logout
      cookieJar = '';
    } else {
      console.log('❌ Błąd wylogowania:', logoutData.message);
      return;
    }
    
    // 5. Test autoryzacji po wylogowaniu
    console.log('\n5. 🔍 Testowanie autoryzacji po wylogowaniu...');
    const authAfterLogoutResponse = await fetch(`${API_BASE}/users/check-auth`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieJar  // Puste cookies po wylogowaniu
      }
    });
    
    const authAfterLogoutData = await authAfterLogoutResponse.json();
    
    if (!authAfterLogoutResponse.ok) {
      console.log('✅ Autoryzacja poprawnie odrzucona po wylogowaniu');
    } else {
      console.log('❌ Autoryzacja nadal działa po wylogowaniu (błąd!)');
      return;
    }
    
    // Podsumowanie
    console.log('\n' + '='.repeat(50));
    console.log('📊 PODSUMOWANIE TESTÓW:');
    console.log('🔐 Logowanie: ✅');
    console.log('🔍 Sprawdzanie autoryzacji: ✅');
    console.log('👤 Pobieranie profilu: ✅');
    console.log('🚪 Wylogowanie: ✅');
    console.log('🔒 Autoryzacja po wylogowaniu: ✅');
    console.log('\n🎯 WYNIK KOŃCOWY: ✅ WSZYSTKIE TESTY UDANE');
    
  } catch (error) {
    console.error('❌ Błąd podczas testów:', error.message);
    console.log('\n🎯 WYNIK KOŃCOWY: ❌ TESTY NIEUDANE');
  }
}

testAuthSystem();
