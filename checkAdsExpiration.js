/**
 * Skrypt do sprawdzania ogłoszeń z kończącym się terminem ważności
 * i wysyłania powiadomień do użytkowników
 * 
 * Uruchamiany jako niezależny skrypt przez cron lub ręcznie
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Ad from './models/ad.js';
import notificationService from './controllers/notificationController.js';

// Załadowanie zmiennych środowiskowych
dotenv.config();
const MONGO_URI = process.env.MONGO_URI;

/**
 * Główna funkcja sprawdzająca ogłoszenia z kończącym się terminem ważności
 */
async function checkExpiringAds() {
  try {
    console.log('Rozpoczynam sprawdzanie ogłoszeń z kończącym się terminem ważności...');
    
    // Połączenie z bazą danych
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Połączono z bazą danych');
    
    // Pobierz aktualną datę
    const now = new Date();
    
    // Oblicz datę za 3 dni
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);
    
    // Znajdź ogłoszenia, które wygasają w ciągu najbliższych 3 dni
    const expiringAds = await Ad.find({
      status: 'active',
      expiresAt: {
        $gte: now,
        $lte: threeDaysFromNow
      },
      // Pole notifiedAboutExpiration pozwala uniknąć wielokrotnego powiadamiania o tym samym ogłoszeniu
      notifiedAboutExpiration: { $ne: true }
    }).populate('owner', 'role'); // Pobieramy rolę właściciela
    
    console.log(`Znaleziono ${expiringAds.length} ogłoszeń z kończącym się terminem ważności`);
    
    // Dla każdego ogłoszenia wyślij powiadomienie do właściciela
    for (const ad of expiringAds) {
      try {
        // Sprawdź, czy właściciel ogłoszenia jest administratorem
        const isAdminAd = ad.owner && ad.owner.role === 'admin';
        
        if (isAdminAd) {
          console.log(`Pomijam powiadomienie dla ogłoszenia (ID: ${ad._id}) - właściciel jest administratorem`);
          continue; // Pomijamy ogłoszenia administratorów
        }
        
        // Oblicz liczbę dni do wygaśnięcia
        const daysLeft = Math.ceil((ad.expiresAt - now) / (1000 * 60 * 60 * 24));
        
        // Tytuł ogłoszenia
        const adTitle = ad.headline || `${ad.brand} ${ad.model}`;
        
        console.log(`Wysyłam powiadomienie dla ogłoszenia "${adTitle}" (ID: ${ad._id}), pozostało dni: ${daysLeft}`);
        
        // Wyślij powiadomienie
        await notificationService.notifyAdExpiringSoon(ad.owner._id, adTitle, daysLeft, ad._id.toString());
        
        // Oznacz ogłoszenie jako powiadomione
        ad.notifiedAboutExpiration = true;
        await ad.save();
        
        console.log(`Powiadomienie wysłane do użytkownika ${ad.owner._id}`);
      } catch (error) {
        console.error(`Błąd podczas wysyłania powiadomienia dla ogłoszenia ${ad._id}:`, error);
      }
    }
    
    console.log('Zakończono sprawdzanie ogłoszeń z kończącym się terminem ważności');
  } catch (error) {
    console.error('Błąd podczas sprawdzania ogłoszeń z kończącym się terminem:', error);
  } finally {
    // Zamknięcie połączenia z bazą danych
    await mongoose.disconnect();
    console.log('Rozłączono z bazą danych');
  }
}

/**
 * Funkcja sprawdzająca ogłoszenia, które wygasły i zmieniająca ich status na "archiwalne"
 */
async function archiveExpiredAds() {
  try {
    console.log('Rozpoczynam archiwizację wygasłych ogłoszeń...');
    
    // Połączenie z bazą danych (jeśli nie jest już połączone)
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('Połączono z bazą danych');
    }
    
    // Pobierz aktualną datę
    const now = new Date();
    
    // Znajdź ogłoszenia, które wygasły
    const expiredAds = await Ad.find({
      status: 'active',
      expiresAt: { $lt: now }
    }).populate('owner', 'role'); // Pobieramy rolę właściciela
    
    console.log(`Znaleziono ${expiredAds.length} wygasłych ogłoszeń do archiwizacji`);
    
    // Dla każdego ogłoszenia zmień status na "archiwalne" i wyślij powiadomienie
    for (const ad of expiredAds) {
      try {
        // Tytuł ogłoszenia
        const adTitle = ad.headline || `${ad.brand} ${ad.model}`;
        
        // Sprawdź, czy właściciel ogłoszenia jest administratorem
        const isAdminAd = ad.owner && ad.owner.role === 'admin';
        
        if (isAdminAd) {
          console.log(`Pomijam archiwizację ogłoszenia "${adTitle}" (ID: ${ad._id}) - właściciel jest administratorem`);
          continue; // Pomijamy ogłoszenia administratorów
        }
        
        console.log(`Archiwizuję ogłoszenie "${adTitle}" (ID: ${ad._id})`);
        
        // Zmień status na "archived"
        ad.status = 'archived';
        await ad.save();
        
        // Wyślij powiadomienie o wygaśnięciu ogłoszenia
        await notificationService.notifyAdExpired(ad.owner._id, adTitle, ad._id.toString());
        
        // Wyślij również powiadomienie o zmianie statusu
        await notificationService.notifyAdStatusChange(ad.owner._id, adTitle, 'archived');
        
        console.log(`Ogłoszenie zarchiwizowane, powiadomienia wysłane do użytkownika ${ad.owner._id}`);
      } catch (error) {
        console.error(`Błąd podczas archiwizacji ogłoszenia ${ad._id}:`, error);
      }
    }
    
    console.log('Zakończono archiwizację wygasłych ogłoszeń');
  } catch (error) {
    console.error('Błąd podczas archiwizacji wygasłych ogłoszeń:', error);
  } finally {
    // Zamknięcie połączenia z bazą danych
    await mongoose.disconnect();
    console.log('Rozłączono z bazą danych');
  }
}

// Uruchomienie funkcji sprawdzających
async function main() {
  try {
    // Sprawdź ogłoszenia z kończącym się terminem ważności
    await checkExpiringAds();
    
    // Archiwizuj wygasłe ogłoszenia
    await archiveExpiredAds();
    
    console.log('Wszystkie operacje zakończone pomyślnie');
    process.exit(0);
  } catch (error) {
    console.error('Wystąpił błąd podczas wykonywania operacji:', error);
    process.exit(1);
  }
}

// Uruchomienie skryptu
main();
