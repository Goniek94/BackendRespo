/**
 * Skrypt sprawdzający konkretnie nowe ogłoszenie BMW z wszystkimi polami
 */

import mongoose from 'mongoose';
import Ad from './models/listings/ad.js';
import dotenv from 'dotenv';

// Załaduj zmienne środowiskowe
dotenv.config();

/**
 * Funkcja sprawdzająca nowe ogłoszenie BMW
 */
async function sprawdzNoweOgloszenieBMW() {
  try {
    console.log('🔍 SPRAWDZANIE NOWEGO OGŁOSZENIA BMW Z WSZYSTKIMI POLAMI');
    console.log('=' .repeat(60));

    // Połącz z bazą danych
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Połączono z bazą danych MongoDB');

    // Znajdź najnowsze ogłoszenie BMW (które właśnie dodaliśmy)
    const bmwOgloszenie = await Ad.findOne({ 
      brand: 'BMW', 
      model: 'X5',
      headline: { $regex: 'Test wszystkich pól' }
    }).sort({ createdAt: -1 });
    
    if (!bmwOgloszenie) {
      console.log('❌ Nie znaleziono ogłoszenia BMW X5 z testem');
      return;
    }

    console.log(`\n📋 ZNALEZIONE OGŁOSZENIE BMW: ${bmwOgloszenie._id}`);
    console.log(`   Marka: ${bmwOgloszenie.brand}`);
    console.log(`   Model: ${bmwOgloszenie.model}`);
    console.log(`   Nagłówek: ${bmwOgloszenie.headline}`);

    // Konwertuj na obiekt (tak jak robi readAdHandler)
    const ogloszenieObj = bmwOgloszenie.toObject();

    console.log('\n🎯 SPRAWDZENIE KLUCZOWYCH PÓL (które wcześniej brakowały):');
    console.log('=' .repeat(60));
    
    const kluczowePola = {
      'countryOfOrigin': 'Kraj pochodzenia',
      'leasingCompany': 'Firma leasingowa (cesja)',
      'remainingInstallments': 'Pozostałe raty',
      'installmentAmount': 'Wysokość raty',
      'cessionFee': 'Opłata za cesję',
      'exchangeOffer': 'Propozycja zamiany',
      'exchangeValue': 'Wartość zamiany',
      'exchangePayment': 'Dopłata przy zamianie',
      'exchangeConditions': 'Warunki zamiany'
    };

    let polePrzeszly = 0;
    for (const [pole, opis] of Object.entries(kluczowePola)) {
      const wartość = ogloszenieObj[pole];
      const status = wartość !== undefined && wartość !== null && wartość !== '' 
        ? `✅ WIDOCZNE: "${wartość}"` 
        : '❌ BRAK WARTOŚCI';
      console.log(`   ${opis.padEnd(30)} → ${status}`);
      
      if (wartość !== undefined && wartość !== null && wartość !== '') {
        polePrzeszly++;
      }
    }

    console.log('\n📊 WYNIK TESTU:');
    console.log('=' .repeat(60));
    console.log(`✅ Pola z wartościami: ${polePrzeszly}/${Object.keys(kluczowePola).length}`);
    console.log(`📈 Procent sukcesu: ${Math.round((polePrzeszly / Object.keys(kluczowePola).length) * 100)}%`);

    if (polePrzeszly === Object.keys(kluczowePola).length) {
      console.log('\n🎉 SUKCES! Wszystkie pola zostały poprawnie zapisane i są widoczne!');
    } else {
      console.log('\n⚠️  Niektóre pola nadal nie są zapisywane poprawnie.');
    }

    console.log('\n🔍 SYMULACJA SZCZEGÓŁÓW OGŁOSZENIA (getAdById):');
    console.log('=' .repeat(60));
    console.log('To jest dokładnie to, co zobaczy użytkownik w szczegółach ogłoszenia:');
    console.log(`- Kraj pochodzenia: ${ogloszenieObj.countryOfOrigin || 'BRAK'}`);
    console.log(`- Firma leasingowa: ${ogloszenieObj.leasingCompany || 'BRAK'}`);
    console.log(`- Pozostałe raty: ${ogloszenieObj.remainingInstallments || 'BRAK'}`);
    console.log(`- Wysokość raty: ${ogloszenieObj.installmentAmount || 'BRAK'} PLN`);
    console.log(`- Opłata za cesję: ${ogloszenieObj.cessionFee || 'BRAK'} PLN`);
    console.log(`- Propozycja zamiany: ${ogloszenieObj.exchangeOffer || 'BRAK'}`);
    console.log(`- Wartość zamiany: ${ogloszenieObj.exchangeValue || 'BRAK'} PLN`);
    console.log(`- Dopłata przy zamianie: ${ogloszenieObj.exchangePayment || 'BRAK'} PLN`);
    console.log(`- Warunki zamiany: ${ogloszenieObj.exchangeConditions || 'BRAK'}`);

  } catch (error) {
    console.error('❌ Błąd podczas sprawdzania:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Rozłączono z bazą danych');
  }
}

// Uruchom sprawdzenie
sprawdzNoweOgloszenieBMW();
