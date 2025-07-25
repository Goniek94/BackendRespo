/**
 * Test API edycji ogłoszeń
 * Sprawdza czy endpointy działają poprawnie
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api';

// Przykładowy token - musisz go zastąpić prawdziwym tokenem
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzY5ZjY4YzY4YzY4YzY4YzY4YzY4YzYiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3Mzc4MDAwMDAsImV4cCI6MTczNzg4NjQwMH0.test';

async function testEditAPI() {
  try {
    console.log('🔍 Testowanie API edycji ogłoszeń...\n');

    // Test 1: Pobierz listę ogłoszeń użytkownika
    console.log('1. Pobieranie listy ogłoszeń użytkownika...');
    const userAdsResponse = await fetch(`${API_BASE}/ads/user/listings`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!userAdsResponse.ok) {
      console.log('❌ Błąd pobierania ogłoszeń:', userAdsResponse.status, userAdsResponse.statusText);
      return;
    }

    const userAdsData = await userAdsResponse.json();
    const userAds = userAdsData.ads || userAdsData;
    console.log(`✅ Znaleziono ${userAds.length} ogłoszeń użytkownika`);

    if (userAds.length === 0) {
      console.log('❌ Brak ogłoszeń do testowania');
      return;
    }

    const testAd = userAds[0];
    console.log(`📋 Testowe ogłoszenie: ${testAd.brand} ${testAd.model} (ID: ${testAd._id})`);
    console.log(`   Aktualna cena: ${testAd.price}`);
    console.log(`   Aktualny opis: ${testAd.description?.substring(0, 50)}...`);

    // Test 2: Pobierz szczegóły ogłoszenia
    console.log('\n2. Pobieranie szczegółów ogłoszenia...');
    const adDetailsResponse = await fetch(`${API_BASE}/ads/${testAd._id}`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!adDetailsResponse.ok) {
      console.log('❌ Błąd pobierania szczegółów:', adDetailsResponse.status);
      return;
    }

    const adDetails = await adDetailsResponse.json();
    console.log('✅ Szczegóły ogłoszenia pobrane pomyślnie');
    console.log(`   Zdjęcia: ${adDetails.images?.length || 0}`);
    console.log(`   Główne zdjęcie: ${adDetails.mainImage ? 'Tak' : 'Nie'}`);

    // Test 3: Aktualizacja ceny
    console.log('\n3. Testowanie aktualizacji ceny...');
    const newPrice = testAd.price + 1000;
    
    const updatePriceResponse = await fetch(`${API_BASE}/ads/${testAd._id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        price: newPrice
      })
    });

    console.log('Status odpowiedzi:', updatePriceResponse.status);
    const updateResult = await updatePriceResponse.text();
    console.log('Odpowiedź serwera:', updateResult);

    if (updatePriceResponse.ok) {
      console.log(`✅ Cena zaktualizowana z ${testAd.price} na ${newPrice}`);
    } else {
      console.log(`❌ Błąd aktualizacji ceny: ${updatePriceResponse.status}`);
    }

    // Test 4: Aktualizacja opisu
    console.log('\n4. Testowanie aktualizacji opisu...');
    const newDescription = `${testAd.description || 'Opis'} [ZAKTUALIZOWANE ${new Date().toISOString()}]`;
    
    const updateDescResponse = await fetch(`${API_BASE}/ads/${testAd._id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        description: newDescription
      })
    });

    console.log('Status odpowiedzi:', updateDescResponse.status);
    const updateDescResult = await updateDescResponse.text();
    console.log('Odpowiedź serwera:', updateDescResult);

    if (updateDescResponse.ok) {
      console.log('✅ Opis zaktualizowany pomyślnie');
    } else {
      console.log(`❌ Błąd aktualizacji opisu: ${updateDescResponse.status}`);
    }

    // Test 5: Sprawdź czy zmiany zostały zapisane
    console.log('\n5. Weryfikacja zmian...');
    const verifyResponse = await fetch(`${API_BASE}/ads/${testAd._id}`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (verifyResponse.ok) {
      const updatedAd = await verifyResponse.json();
      console.log(`📊 Weryfikacja:`);
      console.log(`   Cena: ${updatedAd.price} (oczekiwano: ${newPrice})`);
      console.log(`   Opis zawiera '[ZAKTUALIZOWANE': ${updatedAd.description?.includes('[ZAKTUALIZOWANE') ? 'Tak' : 'Nie'}`);
      
      if (updatedAd.price === newPrice) {
        console.log('✅ Cena została poprawnie zaktualizowana');
      } else {
        console.log('❌ Cena nie została zaktualizowana');
      }
      
      if (updatedAd.description?.includes('[ZAKTUALIZOWANE')) {
        console.log('✅ Opis został poprawnie zaktualizowany');
      } else {
        console.log('❌ Opis nie został zaktualizowany');
      }
    }

  } catch (error) {
    console.error('❌ Błąd podczas testowania:', error.message);
  }
}

// Uruchom test
testEditAPI();
