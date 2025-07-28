/**
 * Test endpoint konwersacji - diagnoza problemu 401
 */

import axios from 'axios';
import dotenv from 'dotenv';

// Załaduj zmienne środowiskowe
dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

// Test credentials
const testUser = {
  email: 'test@example.com',
  password: 'TestPassword123!'
};

async function testMessagesEndpoint() {
  console.log('=== TEST ENDPOINT KONWERSACJI ===\n');
  
  try {
    // 1. Logowanie użytkownika
    console.log('1. Logowanie użytkownika...');
    const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, testUser, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Logowanie udane');
    console.log('Status:', loginResponse.status);
    console.log('Cookies:', loginResponse.headers['set-cookie']);
    
    // Wyciągnij cookies z odpowiedzi
    const cookies = loginResponse.headers['set-cookie'];
    let cookieHeader = '';
    if (cookies) {
      cookieHeader = cookies.map(cookie => cookie.split(';')[0]).join('; ');
    }
    
    console.log('Cookie header:', cookieHeader);
    
    // 2. Test endpointu konwersacji
    console.log('\n2. Test endpointu konwersacji...');
    
    const endpoints = [
      '/api/messages/conversations',
      '/api/v1/messages/conversations',
      '/api/messages/conversations?folder=inbox'
    ];
    
    for (const endpoint of endpoints) {
      console.log(`\nTestowanie: ${endpoint}`);
      
      try {
        const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
          withCredentials: true,
          headers: {
            'Cookie': cookieHeader,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('✅ Sukces!');
        console.log('Status:', response.status);
        console.log('Dane:', Array.isArray(response.data) ? `Tablica z ${response.data.length} elementami` : typeof response.data);
        
        if (Array.isArray(response.data) && response.data.length > 0) {
          console.log('Przykładowa konwersacja:', {
            user: response.data[0].user?.name || response.data[0].user?.email,
            lastMessage: response.data[0].lastMessage?.subject,
            unreadCount: response.data[0].unreadCount
          });
        }
        
      } catch (error) {
        console.log('❌ Błąd:', error.response?.status, error.response?.statusText);
        console.log('Odpowiedź:', error.response?.data);
        
        if (error.response?.status === 401) {
          console.log('🔍 Szczegóły błędu 401:');
          console.log('- Headers wysłane:', error.config?.headers);
          console.log('- URL:', error.config?.url);
        }
      }
    }
    
    // 3. Test innych endpointów wiadomości
    console.log('\n3. Test innych endpointów wiadomości...');
    
    const otherEndpoints = [
      '/api/messages/unread-count',
      '/api/messages/inbox',
      '/api/v1/messages/inbox'
    ];
    
    for (const endpoint of otherEndpoints) {
      console.log(`\nTestowanie: ${endpoint}`);
      
      try {
        const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
          withCredentials: true,
          headers: {
            'Cookie': cookieHeader,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('✅ Sukces!');
        console.log('Status:', response.status);
        console.log('Typ danych:', typeof response.data);
        
      } catch (error) {
        console.log('❌ Błąd:', error.response?.status, error.response?.statusText);
        console.log('Kod błędu:', error.response?.data?.code);
      }
    }
    
    // 4. Test weryfikacji tokena
    console.log('\n4. Test weryfikacji tokena...');
    
    try {
      const profileResponse = await axios.get(`${API_BASE_URL}/api/users/profile`, {
        withCredentials: true,
        headers: {
          'Cookie': cookieHeader,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Token jest ważny');
      console.log('Profil użytkownika:', {
        id: profileResponse.data.id,
        email: profileResponse.data.email,
        name: profileResponse.data.name
      });
      
    } catch (error) {
      console.log('❌ Token nieważny:', error.response?.status, error.response?.data?.code);
    }
    
    // 5. Test bezpośredniego dostępu do controllera
    console.log('\n5. Test bezpośredniego dostępu...');
    
    try {
      // Sprawdź czy serwer w ogóle odpowiada
      const healthResponse = await axios.get(`${API_BASE_URL}/api/health`);
      console.log('✅ Serwer działa:', healthResponse.status);
      
      // Sprawdź routing
      const apiResponse = await axios.get(`${API_BASE_URL}/api`);
      console.log('✅ API routing działa:', apiResponse.status);
      
    } catch (error) {
      console.log('❌ Problem z serwerem:', error.message);
    }
    
  } catch (error) {
    console.error('💥 Błąd podczas testowania:', error.message);
    
    if (error.response?.status === 401) {
      console.log('\n🔍 ANALIZA BŁĘDU 401:');
      console.log('- Prawdopodobnie problem z cookies lub tokenem');
      console.log('- Sprawdź czy frontend wysyła cookies');
      console.log('- Sprawdź konfigurację CORS');
      console.log('- Sprawdź middleware autoryzacji');
    }
  }
}

// Uruchom test
testMessagesEndpoint().catch(console.error);
