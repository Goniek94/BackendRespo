/**
 * Test script for filter counts endpoint
 * Sprawdza czy endpoint /api/ads/filter-counts działa poprawnie
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testFilterCounts() {
  console.log('🧪 Testowanie endpointu /api/ads/filter-counts...\n');
  
  try {
    // Test 1: Bez filtrów - powinien zwrócić wszystkie liczniki
    console.log('📊 Test 1: Bez filtrów');
    const response1 = await fetch(`${BASE_URL}/api/ads/filter-counts`);
    
    if (!response1.ok) {
      throw new Error(`HTTP ${response1.status}: ${response1.statusText}`);
    }
    
    const data1 = await response1.json();
    console.log('✅ Odpowiedź otrzymana');
    console.log('📈 Całkowita liczba ogłoszeń:', data1.totalMatching);
    console.log('🏷️ Liczba marek:', Object.keys(data1.filterCounts?.brands || {}).length);
    console.log('🚗 Liczba modeli:', Object.keys(data1.filterCounts?.models || {}).length);
    console.log('⛽ Liczba typów paliwa:', Object.keys(data1.filterCounts?.fuelTypes || {}).length);
    
    // Test 2: Z filtrem marki
    console.log('\n📊 Test 2: Z filtrem marki (BMW)');
    const response2 = await fetch(`${BASE_URL}/api/ads/filter-counts?brand=BMW`);
    
    if (!response2.ok) {
      throw new Error(`HTTP ${response2.status}: ${response2.statusText}`);
    }
    
    const data2 = await response2.json();
    console.log('✅ Odpowiedź otrzymana');
    console.log('📈 Liczba ogłoszeń BMW:', data2.totalMatching);
    console.log('🚗 Dostępne modele BMW:', Object.keys(data2.filterCounts?.models || {}).length);
    
    if (Object.keys(data2.filterCounts?.models || {}).length > 0) {
      console.log('🎯 Przykładowe modele BMW:');
      Object.entries(data2.filterCounts.models).slice(0, 5).forEach(([model, count]) => {
        console.log(`   - ${model}: ${count} ogłoszeń`);
      });
    }
    
    // Test 3: Z wieloma filtrami
    console.log('\n📊 Test 3: Z wieloma filtrami (BMW, diesel)');
    const response3 = await fetch(`${BASE_URL}/api/ads/filter-counts?brand=BMW&fuelType=diesel`);
    
    if (!response3.ok) {
      throw new Error(`HTTP ${response3.status}: ${response3.statusText}`);
    }
    
    const data3 = await response3.json();
    console.log('✅ Odpowiedź otrzymana');
    console.log('📈 Liczba ogłoszeń BMW diesel:', data3.totalMatching);
    
    console.log('\n🎉 Wszystkie testy zakończone pomyślnie!');
    
  } catch (error) {
    console.error('❌ Błąd podczas testowania:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Sprawdź czy serwer backend jest uruchomiony na porcie 5000');
      console.log('   Uruchom: npm start lub node index.js');
    }
  }
}

// Uruchom test
testFilterCounts();
