// tests/messageTest.js
// Skrypt do testowania systemu wiadomości

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

// Funkcja do sprawdzania wiadomości w bazie danych
const checkMessagesInDatabase = async (userId) => {
  console.log(`\n📊 Sprawdzanie wiadomości w bazie danych dla użytkownika ${userId}`);
  
  try {
    // Sprawdź wiadomości odebrane
    const inboxMessages = await Message.find({ 
      recipient: userId,
      deletedBy: { $ne: userId }
    }).populate('sender', 'name email').populate('recipient', 'name email');
    
    console.log(`📥 Wiadomości odebrane: ${inboxMessages.length}`);
    if (inboxMessages.length > 0) {
      console.log('Przykładowa wiadomość odebrana:');
      console.log({
        id: inboxMessages[0]._id,
        sender: inboxMessages[0].sender ? `${inboxMessages[0].sender.name} (${inboxMessages[0].sender.email})` : 'Brak danych',
        subject: inboxMessages[0].subject,
        content: inboxMessages[0].content.substring(0, 50) + '...',
        read: inboxMessages[0].read,
        createdAt: inboxMessages[0].createdAt
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
      console.log('Przykładowa wiadomość wysłana:');
      console.log({
        id: sentMessages[0]._id,
        recipient: sentMessages[0].recipient ? `${sentMessages[0].recipient.name} (${sentMessages[0].recipient.email})` : 'Brak danych',
        subject: sentMessages[0].subject,
        content: sentMessages[0].content.substring(0, 50) + '...',
        createdAt: sentMessages[0].createdAt
      });
    }
    
    // Sprawdź wiadomości w koszu
    const trashMessages = await Message.find({ 
      deletedBy: userId
    }).populate('sender', 'name email').populate('recipient', 'name email');
    
    console.log(`🗑️ Wiadomości w koszu: ${trashMessages.length}`);
    
    // Sprawdź wiadomości oznaczone gwiazdką
    const starredMessages = await Message.find({ 
      $or: [
        { recipient: userId, starred: true },
        { sender: userId, starred: true }
      ],
      deletedBy: { $ne: userId }
    }).populate('sender', 'name email').populate('recipient', 'name email');
    
    console.log(`⭐ Wiadomości oznaczone gwiazdką: ${starredMessages.length}`);
    
    // Sprawdź szkice
    const draftMessages = await Message.find({ 
      sender: userId,
      draft: true,
      deletedBy: { $ne: userId }
    }).populate('sender', 'name email').populate('recipient', 'name email');
    
    console.log(`📝 Szkice: ${draftMessages.length}`);
    
    return {
      inbox: inboxMessages,
      sent: sentMessages,
      trash: trashMessages,
      starred: starredMessages,
      drafts: draftMessages
    };
  } catch (error) {
    console.error('❌ Błąd podczas sprawdzania wiadomości w bazie danych:', error);
    return null;
  }
};

// Funkcja do testowania API wiadomości
const testMessagesAPI = async (userId) => {
  console.log(`\n🔍 Testowanie API wiadomości dla użytkownika ${userId}`);
  
  try {
    // Generowanie tokenu JWT
    const token = generateToken(userId);
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
      console.log({
        id: inboxResponse.data[0]._id,
        sender: inboxResponse.data[0].sender ? `${inboxResponse.data[0].sender.name} (${inboxResponse.data[0].sender.email})` : 'Brak danych',
        subject: inboxResponse.data[0].subject,
        content: inboxResponse.data[0].content.substring(0, 50) + '...'
      });
    }
    
    // Testowanie pobierania wiadomości z folderu Wysłane
    console.log('\n📤 Testowanie API - folder Wysłane');
    const sentResponse = await api.get('/api/messages/sent', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`Status odpowiedzi: ${sentResponse.status}`);
    console.log(`Liczba wiadomości: ${sentResponse.data.length || 0}`);
    
    // Testowanie pobierania wiadomości z folderu Kosz
    console.log('\n🗑️ Testowanie API - folder Kosz');
    const trashResponse = await api.get('/api/messages/trash', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`Status odpowiedzi: ${trashResponse.status}`);
    console.log(`Liczba wiadomości: ${trashResponse.data.length || 0}`);
    
    return {
      inbox: inboxResponse.data || [],
      sent: sentResponse.data || [],
      trash: trashResponse.data || []
    };
  } catch (error) {
    console.error('❌ Błąd podczas testowania API wiadomości:', error);
    return null;
  }
};

// Funkcja do naprawy pola deletedBy w wiadomościach
const fixDeletedByField = async () => {
  console.log('\n🔧 Naprawianie pola deletedBy w wiadomościach');
  
  try {
    // Znajdź wiadomości, które nie mają pola deletedBy lub jest ono null
    const messagesToFix = await Message.find({
      $or: [
        { deletedBy: { $exists: false } },
        { deletedBy: null }
      ]
    });
    
    console.log(`Znaleziono ${messagesToFix.length} wiadomości do naprawy`);
    
    // Napraw wiadomości
    if (messagesToFix.length > 0) {
      for (const message of messagesToFix) {
        message.deletedBy = [];
        await message.save();
      }
      console.log('✅ Naprawiono pole deletedBy w wiadomościach');
    }
    
    return messagesToFix.length;
  } catch (error) {
    console.error('❌ Błąd podczas naprawiania pola deletedBy:', error);
    return -1;
  }
};

// Główna funkcja testowa
const runTests = async () => {
  console.log('🚀 Rozpoczynanie testów systemu wiadomości');
  
  // Połączenie z bazą danych
  const dbConnected = await connectToDatabase();
  if (!dbConnected) {
    console.error('❌ Nie można przeprowadzić testów bez połączenia z bazą danych');
    process.exit(1);
  }
  
  try {
    // Znajdź użytkownika do testów
    const testUser = await User.findOne({});
    
    if (!testUser) {
      console.error('❌ Nie znaleziono żadnego użytkownika do testów');
      process.exit(1);
    }
    
    console.log(`👤 Znaleziono użytkownika do testów: ${testUser.name || testUser.email} (ID: ${testUser._id})`);
    
    // Napraw pole deletedBy w wiadomościach
    await fixDeletedByField();
    
    // Sprawdź wiadomości w bazie danych
    const dbMessages = await checkMessagesInDatabase(testUser._id);
    
    // Testuj API wiadomości
    const apiMessages = await testMessagesAPI(testUser._id);
    
    // Porównaj wyniki
    if (dbMessages && apiMessages) {
      console.log('\n📊 Porównanie wyników:');
      console.log(`Wiadomości w bazie danych - Odebrane: ${dbMessages.inbox.length}, Wysłane: ${dbMessages.sent.length}, Kosz: ${dbMessages.trash.length}`);
      console.log(`Wiadomości z API - Odebrane: ${apiMessages.inbox.length}, Wysłane: ${apiMessages.sent.length}, Kosz: ${apiMessages.trash.length}`);
      
      if (dbMessages.inbox.length !== apiMessages.inbox.length) {
        console.log('⚠️ Różnica w liczbie wiadomości odebranych między bazą danych a API');
      }
      
      if (dbMessages.sent.length !== apiMessages.sent.length) {
        console.log('⚠️ Różnica w liczbie wiadomości wysłanych między bazą danych a API');
      }
      
      if (dbMessages.trash.length !== apiMessages.trash.length) {
        console.log('⚠️ Różnica w liczbie wiadomości w koszu między bazą danych a API');
      }
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
