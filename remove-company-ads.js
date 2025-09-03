import mongoose from 'mongoose';
import Ad from './models/listings/ad.js';
import config from './config/index.js';

async function removeCompanyAds() {
  try {
    // Connect to database
    await mongoose.connect(config.database.uri);
    console.log('✅ Połączono z bazą danych');

    // Find and remove company ads that were added
    const companyAdsToRemove = await Ad.find({
      sellerType: 'Firma',
      $or: [
        { brand: 'Mercedes-Benz', model: 'C-Class' },
        { brand: 'Audi', model: 'A4' },
        { brand: 'Volkswagen', model: 'Golf' }
      ]
    });

    console.log(`🔍 Znaleziono ${companyAdsToRemove.length} ogłoszeń firmowych do usunięcia:`);
    companyAdsToRemove.forEach((ad, index) => {
      console.log(`  ${index + 1}. ${ad.brand} ${ad.model} (${ad.year}) - ID: ${ad._id}`);
    });

    if (companyAdsToRemove.length > 0) {
      // Remove the ads
      const result = await Ad.deleteMany({
        sellerType: 'Firma',
        $or: [
          { brand: 'Mercedes-Benz', model: 'C-Class' },
          { brand: 'Audi', model: 'A4' },
          { brand: 'Volkswagen', model: 'Golf' }
        ]
      });

      console.log(`✅ Usunięto ${result.deletedCount} ogłoszeń firmowych`);
    } else {
      console.log('ℹ️  Nie znaleziono ogłoszeń firmowych do usunięcia');
    }

    // Check final state
    const remainingCompanyAds = await Ad.countDocuments({ sellerType: 'Firma' });
    console.log(`📊 Pozostałe ogłoszenia firmowe: ${remainingCompanyAds}`);

    // Show all seller types now
    const sellerTypes = await Ad.distinct('sellerType');
    console.log('\n📊 Wszystkie typy sprzedawców w bazie:');
    for (const type of sellerTypes) {
      const count = await Ad.countDocuments({ sellerType: type });
      console.log(`  - "${type}": ${count} ogłoszeń`);
    }

  } catch (error) {
    console.error('❌ Błąd:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Rozłączono z bazą danych');
  }
}

removeCompanyAds();
