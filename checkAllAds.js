// checkAllAds.js
// Skrypt do sprawdzenia wszystkich ogłoszeń w bazie danych

import mongoose from 'mongoose';
import Ad from './models/ad.js';
import dotenv from 'dotenv';

// Załaduj zmienne środowiskowe
dotenv.config();

// Połącz z bazą danych
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Połączono z bazą danych MongoDB'))
  .catch(err => {
    console.error('Błąd połączenia z bazą danych:', err);
    process.exit(1);
  });

// Funkcja do sprawdzenia wszystkich ogłoszeń
async function checkAllAds() {
  try {
    // Pobierz wszystkie ogłoszenia
    const ads = await Ad.find({}).sort({ createdAt: -1 });
    
    console.log(`\nZnaleziono ${ads.length} ogłoszeń w bazie danych\n`);
    
    // Wyświetl statystyki statusów
    const statusStats = {};
    ads.forEach(ad => {
      const status = ad.status || 'undefined';
      statusStats[status] = (statusStats[status] || 0) + 1;
    });
    
    console.log('Statystyki statusów:');
    Object.entries(statusStats).forEach(([status, count]) => {
      console.log(`- ${status}: ${count} ogłoszeń`);
    });
    
    // Wyświetl statystyki typów ogłoszeń
    const typeStats = {};
    ads.forEach(ad => {
      const type = ad.listingType || 'undefined';
      typeStats[type] = (typeStats[type] || 0) + 1;
    });
    
    console.log('\nStatystyki typów ogłoszeń:');
    Object.entries(typeStats).forEach(([type, count]) => {
      console.log(`- ${type}: ${count} ogłoszeń`);
    });
    
    // Wyświetl szczegóły aktywnych ogłoszeń
    console.log('\nSzczegóły aktywnych ogłoszeń:');
    const activeAds = ads.filter(ad => ad.status === 'active');
    
    activeAds.forEach((ad, index) => {
      console.log(`\n[${index + 1}] ID: ${ad._id}`);
      console.log(`Tytuł: ${ad.brand} ${ad.model}`);
      console.log(`Status: ${ad.status}`);
      console.log(`Typ ogłoszenia: ${ad.listingType || 'nie określono'}`);
      console.log(`Cena: ${ad.price} zł`);
      console.log(`Rok: ${ad.year}`);
      console.log(`Przebieg: ${ad.mileage} km`);
      console.log(`Data utworzenia: ${ad.createdAt}`);
      console.log(`Liczba zdjęć: ${ad.images ? ad.images.length : 0}`);
    });
    
    // Sprawdź, czy jest Opel Astra
    const opelAstra = ads.find(ad => 
      ad.brand?.toLowerCase() === 'opel' && 
      ad.model?.toLowerCase() === 'astra'
    );
    
    if (opelAstra) {
      console.log('\nZnaleziono Opel Astra:');
      console.log(`ID: ${opelAstra._id}`);
      console.log(`Status: ${opelAstra.status}`);
      console.log(`Typ ogłoszenia: ${opelAstra.listingType || 'nie określono'}`);
    } else {
      console.log('\nNie znaleziono ogłoszenia Opel Astra');
    }
    
  } catch (error) {
    console.error('Błąd podczas sprawdzania ogłoszeń:', error);
  } finally {
    // Zamknij połączenie z bazą danych
    mongoose.connection.close();
    console.log('\nZakończono sprawdzanie ogłoszeń');
  }
}

// Uruchom funkcję sprawdzającą
checkAllAds();
