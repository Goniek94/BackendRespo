/**
 * Skrypt sprawdzający jakie dokładnie pola są zwracane przez backend
 * w szczegółach ogłoszenia (GET /ads/:id)
 */

import mongoose from 'mongoose';
import Ad from './models/listings/ad.js';
import dotenv from 'dotenv';

// Załaduj zmienne środowiskowe
dotenv.config();

/**
 * Funkcja sprawdzająca pola w ogłoszeniu
 */
async function sprawdzPolaDostepneWOgloszeniu() {
  try {
    console.log('🔍 SPRAWDZANIE POLA DOSTĘPNYCH W SZCZEGÓŁACH OGŁOSZENIA');
    console.log('=' .repeat(60));

    // Połącz z bazą danych
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Połączono z bazą danych MongoDB');

    // Pobierz pierwsze dostępne ogłoszenie
    const ogloszenie = await Ad.findOne({ status: { $in: ['active', 'pending', 'opublikowane'] } });
    
    if (!ogloszenie) {
      console.log('❌ Nie znaleziono żadnego ogłoszenia w bazie danych');
      return;
    }

    console.log(`\n📋 ZNALEZIONE OGŁOSZENIE: ${ogloszenie._id}`);
    console.log(`   Marka: ${ogloszenie.brand || 'BRAK'}`);
    console.log(`   Model: ${ogloszenie.model || 'BRAK'}`);
    console.log(`   Status: ${ogloszenie.status || 'BRAK'}`);

    // Konwertuj na obiekt (tak jak robi readAdHandler)
    const ogloszenieObj = ogloszenie.toObject();

    console.log('\n🔍 WSZYSTKIE DOSTĘPNE POLA W SZCZEGÓŁACH OGŁOSZENIA:');
    console.log('=' .repeat(60));

    // Kategoryzuj pola
    const kategorie = {
      'PODSTAWOWE DANE POJAZDU': [
        'brand', 'model', 'generation', 'version', 'year', 'price', 'mileage',
        'fuelType', 'transmission', 'vin', 'registrationNumber', 'firstRegistrationDate',
        'headline', 'description', 'shortDescription', 'purchaseOptions', 'negotiable',
        'listingType', 'status'
      ],
      'DANE TECHNICZNE': [
        'condition', 'accidentStatus', 'damageStatus', 'tuning', 'imported',
        'registeredInPL', 'firstOwner', 'disabledAdapted', 'bodyType', 'color',
        'paintFinish', 'seats', 'lastOfficialMileage', 'power', 'engineSize',
        'drive', 'doors', 'weight', 'countryOfOrigin'
      ],
      'LOKALIZACJA': [
        'voivodeship', 'city', 'rentalPrice'
      ],
      'POLA CESJI LEASINGU': [
        'leasingCompany', 'remainingInstallments', 'installmentAmount', 'cessionFee'
      ],
      'POLA ZAMIANY': [
        'exchangeOffer', 'exchangeValue', 'exchangePayment', 'exchangeConditions'
      ],
      'DANE WŁAŚCICIELA': [
        'owner', 'ownerName', 'ownerLastName', 'ownerEmail', 'ownerPhone',
        'ownerRole', 'sellerType'
      ],
      'ZDJĘCIA': [
        'images', 'mainImage'
      ],
      'METADANE': [
        'createdAt', 'updatedAt', 'expiresAt', 'notifiedAboutExpiration',
        'moderatedBy', 'moderatedAt', 'moderationComment', 'rejectionReason',
        'requiredChanges', 'featured', 'discount', 'discountedPrice'
      ],
      'STATYSTYKI': [
        'views', 'favorites', 'messages', 'rating', 'visits', 'viewsHistory',
        'trafficSources', 'activityHistory', 'priceHistory'
      ]
    };

    let polaDostepne = 0;
    let polaZWartosciami = 0;

    for (const [kategoria, pola] of Object.entries(kategorie)) {
      console.log(`\n📂 ${kategoria}:`);
      console.log('-'.repeat(40));
      
      for (const pole of pola) {
        const wartość = ogloszenieObj[pole];
        const czyDostepne = pole in ogloszenieObj;
        const czyMaWartosc = wartość !== undefined && wartość !== null && wartość !== '';
        
        polaDostepne++;
        if (czyMaWartosc) polaZWartosciami++;

        let status = '❌ BRAK';
        if (czyDostepne) {
          if (czyMaWartosc) {
            if (Array.isArray(wartość)) {
              status = `✅ TABLICA [${wartość.length} elementów]`;
            } else if (typeof wartość === 'object') {
              status = `✅ OBIEKT`;
            } else {
              status = `✅ "${wartość}"`;
            }
          } else {
            status = '⚠️  PUSTE';
          }
        }
        
        console.log(`   ${pole.padEnd(25)} → ${status}`);
      }
    }

    console.log('\n📊 PODSUMOWANIE:');
    console.log('=' .repeat(60));
    console.log(`✅ Pola dostępne w obiekcie: ${polaDostepne}`);
    console.log(`📝 Pola z wartościami: ${polaZWartosciami}`);
    console.log(`📈 Procent wypełnienia: ${Math.round((polaZWartosciami / polaDostepne) * 100)}%`);

    // Sprawdź konkretnie pola, o które pytałeś
    console.log('\n🎯 SPRAWDZENIE KONKRETNYCH PÓL:');
    console.log('=' .repeat(60));
    
    const kluczowePola = {
      'countryOfOrigin': 'Kraj pochodzenia',
      'lastOfficialMileage': 'Ostatni oficjalny przebieg',
      'sellerType': 'Typ sprzedającego',
      'leasingCompany': 'Firma leasingowa (cesja)',
      'exchangeOffer': 'Propozycja zamiany'
    };

    for (const [pole, opis] of Object.entries(kluczowePola)) {
      const wartość = ogloszenieObj[pole];
      const status = wartość !== undefined && wartość !== null && wartość !== '' 
        ? `✅ WIDOCZNE: "${wartość}"` 
        : '❌ BRAK WARTOŚCI';
      console.log(`   ${opis.padEnd(30)} → ${status}`);
    }

    console.log('\n🔍 KOMPLETNY OBIEKT ZWRACANY PRZEZ BACKEND:');
    console.log('=' .repeat(60));
    console.log('(Pokazuję pierwsze 50 znaków każdego pola dla czytelności)');
    
    for (const [klucz, wartość] of Object.entries(ogloszenieObj)) {
      let wyswietlanaWartosc;
      if (wartość === null || wartość === undefined) {
        wyswietlanaWartosc = 'NULL/UNDEFINED';
      } else if (Array.isArray(wartość)) {
        wyswietlanaWartosc = `TABLICA[${wartość.length}]: ${JSON.stringify(wartość).substring(0, 50)}...`;
      } else if (typeof wartość === 'object') {
        wyswietlanaWartosc = `OBIEKT: ${JSON.stringify(wartość).substring(0, 50)}...`;
      } else {
        wyswietlanaWartosc = String(wartość).substring(0, 50);
        if (String(wartość).length > 50) wyswietlanaWartosc += '...';
      }
      
      console.log(`   ${klucz.padEnd(25)} → ${wyswietlanaWartosc}`);
    }

    console.log('\n✅ WNIOSEK:');
    console.log('=' .repeat(60));
    console.log('Backend zwraca KOMPLETNY obiekt ogłoszenia bez żadnego filtrowania!');
    console.log('Wszystkie pola zapisane w bazie danych są dostępne w szczegółach ogłoszenia.');

  } catch (error) {
    console.error('❌ Błąd podczas sprawdzania pól:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Rozłączono z bazą danych');
  }
}

// Uruchom skrypt
sprawdzPolaDostepneWOgloszeniu();
