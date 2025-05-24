// tests/checkUserMessages.js
// Skrypt do sprawdzania wiadomości użytkownika w bazie danych

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Message from '../models/message.js';
import User from '../models/user.js';
import Ad from '../models/ad.js';

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

// Funkcja do sprawdzania wiadomości użytkownika
const checkUserMessages = async (userEmail) => {
  try {
    // Znajdź użytkownika po adresie email
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      console.log(`❌ Nie znaleziono użytkownika o adresie email: ${userEmail}`);
      return;
    }
    
    console.log(`✅ Znaleziono użytkownika: ${user.name || user.email} (ID: ${user._id})`);
    
    // Sprawdź wiadomości odebrane
    const receivedMessages = await Message.find({ 
      recipient: user._id,
      deletedBy: { $ne: user._id }
    })
    .populate('sender', 'name email')
    .populate('recipient', 'name email')
    .populate('relatedAd', 'headline brand model');
    
    console.log(`\n📥 Wiadomości odebrane (${receivedMessages.length}):`);
    if (receivedMessages.length > 0) {
      receivedMessages.forEach((msg, index) => {
        console.log(`[${index + 1}] Od: ${msg.sender ? `${msg.sender.name || 'brak'} (${msg.sender.email || 'brak'})` : 'Brak danych'}`);
        console.log(`    Do: ${msg.recipient ? `${msg.recipient.name || 'brak'} (${msg.recipient.email || 'brak'})` : 'Brak danych'}`);
        console.log(`    Temat: ${msg.subject || 'brak'}`);
        console.log(`    Treść: ${msg.content ? (msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : '')) : 'brak'}`);
        console.log(`    Ogłoszenie: ${msg.relatedAd ? (msg.relatedAd.headline || `${msg.relatedAd.brand || 'brak'} ${msg.relatedAd.model || 'brak'}`) : 'Brak'}`);
        console.log(`    Data: ${msg.createdAt}`);
        console.log(`    Przeczytana: ${msg.read ? 'Tak' : 'Nie'}`);
        console.log(`    ID: ${msg._id}`);
        console.log('---');
      });
    } else {
      console.log('Brak wiadomości odebranych');
    }
    
    // Sprawdź wiadomości wysłane
    const sentMessages = await Message.find({ 
      sender: user._id,
      draft: false,
      deletedBy: { $ne: user._id }
    })
    .populate('sender', 'name email')
    .populate('recipient', 'name email')
    .populate('relatedAd', 'headline brand model');
    
    console.log(`\n📤 Wiadomości wysłane (${sentMessages.length}):`);
    if (sentMessages.length > 0) {
      sentMessages.forEach((msg, index) => {
        console.log(`[${index + 1}] Od: ${msg.sender ? `${msg.sender.name || 'brak'} (${msg.sender.email || 'brak'})` : 'Brak danych'}`);
        console.log(`    Do: ${msg.recipient ? `${msg.recipient.name || 'brak'} (${msg.recipient.email || 'brak'})` : 'Brak danych'}`);
        console.log(`    Temat: ${msg.subject || 'brak'}`);
        console.log(`    Treść: ${msg.content ? (msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : '')) : 'brak'}`);
        console.log(`    Ogłoszenie: ${msg.relatedAd ? (msg.relatedAd.headline || `${msg.relatedAd.brand || 'brak'} ${msg.relatedAd.model || 'brak'}`) : 'Brak'}`);
        console.log(`    Data: ${msg.createdAt}`);
        console.log(`    ID: ${msg._id}`);
        console.log('---');
      });
    } else {
      console.log('Brak wiadomości wysłanych');
    }
    
    // Sprawdź wszystkie wiadomości (bez filtrowania)
    const allMessages = await Message.find({
      $or: [
        { sender: user._id },
        { recipient: user._id }
      ]
    })
    .populate('sender', 'name email')
    .populate('recipient', 'name email')
    .populate('relatedAd', 'headline brand model');
    
    console.log(`\n📝 Wszystkie wiadomości (${allMessages.length}):`);
    if (allMessages.length > 0) {
      allMessages.forEach((msg, index) => {
        console.log(`[${index + 1}] Od: ${msg.sender ? `${msg.sender.name || 'brak'} (${msg.sender.email || 'brak'})` : 'Brak danych'}`);
        console.log(`    Do: ${msg.recipient ? `${msg.recipient.name || 'brak'} (${msg.recipient.email || 'brak'})` : 'Brak danych'}`);
        console.log(`    Temat: ${msg.subject || 'brak'}`);
        console.log(`    Treść: ${msg.content ? (msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : '')) : 'brak'}`);
        console.log(`    Ogłoszenie: ${msg.relatedAd ? (msg.relatedAd.headline || `${msg.relatedAd.brand || 'brak'} ${msg.relatedAd.model || 'brak'}`) : 'Brak'}`);
        console.log(`    Data: ${msg.createdAt}`);
        console.log(`    Przeczytana: ${msg.read ? 'Tak' : 'Nie'}`);
        console.log(`    Szkic: ${msg.draft ? 'Tak' : 'Nie'}`);
        console.log(`    Usunięta przez: ${msg.deletedBy && msg.deletedBy.length > 0 ? msg.deletedBy.join(', ') : 'Nikogo'}`);
        console.log(`    ID: ${msg._id}`);
        console.log('---');
      });
    } else {
      console.log('Brak wiadomości');
    }
    
    return {
      received: receivedMessages,
      sent: sentMessages,
      all: allMessages
    };
  } catch (error) {
    console.error('❌ Błąd podczas sprawdzania wiadomości użytkownika:', error);
    return null;
  }
};

// Główna funkcja
const main = async () => {
  console.log('🚀 Rozpoczynanie sprawdzania wiadomości użytkownika');
  
  // Połączenie z bazą danych
  const dbConnected = await connectToDatabase();
  if (!dbConnected) {
    console.error('❌ Nie można przeprowadzić operacji bez połączenia z bazą danych');
    process.exit(1);
  }
  
  try {
    // Sprawdź wiadomości dla użytkownika
    const userEmail = 'mateusz.goszczycki1994@gmail.com'; // Zmień na adres email użytkownika
    await checkUserMessages(userEmail);
    
    // Sprawdź wiadomości dla innego użytkownika
    const otherUserEmail = 'test2@example.com'; // Zmień na adres email innego użytkownika
    await checkUserMessages(otherUserEmail);
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
