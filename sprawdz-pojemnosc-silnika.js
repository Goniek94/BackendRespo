import mongoose from 'mongoose';
import Ad from './models/listings/ad.js';
import './config/index.js';

async function sprawdzPojemnoscSilnika() {
  try {
    console.log('🔍 SPRAWDZANIE PÓL POJEMNOŚCI SILNIKA');
    console.log('============================================================');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Połączono z bazą danych MongoDB');

    // Pobierz kilka aktywnych ogłoszeń
    const ads = await Ad.find({ status: 'active' }).limit(5);
    
    console.log(`\n📊 ZNALEZIONO ${ads.length} AKTYWNYCH OGŁOSZEŃ:`);
    console.log('============================================================');

    ads.forEach((ad, index) => {
      console.log(`\n🚗 OGŁOSZENIE ${index + 1}:`);
      console.log('----------------------------');
      console.log(`ID: ${ad._id}`);
      console.log(`Marka: ${ad.brand} ${ad.model}`);
      console.log(`Wersja: ${ad.version || 'BRAK'}`);
      
      // Sprawdź wszystkie możliwe pola pojemności
      console.log('\n🔧 POLA POJEMNOŚCI:');
      console.log(`capacity: ${ad.capacity || 'BRAK'}`);
      console.log(`engineCapacity: ${ad.engineCapacity || 'BRAK'}`);
      console.log(`engineSize: ${ad.engineSize || 'BRAK'}`);
      console.log(`displacement: ${ad.displacement || 'BRAK'}`);
      console.log(`engine: ${ad.engine || 'BRAK'}`);
      console.log(`engineVolume: ${ad.engineVolume || 'BRAK'}`);
      
      // Sprawdź wszystkie klucze obiektu
      console.log('\n🔍 WSZYSTKIE KLUCZE ZAWIERAJĄCE "capacity" lub "engine":');
      const keys = Object.keys(ad.toObject());
      const engineKeys = keys.filter(key => 
        key.toLowerCase().includes('capacity') || 
        key.toLowerCase().includes('engine') ||
        key.toLowerCase().includes('displacement') ||
        key.toLowerCase().includes('volume')
      );
      engineKeys.forEach(key => {
        console.log(`${key}: ${ad[key] || 'BRAK'}`);
      });
    });

  } catch (error) {
    console.error('❌ Błąd:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Rozłączono z bazą danych');
  }
}

sprawdzPojemnoscSilnika();
