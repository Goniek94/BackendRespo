import mongoose from 'mongoose';
import Ad from './models/listings/ad.js';
import config from './config/index.js';

async function addCompanyAds() {
  try {
    // Connect to database
    await mongoose.connect(config.database.uri);
    console.log('✅ Połączono z bazą danych');

    // Sample company ads data
    const companyAds = [
      {
        brand: 'Mercedes-Benz',
        model: 'C-Class',
        year: 2022,
        price: 180000,
        mileage: 15000,
        fuelType: 'Benzyna',
        transmission: 'Automatyczna',
        bodyType: 'Sedan',
        engineSize: 2000,
        power: 204,
        condition: 'Używany',
        headline: 'Mercedes-Benz C-Class 2022 - Stan idealny',
        description: 'Profesjonalnie serwisowany Mercedes-Benz C-Class z salonu. Pełna dokumentacja serwisowa.',
        shortDescription: 'Mercedes-Benz C-Class 2022 z salonu',
        voivodeship: 'mazowieckie',
        city: 'Warszawa',
        sellerType: 'Firma',
        ownerName: 'AutoSalon',
        ownerLastName: 'Premium',
        ownerEmail: 'kontakt@autosalon.pl',
        ownerPhone: '+48123456789',
        status: 'active',
        listingType: 'standardowe',
        images: ['/images/mercedes-c-class.jpg'],
        mainImageIndex: 0
      },
      {
        brand: 'Audi',
        model: 'A4',
        year: 2021,
        price: 165000,
        mileage: 25000,
        fuelType: 'Diesel',
        transmission: 'Automatyczna',
        bodyType: 'Kombi',
        engineSize: 2000,
        power: 190,
        condition: 'Używany',
        headline: 'Audi A4 Avant 2021 - Kombi biznesowe',
        description: 'Audi A4 Avant w wersji biznesowej. Idealne do pracy i rodziny.',
        shortDescription: 'Audi A4 Avant 2021 biznesowe',
        voivodeship: 'śląskie',
        city: 'Katowice',
        sellerType: 'Firma',
        ownerName: 'Dealer',
        ownerLastName: 'Audi',
        ownerEmail: 'sprzedaz@audidealer.pl',
        ownerPhone: '+48987654321',
        status: 'active',
        listingType: 'wyróżnione',
        images: ['/images/audi-a4.jpg'],
        mainImageIndex: 0
      },
      {
        brand: 'Volkswagen',
        model: 'Golf',
        year: 2020,
        price: 95000,
        mileage: 45000,
        fuelType: 'Benzyna',
        transmission: 'Manualna',
        bodyType: 'Hatchback',
        engineSize: 1400,
        power: 125,
        condition: 'Używany',
        headline: 'Volkswagen Golf 2020 - Ekonomiczny i niezawodny',
        description: 'Volkswagen Golf w doskonałym stanie technicznym. Serwisowany w ASO.',
        shortDescription: 'VW Golf 2020 ekonomiczny',
        voivodeship: 'wielkopolskie',
        city: 'Poznań',
        sellerType: 'Firma',
        ownerName: 'VW',
        ownerLastName: 'Centrum',
        ownerEmail: 'info@vwcentrum.pl',
        ownerPhone: '+48555666777',
        status: 'active',
        listingType: 'standardowe',
        images: ['/images/vw-golf.jpg'],
        mainImageIndex: 0
      }
    ];

    // Add owner field (using a dummy ObjectId for now)
    const dummyOwnerId = new mongoose.Types.ObjectId();
    companyAds.forEach(ad => {
      ad.owner = dummyOwnerId;
    });

    // Insert company ads
    const result = await Ad.insertMany(companyAds);
    console.log(`✅ Dodano ${result.length} ogłoszeń firmowych do bazy danych`);

    // Verify the insertion
    const companyCount = await Ad.countDocuments({ sellerType: 'Firma' });
    console.log(`📊 Łączna liczba ogłoszeń firmowych w bazie: ${companyCount}`);

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

addCompanyAds();
