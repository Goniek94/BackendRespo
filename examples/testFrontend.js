// examples/testFrontend.js
// Skrypt do testowania frontendu systemu wiadomości

import axios from 'axios';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

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
      console.log(JSON.stringify(inboxResponse.data[0], null, 2));
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
      console.log(JSON.stringify(sentResponse.data[0], null, 2));
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

// Funkcja do symulacji działania komponentu MessagesInbox
const simulateMessagesInbox = async (userId) => {
  console.log(`\n🖥️ Symulacja działania komponentu MessagesInbox dla użytkownika ${userId}`);
  
  try {
    // Generowanie tokenu JWT
    const token = generateToken(userId);
    
    // Symulacja stanu komponentu
    let activeFolder = 'inbox';
    let messages = [];
    let selectedMessage = null;
    
    // Symulacja fetchMessages
    console.log(`Pobieranie wiadomości dla folderu: ${activeFolder}`);
    console.log(`Token autoryzacji: ${token ? 'Dostępny' : 'Brak'}`);
    
    try {
      const response = await axios.get(`/api/messages/${activeFolder}`, {
        baseURL: 'http://localhost:5000',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Odpowiedź z API:', response.status);
      console.log('Liczba wiadomości:', response.data.length);
      
      if (response.data.length === 0) {
        console.log('Brak wiadomości w odpowiedzi');
      } else {
        console.log('Przykładowa wiadomość:');
        console.log(JSON.stringify(response.data[0], null, 2));
      }
      
      messages = response.data;
      
// Symulacja kliknięcia w wiadomość
      if (messages.length > 0) {
        const messageId = messages[0]._id;
        console.log(`\nKliknięcie w wiadomość o ID: ${messageId}`);
        
        // Wyświetl szczegóły wiadomości przed wysłaniem zapytania
        console.log('Szczegóły wiadomości przed zapytaniem:');
        console.log({
          id: messages[0]._id,
          sender: messages[0].sender._id,
          recipient: messages[0].recipient._id,
          subject: messages[0].subject,
          content: messages[0].content.substring(0, 50)
        });
        
        // Symulacja fetchMessageDetails
        try {
          console.log(`Wysyłanie zapytania do /api/messages/message/${messageId}`);
          console.log(`Token: ${token.substring(0, 20)}...`);
          
          const detailsResponse = await axios.get(`/api/messages/message/${messageId}`, {
            baseURL: 'http://localhost:5000',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
        
        console.log('Status odpowiedzi:', detailsResponse.status);
        console.log('Szczegóły wiadomości:');
        console.log(JSON.stringify(detailsResponse.data, null, 2));
        
        selectedMessage = detailsResponse.data;
      }
      
      return {
        success: true,
        messages,
        selectedMessage
      };
    } catch (err) {
      console.error('❌ Błąd podczas pobierania wiadomości:', err.message);
      if (err.response) {
        console.error('Status błędu:', err.response.status);
        console.error('Dane błędu:', err.response.data);
      }
      return {
        success: false,
        error: err.message
      };
    }
  } catch (error) {
    console.error('❌ Błąd podczas symulacji komponentu MessagesInbox:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Główna funkcja testowa
const runTests = async () => {
  console.log('🚀 Rozpoczynanie testów frontendu systemu wiadomości');
  
  // ID użytkownika do testów
  const userId = '67cd803e430b755038f60025'; // ID z poprzednich testów
  
  try {
    // Testuj API wiadomości
    await testMessagesAPI(userId);
    
    // Symuluj działanie komponentu MessagesInbox
    await simulateMessagesInbox(userId);
    
    console.log('\n✅ Testy zakończone');
  } catch (error) {
    console.error('❌ Błąd podczas wykonywania testów:', error);
  }
};

// Uruchomienie testów
runTests();
