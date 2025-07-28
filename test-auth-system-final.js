/**
 * Test systemu autoryzacji - finalna wersja
 * Testuje naprawiony system z AuthService i HttpOnly cookies
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api';

// Test data - prawdziwy użytkownik z bazy danych
const testUser = {
  email: 'mateusz.goszczycki1994@gmail.com',
  password: 'Neluchu321.'
};

/**
 * Test logowania
 */
async function testLogin() {
  console.log('\n🔐 Testowanie logowania...');
  
  try {
    const response = await fetch(`${API_BASE}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Logowanie udane');
      console.log('📋 Dane użytkownika:', {
        id: data.user?.id,
        name: data.user?.name,
        email: data.user?.email,
        role: data.user?.role
      });
      
      // Sprawdź czy otrzymaliśmy cookies
      const setCookieHeader = response.headers.get('set-cookie');
      if (setCookieHeader) {
        // Parsuj cookies z nagłówka Set-Cookie
        const cookieStrings = setCookieHeader.split(',').map(cookie => {
          const cookiePart = cookie.trim().split(';')[0];
          return cookiePart;
        });
        
        const cookiesFormatted = cookieStrings.join('; ');
        console.log('🍪 Otrzymano cookies:', cookieStrings.join(', '));
        
        return { success: true, cookies: cookiesFormatted, user: data.user };
      } else {
        console.log('⚠️ Brak cookies w odpowiedzi');
        return { success: true, cookies: '', user: data.user };
      }
    } else {
      console.log('❌ Błąd logowania:', data.message);
      return { success: false, error: data.message };
    }
  } catch (error) {
    console.log('❌ Błąd połączenia:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test sprawdzania autoryzacji
 */
async function testCheckAuth(cookies) {
  console.log('\n🔍 Testowanie sprawdzania autoryzacji...');
  
  try {
    const response = await fetch(`${API_BASE}/users/check-auth`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies || ''
      }
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Autoryzacja potwierdzona');
      console.log('📋 Dane użytkownika:', {
        id: data.user?.id,
        name: data.user?.name,
        email: data.user?.email,
        role: data.user?.role
      });
      return { success: true, user: data.user };
    } else {
      console.log('❌ Autoryzacja nieudana:', data.message);
      return { success: false, error: data.message };
    }
  } catch (error) {
    console.log('❌ Błąd połączenia:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test pobierania profilu
 */
async function testGetProfile(cookies) {
  console.log('\n👤 Testowanie pobierania profilu...');
  
  try {
    const response = await fetch(`${API_BASE}/users/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies || ''
      }
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Profil pobrany pomyślnie');
      console.log('📋 Dane profilu:', {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        phone: data.phone
      });
      return { success: true, profile: data };
    } else {
      console.log('❌ Błąd pobierania profilu:', data.message);
      return { success: false, error: data.message };
    }
  } catch (error) {
    console.log('❌ Błąd połączenia:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test wylogowania
 */
async function testLogout(cookies) {
  console.log('\n🚪 Testowanie wylogowania...');
  
  try {
    const response = await fetch(`${API_BASE}/users/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies || ''
      }
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Wylogowanie udane');
      return { success: true };
    } else {
      console.log('❌ Błąd wylogowania:', data.message);
      return { success: false, error: data.message };
    }
  } catch (error) {
    console.log('❌ Błąd połączenia:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test sprawdzania autoryzacji po wylogowaniu
 */
async function testCheckAuthAfterLogout(cookies) {
  console.log('\n🔍 Testowanie autoryzacji po wylogowaniu...');
  
  try {
    const response = await fetch(`${API_BASE}/users/check-auth`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies || ''
      }
    });

    if (response.status === 401) {
      console.log('✅ Autoryzacja poprawnie odrzucona po wylogowaniu');
      return { success: true };
    } else {
      console.log('❌ Autoryzacja nadal aktywna po wylogowaniu - to błąd!');
      return { success: false };
    }
  } catch (error) {
    console.log('❌ Błąd połączenia:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Główna funkcja testowa
 */
async function runTests() {
  console.log('🧪 ROZPOCZYNAM TESTY SYSTEMU AUTORYZACJI');
  console.log('=' .repeat(50));
  
  let cookies = '';
  
  // Test 1: Logowanie
  const loginResult = await testLogin();
  if (!loginResult.success) {
    console.log('\n❌ Test logowania nieudany - przerywam testy');
    return;
  }
  cookies = loginResult.cookies;
  
  // Test 2: Sprawdzanie autoryzacji
  const authResult = await testCheckAuth(cookies);
  if (!authResult.success) {
    console.log('\n❌ Test autoryzacji nieudany');
  }
  
  // Test 3: Pobieranie profilu
  const profileResult = await testGetProfile(cookies);
  if (!profileResult.success) {
    console.log('\n❌ Test pobierania profilu nieudany');
  }
  
  // Test 4: Wylogowanie
  const logoutResult = await testLogout(cookies);
  if (!logoutResult.success) {
    console.log('\n❌ Test wylogowania nieudany');
  }
  
  // Test 5: Sprawdzanie autoryzacji po wylogowaniu
  const authAfterLogoutResult = await testCheckAuthAfterLogout(cookies);
  if (!authAfterLogoutResult.success) {
    console.log('\n❌ Test autoryzacji po wylogowaniu nieudany');
  }
  
  // Podsumowanie
  console.log('\n' + '=' .repeat(50));
  console.log('📊 PODSUMOWANIE TESTÓW:');
  console.log(`🔐 Logowanie: ${loginResult.success ? '✅' : '❌'}`);
  console.log(`🔍 Sprawdzanie autoryzacji: ${authResult.success ? '✅' : '❌'}`);
  console.log(`👤 Pobieranie profilu: ${profileResult.success ? '✅' : '❌'}`);
  console.log(`🚪 Wylogowanie: ${logoutResult.success ? '✅' : '❌'}`);
  console.log(`🔒 Autoryzacja po wylogowaniu: ${authAfterLogoutResult.success ? '✅' : '❌'}`);
  
  const allPassed = [
    loginResult.success,
    authResult.success,
    profileResult.success,
    logoutResult.success,
    authAfterLogoutResult.success
  ].every(Boolean);
  
  console.log(`\n🎯 WYNIK KOŃCOWY: ${allPassed ? '✅ WSZYSTKIE TESTY PRZESZŁY' : '❌ NIEKTÓRE TESTY NIEUDANE'}`);
}

// Uruchom testy
runTests().catch(console.error);
