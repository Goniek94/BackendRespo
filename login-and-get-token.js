/**
 * LOGOWANIE I UZYSKANIE TOKENA
 * 
 * Loguje się na podane konto i zwraca token JWT
 */

import fetch from 'node-fetch';

const BACKEND_URL = 'http://localhost:5000';
const EMAIL = 'mateusz.goszczycki1994@gmail.com';
const PASSWORD = 'Neluchu321.';

console.log('🔐 LOGOWANIE I UZYSKANIE TOKENA');
console.log('==============================\n');

async function loginAndGetToken() {
  try {
    console.log(`📧 Logowanie na konto: ${EMAIL}`);
    
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: EMAIL,
        password: PASSWORD
      })
    });
    
    if (!response.ok) {
      console.log(`❌ Błąd logowania: ${response.status}`);
      const errorText = await response.text();
      console.log(`   Odpowiedź: ${errorText}`);
      return null;
    }
    
    const result = await response.json();
    console.log('✅ Logowanie udane!');
    
    // Sprawdź czy mamy token w odpowiedzi
    if (result.token) {
      console.log(`🎫 Token JWT: ${result.token}`);
      return result.token;
    }
    
    // Sprawdź czy token jest w cookies
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      console.log('🍪 Sprawdzanie cookies...');
      console.log(`   Set-Cookie: ${setCookieHeader}`);
      
      // Wyciągnij token z cookie
      const tokenMatch = setCookieHeader.match(/token=([^;]+)/);
      if (tokenMatch) {
        const token = tokenMatch[1];
        console.log(`🎫 Token z cookie: ${token}`);
        return token;
      }
    }
    
    console.log('⚠️ Nie znaleziono tokena w odpowiedzi');
    console.log('📋 Pełna odpowiedź:', JSON.stringify(result, null, 2));
    
    return null;
  } catch (error) {
    console.log(`❌ Błąd: ${error.message}`);
    return null;
  }
}

/**
 * Test API z tokenem
 */
async function testAPIWithToken(token) {
  console.log('\n🧪 TESTOWANIE API Z TOKENEM');
  console.log('===========================\n');
  
  try {
    // Test 1: Lista konwersacji
    console.log('1. 📋 Test listy konwersacji...');
    
    const conversationsResponse = await fetch(`${BACKEND_URL}/api/messages/conversations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${token}`
      }
    });
    
    if (!conversationsResponse.ok) {
      console.log(`❌ Błąd HTTP: ${conversationsResponse.status}`);
      const errorText = await conversationsResponse.text();
      console.log(`   Odpowiedź: ${errorText}`);
    } else {
      const conversations = await conversationsResponse.json();
      console.log(`✅ Pobrano ${conversations.length} konwersacji`);
      
      if (conversations.length > 0) {
        const conv = conversations[0];
        console.log('\n📝 PRZYKŁADOWA KONWERSACJA:');
        console.log(`   Rozmówca ID: ${conv.user?._id || 'BRAK'}`);
        console.log(`   Rozmówca imię: ${conv.user?.name || 'BRAK'}`);
        console.log(`   Rozmówca email: ${conv.user?.email || 'BRAK'}`);
        console.log(`   Ostatnia wiadomość: ${conv.lastMessage?.subject || 'BRAK'}`);
        console.log(`   Data utworzenia: ${conv.lastMessage?.createdAt || 'BRAK'}`);
        console.log(`   Nieprzeczytane: ${conv.unreadCount || 0}`);
        console.log(`   Ogłoszenie ID: ${conv.adInfo?._id || 'BRAK'}`);
        console.log(`   Ogłoszenie tytuł: ${conv.adInfo?.headline || 'BRAK'}`);
        console.log(`   Ogłoszenie marka: ${conv.adInfo?.brand || 'BRAK'}`);
        console.log(`   Ogłoszenie model: ${conv.adInfo?.model || 'BRAK'}`);
        
        // Sprawdź strukturę lastMessage
        if (conv.lastMessage) {
          console.log('\n📨 SZCZEGÓŁY OSTATNIEJ WIADOMOŚCI:');
          console.log(`   ID: ${conv.lastMessage._id || 'BRAK'}`);
          console.log(`   Nadawca ID: ${conv.lastMessage.sender?._id || conv.lastMessage.sender || 'BRAK'}`);
          console.log(`   Nadawca imię: ${conv.lastMessage.sender?.name || 'BRAK'}`);
          console.log(`   Odbiorca ID: ${conv.lastMessage.recipient?._id || conv.lastMessage.recipient || 'BRAK'}`);
          console.log(`   Odbiorca imię: ${conv.lastMessage.recipient?.name || 'BRAK'}`);
          console.log(`   Treść: ${conv.lastMessage.content || 'BRAK'}`);
          console.log(`   Przeczytana: ${conv.lastMessage.read || false}`);
        }
      }
    }
    
    // Test 2: Liczba nieprzeczytanych
    console.log('\n2. 🔔 Test liczby nieprzeczytanych...');
    
    const unreadResponse = await fetch(`${BACKEND_URL}/api/messages/unread-count`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${token}`
      }
    });
    
    if (!unreadResponse.ok) {
      console.log(`❌ Błąd HTTP: ${unreadResponse.status}`);
    } else {
      const unreadResult = await unreadResponse.json();
      console.log('✅ Pobrano liczbę nieprzeczytanych');
      console.log(`   Nieprzeczytane: ${unreadResult.unreadCount || 0}`);
    }
    
  } catch (error) {
    console.log(`❌ Błąd testowania API: ${error.message}`);
  }
}

/**
 * Główna funkcja
 */
async function main() {
  const token = await loginAndGetToken();
  
  if (token) {
    await testAPIWithToken(token);
    
    console.log('\n🎯 WYNIK:');
    console.log(`Token do użycia w testach: ${token}`);
    console.log('\nMożesz teraz zaktualizować test-messages-api-complete.js z tym tokenem');
  } else {
    console.log('\n❌ Nie udało się uzyskać tokena');
  }
}

// Uruchom
main().catch(console.error);
