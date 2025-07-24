import mongoose from 'mongoose';
import Ad from './models/ad.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/marketplace';

async function debugKiaStatus() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Połączono z bazą danych');

    // Znajdź wszystkie ogłoszenia Kia
    const kiaAds = await Ad.find({ brand: 'Kia' });
    
    console.log('\n=== ANALIZA OGŁOSZEŃ KIA ===');
    console.log(`Liczba ogłoszeń Kia: ${kiaAds.length}`);
    
    if (kiaAds.length > 0) {
      kiaAds.forEach((ad, index) => {
        console.log(`\n${index + 1}. Ogłoszenie Kia:`);
        console.log(`   ID: ${ad._id}`);
        console.log(`   Marka: ${ad.brand}`);
        console.log(`   Model: ${ad.model}`);
        console.log(`   Status: "${ad.status}"`);
        console.log(`   ListingType: "${ad.listingType}"`);
        console.log(`   CreatedAt: ${ad.createdAt}`);
        console.log(`   UpdatedAt: ${ad.updatedAt}`);
      });
    } else {
      console.log('Nie znaleziono żadnych ogłoszeń Kia!');
    }

    // Sprawdź funkcję getActiveStatusFilter
    console.log('\n=== ANALIZA FILTRA STATUSU ===');
    const { getActiveStatusFilter } = await import('./utils/listings/commonFilters.js');
    const activeStatusFilter = getActiveStatusFilter();
    console.log(`getActiveStatusFilter() zwraca: "${activeStatusFilter}"`);

    // Sprawdź ile ogłoszeń Kia pasuje do filtra aktywnych
    const activeKiaAds = await Ad.find({ 
      brand: 'Kia', 
      status: activeStatusFilter 
    });
    console.log(`Liczba aktywnych ogłoszeń Kia (status = "${activeStatusFilter}"): ${activeKiaAds.length}`);

    // Sprawdź wszystkie unikalne statusy w bazie
    const allStatuses = await Ad.distinct('status');
    console.log(`\nWszystkie statusy w bazie: [${allStatuses.map(s => `"${s}"`).join(', ')}]`);

    // Sprawdź endpoint /ads/brands - symulacja
    console.log('\n=== SYMULACJA ENDPOINT /ads/brands ===');
    const brandsFromActiveAds = await Ad.distinct('brand', { status: activeStatusFilter });
    console.log(`Marki z aktywnych ogłoszeń: [${brandsFromActiveAds.map(b => `"${b}"`).join(', ')}]`);

    await mongoose.disconnect();
    console.log('\nRozłączono z bazą danych');

  } catch (error) {
    console.error('Błąd:', error);
    process.exit(1);
  }
}

debugKiaStatus();
