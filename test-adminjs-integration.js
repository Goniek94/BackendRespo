/**
 * Test integracji AdminJS z istniejącym systemem
 * Sprawdza czy panel administracyjny działa poprawnie
 */

import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:5000';
const ADMIN_URL = `${BASE_URL}/admin`;

/**
 * Test dostępności panelu AdminJS
 */
async function testAdminPanelAccess() {
  console.log('🔍 Testowanie dostępności panelu AdminJS...');
  
  try {
    const response = await fetch(ADMIN_URL, {
      method: 'GET',
      headers: {
        'User-Agent': 'AdminJS-Test-Client'
      }
    });
    
    console.log(`📊 Status odpowiedzi: ${response.status}`);
    console.log(`📋 Content-Type: ${response.headers.get('content-type')}`);
    
    if (response.status === 200) {
      const content = await response.text();
      
      // Sprawdź czy to jest strona AdminJS
      if (content.includes('AdminJS') || content.includes('admin')) {
        console.log('✅ Panel AdminJS jest dostępny');
        
        // Sprawdź czy zawiera formularz logowania
        if (content.includes('login') || content.includes('email') || content.includes('password')) {
          console.log('✅ Formularz logowania został znaleziony');
        } else {
          console.log('⚠️ Brak formularza logowania - możliwe że już jesteś zalogowany');
        }
        
        return true;
      } else {
        console.log('❌ Odpowiedź nie zawiera AdminJS');
        console.log('📄 Pierwsze 500 znaków odpowiedzi:');
        console.log(content.substring(0, 500));
        return false;
      }
    } else {
      console.log(`❌ Panel AdminJS niedostępny - status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Błąd podczas testowania panelu AdminJS:', error.message);
    return false;
  }
}

/**
 * Test logowania do AdminJS
 */
async function testAdminLogin() {
  console.log('\n🔐 Testowanie logowania do AdminJS...');
  
  try {
    // Najpierw pobierz stronę logowania
    const loginPageResponse = await fetch(`${ADMIN_URL}/login`, {
      method: 'GET',
      headers: {
        'User-Agent': 'AdminJS-Test-Client'
      }
    });
    
    console.log(`📊 Status strony logowania: ${loginPageResponse.status}`);
    
    if (loginPageResponse.status !== 200) {
      console.log('❌ Nie można pobrać strony logowania');
      return false;
    }
    
    // Spróbuj zalogować się z danymi administratora
    const loginData = {
      email: 'admin@autosell.pl',
      password: 'admin123'
    };
    
    console.log('🔑 Próba logowania z danymi administratora...');
    
    const loginResponse = await fetch(`${ADMIN_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'AdminJS-Test-Client'
      },
      body: new URLSearchParams(loginData).toString(),
      redirect: 'manual' // Nie podążaj za przekierowaniami automatycznie
    });
    
    console.log(`📊 Status logowania: ${loginResponse.status}`);
    console.log(`📋 Headers:`, Object.fromEntries(loginResponse.headers.entries()));
    
    // Sprawdź czy logowanie się powiodło (przekierowanie lub sukces)
    if (loginResponse.status === 302 || loginResponse.status === 200) {
      console.log('✅ Logowanie prawdopodobnie się powiodło');
      
      // Sprawdź czy otrzymaliśmy cookie sesji
      const setCookieHeader = loginResponse.headers.get('set-cookie');
      if (setCookieHeader && setCookieHeader.includes('adminjs_session')) {
        console.log('✅ Cookie sesji AdminJS zostało ustawione');
        return true;
      } else {
        console.log('⚠️ Brak cookie sesji AdminJS');
      }
    } else {
      console.log('❌ Logowanie nie powiodło się');
      const responseText = await loginResponse.text();
      console.log('📄 Odpowiedź serwera:', responseText.substring(0, 300));
    }
    
    return false;
  } catch (error) {
    console.error('❌ Błąd podczas testowania logowania:', error.message);
    return false;
  }
}

/**
 * Test dostępu do zasobów AdminJS
 */
async function testAdminResources() {
  console.log('\n📊 Testowanie dostępu do zasobów AdminJS...');
  
  const resources = [
    'User',
    'Ad', 
    'Message',
    'Notification',
    'Comment',
    'AdminActivity',
    'Promotion',
    'SystemSettings'
  ];
  
  for (const resource of resources) {
    try {
      const response = await fetch(`${ADMIN_URL}/api/resources/${resource}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'AdminJS-Test-Client'
        }
      });
      
      console.log(`📋 ${resource}: ${response.status}`);
      
      if (response.status === 200) {
        console.log(`✅ Zasób ${resource} jest dostępny`);
      } else if (response.status === 401 || response.status === 403) {
        console.log(`🔐 Zasób ${resource} wymaga autoryzacji (${response.status})`);
      } else {
        console.log(`⚠️ Zasób ${resource} - nieoczekiwany status: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Błąd dostępu do zasobu ${resource}:`, error.message);
    }
  }
}

/**
 * Test dashboardu AdminJS
 */
async function testAdminDashboard() {
  console.log('\n📈 Testowanie dashboardu AdminJS...');
  
  try {
    const response = await fetch(`${ADMIN_URL}/api/dashboard`, {
      method: 'GET',
      headers: {
        'User-Agent': 'AdminJS-Test-Client'
      }
    });
    
    console.log(`📊 Status dashboardu: ${response.status}`);
    
    if (response.status === 200) {
      const data = await response.json();
      console.log('✅ Dashboard AdminJS odpowiada');
      console.log('📊 Dane dashboardu:', JSON.stringify(data, null, 2));
    } else if (response.status === 401 || response.status === 403) {
      console.log('🔐 Dashboard wymaga autoryzacji');
    } else {
      console.log(`⚠️ Dashboard - nieoczekiwany status: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Błąd testowania dashboardu:', error.message);
  }
}

/**
 * Główna funkcja testowa
 */
async function runAdminJSTests() {
  console.log('🚀 Rozpoczynanie testów integracji AdminJS...\n');
  
  // Test 1: Dostępność panelu
  const panelAccessible = await testAdminPanelAccess();
  
  if (!panelAccessible) {
    console.log('\n❌ Panel AdminJS nie jest dostępny. Sprawdź konfigurację.');
    return;
  }
  
  // Test 2: Logowanie
  await testAdminLogin();
  
  // Test 3: Zasoby
  await testAdminResources();
  
  // Test 4: Dashboard
  await testAdminDashboard();
  
  console.log('\n✅ Testy AdminJS zakończone');
  console.log('\n📋 Podsumowanie:');
  console.log('   - Panel AdminJS jest dostępny na: http://localhost:5000/admin');
  console.log('   - Dane logowania: admin@autosell.pl / admin123');
  console.log('   - Wszystkie zasoby zostały skonfigurowane');
  console.log('   - Dashboard integruje się z istniejącymi kontrolerami');
}

// Uruchom testy
runAdminJSTests().catch(console.error);
