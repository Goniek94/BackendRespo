import notificationManager from '../services/notificationManager.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user/user.js';

// Załaduj zmienne środowiskowe
dotenv.config();

/**
 * Tworzy testowe powiadomienia dla użytkownika
 */
async function createTestNotifications() {
  try {
    console.log('🔄 Łączenie z bazą danych...');
    
    // Połącz z bazą danych
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/marketplace', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Połączono z bazą danych');
    
    // Inicjalizuj serwis powiadomień
    // notificationManager nie wymaga inicjalizacji
    
    // Znajdź użytkownika Mateusz Goszczycki
    const user = await User.findOne({ email: 'mateusz.goszczycki1994@gmail.com' });
    if (!user) {
      console.log('❌ Nie znaleziono użytkownika');
      return;
    }
    
    console.log(`✅ Znaleziono użytkownika: ${user.name} (${user.email})`);
    console.log(`📋 ID użytkownika: ${user._id}`);
    
    console.log('\n📝 Tworzenie testowych powiadomień...\n');
    
    // Test 1: Powiadomienie o nowej wiadomości
    console.log('1️⃣ Tworzenie powiadomienia o nowej wiadomości...');
    const messageNotification = await notificationManager.createNotification(
      user._id.toString(),
      'Nowa wiadomość od Jan Kowalski',
      'Otrzymałeś nową wiadomość dotyczącą ogłoszenia BMW X5 2020',
      'new_message',
      { 
        senderName: 'Jan Kowalski',
        adTitle: 'BMW X5 2020',
        conversationId: 'test123' 
      }
    );
    
    if (messageNotification) {
      console.log('✅ Powiadomienie o wiadomości utworzone:', messageNotification._id);
    } else {
      console.log('❌ Nie udało się utworzyć powiadomienia o wiadomości');
    }
    
    // Test 2: Powiadomienie o dodaniu do ulubionych
    console.log('\n2️⃣ Tworzenie powiadomienia o dodaniu do ulubionych...');
    const likedNotification = await notificationManager.createNotification(
      user._id.toString(),
      'Ogłoszenie dodane do ulubionych',
      'Twoje ogłoszenie Audi A4 2019 zostało dodane do ulubionych przez innego użytkownika',
      'listing_liked',
      { 
        adTitle: 'Audi A4 2019',
        adId: '507f1f77bcf86cd799439012'
      }
    );
    
    if (likedNotification) {
      console.log('✅ Powiadomienie o ulubionych utworzone:', likedNotification._id);
    } else {
      console.log('❌ Nie udało się utworzyć powiadomienia o ulubionych');
    }
    
    // Test 3: Powiadomienie o płatności
    console.log('\n3️⃣ Tworzenie powiadomienia o płatności...');
    const paymentNotification = await notificationManager.createNotification(
      user._id.toString(),
      'Płatność zakończona pomyślnie',
      'Płatność za promocję ogłoszenia Mercedes C-Class 2021 została zrealizowana (50 PLN)',
      'payment_completed',
      { 
        adTitle: 'Mercedes C-Class 2021',
        amount: 50, 
        currency: 'PLN' 
      }
    );
    
    if (paymentNotification) {
      console.log('✅ Powiadomienie o płatności utworzone:', paymentNotification._id);
    } else {
      console.log('❌ Nie udało się utworzyć powiadomienia o płatności');
    }
    
    // Test 4: Powiadomienie systemowe
    console.log('\n4️⃣ Tworzenie powiadomienia systemowego...');
    const systemNotification = await notificationManager.createNotification(
      user._id.toString(),
      'Aktualizacja systemu',
      'System został zaktualizowany do najnowszej wersji. Sprawdź nowe funkcje!',
      'system',
      { version: '2.1.0', features: ['notifications', 'search'] }
    );
    
    if (systemNotification) {
      console.log('✅ Powiadomienie systemowe utworzone:', systemNotification._id);
    } else {
      console.log('❌ Nie udało się utworzyć powiadomienia systemowego');
    }
    
    // Test 5: Powiadomienie o ogłoszeniu
    console.log('\n5️⃣ Tworzenie powiadomienia o ogłoszeniu...');
    const adNotification = await notificationManager.createNotification(
      user._id.toString(),
      'Ogłoszenie zostało opublikowane',
      'Twoje ogłoszenie Toyota Corolla 2022 zostało pomyślnie opublikowane',
      'listing_approved',
      { 
        adTitle: 'Toyota Corolla 2022',
        adId: '507f1f77bcf86cd799439013'
      }
    );
    
    if (adNotification) {
      console.log('✅ Powiadomienie o ogłoszeniu utworzone:', adNotification._id);
    } else {
      console.log('❌ Nie udało się utworzyć powiadomienia o ogłoszeniu');
    }
    
    console.log('\n🎉 Testowe powiadomienia utworzone!');
    console.log('\n📋 Instrukcje:');
    console.log('1. Zaloguj się jako mateusz.goszczycki1994@gmail.com');
    console.log('2. Przejdź do /profil/notifications');
    console.log('3. Sprawdź czy powiadomienia są widoczne');
    console.log('4. Otwórz konsolę przeglądarki i sprawdź logi [NotificationContext]');
    
  } catch (error) {
    console.error('❌ Błąd podczas tworzenia powiadomień:', error);
  } finally {
    // Zamknij połączenie z bazą danych
    await mongoose.connection.close();
    console.log('\n🔌 Rozłączono z bazą danych');
    process.exit(0);
  }
}

// Uruchom test
createTestNotifications();
