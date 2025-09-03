import mongoose from 'mongoose';
import Ad from './models/listings/ad.js';
import './config/index.js';

async function usunTestoweOgloszenia() {
  try {
    console.log('🗑️ USUWANIE TESTOWYCH OGŁOSZEŃ');
    console.log('============================================================');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Połączono z bazą danych MongoDB');

    // Znajdź ogłoszenia testowe - te które mają w tytule słowa testowe lub zostały utworzone przez testy
    const testAds = await Ad.find({
      $or: [
        { headline: { $regex: /test|TEST|BMW MODEL D|1\.5 B38 TDI|3\.4 R6/i } },
        { ownerEmail: 'kontakt@autosell.pl' },
        { description: { $regex: /test|testowe/i } },
        { brand: 'BMW', model: 'MODEL D' },
        { version: '1.5 B38 TDI' },
        { version: '3.4 R6' }
      ]
    });

    console.log(`📊 Znaleziono ${testAds.length} testowych ogłoszeń do usunięcia:`);
    
    if (testAds.length === 0) {
      console.log('✅ Brak testowych ogłoszeń do usunięcia');
      return;
    }

    // Wyświetl listę ogłoszeń do usunięcia
    testAds.forEach((ad, index) => {
      console.log(`${index + 1}. ${ad.headline} (${ad.brand} ${ad.model}) - ID: ${ad._id}`);
    });

    // Usuń testowe ogłoszenia
    const result = await Ad.deleteMany({
      _id: { $in: testAds.map(ad => ad._id) }
    });

    console.log(`\n🗑️ Usunięto ${result.deletedCount} testowych ogłoszeń`);
    
    // Sprawdź ile ogłoszeń zostało
    const remainingAds = await Ad.countDocuments({ status: 'active' });
    console.log(`📊 Pozostało ${remainingAds} aktywnych ogłoszeń w bazie danych`);

  } catch (error) {
    console.error('❌ Błąd:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Rozłączono z bazą danych');
  }
}

usunTestoweOgloszenia();
