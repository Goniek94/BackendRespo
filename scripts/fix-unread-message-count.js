import mongoose from 'mongoose';
import Message from '../models/communication/message.js';
import Notification from '../models/communication/notification.js';
import User from '../models/user/user.js';

// Konfiguracja połączenia z bazą danych
const connectDB = async () => {
  try {
    // Wczytaj zmienne środowiskowe
    const dotenv = await import('dotenv');
    dotenv.config();
    
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/marketplace';
    console.log('🔗 Łączenie z bazą danych...');
    await mongoose.connect(mongoURI);
    console.log('✅ Połączono z bazą danych MongoDB');
  } catch (error) {
    console.error('❌ Błąd połączenia z bazą danych:', error);
    process.exit(1);
  }
};

// Funkcja naprawiająca liczniki nieprzeczytanych wiadomości
const fixUnreadMessageCount = async () => {
  try {
    console.log('🔧 Rozpoczynam naprawę liczników nieprzeczytanych wiadomości...\n');

    // Pobierz wszystkich użytkowników
    const users = await User.find({}).select('_id name email');
    console.log(`📊 Znaleziono ${users.length} użytkowników\n`);

    let totalFixed = 0;
    let totalRemoved = 0;

    for (const user of users) {
      console.log(`👤 Sprawdzam użytkownika: ${user.name || user.email} (${user._id})`);

      // Policz rzeczywiste nieprzeczytane wiadomości
      const actualUnreadMessages = await Message.countDocuments({
        recipient: user._id,
        read: false,
        deletedBy: { $ne: user._id }
      });

      // Znajdź powiadomienia o nowych wiadomościach
      const messageNotifications = await Notification.find({
        user: user._id,
        type: 'new_message',
        isRead: false
      });

      console.log(`  📧 Rzeczywiste nieprzeczytane wiadomości: ${actualUnreadMessages}`);
      console.log(`  🔔 Powiadomienia o wiadomościach: ${messageNotifications.length}`);

      // Jeśli nie ma nieprzeczytanych wiadomości, usuń wszystkie powiadomienia o wiadomościach
      if (actualUnreadMessages === 0 && messageNotifications.length > 0) {
        console.log(`  🗑️  Usuwam ${messageNotifications.length} niepotrzebnych powiadomień...`);
        
        const deleteResult = await Notification.deleteMany({
          user: user._id,
          type: 'new_message',
          isRead: false
        });

        totalRemoved += deleteResult.deletedCount;
        totalFixed++;
        console.log(`  ✅ Usunięto ${deleteResult.deletedCount} powiadomień`);
      } else if (actualUnreadMessages > 0 && messageNotifications.length !== actualUnreadMessages) {
        // Jeśli liczba powiadomień nie zgadza się z liczbą wiadomości
        console.log(`  ⚠️  Niezgodność: ${actualUnreadMessages} wiadomości vs ${messageNotifications.length} powiadomień`);
        
        // Usuń wszystkie stare powiadomienia o wiadomościach
        await Notification.deleteMany({
          user: user._id,
          type: 'new_message',
          isRead: false
        });

        console.log(`  ✅ Wyczyszczono stare powiadomienia dla użytkownika ${user.name || user.email}`);
        totalFixed++;
      } else if (actualUnreadMessages === messageNotifications.length && actualUnreadMessages > 0) {
        console.log(`  ✅ Liczniki są prawidłowe`);
      } else {
        console.log(`  ✅ Brak nieprzeczytanych wiadomości - OK`);
      }

      console.log(''); // Pusta linia dla czytelności
    }

    console.log('📈 PODSUMOWANIE:');
    console.log(`  👥 Sprawdzonych użytkowników: ${users.length}`);
    console.log(`  🔧 Naprawionych użytkowników: ${totalFixed}`);
    console.log(`  🗑️  Usuniętych powiadomień: ${totalRemoved}`);
    console.log('\n✅ Naprawa zakończona pomyślnie!');

  } catch (error) {
    console.error('❌ Błąd podczas naprawy liczników:', error);
    throw error;
  }
};

// Funkcja sprawdzająca aktualny stan
const checkCurrentState = async () => {
  try {
    console.log('🔍 Sprawdzam aktualny stan liczników...\n');

    const users = await User.find({}).select('_id name email').limit(5);

    for (const user of users) {
      console.log(`👤 ${user.name || user.email} (${user._id}):`);

      const actualUnreadMessages = await Message.countDocuments({
        recipient: user._id,
        read: false,
        deletedBy: { $ne: user._id }
      });

      const messageNotifications = await Notification.countDocuments({
        user: user._id,
        type: 'new_message',
        isRead: false
      });

      const otherNotifications = await Notification.countDocuments({
        user: user._id,
        type: { $ne: 'new_message' },
        isRead: false
      });

      console.log(`  📧 Nieprzeczytane wiadomości: ${actualUnreadMessages}`);
      console.log(`  🔔 Powiadomienia o wiadomościach: ${messageNotifications}`);
      console.log(`  📢 Inne powiadomienia: ${otherNotifications}`);
      console.log(`  📊 Razem powinno być: ${actualUnreadMessages + otherNotifications}`);
      console.log('');
    }
  } catch (error) {
    console.error('❌ Błąd podczas sprawdzania stanu:', error);
  }
};

// Główna funkcja
const main = async () => {
  await connectDB();

  const args = process.argv.slice(2);
  const command = args[0];

  try {
    if (command === 'check') {
      await checkCurrentState();
    } else if (command === 'fix') {
      await fixUnreadMessageCount();
    } else {
      console.log('📋 Dostępne komendy:');
      console.log('  node scripts/fix-unread-message-count.js check  - sprawdź aktualny stan');
      console.log('  node scripts/fix-unread-message-count.js fix    - napraw liczniki');
    }
  } catch (error) {
    console.error('❌ Błąd:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Rozłączono z bazą danych');
  }
};

// Uruchom skrypt
main();
