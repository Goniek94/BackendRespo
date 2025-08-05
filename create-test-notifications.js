import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Notification from './models/communication/notification.js';
import User from './models/user/user.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/marketplace';

async function createTestNotifications() {
  try {
    console.log('🔍 Łączenie z bazą danych...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Połączono z bazą danych');

    // Find the user
    const user = await User.findOne({ email: 'mateusz.goszczycki1994@gmail.com' });
    
    if (!user) {
      console.log('❌ Użytkownik nie znaleziony');
      return;
    }

    console.log(`👤 Znaleziono użytkownika: ${user.email} (${user._id})`);

    // Create test notifications
    const testNotifications = [
      {
        userId: user._id,
        user: user._id,
        type: 'listing_added',
        title: 'Ogłoszenie opublikowane!',
        message: 'Twoje ogłoszenie "BMW X5 2020" zostało pomyślnie opublikowane.',
        isRead: false,
        createdAt: new Date()
      },
      {
        userId: user._id,
        user: user._id,
        type: 'new_message',
        title: 'Nowa wiadomość',
        message: 'Otrzymałeś nową wiadomość od użytkownika Jan Kowalski.',
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 30) // 30 minutes ago
      },
      {
        userId: user._id,
        user: user._id,
        type: 'listing_liked',
        title: 'Ogłoszenie dodane do ulubionych',
        message: 'Ktoś dodał Twoje ogłoszenie "BMW X5 2020" do ulubionych.',
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60) // 1 hour ago
      },
      {
        userId: user._id,
        user: user._id,
        type: 'system_notification',
        title: 'Aktualizacja systemu',
        message: 'System został zaktualizowany. Sprawdź nowe funkcje!',
        isRead: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2) // 2 hours ago
      },
      {
        userId: user._id,
        user: user._id,
        type: 'listing_expiring',
        title: 'Ogłoszenie wkrótce wygaśnie',
        message: 'Twoje ogłoszenie "BMW X5 2020" wygaśnie za 3 dni.',
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6) // 6 hours ago
      }
    ];

    console.log('\n📝 Tworzenie powiadomień testowych...');
    
    // Delete existing notifications for this user first
    await Notification.deleteMany({ user: user._id });
    console.log('🗑️ Usunięto stare powiadomienia');

    // Create new notifications
    const createdNotifications = await Notification.insertMany(testNotifications);
    console.log(`✅ Utworzono ${createdNotifications.length} powiadomień testowych`);

    // Display created notifications
    console.log('\n📋 Utworzone powiadomienia:');
    createdNotifications.forEach((notification, index) => {
      console.log(`${index + 1}. [${notification.type}] ${notification.title}`);
      console.log(`   Wiadomość: ${notification.message}`);
      console.log(`   Przeczytane: ${notification.isRead ? 'Tak' : 'Nie'}`);
      console.log(`   Data: ${notification.createdAt}`);
      console.log('');
    });

    // Count unread notifications
    const unreadCount = await Notification.countDocuments({ 
      user: user._id, 
      isRead: false 
    });
    console.log(`📊 Nieprzeczytane powiadomienia: ${unreadCount}`);

  } catch (error) {
    console.error('❌ Błąd podczas tworzenia powiadomień:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Rozłączono z bazą danych');
  }
}

createTestNotifications();
