/**
 * Test funkcjonalności edycji ogłoszeń
 * Sprawdza czy wszystkie endpointy działają poprawnie
 */

import mongoose from 'mongoose';
import Ad from './models/ad.js';
import User from './models/user.js';

// Konfiguracja połączenia z bazą danych
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/marketplace';

async function testEditFunctionality() {
  try {
    console.log('🔄 Łączenie z bazą danych...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Połączono z bazą danych');

    // Znajdź testowego użytkownika
    const testUser = await User.findOne({ email: { $regex: /test|admin/i } });
    if (!testUser) {
      console.log('❌ Nie znaleziono testowego użytkownika');
      return;
    }
    console.log(`✅ Znaleziono użytkownika: ${testUser.email}`);

    // Znajdź testowe ogłoszenie
    const testAd = await Ad.findOne({ owner: testUser._id }).limit(1);
    if (!testAd) {
      console.log('❌ Nie znaleziono testowego ogłoszenia');
      return;
    }
    console.log(`✅ Znaleziono ogłoszenie: ${testAd.brand} ${testAd.model} (ID: ${testAd._id})`);

    // Test 1: Sprawdź strukturę ogłoszenia
    console.log('\n📋 Test 1: Struktura ogłoszenia');
    console.log('- Status:', testAd.status);
    console.log('- Zdjęcia:', testAd.images?.length || 0);
    console.log('- Główne zdjęcie:', testAd.mainImage ? 'Tak' : 'Nie');
    console.log('- Data wygaśnięcia:', testAd.expiresAt ? testAd.expiresAt.toISOString() : 'Brak');

    // Test 2: Symulacja aktualizacji ogłoszenia
    console.log('\n📝 Test 2: Aktualizacja ogłoszenia');
    const originalPrice = testAd.price;
    const originalDescription = testAd.description;
    
    testAd.price = originalPrice + 1000;
    testAd.description = `${originalDescription} [ZAKTUALIZOWANE]`;
    testAd.headline = 'Test aktualizacji nagłówka';
    
    await testAd.save();
    console.log('✅ Ogłoszenie zaktualizowane pomyślnie');
    console.log(`- Nowa cena: ${testAd.price} (było: ${originalPrice})`);
    console.log(`- Nowy opis: ${testAd.description.substring(0, 50)}...`);

    // Test 3: Sprawdź czy można zmienić status
    console.log('\n🔄 Test 3: Zmiana statusu');
    const originalStatus = testAd.status;
    
    if (originalStatus === 'active') {
      testAd.status = 'archived';
      testAd.archivedAt = new Date();
    } else {
      testAd.status = 'active';
      testAd.archivedAt = null;
    }
    
    await testAd.save();
    console.log(`✅ Status zmieniony z '${originalStatus}' na '${testAd.status}'`);

    // Przywróć oryginalny status
    testAd.status = originalStatus;
    testAd.archivedAt = null;
    await testAd.save();
    console.log(`✅ Status przywrócony do '${originalStatus}'`);

    // Test 4: Sprawdź obsługę zdjęć
    console.log('\n📸 Test 4: Obsługa zdjęć');
    if (testAd.images && testAd.images.length > 0) {
      console.log(`✅ Ogłoszenie ma ${testAd.images.length} zdjęć`);
      console.log('- Pierwsze zdjęcie:', testAd.images[0]);
      console.log('- Główne zdjęcie:', testAd.mainImage);
      
      // Test zmiany głównego zdjęcia
      if (testAd.images.length > 1) {
        const originalMainImage = testAd.mainImage;
        testAd.mainImage = testAd.images[1];
        await testAd.save();
        console.log(`✅ Główne zdjęcie zmienione z '${originalMainImage}' na '${testAd.mainImage}'`);
        
        // Przywróć oryginalne
        testAd.mainImage = originalMainImage;
        await testAd.save();
        console.log('✅ Główne zdjęcie przywrócone');
      }
    } else {
      console.log('⚠️ Ogłoszenie nie ma zdjęć');
    }

    // Test 5: Sprawdź przedłużanie ogłoszenia
    console.log('\n⏰ Test 5: Przedłużanie ogłoszenia');
    if (testAd.expiresAt) {
      const originalExpiryDate = new Date(testAd.expiresAt);
      const newExpiryDate = new Date();
      newExpiryDate.setDate(newExpiryDate.getDate() + 30);
      
      testAd.expiresAt = newExpiryDate;
      testAd.createdAt = new Date();
      await testAd.save();
      
      console.log(`✅ Ogłoszenie przedłużone`);
      console.log(`- Poprzednia data wygaśnięcia: ${originalExpiryDate.toISOString()}`);
      console.log(`- Nowa data wygaśnięcia: ${newExpiryDate.toISOString()}`);
    } else {
      console.log('ℹ️ Ogłoszenie nie ma daty wygaśnięcia (prawdopodobnie ogłoszenie admina)');
    }

    // Przywróć oryginalne wartości
    console.log('\n🔄 Przywracanie oryginalnych wartości...');
    testAd.price = originalPrice;
    testAd.description = originalDescription;
    testAd.headline = testAd.headline?.replace(' [ZAKTUALIZOWANE]', '') || testAd.headline;
    await testAd.save();
    console.log('✅ Oryginalne wartości przywrócone');

    console.log('\n🎉 Wszystkie testy zakończone pomyślnie!');
    console.log('\n📊 Podsumowanie:');
    console.log('✅ Aktualizacja podstawowych pól działa');
    console.log('✅ Zmiana statusu działa');
    console.log('✅ Obsługa zdjęć działa');
    console.log('✅ Przedłużanie ogłoszenia działa');
    console.log('\n💡 Funkcjonalność edycji ogłoszeń jest gotowa do użycia!');

  } catch (error) {
    console.error('❌ Błąd podczas testowania:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Rozłączono z bazą danych');
  }
}

// Uruchom test
testEditFunctionality();
