// tests/messageTestSendToAd.js
// Skrypt do testowania wysyłania wiadomości do właściciela ogłoszenia

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Message from '../models/message.js';
import User from '../models/user.js';
import Ad from '../models/ad.js';
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

// Funkcja do znajdowania ogłoszenia
const findRandomAd = async () => {
  try {
    // Znajdź ogłoszenie, które ma ustawione pole owner
    const ad = await Ad.findOne({ owner: { $exists: true, $ne: null } });
    if (!ad) {
      console.log('❌ Nie znaleziono żadnego ogłoszenia z ustawionym polem owner');
      return null;
    }
    
    console.log(`Znaleziono ogłoszenie z polem owner: ${ad.headline || `${ad.brand} ${ad.model}`} (ID: ${ad._id})`);
    console.log(`Owner ID: ${ad.owner}`);
    
    // Pobierz właściciela ogłoszenia
    const owner = await User.findById(ad.owner);
    if (!owner) {
      console.log(`❌ Nie znaleziono właściciela ogłoszenia o ID: ${ad.owner}`);
      return null;
    }
    
    console.log(`✅ Znaleziono ogłoszenie: ${ad.headline || `${ad.brand} ${ad.model}`} (ID: ${ad._id})`);
    console.log(`   Właściciel: ${owner.name || owner.email} (ID: ${owner._id})`);
    
    // Przypisz właściciela do ogłoszenia
    ad.owner = owner;
    
    return ad;
  } catch (error) {
    console.error('❌ Błąd podczas wyszukiwania ogłoszenia:', error);
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
    }).populate('sender', 'name email').populate('recipient', 'name email').populate('relatedAd', 'headline brand model');
    
    console.log(`📥 Wiadomości odebrane: ${inboxMessages.length}`);
    if (inboxMessages.length > 0) {
      console.log('Przykładowe wiadomości odebrane:');
      inboxMessages.slice(0, 3).forEach((msg, index) => {
        console.log(`[${index + 1}] Od: ${msg.sender ? `${msg.sender.name} (${msg.sender.email})` : 'Brak danych'}`);
        console.log(`    Temat: ${msg.subject}`);
        console.log(`    Treść: ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`);
        console.log(`    Ogłoszenie: ${msg.relatedAd ? (msg.relatedAd.headline || `${msg.relatedAd.brand} ${msg.relatedAd.model}`) : 'Brak'}`);
        console.log(`    Data: ${msg.createdAt}`);
        console.log('---');
      });
    }
    
    // Sprawdź wiadomości wysłane
    const sentMessages = await Message.find({ 
      sender: userId,
      draft: false,
      deletedBy: { $ne: userId }
    }).populate('sender', 'name email').populate('recipient', 'name email').populate('relatedAd', 'headline brand model');
    
    console.log(`📤 Wiadomości wysłane: ${sentMessages.length}`);
    if (sentMessages.length > 0) {
      console.log('Przykładowe wiadomości wysłane:');
      sentMessages.slice(0, 3).forEach((msg, index) => {
        console.log(`[${index + 1}] Do: ${msg.recipient ? `${msg.recipient.name} (${msg.recipient.email})` : 'Brak danych'}`);
        console.log(`    Temat: ${msg.subject}`);
        console.log(`    Treść: ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`);
        console.log(`    Ogłoszenie: ${msg.relatedAd ? (msg.relatedAd.headline || `${msg.relatedAd.brand} ${msg.relatedAd.model}`) : 'Brak'}`);
        console.log(`    Data: ${msg.createdAt}`);
        console.log('---');
      });
    }
    
    return {
      inbox: inboxMessages,
      sent: sentMessages
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
      console.log(`Ogłoszenie: ${msg.relatedAd ? (msg.relatedAd.headline || `${msg.relatedAd.brand} ${msg.relatedAd.model}`) : 'Brak'}`);
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
      console.log(`Ogłoszenie: ${msg.relatedAd ? (msg.relatedAd.headline || `${msg.relatedAd.brand} ${msg.relatedAd.model}`) : 'Brak'}`);
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

// Funkcja do wysyłania wiadomości do właściciela ogłoszenia
const sendMessageToAd = async (senderUser, ad) => {
  console.log(`\n📧 Wysyłanie wiadomości od ${senderUser.email} do właściciela ogłoszenia ${ad.headline || `${ad.brand} ${ad.model}`}`);
  
  try {
    // Generowanie tokenu JWT dla nadawcy
    const token = generateToken(senderUser._id.toString());
    
    // Przygotowanie danych wiadomości
    const messageData = {
      subject: `Pytanie o ogłoszenie: ${ad.headline || `${ad.brand} ${ad.model}`}`,
      content: `To jest testowa wiadomość wysłana z adresu ${senderUser.email} do właściciela ogłoszenia ${ad.headline || `${ad.brand} ${ad.model}`} w ramach testów systemu wiadomości.`
    };
    
    // Wysłanie wiadomości przez API
    console.log(`Wysyłanie żądania do: /api/messages/send-to-ad/${ad._id}`);
    console.log('Dane wiadomości:', messageData);
    
    const response = await api.post(`/api/messages/send-to-ad/${ad._id}`, messageData, {
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
  console.log('🚀 Rozpoczynanie testów wysyłania wiadomości do właściciela ogłoszenia');
  
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
    
    // Znajdź ogłoszenie do testów
    const ad = await findRandomAd();
    
    if (!ad) {
      console.error('❌ Nie znaleziono ogłoszenia do testów');
      process.exit(1);
    }
    
    // Sprawdź wiadomości przed wysłaniem
    console.log('\n📊 Sprawdzanie wiadomości przed wysłaniem testowej wiadomości');
    await checkMessagesInDatabase(user);
    await checkMessagesInDatabase(ad.owner);
    
    // Wyślij testową wiadomość
    await sendMessageToAd(user, ad);
    
    // Sprawdź wiadomości po wysłaniu
    console.log('\n📊 Sprawdzanie wiadomości po wysłaniu testowej wiadomości');
    await checkMessagesInDatabase(user);
    await checkMessagesInDatabase(ad.owner);
    
    // Testuj API wiadomości
    await testMessagesAPI(user);
    await testMessagesAPI(ad.owner);
    
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
