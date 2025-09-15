import mongoose from 'mongoose';
import Message from '../models/communication/message.js';
import User from '../models/user/user.js';
import Ad from '../models/listings/ad.js';

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

// Funkcja debugująca nieprzeczytane wiadomości
const debugUnreadMessages = async (userEmail) => {
  try {
    console.log(`🔍 Szukam nieprzeczytanych wiadomości dla użytkownika: ${userEmail}\n`);

    // Znajdź użytkownika
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      console.log('❌ Nie znaleziono użytkownika o podanym emailu');
      return;
    }

    console.log(`👤 Znaleziono użytkownika: ${user.name || user.email} (ID: ${user._id})\n`);

    // Znajdź wszystkie nieprzeczytane wiadomości
    const unreadMessages = await Message.find({
      recipient: user._id,
      read: false,
      deletedBy: { $ne: user._id }
    })
    .populate('sender', 'name email')
    .populate('relatedAd', 'headline brand model')
    .sort({ createdAt: -1 });

    console.log(`📧 Znaleziono ${unreadMessages.length} nieprzeczytanych wiadomości:\n`);

    if (unreadMessages.length === 0) {
      console.log('✅ Brak nieprzeczytanych wiadomości - licznik powinien pokazywać 0');
      return;
    }

    // Pokaż szczegóły każdej nieprzeczytanej wiadomości
    unreadMessages.forEach((msg, index) => {
      console.log(`📨 Wiadomość ${index + 1}:`);
      console.log(`   ID: ${msg._id}`);
      console.log(`   Od: ${msg.sender?.name || msg.sender?.email || 'Nieznany'} (${msg.sender?._id})`);
      console.log(`   Temat: ${msg.subject}`);
      console.log(`   Treść: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
      console.log(`   Data: ${msg.createdAt}`);
      console.log(`   Przeczytana: ${msg.read}`);
      console.log(`   Usunięta przez: ${msg.deletedBy}`);
      console.log(`   Ogłoszenie: ${msg.relatedAd ? 
        (msg.relatedAd.headline || `${msg.relatedAd.brand} ${msg.relatedAd.model}`) : 
        'Brak'}`);
      console.log('');
    });

    // Sprawdź też wszystkie wiadomości użytkownika (przeczytane i nieprzeczytane)
    const allMessages = await Message.find({
      recipient: user._id,
      deletedBy: { $ne: user._id }
    })
    .populate('sender', 'name email')
    .sort({ createdAt: -1 })
    .limit(10);

    console.log(`📋 Ostatnie 10 wiadomości użytkownika (wszystkie):\n`);
    
    allMessages.forEach((msg, index) => {
      console.log(`${index + 1}. ${msg.read ? '✅' : '❌'} ${msg.subject} - od ${msg.sender?.name || msg.sender?.email} (${msg.createdAt.toLocaleDateString()})`);
    });

  } catch (error) {
    console.error('❌ Błąd podczas debugowania:', error);
    throw error;
  }
};

// Funkcja oznaczająca wszystkie wiadomości jako przeczytane
const markAllAsRead = async (userEmail) => {
  try {
    console.log(`🔧 Oznaczam wszystkie wiadomości jako przeczytane dla: ${userEmail}\n`);

    // Znajdź użytkownika
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      console.log('❌ Nie znaleziono użytkownika o podanym emailu');
      return;
    }

    // Oznacz wszystkie nieprzeczytane wiadomości jako przeczytane
    const result = await Message.updateMany(
      {
        recipient: user._id,
        read: false,
        deletedBy: { $ne: user._id }
      },
      {
        $set: { read: true }
      }
    );

    console.log(`✅ Oznaczono ${result.modifiedCount} wiadomości jako przeczytane`);

  } catch (error) {
    console.error('❌ Błąd podczas oznaczania wiadomości:', error);
    throw error;
  }
};

// Główna funkcja
const main = async () => {
  await connectDB();

  const args = process.argv.slice(2);
  const command = args[0];
  const userEmail = args[1];

  try {
    if (command === 'debug' && userEmail) {
      await debugUnreadMessages(userEmail);
    } else if (command === 'mark-read' && userEmail) {
      await markAllAsRead(userEmail);
    } else {
      console.log('📋 Dostępne komendy:');
      console.log('  node scripts/debug-unread-messages.js debug <email>     - debuguj nieprzeczytane wiadomości');
      console.log('  node scripts/debug-unread-messages.js mark-read <email> - oznacz wszystkie jako przeczytane');
      console.log('\nPrzykład:');
      console.log('  node scripts/debug-unread-messages.js debug mateusz@example.com');
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
