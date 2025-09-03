/**
 * Skrypt sprawdzający pole sellerType w ogłoszeniach
 */

import mongoose from 'mongoose';
import Ad from './models/listings/ad.js';
import dotenv from 'dotenv';

// Załaduj zmienne środowiskowe
dotenv.config();

/**
 * Funkcja sprawdzająca sellerType w ogłoszeniach
 */
async function sprawdzSellerType() {
  try {
    console.log('🔍 SPRAWDZANIE POLA SELLERTYPE W OGŁOSZENIACH');
    console.log('=' .repeat(60));

    // Połącz z bazą danych
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Połączono z bazą danych MongoDB');

    // Znajdź najnowsze ogłoszenie BMW (które właśnie dodaliśmy z sellerType: 'Firma')
    const bmwOgloszenie = await Ad.findOne({ 
      brand: 'BMW', 
      model: 'X5',
      headline: { $regex: 'Test wszystkich pól' }
    }).sort({ createdAt: -1 });
    
    if (bmwOgloszenie) {
      console.log(`\n📋 OGŁOSZENIE BMW X5 (ID: ${bmwOgloszenie._id}):`);
      console.log(`   sellerType w bazie: "${bmwOgloszenie.sellerType}"`);
      console.log(`   Typ: ${typeof bmwOgloszenie.sellerType}`);
      
      // Sprawdź jak wygląda w obiekcie zwracanym przez getAdById
      const adObj = bmwOgloszenie.toObject();
      console.log(`   sellerType w szczegółach: "${adObj.sellerType}"`);
    }

    // Sprawdź też inne ogłoszenia
    console.log('\n🔍 PRZEGLĄD WSZYSTKICH OGŁOSZEŃ I ICH SELLERTYPE:');
    console.log('=' .repeat(60));
    
    const wszystkieOgloszenia = await Ad.find({}).select('_id brand model sellerType ownerName').limit(10);
    
    for (const ogloszenie of wszystkieOgloszenia) {
      const adObj = ogloszenie.toObject();
      console.log(`${ogloszenie._id} | ${ogloszenie.brand} ${ogloszenie.model} | sellerType: "${ogloszenie.sellerType}" | owner: ${ogloszenie.ownerName}`);
    }

    // Sprawdź statystyki sellerType
    console.log('\n📊 STATYSTYKI SELLERTYPE:');
    console.log('=' .repeat(60));
    
    const statystyki = await Ad.aggregate([
      {
        $group: {
          _id: '$sellerType',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    for (const stat of statystyki) {
      console.log(`   "${stat._id}": ${stat.count} ogłoszeń`);
    }

    // Test mapowania sellerType
    console.log('\n🧪 TEST MAPOWANIA SELLERTYPE:');
    console.log('=' .repeat(60));
    
    // Importuj funkcję mapowania
    const { mapFormDataToBackend } = await import('./routes/listings/handlers/createAdHandler.js');
    
    const testCases = [
      { input: 'Firma', expected: 'Firma' },
      { input: 'firma', expected: 'Firma' },
      { input: 'company', expected: 'Firma' },
      { input: 'Prywatny', expected: 'Prywatny' },
      { input: 'prywatny', expected: 'Prywatny' },
      { input: 'private', expected: 'Prywatny' },
      { input: undefined, expected: 'Prywatny' }
    ];
    
    for (const testCase of testCases) {
      const result = mapFormDataToBackend({ sellerType: testCase.input });
      const status = result.sellerType === testCase.expected ? '✅' : '❌';
      console.log(`   "${testCase.input}" → "${result.sellerType}" ${status}`);
    }

  } catch (error) {
    console.error('❌ Błąd podczas sprawdzania:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Rozłączono z bazą danych');
  }
}

// Uruchom sprawdzenie
sprawdzSellerType();
