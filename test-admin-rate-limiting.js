/**
 * TEST RATE LIMITING DLA ADMINÓW
 * Sprawdza czy admini są pomijani w rate limiting
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api'; // Serwer działa na porcie 5000

const adminUser = {
  email: 'mateusz.goszczycki1994@gmail.com', // Twój email z rolą admin
  password: 'Neluchu321.'
};

const regularUser = {
  email: 'test@test.com', // Zwykły użytkownik
  password: 'test123'
};

async function testAdminRateLimiting() {
  console.log('🔒 TESTOWANIE RATE LIMITING DLA ADMINÓW\n');
  
  try {
    // ========================================
    // 1. TEST ZWYKŁEGO UŻYTKOWNIKA (POWINIEN BYĆ RATE LIMITED)
    // ========================================
    console.log('1️⃣ Test rate limiting dla zwykłego użytkownika...');
    
    let rateLimitHit = false;
    for (let i = 1; i <= 6; i++) {
      console.log(`   Próba ${i}/6 logowania zwykłym użytkownikiem...`);
      
      const response = await fetch(`${API_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: regularUser.email,
          password: 'wrong-password' // Celowo błędne hasło
        })
      });
      
      console.log(`   Status: ${response.status}`);
      
      if (response.status === 429) {
        console.log('   ✅ Rate limiting zadziałał dla zwykłego użytkownika!');
        rateLimitHit = true;
        break;
      }
      
      // Krótka pauza między próbami
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (!rateLimitHit) {
      console.log('   ⚠️ Rate limiting nie zadziałał dla zwykłego użytkownika');
    }
    
    // ========================================
    // 2. TEST ADMINA (POWINIEN BYĆ POMINIĘTY)
    // ========================================
    console.log('\n2️⃣ Test rate limiting dla admina...');
    
    let adminBlocked = false;
    for (let i = 1; i <= 10; i++) {
      console.log(`   Próba ${i}/10 logowania adminem...`);
      
      const response = await fetch(`${API_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminUser.email,
          password: 'wrong-password' // Celowo błędne hasło
        })
      });
      
      console.log(`   Status: ${response.status}`);
      
      if (response.status === 429) {
        console.log('   ❌ Admin został zablokowany przez rate limiting!');
        adminBlocked = true;
        break;
      } else if (response.status === 401) {
        console.log('   ✅ Admin nie jest blokowany - tylko błędne hasło');
      }
      
      // Krótka pauza między próbami
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // ========================================
    // 3. TEST PRAWIDŁOWEGO LOGOWANIA ADMINA
    // ========================================
    console.log('\n3️⃣ Test prawidłowego logowania admina...');
    
    const loginResponse = await fetch(`${API_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adminUser)
    });
    
    console.log(`   Status logowania: ${loginResponse.status}`);
    
    if (loginResponse.status === 200) {
      const loginData = await loginResponse.json();
      console.log('   ✅ Admin zalogował się pomyślnie!');
      console.log(`   👤 Użytkownik: ${loginData.user?.name}`);
      console.log(`   🔑 Rola: ${loginData.user?.role}`);
    } else if (loginResponse.status === 429) {
      console.log('   ❌ Admin został zablokowany przez rate limiting!');
    } else {
      const errorData = await loginResponse.json();
      console.log(`   ❌ Błąd logowania: ${errorData.message}`);
    }
    
    // ========================================
    // PODSUMOWANIE
    // ========================================
    console.log('\n🎯 PODSUMOWANIE TESTÓW:');
    console.log('');
    
    if (rateLimitHit && !adminBlocked) {
      console.log('✅ RATE LIMITING DZIAŁA PRAWIDŁOWO:');
      console.log('   • Zwykli użytkownicy są blokowani');
      console.log('   • Admini są pomijani');
      console.log('   • System bezpieczeństwa działa jak należy');
    } else if (!rateLimitHit && !adminBlocked) {
      console.log('⚠️ RATE LIMITING MOŻE BYĆ WYŁĄCZONY:');
      console.log('   • Ani zwykli użytkownicy, ani admini nie są blokowani');
      console.log('   • Sprawdź konfigurację serwera');
    } else if (rateLimitHit && adminBlocked) {
      console.log('❌ PROBLEM Z KONFIGURACJĄ:');
      console.log('   • Rate limiting blokuje wszystkich, włącznie z adminami');
      console.log('   • Sprawdź middleware rateLimiting.js');
    } else {
      console.log('🤔 NIEOCZEKIWANY WYNIK:');
      console.log('   • Tylko admini są blokowani, zwykli użytkownicy nie');
      console.log('   • To nie powinno się zdarzyć');
    }
    
  } catch (error) {
    console.error('❌ Błąd podczas testowania:', error.message);
  }
}

// Uruchom test
testAdminRateLimiting();
