/**
 * SZYBKI TEST RATE LIMITING DLA ADMINÓW
 * Testuje bezpośrednio middleware bez czekania na reset
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api';

async function quickAdminTest() {
  console.log('⚡ SZYBKI TEST RATE LIMITING DLA ADMINÓW\n');
  
  try {
    // Test z nowym emailem admina (żeby ominąć cache)
    const adminEmail = 'kontakt@autosell.pl'; // Drugi admin z bazy
    const adminPassword = 'test123'; // Może nie być prawidłowe, ale to nie problem
    
    console.log('🔧 Test logowania drugim adminem...');
    console.log(`📧 Email: ${adminEmail}`);
    
    // Próba logowania adminem
    const response = await fetch(`${API_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword
      })
    });
    
    console.log(`📊 Status odpowiedzi: ${response.status}`);
    
    const data = await response.json();
    console.log('📋 Odpowiedź serwera:', JSON.stringify(data, null, 2));
    
    if (response.status === 429) {
      console.log('❌ Admin nadal jest blokowany przez rate limiting');
      console.log('🔧 Potrzebny restart serwera lub inna konfiguracja');
    } else if (response.status === 401) {
      console.log('✅ Admin nie jest blokowany przez rate limiting!');
      console.log('🔑 Otrzymał błąd autoryzacji (nieprawidłowe hasło) - to jest OK');
      console.log('💡 Rate limiting działa prawidłowo dla adminów');
    } else if (response.status === 200) {
      console.log('🎉 Admin zalogował się pomyślnie!');
      console.log('✅ Rate limiting nie blokuje adminów');
    } else {
      console.log(`🤔 Nieoczekiwany status: ${response.status}`);
    }
    
    // Test z Twoim emailem
    console.log('\n🔧 Test z Twoim emailem admina...');
    
    const yourResponse = await fetch(`${API_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'mateusz.goszczycki1994@gmail.com',
        password: 'wrong-password' // Celowo błędne
      })
    });
    
    console.log(`📊 Status dla Twojego konta: ${yourResponse.status}`);
    
    if (yourResponse.status === 429) {
      console.log('❌ Twoje konto nadal jest rate limited');
    } else if (yourResponse.status === 401) {
      console.log('✅ Twoje konto nie jest rate limited!');
    }
    
    // Sprawdź czy serwer został zrestartowany
    console.log('\n🔍 Sprawdzanie czy serwer załadował nową konfigurację...');
    
    const healthResponse = await fetch(`${API_URL}/health`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log(`⏰ Uptime serwera: ${Math.floor(healthData.uptime)} sekund`);
      
      if (healthData.uptime < 300) { // Mniej niż 5 minut
        console.log('✅ Serwer został niedawno zrestartowany');
      } else {
        console.log('⚠️ Serwer działa długo - może potrzebuje restartu');
      }
    }
    
  } catch (error) {
    console.error('❌ Błąd podczas testowania:', error.message);
  }
}

// Uruchom test
quickAdminTest();
