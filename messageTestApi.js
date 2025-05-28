// messageTestApi.js - Skrypt testujący API wiadomości
import fetch from 'node-fetch';

// Dane logowania
const credentials = {
  email: 'mateusz.goszczycki1994@gmail.com',
  password: 'Neluchu321.'
};

// URL API
const API_URL = 'http://localhost:5000/api';

// Funkcja logowania i uzyskania tokenu
async function login() {
  try {
    const response = await fetch(`${API_URL}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });

    if (!response.ok) {
      throw new Error(`Błąd logowania: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Zalogowano pomyślnie!');
    return data.token;
  } catch (error) {
    console.error('Błąd podczas logowania:', error.message);
    process.exit(1);
  }
}

// Funkcja testująca pobieranie wiadomości
async function testGetMessages(token, folder = 'inbox') {
  try {
    console.log(`\nTestowanie pobierania wiadomości z folderu ${folder}...`);
    
    const response = await fetch(`${API_URL}/messages/${folder}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Błąd pobierania wiadomości: ${response.status} ${response.statusText}`);
    }

    const messages = await response.json();
    console.log(`Pobrano ${messages.length} wiadomości z folderu ${folder}`);
    
    if (messages.length > 0) {
      console.log('Przykładowa wiadomość:');
      console.log('- ID:', messages[0]._id);
      console.log('- Nadawca:', messages[0].sender?.name || messages[0].sender?.email || messages[0].sender);
      console.log('- Odbiorca:', messages[0].recipient?.name || messages[0].recipient?.email || messages[0].recipient);
      console.log('- Temat:', messages[0].subject);
      console.log('- Treść:', messages[0].content.substring(0, 50) + '...');
    }
    
    return messages;
  } catch (error) {
    console.error('Błąd podczas pobierania wiadomości:', error.message);
    return [];
  }
}

// Funkcja testująca pobieranie konwersacji
async function testGetConversations(token) {
  try {
    console.log('\nTestowanie pobierania listy konwersacji...');
    
    const response = await fetch(`${API_URL}/messages/conversations`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Błąd pobierania konwersacji: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Pobrano dane konwersacji:`, data);
    return data;
  } catch (error) {
    console.error('Błąd podczas pobierania konwersacji:', error.message);
    return null;
  }
}

// Funkcja testująca pobieranie konwersacji z użytkownikiem
async function testGetConversation(token, userId) {
  try {
    console.log(`\nTestowanie pobierania konwersacji z użytkownikiem ${userId}...`);
    
    const response = await fetch(`${API_URL}/messages/conversation/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Błąd pobierania konwersacji: ${response.status} ${response.statusText}`);
    }

    const conversation = await response.json();
    console.log('Pobrano konwersację:', conversation);
    return conversation;
  } catch (error) {
    console.error('Błąd podczas pobierania konwersacji:', error.message);
    return null;
  }
}

// Główna funkcja testowa
async function runTests() {
  console.log('Rozpoczynanie testów API wiadomości...');
  
  // Logowanie i uzyskanie tokenu
  const token = await login();
  if (!token) {
    console.error('Nie można kontynuować testów bez tokenu.');
    return;
  }
  
  // Test 1: Pobieranie wiadomości z różnych folderów
  const inboxMessages = await testGetMessages(token, 'inbox');
  const sentMessages = await testGetMessages(token, 'sent');
  
  // Test 2: Pobieranie listy konwersacji
  const conversationsData = await testGetConversations(token);
  
  // Test 3: Jeśli mamy jakieś wiadomości, testujemy pobieranie konkretnej konwersacji
  if (inboxMessages.length > 0) {
    // Pobieramy ID nadawcy pierwszej wiadomości
    const otherUserId = inboxMessages[0].sender?._id || inboxMessages[0].sender;
    if (otherUserId) {
      await testGetConversation(token, otherUserId);
    }
  }
  
  console.log('\nTesty zakończone!');
}

// Uruchomienie testów
runTests();