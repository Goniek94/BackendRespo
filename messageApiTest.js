/**
 * Uproszczony skrypt testowy dla API wiadomości
 * 
 * Ten skrypt testuje API wiadomości i sprawdza, czy zwraca rzeczywiste dane.
 * Używa prostego logowania za pomocą nazwy użytkownika/hasła, a następnie
 * testuje główne endpointy API wiadomości.
 */

import axios from 'axios';

// Konfiguracja
const API_URL = 'http://localhost:5000';
let authToken = null;
let userId = null;

// Dane testowe
const TEST_USER = {
  email: 'mateusz.goszczycki1994@gmail.com',
  password: 'test123'
};

/**
 * Logowanie i uzyskanie tokenu JWT
 */
async function login() {
  console.log('=================================================');
  console.log('TESTOWANIE API WIADOMOŚCI');
  console.log('=================================================');
  console.log(`\n🔑 Próba logowania jako: ${TEST_USER.email}`);
  
  try {
    // Próba logowania przez endpoint /api/auth/login
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    
    authToken = response.data.token;
    userId = response.data.user?._id || response.data.userId;
    
    console.log('✅ Logowanie udane!');
    console.log(`📝 ID użytkownika: ${userId}`);
    console.log(`🔒 Token JWT: ${authToken?.substring(0, 15)}...`);
    return true;
  } catch (error) {
    console.error('❌ Błąd logowania (endpoint /api/auth/login):', error.message);
    console.error('Szczegóły:', error.response?.data || 'Brak szczegółów');
    
    // Spróbuj alternatywny endpoint logowania
    try {
      console.log('\n🔄 Próba alternatywnego logowania (endpoint /users/login)...');
      const altResponse = await axios.post(`${API_URL}/users/login`, {
        email: TEST_USER.email,
        password: TEST_USER.password
      });
      
      authToken = altResponse.data.token;
      userId = altResponse.data.user?._id || altResponse.data.userId;
      
      console.log('✅ Alternatywne logowanie udane!');
      console.log(`📝 ID użytkownika: ${userId}`);
      console.log(`🔒 Token JWT: ${authToken?.substring(0, 15)}...`);
      return true;
    } catch (altError) {
      console.error('❌ Błąd alternatywnego logowania:', altError.message);
      console.error('Szczegóły:', altError.response?.data || 'Brak szczegółów');
      return false;
    }
  }
}

/**
 * Test pobierania konwersacji z określonego folderu
 */
async function testGetConversations(folder = 'inbox', prefix = '/api') {
  console.log(`\n📂 Test pobierania konwersacji - folder: ${folder}, prefix: ${prefix}`);
  
  try {
    console.log(`📡 Wysyłanie zapytania: ${API_URL}${prefix}/messages/conversations?folder=${folder}`);
    
    const response = await axios.get(
      `${API_URL}${prefix}/messages/conversations?folder=${folder}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    );
    
    console.log('✅ Odpowiedź otrzymana');
    console.log(`📊 Status: ${response.status}`);
    
    if (Array.isArray(response.data)) {
      console.log(`📋 Liczba konwersacji: ${response.data.length}`);
      
      if (response.data.length > 0) {
        console.log('📝 Przykładowa konwersacja:');
        const sample = response.data[0];
        console.log(JSON.stringify({
          id: sample._id,
          user: sample.user?._id || sample.userId,
          userName: sample.user?.name || sample.user?.email || 'Nieznany użytkownik',
          lastMessage: sample.lastMessage || 'Brak ostatniej wiadomości',
          unreadCount: sample.unreadCount || 0
        }, null, 2));
      } else {
        console.log('⚠️ Brak konwersacji w odpowiedzi');
      }
    } else if (response.data && typeof response.data === 'object') {
      console.log('📝 Odpowiedź w formacie obiektu:');
      console.log(JSON.stringify(response.data, null, 2).substring(0, 500) + '...');
    } else {
      console.log('⚠️ Nieoczekiwany format odpowiedzi:', typeof response.data);
    }
    
    return response.data;
  } catch (error) {
    console.error(`❌ Błąd pobierania konwersacji (prefix ${prefix}):`, error.message);
    console.error('Szczegóły:', error.response?.data || 'Brak szczegółów');
    console.error('Status błędu:', error.response?.status);
    return null;
  }
}

/**
 * Test pobierania wiadomości z konwersacji
 */
async function testGetConversation(userId, prefix = '/api') {
  console.log(`\n💬 Test pobierania wiadomości z konwersacji - userId: ${userId}, prefix: ${prefix}`);
  
  try {
    console.log(`📡 Wysyłanie zapytania: ${API_URL}${prefix}/messages/conversation/${userId}`);
    
    const response = await axios.get(
      `${API_URL}${prefix}/messages/conversation/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    );
    
    console.log('✅ Odpowiedź otrzymana');
    console.log(`📊 Status: ${response.status}`);
    
    // Analiza różnych formatów odpowiedzi
    let messageCount = 0;
    let format = 'nieznany';
    
    if (Array.isArray(response.data)) {
      messageCount = response.data.length;
      format = 'tablica wiadomości';
    } else if (response.data.messages && Array.isArray(response.data.messages)) {
      messageCount = response.data.messages.length;
      format = 'obiekt z tablicą messages';
    } else if (response.data.conversations) {
      let total = 0;
      Object.values(response.data.conversations).forEach(convo => {
        if (convo.messages && Array.isArray(convo.messages)) {
          total += convo.messages.length;
        }
      });
      messageCount = total;
      format = 'obiekt conversations z zagnieżdżonymi wiadomościami';
    }
    
    console.log(`📝 Format odpowiedzi: ${format}`);
    console.log(`📋 Liczba wiadomości: ${messageCount}`);
    
    // Próba wyświetlenia przykładowej wiadomości
    let sampleMessage = null;
    
    if (Array.isArray(response.data) && response.data.length > 0) {
      sampleMessage = response.data[0];
    } else if (response.data.messages && Array.isArray(response.data.messages) && response.data.messages.length > 0) {
      sampleMessage = response.data.messages[0];
    } else if (response.data.conversations) {
      const conversationKeys = Object.keys(response.data.conversations);
      if (conversationKeys.length > 0) {
        const firstConvo = response.data.conversations[conversationKeys[0]];
        if (firstConvo.messages && firstConvo.messages.length > 0) {
          sampleMessage = firstConvo.messages[0];
        }
      }
    }
    
    if (sampleMessage) {
      console.log('📝 Przykładowa wiadomość:');
      console.log(JSON.stringify({
        id: sampleMessage._id,
        sender: sampleMessage.sender?._id || sampleMessage.sender,
        content: sampleMessage.content,
        date: sampleMessage.createdAt || sampleMessage.date,
        read: sampleMessage.read
      }, null, 2));
    } else {
      console.log('⚠️ Brak wiadomości w odpowiedzi');
    }
    
    return response.data;
  } catch (error) {
    console.error(`❌ Błąd pobierania wiadomości z konwersacji (prefix ${prefix}):`, error.message);
    console.error('Szczegóły:', error.response?.data || 'Brak szczegółów');
    console.error('Status błędu:', error.response?.status);
    return null;
  }
}

/**
 * Test wysłania wiadomości
 */
async function testSendMessage(recipientId, prefix = '/api') {
  console.log(`\n📤 Test wysyłania wiadomości - recipient: ${recipientId}, prefix: ${prefix}`);
  
  try {
    const testMessage = {
      recipient: recipientId,
      content: `Test wiadomości wygenerowany przez API test (${new Date().toLocaleString()})`,
      subject: 'Testowa wiadomość z API'
    };
    
    console.log('📝 Dane wiadomości:', testMessage);
    console.log(`📡 Wysyłanie zapytania: ${API_URL}${prefix}/messages`);
    
    const response = await axios.post(
      `${API_URL}${prefix}/messages`,
      testMessage,
      {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    );
    
    console.log('✅ Wiadomość wysłana');
    console.log(`📊 Status: ${response.status}`);
    console.log('📝 Odpowiedź:', response.data);
    
    return response.data;
  } catch (error) {
    console.error(`❌ Błąd wysyłania wiadomości (prefix ${prefix}):`, error.message);
    console.error('Szczegóły:', error.response?.data || 'Brak szczegółów');
    console.error('Status błędu:', error.response?.status);
    return null;
  }
}

/**
 * Główna funkcja testowa
 */
async function runTests() {
  try {
    // Logowanie i uzyskanie tokenu JWT
    const loginSuccess = await login();
    if (!loginSuccess) {
      console.error('❌ Nie można kontynuować testów - logowanie nieudane');
      return;
    }
    
    // Testowanie dwóch wariantów URL API
    const prefixes = ['/api', ''];
    
    // Wykonaj testy dla obu wariantów URL
    for (const prefix of prefixes) {
      console.log(`\n🧪 TESTY Z PREFIXEM: "${prefix}"`);
      
      // Test 1: Pobieranie konwersacji z folderu Odebrane (inbox)
      const inboxConversations = await testGetConversations('inbox', prefix);
      
      // Test 2: Pobieranie konwersacji z folderu Wysłane (sent)
      const sentConversations = await testGetConversations('sent', prefix);
      
      // Test 3: Pobieranie wiadomości z konwersacji (jeśli istnieją)
      let testUserId = null;
      
      // Szukamy użytkownika do testu
      if (Array.isArray(inboxConversations) && inboxConversations.length > 0) {
        testUserId = inboxConversations[0].user?._id || inboxConversations[0]._id;
      } else if (Array.isArray(sentConversations) && sentConversations.length > 0) {
        testUserId = sentConversations[0].user?._id || sentConversations[0]._id;
      }
      
      if (testUserId) {
        await testGetConversation(testUserId, prefix);
        
        // Test 4: Wysyłanie nowej wiadomości
        await testSendMessage(testUserId, prefix);
      } else {
        console.log('⚠️ Nie można kontynuować testów - brak użytkownika do konwersacji');
      }
    }
    
    console.log('\n✅ Testy API zakończone!');
  } catch (error) {
    console.error('\n❌ Nieobsłużony błąd podczas testów API:', error);
  }
}

// Uruchomienie testów
runTests();