import fetch from 'node-fetch';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Message from './models/communication/message.js';
import User from './models/user/user.js';

// Załaduj zmienne środowiskowe
dotenv.config();

const API_BASE = 'http://localhost:5000/api';
const TEST_EMAIL = 'mateusz.goszczycki1994@gmail.com';
const TEST_PASSWORD = 'Neluchu321.';

async function debugMessagesIssue() {
  try {
    console.log('🔍 DEBUGOWANIE PROBLEMU Z WIADOMOŚCIAMI');
    console.log('=====================================\n');

    // 1. Zaloguj się i pobierz token
    console.log('🔐 Logowanie użytkownika...');
    const loginResponse = await fetch(`${API_BASE}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      })
    });

    if (!loginResponse.ok) {
      console.error('❌ Błąd logowania:', loginResponse.status);
      return;
    }

    const loginData = await loginResponse.json();
    const userId = loginData.user?.id;
    console.log('✅ Zalogowano. User ID:', userId);

    // Pobierz token z cookies
    const cookies = loginResponse.headers.get('set-cookie');
    let authToken = null;
    if (cookies) {
      const tokenMatch = cookies.match(/token=([^;]+)/);
      if (tokenMatch) {
        authToken = tokenMatch[1];
      }
    }

    if (!authToken && loginData.token) {
      authToken = loginData.token;
    }

    if (!authToken) {
      console.error('❌ Nie udało się pobrać tokenu');
      return;
    }

    console.log('✅ Token pobrany\n');

    // 2. Sprawdź bezpośrednio w bazie danych
    console.log('🗄️ SPRAWDZANIE BAZY DANYCH');
    console.log('==========================');
    
    // Połącz z bazą danych
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Połączono z bazą danych');

    // Znajdź użytkownika
    const user = await User.findById(userId);
    if (!user) {
      console.error('❌ Nie znaleziono użytkownika w bazie');
      return;
    }
    console.log(`✅ Użytkownik: ${user.name || user.email} (${user._id})`);

    // Sprawdź wszystkie wiadomości związane z tym użytkownikiem
    console.log('\n📧 ANALIZA WIADOMOŚCI W BAZIE');
    console.log('==============================');

    const allMessages = await Message.find({
      $or: [
        { sender: userId },
        { recipient: userId }
      ]
    })
    .populate('sender', 'name email')
    .populate('recipient', 'name email')
    .sort({ createdAt: -1 });

    console.log(`Znaleziono ${allMessages.length} wiadomości związanych z użytkownikiem\n`);

    allMessages.forEach((msg, index) => {
      console.log(`--- Wiadomość ${index + 1} ---`);
      console.log(`ID: ${msg._id}`);
      console.log(`Nadawca: ${msg.sender?.name || msg.sender?.email || msg.sender} (${msg.sender?._id || msg.sender})`);
      console.log(`Odbiorca: ${msg.recipient?.name || msg.recipient?.email || msg.recipient} (${msg.recipient?._id || msg.recipient})`);
      console.log(`Temat: ${msg.subject}`);
      console.log(`Treść: ${msg.content.substring(0, 50)}...`);
      console.log(`Data: ${msg.createdAt}`);
      console.log(`Przeczytana: ${msg.read}`);
      console.log(`Szkic: ${msg.draft}`);
      console.log(`Usunięta przez: ${msg.deletedBy || 'nikt'}`);
      console.log(`Zarchiwizowana: ${msg.archived}`);
      
      // Sprawdź czy to wiadomość przychodzaca czy wychodząca
      const isIncoming = msg.recipient?._id?.toString() === userId || msg.recipient?.toString() === userId;
      const isOutgoing = msg.sender?._id?.toString() === userId || msg.sender?.toString() === userId;
      
      console.log(`Typ: ${isIncoming ? 'PRZYCHODZĄCA' : ''} ${isOutgoing ? 'WYCHODZĄCA' : ''}`);
      console.log('');
    });

    // 3. Sprawdź zapytania dla inbox
    console.log('📥 TESTOWANIE ZAPYTANIA INBOX');
    console.log('=============================');

    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    const inboxQuery = { 
      recipient: userObjectId,
      deletedBy: { $ne: userObjectId }
    };
    
    console.log('Zapytanie inbox:', JSON.stringify(inboxQuery));
    
    const inboxMessages = await Message.find(inboxQuery)
      .populate('sender', 'name email')
      .populate('recipient', 'name email')
      .sort({ createdAt: -1 });
    
    console.log(`Wynik zapytania inbox: ${inboxMessages.length} wiadomości`);
    
    if (inboxMessages.length > 0) {
      console.log('Przykładowa wiadomość inbox:');
      const msg = inboxMessages[0];
      console.log(`- Od: ${msg.sender?.name || msg.sender?.email}`);
      console.log(`- Temat: ${msg.subject}`);
      console.log(`- Data: ${msg.createdAt}`);
    }

    // 4. Sprawdź zapytanie dla sent
    console.log('\n📤 TESTOWANIE ZAPYTANIA SENT');
    console.log('============================');

    const sentQuery = { 
      sender: userObjectId,
      draft: false, 
      deletedBy: { $ne: userObjectId }
    };
    
    console.log('Zapytanie sent:', JSON.stringify(sentQuery));
    
    const sentMessages = await Message.find(sentQuery)
      .populate('sender', 'name email')
      .populate('recipient', 'name email')
      .sort({ createdAt: -1 });
    
    console.log(`Wynik zapytania sent: ${sentMessages.length} wiadomości`);

    // 5. Test API endpoints
    console.log('\n🌐 TESTOWANIE API ENDPOINTS');
    console.log('===========================');

    // Test inbox endpoint
    const inboxResponse = await fetch(`${API_BASE}/messages/inbox`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Cookie': cookies || ''
      }
    });

    console.log(`Inbox API status: ${inboxResponse.status}`);
    if (inboxResponse.ok) {
      const inboxData = await inboxResponse.json();
      console.log(`Inbox API wynik: ${inboxData.length} wiadomości`);
    } else {
      const errorText = await inboxResponse.text();
      console.log(`Inbox API błąd: ${errorText}`);
    }

    // Test sent endpoint
    const sentResponse = await fetch(`${API_BASE}/messages/sent`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Cookie': cookies || ''
      }
    });

    console.log(`Sent API status: ${sentResponse.status}`);
    if (sentResponse.ok) {
      const sentData = await sentResponse.json();
      console.log(`Sent API wynik: ${sentData.length} wiadomości`);
    }

    // 6. Test unread count
    console.log('\n🔔 TESTOWANIE UNREAD COUNT');
    console.log('==========================');

    const unreadQuery = { 
      recipient: userObjectId,
      read: false,
      deletedBy: { $ne: userObjectId }
    };
    
    console.log('Zapytanie unread:', JSON.stringify(unreadQuery));
    
    const unreadCount = await Message.countDocuments(unreadQuery);
    console.log(`Liczba nieprzeczytanych w bazie: ${unreadCount}`);

    const unreadResponse = await fetch(`${API_BASE}/messages/unread-count`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Cookie': cookies || ''
      }
    });

    console.log(`Unread API status: ${unreadResponse.status}`);
    if (unreadResponse.ok) {
      const unreadData = await unreadResponse.json();
      console.log(`Unread API wynik:`, unreadData);
    }

    console.log('\n✅ DEBUGOWANIE ZAKOŃCZONE');

  } catch (error) {
    console.error('💥 Błąd podczas debugowania:', error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  }
}

// Uruchom debugowanie
debugMessagesIssue();
