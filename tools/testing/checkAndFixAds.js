// tests/checkAndFixAds.js
// Skrypt do sprawdzania i naprawiania pola owner w ogłoszeniach

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Ad from '../models/ad.js';
import User from '../models/user.js';

// Załadowanie zmiennych środowiskowych
dotenv.config();

// Funkcja do połączenia z bazą danych
const connectToDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/marketplace', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Połączono z bazą danych MongoDB');
    return true;
  } catch (err) {
    console.error('❌ Błąd połączenia z MongoDB:', err);
    return false;
  }
};

// Funkcja do sprawdzania i naprawiania ogłoszeń
const checkAndFixAds = async () => {
  console.log('🔍 Sprawdzanie ogłoszeń w bazie danych...');
  
  try {
    // Pobierz wszystkie ogłoszenia
    const ads = await Ad.find();
    console.log(`Znaleziono ${ads.length} ogłoszeń w bazie danych.`);
    
    if (ads.length === 0) {
      console.log('❌ Brak ogłoszeń w bazie danych.');
      return;
    }
    
    // Sprawdź każde ogłoszenie
    for (const ad of ads) {
      console.log(`\n📄 Ogłoszenie: ${ad.headline || `${ad.brand} ${ad.model}`} (ID: ${ad._id})`);
      
      // Sprawdź, czy pole owner istnieje i jest poprawne
      if (!ad.owner) {
        console.log('❌ Brak pola owner w ogłoszeniu.');
        
        // Jeśli brak pola owner, ale jest ownerEmail, znajdź użytkownika po emailu
        if (ad.ownerEmail) {
          console.log(`Próba znalezienia właściciela po adresie email: ${ad.ownerEmail}`);
          const owner = await User.findOne({ email: ad.ownerEmail });
          
          if (owner) {
            console.log(`✅ Znaleziono właściciela: ${owner.name || owner.email} (ID: ${owner._id})`);
            
            // Aktualizuj ogłoszenie
            ad.owner = owner._id;
            await ad.save();
            console.log('✅ Zaktualizowano pole owner w ogłoszeniu.');
          } else {
            console.log('❌ Nie znaleziono użytkownika o podanym adresie email.');
          }
        } else {
          console.log('❌ Brak pola ownerEmail w ogłoszeniu. Nie można automatycznie naprawić.');
        }
      } else {
        // Sprawdź, czy owner jest poprawnym ObjectId
        if (mongoose.Types.ObjectId.isValid(ad.owner)) {
          console.log(`Owner ID: ${ad.owner}`);
          
          // Sprawdź, czy istnieje użytkownik o podanym ID
          const owner = await User.findById(ad.owner);
          
          if (owner) {
            console.log(`✅ Znaleziono właściciela: ${owner.name || owner.email} (ID: ${owner._id})`);
          } else {
            console.log('❌ Nie znaleziono użytkownika o podanym ID.');
            
            // Jeśli brak użytkownika o podanym ID, ale jest ownerEmail, znajdź użytkownika po emailu
            if (ad.ownerEmail) {
              console.log(`Próba znalezienia właściciela po adresie email: ${ad.ownerEmail}`);
              const ownerByEmail = await User.findOne({ email: ad.ownerEmail });
              
              if (ownerByEmail) {
                console.log(`✅ Znaleziono właściciela: ${ownerByEmail.name || ownerByEmail.email} (ID: ${ownerByEmail._id})`);
                
                // Aktualizuj ogłoszenie
                ad.owner = ownerByEmail._id;
                await ad.save();
                console.log('✅ Zaktualizowano pole owner w ogłoszeniu.');
              } else {
                console.log('❌ Nie znaleziono użytkownika o podanym adresie email.');
              }
            } else {
              console.log('❌ Brak pola ownerEmail w ogłoszeniu. Nie można automatycznie naprawić.');
            }
          }
        } else {
          console.log('❌ Pole owner nie jest poprawnym ObjectId.');
          
          // Jeśli pole owner nie jest poprawnym ObjectId, ale jest ownerEmail, znajdź użytkownika po emailu
          if (ad.ownerEmail) {
            console.log(`Próba znalezienia właściciela po adresie email: ${ad.ownerEmail}`);
            const owner = await User.findOne({ email: ad.ownerEmail });
            
            if (owner) {
              console.log(`✅ Znaleziono właściciela: ${owner.name || owner.email} (ID: ${owner._id})`);
              
              // Aktualizuj ogłoszenie
              ad.owner = owner._id;
              await ad.save();
              console.log('✅ Zaktualizowano pole owner w ogłoszeniu.');
            } else {
              console.log('❌ Nie znaleziono użytkownika o podanym adresie email.');
            }
          } else {
            console.log('❌ Brak pola ownerEmail w ogłoszeniu. Nie można automatycznie naprawić.');
          }
        }
      }
      
      // Wyświetl wszystkie pola związane z właścicielem
      console.log('Pola związane z właścicielem:');
      console.log(`- owner: ${ad.owner || 'brak'}`);
      console.log(`- ownerName: ${ad.ownerName || 'brak'}`);
      console.log(`- ownerLastName: ${ad.ownerLastName || 'brak'}`);
      console.log(`- ownerEmail: ${ad.ownerEmail || 'brak'}`);
      console.log(`- ownerPhone: ${ad.ownerPhone || 'brak'}`);
    }
    
    console.log('\n✅ Sprawdzanie i naprawianie ogłoszeń zakończone.');
  } catch (error) {
    console.error('❌ Błąd podczas sprawdzania i naprawiania ogłoszeń:', error);
  }
};

// Funkcja do tworzenia testowego ogłoszenia
const createTestAd = async (userEmail) => {
  console.log(`\n🔧 Tworzenie testowego ogłoszenia dla użytkownika o adresie email: ${userEmail}`);
  
  try {
    // Znajdź użytkownika
    const user = await User.findOne({ email: userEmail });
    
    if (!user) {
      console.log(`❌ Nie znaleziono użytkownika o adresie email: ${userEmail}`);
      return null;
    }
    
    console.log(`✅ Znaleziono użytkownika: ${user.name || user.email} (ID: ${user._id})`);
    
    // Utwórz testowe ogłoszenie
    const newAd = new Ad({
      // Podstawowe dane
      brand: 'Test',
      model: 'Testowy',
      year: 2023,
      price: 10000,
      mileage: 0,
      fuelType: 'benzyna',
      transmission: 'manualna',
      headline: 'Testowe ogłoszenie',
      description: 'To jest testowe ogłoszenie utworzone automatycznie w celu testowania systemu wiadomości.',
      images: [],
      listingType: 'standardowe',
      
      // Dane techniczne
      condition: 'używany',
      bodyType: 'sedan',
      color: 'czarny',
      power: 100,
      
      // Lokalizacja
      voivodeship: 'mazowieckie',
      city: 'Warszawa',
      
      // Dane właściciela
      owner: user._id,
      ownerName: user.name,
      ownerLastName: user.lastName,
      ownerEmail: user.email,
      ownerPhone: user.phoneNumber,
      
      // Status
      status: 'opublikowane'
    });
    
    // Zapisz ogłoszenie w bazie danych
    const ad = await newAd.save();
    console.log(`✅ Utworzono testowe ogłoszenie (ID: ${ad._id})`);
    
    return ad;
  } catch (error) {
    console.error('❌ Błąd podczas tworzenia testowego ogłoszenia:', error);
    return null;
  }
};

// Główna funkcja
const main = async () => {
  console.log('🚀 Rozpoczynanie sprawdzania i naprawiania ogłoszeń');
  
  // Połączenie z bazą danych
  const dbConnected = await connectToDatabase();
  if (!dbConnected) {
    console.error('❌ Nie można przeprowadzić operacji bez połączenia z bazą danych');
    process.exit(1);
  }
  
  try {
    // Sprawdź i napraw ogłoszenia
    await checkAndFixAds();
    
    // Sprawdź, czy istnieją ogłoszenia po naprawie
    const adsCount = await Ad.countDocuments();
    console.log(`\nLiczba ogłoszeń po naprawie: ${adsCount}`);
    
    // Jeśli nie ma ogłoszeń, utwórz testowe ogłoszenie
    if (adsCount === 0) {
      console.log('Brak ogłoszeń w bazie danych. Tworzenie testowego ogłoszenia...');
      
      // Utwórz testowe ogłoszenie dla użytkownika
      const userEmail = 'mateusz.goszczycki1994@gmail.com'; // Zmień na istniejący adres email
      const testAd = await createTestAd(userEmail);
      
      if (testAd) {
        console.log('✅ Testowe ogłoszenie zostało utworzone pomyślnie.');
      } else {
        console.log('❌ Nie udało się utworzyć testowego ogłoszenia.');
      }
    }
  } catch (error) {
    console.error('❌ Błąd podczas wykonywania operacji:', error);
  } finally {
    // Zamknij połączenie z bazą danych
    await mongoose.connection.close();
    console.log('🔌 Zamknięto połączenie z bazą danych');
  }
};

// Uruchomienie głównej funkcji
main();
