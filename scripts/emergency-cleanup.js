/**
 * EMERGENCY CLEANUP SCRIPT
 * Wywołuje endpoint do czyszczenia cookies i sesji
 */

import fetch from 'node-fetch';

const SERVER_URL = 'http://localhost:5000';

async function emergencyCleanup() {
  console.log('🚨 EMERGENCY CLEANUP - Czyszczenie cookies i sesji...');
  console.log('='.repeat(60));

  try {
    // Wywołaj emergency cleanup endpoint
    const response = await fetch(`${SERVER_URL}/api/admin-panel/emergency-cleanup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Emergency-Cleanup-Script/1.0'
      }
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ EMERGENCY CLEANUP ZAKOŃCZONY POMYŚLNIE!');
      console.log('📋 Szczegóły:');
      console.log(`   - Status: ${response.status}`);
      console.log(`   - Wyczyszczono cookies: ${result.cookiesCleared || 'wszystkie'}`);
      console.log(`   - Czas: ${result.timestamp}`);
      
      console.log('\n📝 INSTRUKCJE:');
      if (result.instructions) {
        result.instructions.forEach((instruction, index) => {
          console.log(`   ${index + 1}. ${instruction}`);
        });
      }

      console.log('\n🔄 NASTĘPNE KROKI:');
      console.log('   1. Otwórz przeglądarkę');
      console.log('   2. Wejdź na: http://localhost:3000/admin');
      console.log('   3. Zaloguj się ponownie');
      console.log('   4. Sprawdź czy błąd HTTP 431 zniknął');

    } else {
      console.log('❌ EMERGENCY CLEANUP NIEUDANY');
      console.log(`   Status: ${response.status}`);
      console.log(`   Błąd: ${result.error || 'Nieznany błąd'}`);
      console.log(`   Wiadomość: ${result.message || 'Brak szczegółów'}`);

      if (result.instructions) {
        console.log('\n📝 INSTRUKCJE MANUALNE:');
        result.instructions.forEach((instruction, index) => {
          console.log(`   ${index + 1}. ${instruction}`);
        });
      }
    }

  } catch (error) {
    console.log('❌ BŁĄD POŁĄCZENIA Z SERWEREM');
    console.log(`   Błąd: ${error.message}`);
    console.log('\n🔧 SPRAWDŹ:');
    console.log('   1. Czy serwer działa na porcie 5000?');
    console.log('   2. Uruchom: npm start');
    console.log('   3. Spróbuj ponownie');
    
    console.log('\n📝 MANUALNE CZYSZCZENIE:');
    console.log('   1. Otwórz DevTools (F12)');
    console.log('   2. Application → Storage → Clear storage');
    console.log('   3. Wyczyść wszystkie cookies');
    console.log('   4. Odśwież stronę');
  }

  console.log('\n' + '='.repeat(60));
}

// Uruchom cleanup
emergencyCleanup().catch(console.error);
