import mongoose from 'mongoose';
import Ad from './models/listings/ad.js';
import './config/index.js';

async function sprawdzDaneWListachOgloszen() {
  try {
    console.log('🔍 SPRAWDZANIE DANYCH W LISTACH OGŁOSZEŃ');
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
      console.log(`Tytuł: ${ad.headline || 'BRAK'}`);
      console.log(`Marka: ${ad.brand || 'BRAK'}`);
      console.log(`Model: ${ad.model || 'BRAK'}`);
      console.log(`Wersja: ${ad.version || 'BRAK'}`);
      console.log(`Rok: ${ad.year || 'BRAK'}`);
      console.log(`Cena: ${ad.price || 'BRAK'} zł`);
      console.log(`Przebieg: ${ad.mileage || 'BRAK'} km`);
      console.log(`Paliwo: ${ad.fuelType || 'BRAK'}`);
      console.log(`Skrzynia: ${ad.transmission || 'BRAK'}`);
      console.log(`Moc: ${ad.power || 'BRAK'} KM`);
      console.log(`Napęd: ${ad.drive || 'BRAK'}`);
      console.log(`Typ nadwozia: ${ad.bodyType || 'BRAK'}`);
      console.log(`Kolor: ${ad.color || 'BRAK'}`);
      console.log(`Stan: ${ad.condition || 'BRAK'}`);
      console.log(`Kraj pochodzenia: ${ad.countryOfOrigin || 'BRAK'}`);
      console.log(`Typ sprzedającego: ${ad.sellerType || 'BRAK'}`);
      console.log(`Miasto: ${ad.city || 'BRAK'}`);
      console.log(`Województwo: ${ad.voivodeship || 'BRAK'}`);
      console.log(`Status: ${ad.status}`);
      console.log(`Data utworzenia: ${ad.createdAt}`);
      
      // Sprawdź czy wszystkie kluczowe pola są wypełnione
      const kluczowePola = [
        'brand', 'model', 'year', 'price', 'mileage', 'fuelType', 
        'transmission', 'power', 'drive', 'bodyType', 'color', 
        'condition', 'countryOfOrigin', 'sellerType', 'city'
      ];
      
      const brakujacePola = kluczowePola.filter(pole => !ad[pole] || ad[pole] === '');
      
      if (brakujacePola.length > 0) {
        console.log(`❌ BRAKUJĄCE POLA: ${brakujacePola.join(', ')}`);
      } else {
        console.log(`✅ WSZYSTKIE KLUCZOWE POLA WYPEŁNIONE`);
      }
    });

    // Sprawdź statystyki brakujących pól
    console.log('\n📈 STATYSTYKI BRAKUJĄCYCH PÓL:');
    console.log('============================================================');
    
    const totalAds = await Ad.countDocuments({ status: 'active' });
    console.log(`Łączna liczba aktywnych ogłoszeń: ${totalAds}`);
    
    const polaDoBadania = [
      'brand', 'model', 'year', 'price', 'mileage', 'fuelType', 
      'transmission', 'power', 'drive', 'bodyType', 'color', 
      'condition', 'countryOfOrigin', 'sellerType', 'city', 'voivodeship'
    ];
    
    for (const pole of polaDoBadania) {
      const pustePola = await Ad.countDocuments({ 
        status: 'active', 
        $or: [
          { [pole]: { $exists: false } },
          { [pole]: null },
          { [pole]: '' }
        ]
      });
      
      const procent = ((pustePola / totalAds) * 100).toFixed(1);
      console.log(`${pole}: ${pustePola}/${totalAds} pustych (${procent}%)`);
    }

  } catch (error) {
    console.error('❌ Błąd:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Rozłączono z bazą danych');
  }
}

sprawdzDaneWListachOgloszen();
