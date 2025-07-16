// tests/messageTestByEmail.js
// Skrypt do testowania systemu wiadomości z uwzględnieniem adresu email

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Message from '../models/message.js';
import User from '../models/user.js';
import jwt from 'jsonwebtoken';
import axios from 'axios';

// Załadowanie zmiennych środowiskowych
dotenv.config();

// Konfiguracja axios
const api = axios.create({
  baseURL: 'http://localhost:5000',
  validateStatus: () => true // Akceptuj wszystkie kody statusu
});

// Funkcja do generowania tokenu JWT
const generateToken = (userId, role = 'user') => {
  const JWT_SECRET = process.env.JWT_SECRET || 'tajnyKluczJWT123';
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '1h' });
};

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

// Funkcja do znajdowania użytkownika po adresie email
const findUserByEmail = async (email) => {
  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`❌ Nie znaleziono użytkownika o adresie email: ${email}`);
      return null;
    }
    
    console.log(`✅ Znaleziono użytkownika: ${user.name || user.email} (ID: ${user._id})`);
    return user;
  } catch (error) {
    console.error('❌ Błąd podczas wyszukiwania użytkownika:', error);
    return null;
  }
};

// Funkcja do sprawdzania wiadomości w bazie danych dla użytkownika
const checkMessagesInDatabase = async (user) => {
  const userId = user._id;
  console.log(`\n📊 Sprawdzanie wiadomości w bazie danych dla użytkownika ${user.email} (ID: ${userId})`);
  
  try {
    // Sprawdź wiadomości odebrane
    const inboxMessages = await Message.find({ 
      recipient: userId,
      deletedBy: { $ne: userId }
    }).populate('sender', 'name email').populate('recipient', 'name email');
    
    console.log(`📥 Wiadomości odebrane: ${inboxMessages.length}`);
    if (inboxMessages.length > 0) {
      console.log('Przykładowe wiadomości odebrane:');
      inboxMessages.slice(0, 3).forEach((msg, index) => {
        console.log(`[${index + 1}] Od: ${msg.sender ? `${msg.sender.name} (${msg.sender.email})` : 'Brak danych'}`);
        console.log(`    Temat: ${msg.subject}`);
        console.log(`    Treść: ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`);
        console.log(`    Data: ${msg.createdAt}`);
        console.log('---');
      });
    }
    
    // Sprawdź wiadomości wysłane
    const sentMessages = await Message.find({ 
      sender: userId,
      draft: false,
      deletedBy: { $ne: userId }
    }).populate('sender', 'name email').populate('recipient', 'name email');
    
    console.log(`📤 Wiadomości wysłane: ${sentMessages.length}`);
    if (sentMessages.length > 0) {
      console.log('Przykładowe wiadomości wysłane:');
      sentMessages.slice(0, 3).forEach((msg, index) => {
        console.log(`[${index + 1}] Do: ${msg.recipient ? `${msg.recipient.name} (${msg.recipient.email})` : 'Brak danych'}`);
        console.log(`    Temat: ${msg.subject}`);
        console.log(`    Treść: ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`);
        console.log(`    Data: ${msg.createdAt}`);
        console.log('---');
      });
    }
    
    // Sprawdź wszystkie wiadomości, gdzie użytkownik jest nadawcą lub odbiorcą
    const allMessages = await Message.find({
      $or: [
        { sender: userId },
        { recipient: userId }
      ]
    }).populate('sender', 'name email').populate('recipient', 'name email');
    
    console.log(`📝 Wszystkie wiadomości (nadawca lub odbiorca): ${allMessages.length}`);
    
    return {
      inbox: inboxMessages,
      sent: sentMessages,
      all: allMessages
    };
  } catch (error) {
    console.error('❌ Błąd podczas sprawdzania wiadomości w bazie danych:', error);
    return null;
  }
};

// Funkcja do testowania API wiadomości
const testMessagesAPI = async (user) => {
  const userId = user._id;
  console.log(`\n🔍 Testowanie API wiadomości dla użytkownika ${user.email} (ID: ${userId})`);
  
  try {
    // Generowanie tokenu JWT
    const token = generateToken(userId.toString());
    console.log(`🔑 Wygenerowano token JWT: ${token.substring(0, 20)}...`);
    
    // Testowanie pobierania wiadomości z folderu Odebrane
    console.log('\n📥 Testowanie API - folder Odebrane');
    const inboxResponse = await api.get('/api/messages/inbox', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`Status odpowiedzi: ${inboxResponse.status}`);
    console.log(`Liczba wiadomości: ${inboxResponse.data.length || 0}`);
    
    if (inboxResponse.data && inboxResponse.data.length > 0) {
      console.log('Przykładowa wiadomość z API:');
      const msg = inboxResponse.data[0];
      console.log(`Od: ${msg.sender ? `${msg.sender.name} (${msg.sender.email})` : 'Brak danych'}`);
      console.log(`Temat: ${msg.subject}`);
      console.log(`Treść: ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`);
    }
    
    // Testowanie pobierania wiadomości z folderu Wysłane
    console.log('\n📤 Testowanie API - folder Wysłane');
    const sentResponse = await api.get('/api/messages/sent', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`Status odpowiedzi: ${sentResponse.status}`);
    console.log(`Liczba wiadomości: ${sentResponse.data.length || 0}`);
    
    if (sentResponse.data && sentResponse.data.length > 0) {
      console.log('Przykładowa wiadomość z API:');
      const msg = sentResponse.data[0];
      console.log(`Do: ${msg.recipient ? `${msg.recipient.name} (${msg.recipient.email})` : 'Brak danych'}`);
      console.log(`Temat: ${msg.subject}`);
      console.log(`Treść: ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`);
    }
    
    return {
      inbox: inboxResponse.data || [],
      sent: sentResponse.data || []
    };
  } catch (error) {
    console.error('❌ Błąd podczas testowania API wiadomości:', error);
    return null;
  }
};

// Funkcja do wysyłania testowej wiadomości
const sendTestMessage = async (senderUser, recipientUser) => {
  console.log(`\n📧 Wysyłanie testowej wiadomości od ${senderUser.email} do ${recipientUser.email}`);
  
  try {
    // Generowanie tokenu JWT dla nadawcy
    const token = generateToken(senderUser._id.toString());
    
    // Przygotowanie danych wiadomości
    const messageData = {
      recipient: recipientUser._id.toString(),
      subject: `Test wiadomości ${new Date().toISOString()}`,
      content: `To jest testowa wiadomość wysłana z adresu ${senderUser.email} do ${recipientUser.email} w ramach testów systemu wiadomości.`
    };
    
    // Wysłanie wiadomości przez API
    const response = await api.post('/api/messages/send', messageData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`Status odpowiedzi: ${response.status}`);
    console.log(`Odpowiedź: ${JSON.stringify(response.data)}`);
    
    if (response.status === 201) {
      console.log('✅ Wiadomość testowa wysłana pomyślnie');
      return true;
    } else {
      console.log('❌ Błąd podczas wysyłania wiadomości testowej');
      return false;
    }
  } catch (error) {
    console.error('❌ Błąd podczas wysyłania wiadomości testowej:', error);
    return false;
  }
};

// Główna funkcja testowa
const runTests = async () => {
  console.log('🚀 Rozpoczynanie testów systemu wiadomości z uwzględnieniem adresu email');
  
  // Połączenie z bazą danych
  const dbConnected = await connectToDatabase();
  if (!dbConnected) {
    console.error('❌ Nie można przeprowadzić testów bez połączenia z bazą danych');
    process.exit(1);
  }
  
  try {
    // Znajdź użytkownika do testów
    const email = 'mateusz.goszczycki1994@gmail.com';
    const user = await findUserByEmail(email);
    
    if (!user) {
      console.error(`❌ Nie znaleziono użytkownika o adresie email: ${email}`);
      process.exit(1);
    }
    
    // Sprawdź wiadomości w bazie danych
    await checkMessagesInDatabase(user);
    
    // Testuj API wiadomości
    await testMessagesAPI(user);
    
    // Znajdź innego użytkownika do testów wysyłania wiadomości
    const otherUsers = await User.find({ _id: { $ne: user._id } }).limit(1);
    
    if (otherUsers.length > 0) {
      const otherUser = otherUsers[0];
      console.log(`\n👤 Znaleziono innego użytkownika do testów: ${otherUser.name || otherUser.email} (ID: ${otherUser._id})`);
      
      // Wyślij testową wiadomość
      await sendTestMessage(user, otherUser);
      
      // Sprawdź wiadomości po wysłaniu
      console.log('\n📊 Sprawdzanie wiadomości po wysłaniu testowej wiadomości');
      await checkMessagesInDatabase(user);
      await testMessagesAPI(user);
    }
    
    console.log('\n✅ Testy zakończone');
  } catch (error) {
    console.error('❌ Błąd podczas wykonywania testów:', error);
  } finally {
    // Zamknij połączenie z bazą danych
    await mongoose.connection.close();
    console.log('🔌 Zamknięto połączenie z bazą danych');
  }
};

// Uruchomienie testów
runTests();
