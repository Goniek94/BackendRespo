/**
 * Skrypt do dodania przykładowego ogłoszenia - symulacja formularza
 * Używa gotowych URL-i zdjęć z Supabase (jak frontend po uploaderze)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Ad from '../models/listings/ad.js';
import User from '../models/user/user.js';

dotenv.config();

// Konfiguracja MongoDB
const MONGODB_URI = process.env.MONGODB_URI;

// Przykładowe URL-e zdjęć z Supabase (można użyć prawdziwych lub testowych)
const SAMPLE_IMAGES = [
  'https://zcxakmniknrtvtnyetxd.supabase.co/storage/v1/object/public/autosell/sample_bmw_x5_1.jpg',
  'https://zcxakmniknrtvtnyetxd.supabase.co/storage/v1/object/public/autosell/sample_bmw_x5_2.jpg',
  'https://zcxakmniknrtvtnyetxd.supabase.co/storage/v1/object/public/autosell/sample_bmw_x5_3.jpg',
  'https://zcxakmniknrtvtnyetxd.supabase.co/storage/v1/object/public/autosell/sample_bmw_x5_4.jpg',
  'https://zcxakmniknrtvtnyetxd.supabase.co/storage/v1/object/public/autosell/sample_bmw_x5_5.jpg'
];

// Dane przykładowego ogłoszenia - tak jak z formularza
const SAMPLE_AD_DATA = {
  // Podstawowe dane pojazdu
  brand: 'BMW',
  model: 'X5',
  generation: 'G05',
  version: 'xDrive30d M Sport',
  year: 2020,
  price: 285000,
  mileage: 45000,
  fuelType: 'Diesel',
  transmission: 'Automatyczna',
  
  // Identyfikatory
  vin: 'WBAJA7C50LCE12345',
  registrationNumber: 'WW12345',
  firstRegistrationDate: new Date('2020-03-15'),
  
  // Opis
  headline: 'BMW X5 xDrive30d M Sport - Stan Idealny, Serwisowany w ASO',
  description: `Sprzedam przepiękne BMW X5 G05 w wersji M Sport. Samochód w idealnym stanie technicznym i wizualnym.

🚗 DANE TECHNICZNE:
• Silnik: 3.0 diesel, 265 KM
• Napęd: xDrive (4x4)
• Skrzynia: Automatyczna 8-biegowa
• Przebieg: 45 000 km (udokumentowany)

✨ WYPOSAŻENIE:
• Pakiet M Sport
• Panorama
• Skórzana tapicerka
• System nawigacji Professional
• Kamera cofania + czujniki
• Klimatyzacja automatyczna 4-strefowa
• Podgrzewane fotele
• Światła LED
• Felgi M 20"

📋 HISTORIA:
• Pierwszy właściciel
• Serwisowany wyłącznie w ASO BMW
• Książka serwisowa
• Wszystkie przeglądy na bieżąco
• Bezwypadkowy

💰 CENA: 285 000 zł (możliwa niewielka negocjacja)

Samochód dostępny do oględzin w Warszawie. Zapraszam do kontaktu!`,
  
  // Opcje sprzedaży
  purchaseOptions: 'Sprzedaż',
  negotiable: 'Tak',
  listingType: 'standardowe',
  sellerType: 'Prywatny',
  
  // Dane techniczne
  condition: 'Używany',
  accidentStatus: 'Bezwypadkowy',
  damageStatus: 'Nieuszkodzony',
  tuning: 'Nie',
  imported: 'Nie',
  registeredInPL: 'Tak',
  firstOwner: 'Tak',
  disabledAdapted: 'Nie',
  
  // Szczegóły techniczne
  bodyType: 'Suv',
  color: 'Czarny metalik',
  paintFinish: 'METALIK',
  seats: 5,
  power: 265,
  engineSize: 2993,
  drive: 'Na cztery koła (4x4)',
  doors: 5,
  countryOfOrigin: 'Niemcy',
  
  // Lokalizacja
  voivodeship: 'Mazowieckie',
  city: 'Warszawa',
  
  // Zdjęcia z Supabase
  images: SAMPLE_IMAGES,
  mainImage: SAMPLE_IMAGES[0]
};

async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Połączono z MongoDB');
  } catch (error) {
    console.error('❌ Błąd połączenia z MongoDB:', error);
    process.exit(1);
  }
}

async function findOrCreateUser() {
  try {
    // Znajdź pierwszego dostępnego użytkownika lub utwórz testowego
    let user = await User.findOne({ role: { $ne: 'admin' } });
    
    if (!user) {
      console.log('📝 Tworzenie testowego użytkownika...');
      user = new User({
        name: 'Jan',
        lastName: 'Kowalski',
        email: 'jan.kowalski@example.com',
        phoneNumber: '+48123456789',
        role: 'user',
        isVerified: true,
        password: 'hashedpassword123' // W prawdziwej aplikacji byłoby zahashowane
      });
      await user.save();
      console.log('✅ Utworzono testowego użytkownika:', user.email);
    } else {
      console.log('✅ Znaleziono użytkownika:', user.email);
    }
    
    return user;
  } catch (error) {
    console.error('❌ Błąd podczas tworzenia/znajdowania użytkownika:', error);
    throw error;
  }
}

async function createSampleAd() {
  try {
    console.log('🚀 Dodawanie przykładowego ogłoszenia...');
    console.log('📸 Zdjęcia z Supabase:', SAMPLE_AD_DATA.images.length);
    
    // Znajdź użytkownika
    const user = await findOrCreateUser();
    
    // Sprawdź czy ogłoszenie już istnieje
    const existingAd = await Ad.findOne({ 
      brand: SAMPLE_AD_DATA.brand, 
      model: SAMPLE_AD_DATA.model,
      vin: SAMPLE_AD_DATA.vin 
    });
    
    if (existingAd) {
      console.log('⚠️ Ogłoszenie już istnieje:', existingAd._id);
      return existingAd;
    }
    
    // Utwórz nowe ogłoszenie z danymi użytkownika
    const newAd = new Ad({
      ...SAMPLE_AD_DATA,
      
      // Dane właściciela (z bazy danych)
      owner: user._id,
      ownerName: user.name,
      ownerLastName: user.lastName,
      ownerEmail: user.email,
      ownerPhone: user.phoneNumber,
      ownerRole: user.role,
      
      // Metadane
      status: 'active', // Od razu aktywne dla testu
      shortDescription: SAMPLE_AD_DATA.headline.substring(0, 120),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dni
    });
    
    // Zapisz ogłoszenie
    const savedAd = await newAd.save();
    
    console.log('✅ SUKCES - Ogłoszenie dodane pomyślnie!');
    console.log('🆔 ID ogłoszenia:', savedAd._id);
    console.log('🚗 Pojazd:', `${savedAd.brand} ${savedAd.model} ${savedAd.year}`);
    console.log('💰 Cena:', `${savedAd.price.toLocaleString()} zł`);
    console.log('📸 Zdjęcia:', savedAd.images.length);
    console.log('🌐 Główne zdjęcie:', savedAd.mainImage);
    console.log('👤 Właściciel:', `${savedAd.ownerName} ${savedAd.ownerLastName}`);
    console.log('📍 Lokalizacja:', `${savedAd.city}, ${savedAd.voivodeship}`);
    
    return savedAd;
    
  } catch (error) {
    console.error('❌ Błąd podczas tworzenia ogłoszenia:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🎯 DODAWANIE PRZYKŁADOWEGO OGŁOSZENIA');
    console.log('=' .repeat(50));
    
    // Połącz z bazą danych
    await connectToDatabase();
    
    // Dodaj ogłoszenie
    const ad = await createSampleAd();
    
    console.log('\n🎉 ZADANIE ZAKOŃCZONE POMYŚLNIE!');
    console.log('📋 Podsumowanie:');
    console.log(`   • Ogłoszenie: ${ad.brand} ${ad.model} ${ad.year}`);
    console.log(`   • Status: ${ad.status}`);
    console.log(`   • Zdjęcia z Supabase: ${ad.images.length}`);
    console.log(`   • URL głównego zdjęcia: ${ad.mainImage}`);
    
  } catch (error) {
    console.error('💥 BŁĄD KRYTYCZNY:', error);
  } finally {
    // Zamknij połączenie z bazą danych
    await mongoose.connection.close();
    console.log('🔌 Rozłączono z MongoDB');
    process.exit(0);
  }
}

// Uruchom skrypt
main();
