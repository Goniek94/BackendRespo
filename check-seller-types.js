import mongoose from 'mongoose';
import Ad from './models/listings/ad.js';
import config from './config/index.js';

async function checkSellerTypes() {
  try {
    // Connect to database
    await mongoose.connect(config.database.uri);
    console.log('✅ Połączono z bazą danych');

    // Get all unique seller types
    const sellerTypes = await Ad.distinct('sellerType');
    console.log('\n📊 Wszystkie wartości sellerType w bazie:');
    sellerTypes.forEach(type => {
      console.log(`  - "${type}" (typ: ${typeof type})`);
    });

    // Count ads by seller type
    console.log('\n📈 Liczba ogłoszeń według typu sprzedawcy:');
    for (const type of sellerTypes) {
      const count = await Ad.countDocuments({ sellerType: type });
      console.log(`  - "${type}": ${count} ogłoszeń`);
    }

    // Get sample ads with seller type
    console.log('\n🔍 Przykładowe ogłoszenia z różnymi typami sprzedawcy:');
    for (const type of sellerTypes) {
      const sampleAd = await Ad.findOne({ sellerType: type }).select('_id brand model sellerType');
      if (sampleAd) {
        console.log(`  - ${sampleAd.brand} ${sampleAd.model} (sellerType: "${sampleAd.sellerType}")`);
      }
    }

    // Check for null/undefined seller types
    const nullCount = await Ad.countDocuments({ sellerType: { $in: [null, undefined] } });
    console.log(`\n❓ Ogłoszenia bez sellerType: ${nullCount}`);

    // Check for empty string seller types
    const emptyCount = await Ad.countDocuments({ sellerType: '' });
    console.log(`❓ Ogłoszenia z pustym sellerType: ${emptyCount}`);

  } catch (error) {
    console.error('❌ Błąd:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Rozłączono z bazą danych');
  }
}

checkSellerTypes();
