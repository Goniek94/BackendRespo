/**
 * Skrypt do przywracania wygasłych ogłoszeń administratorów
 * Znajduje wszystkie ogłoszenia z rolą właściciela 'admin' i statusem 'archived'
 * Zmienia ich status na 'active' i ustawia datę wygaśnięcia na null
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Ad from './models/ad.js';
import User from './models/user.js';

// Załadowanie zmiennych środowiskowych
dotenv.config();
const MONGO_URI = process.env.MONGO_URI;

/**
 * Główna funkcja przywracająca wygasłe ogłoszenia administratorów
 */
async function restoreAdminAds() {
  try {
    console.log('Rozpoczynam przywracanie wygasłych ogłoszeń administratorów...');
    
    // Połączenie z bazą danych
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Połączono z bazą danych');
    
    // Znajdź wszystkich użytkowników z rolą 'admin'
    const admins = await User.find({ role: 'admin' });
    console.log(`Znaleziono ${admins.length} administratorów`);
    
    if (admins.length === 0) {
      console.log('Nie znaleziono administratorów, kończę działanie');
      await mongoose.disconnect();
      return;
    }
    
    // Pobierz ID administratorów
    const adminIds = admins.map(admin => admin._id);
    console.log('ID administratorów:', adminIds);
    
    // Znajdź wszystkie ogłoszenia administratorów ze statusem 'archived'
    const archivedAdminAds = await Ad.find({
      owner: { $in: adminIds },
      status: 'archived'
    });
    
    console.log(`Znaleziono ${archivedAdminAds.length} wygasłych ogłoszeń administratorów`);
    
    // Przywróć każde ogłoszenie
    for (const ad of archivedAdminAds) {
      console.log(`Przywracanie ogłoszenia ${ad._id} (${ad.headline || ad.brand + ' ' + ad.model})`);
      
      // Zmień status na 'active' (aktywne)
      ad.status = 'active';
      
      // Ustaw datę wygaśnięcia na null (nigdy nie wygaśnie)
      ad.expiresAt = null;
      
      // Zapisz zmiany
      await ad.save();
      
      console.log(`Ogłoszenie ${ad._id} zostało przywrócone`);
    }
    
    // Znajdź wszystkie ogłoszenia administratorów z datą wygaśnięcia
    const adminAdsWithExpiration = await Ad.find({
      owner: { $in: adminIds },
      expiresAt: { $ne: null }
    });
    
    console.log(`Znaleziono ${adminAdsWithExpiration.length} ogłoszeń administratorów z datą wygaśnięcia`);
    
    // Usuń datę wygaśnięcia dla każdego ogłoszenia
    for (const ad of adminAdsWithExpiration) {
      console.log(`Usuwanie daty wygaśnięcia dla ogłoszenia ${ad._id} (${ad.headline || ad.brand + ' ' + ad.model})`);
      
      // Ustaw datę wygaśnięcia na null (nigdy nie wygaśnie)
      ad.expiresAt = null;
      
      // Zapisz zmiany
      await ad.save();
      
      console.log(`Data wygaśnięcia dla ogłoszenia ${ad._id} została usunięta`);
    }
    
    console.log('Zakończono przywracanie wygasłych ogłoszeń administratorów');
  } catch (error) {
    console.error('Błąd podczas przywracania wygasłych ogłoszeń administratorów:', error);
  } finally {
    // Zamknięcie połączenia z bazą danych
    await mongoose.disconnect();
    console.log('Rozłączono z bazą danych');
  }
}

// Uruchomienie funkcji
restoreAdminAds()
  .then(() => {
    console.log('Skrypt zakończył działanie');
    process.exit(0);
  })
  .catch(error => {
    console.error('Błąd podczas wykonywania skryptu:', error);
    process.exit(1);
  });
