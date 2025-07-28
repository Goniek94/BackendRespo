const mongoose = require('mongoose');

// Schemat powiadomienia
const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  link: { type: String },
  metadata: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

async function createTestNotifications() {
  try {
    console.log('🔗 Łączenie z bazą danych...');
    await mongoose.connect('mongodb://localhost:27017/marketplace', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const Notification = mongoose.model('Notification', notificationSchema);
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

    // Znajdź pierwszego użytkownika
    const user = await User.findOne({});
    if (!user) {
      console.log('❌ Nie znaleziono użytkownika w bazie danych');
      return;
    }

    console.log(`👤 Znaleziono użytkownika: ${user.email || user.username || user._id}`);

    // Usuń stare testowe powiadomienia
    await Notification.deleteMany({ 
      userId: user._id,
      title: { $regex: /^TEST/ }
    });

    // Stwórz testowe powiadomienia
    const testNotifications = [
      {
        userId: user._id,
        type: 'new_message',
        title: 'TEST: Nowa wiadomość',
        content: 'Otrzymałeś nową wiadomość od użytkownika TestUser',
        isRead: false,
        link: '/profil/messages',
        metadata: { senderId: 'test123' }
      },
      {
        userId: user._id,
        type: 'new_message',
        title: 'TEST: Kolejna wiadomość',
        content: 'Otrzymałeś kolejną wiadomość',
        isRead: false,
        link: '/profil/messages',
        metadata: { senderId: 'test456' }
      },
      {
        userId: user._id,
        type: 'listing_approved',
        title: 'TEST: Ogłoszenie zatwierdzone',
        content: 'Twoje ogłoszenie zostało zatwierdzone',
        isRead: false,
        link: '/profil/listings',
        metadata: { listingId: 'test789' }
      },
      {
        userId: user._id,
        type: 'system_notification',
        title: 'TEST: Powiadomienie systemowe',
        content: 'Ważna informacja systemowa',
        isRead: false,
        link: '/profil/notifications',
        metadata: {}
      },
      {
        userId: user._id,
        type: 'new_message',
        title: 'TEST: Przeczytana wiadomość',
        content: 'Ta wiadomość jest już przeczytana',
        isRead: true,
        link: '/profil/messages',
        metadata: { senderId: 'test999' }
      }
    ];

    console.log('📝 Tworzenie testowych powiadomień...');
    const createdNotifications = await Notification.insertMany(testNotifications);
    
    console.log(`✅ Utworzono ${createdNotifications.length} testowych powiadomień`);

    // Sprawdź statystyki
    const totalNotifications = await Notification.countDocuments({ userId: user._id });
    const unreadNotifications = await Notification.countDocuments({ userId: user._id, isRead: false });
    const unreadMessages = await Notification.countDocuments({ 
      userId: user._id, 
      isRead: false, 
      type: 'new_message' 
    });
    const unreadOther = await Notification.countDocuments({ 
      userId: user._id, 
      isRead: false, 
      type: { $ne: 'new_message' } 
    });

    console.log('\n📊 Statystyki powiadomień:');
    console.log(`   - Wszystkie powiadomienia: ${totalNotifications}`);
    console.log(`   - Nieprzeczytane ogółem: ${unreadNotifications}`);
    console.log(`   - Nieprzeczytane wiadomości: ${unreadMessages}`);
    console.log(`   - Nieprzeczytane inne: ${unreadOther}`);

    console.log('\n🎯 Oczekiwane liczniki w interfejsie:');
    console.log(`   - Wiadomości: ${unreadMessages}`);
    console.log(`   - Powiadomienia: ${unreadOther}`);

    await mongoose.disconnect();
    console.log('\n✅ Zakończono pomyślnie');

  } catch (error) {
    console.error('❌ Błąd:', error.message);
    await mongoose.disconnect();
  }
}

// Uruchom skrypt
createTestNotifications();
