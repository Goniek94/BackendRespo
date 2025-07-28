/**
 * Test debugowania security fingerprinting
 */

import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const API_BASE = 'http://localhost:5000/api';

// Test data
const testUser = {
  email: 'mateusz.goszczycki1994@gmail.com',
  password: 'Neluchu321.'
};

// Symuluj dokładnie to samo User-Agent i IP
const USER_AGENT = 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)';
const IP_ADDRESS = '::1';

// Funkcja do generowania fingerprinta (skopiowana z middleware)
const generateFingerprint = (userAgent, ipAddress) => {
  const data = `${userAgent || 'unknown'}:${ipAddress || 'unknown'}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
};

async function testFingerprinting() {
  console.log('🔍 DEBUGOWANIE SECURITY FINGERPRINTING');
  console.log('=' .repeat(50));
  
  try {
    // 1. Logowanie z dokładnie tym samym User-Agent
    console.log('\n1. 🔐 Logowanie z kontrolowanym User-Agent...');
    console.log('User-Agent:', USER_AGENT);
    console.log('Expected IP:', IP_ADDRESS);
    
    const loginResponse = await fetch(`${API_BASE}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': USER_AGENT
      },
      body: JSON.stringify(testUser)
    });

    const loginData = await loginResponse.json();
    
    if (!loginResponse.ok) {
      console.log('❌ Logowanie nieudane:', loginData.message);
      return;
    }
    
    console.log('✅ Logowanie udane');
    
    // 2. Wyciągnij cookies
    const setCookieHeader = loginResponse.headers.get('set-cookie');
    const cookieStrings = setCookieHeader.split(/, (?=\w+=)/);
    const cookies = cookieStrings.map(cookieStr => {
      const parts = cookieStr.split(';');
      return parts[0];
    }).filter(cookie => cookie.includes('='));
    
    const cookieHeader = cookies.join('; ');
    const accessToken = cookies.find(c => c.startsWith('token='))?.split('=')[1];
    
    console.log('🍪 Cookies otrzymane:', cookieHeader ? 'TAK' : 'NIE');
    
    if (!accessToken) {
      console.log('❌ Brak access tokena');
      return;
    }
    
    // 3. Dekoduj token i sprawdź fingerprint
    console.log('\n2. 🔍 Analiza fingerprinta w tokenie...');
    const decoded = jwt.decode(accessToken);
    
    console.log('Token fingerprint:', decoded.fingerprint);
    console.log('Token User-Agent:', decoded.userAgent);
    console.log('Token IP:', decoded.ipAddress);
    
    // 4. Wygeneruj oczekiwany fingerprint
    const expectedFingerprint = generateFingerprint(USER_AGENT, IP_ADDRESS);
    console.log('Oczekiwany fingerprint:', expectedFingerprint);
    console.log('Fingerprint pasuje:', decoded.fingerprint === expectedFingerprint ? '✅ TAK' : '❌ NIE');
    
    // 5. Test autoryzacji z DOKŁADNIE tym samym User-Agent
    console.log('\n3. 🔍 Test autoryzacji z tym samym User-Agent...');
    const authResponse = await fetch(`${API_BASE}/users/check-auth`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': USER_AGENT,  // DOKŁADNIE ten sam!
        'Cookie': cookieHeader
      }
    });
    
    const authData = await authResponse.json();
    
    if (authResponse.ok) {
      console.log('✅ Autoryzacja udana z tym samym User-Agent');
      console.log('👤 Dane użytkownika:', authData.user?.name);
    } else {
      console.log('❌ Autoryzacja nieudana z tym samym User-Agent:', authData.message);
    }
    
    // 6. Test autoryzacji z INNYM User-Agent (powinien się nie udać)
    console.log('\n4. 🔍 Test autoryzacji z INNYM User-Agent...');
    const authResponse2 = await fetch(`${API_BASE}/users/check-auth`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',  // INNY!
        'Cookie': cookieHeader
      }
    });
    
    const authData2 = await authResponse2.json();
    
    if (authResponse2.ok) {
      console.log('⚠️ Autoryzacja udana z INNYM User-Agent (może być problem!)');
    } else {
      console.log('✅ Autoryzacja poprawnie odrzucona z innym User-Agent:', authData2.message);
    }
    
    // 7. Test bez User-Agent
    console.log('\n5. 🔍 Test autoryzacji BEZ User-Agent...');
    const authResponse3 = await fetch(`${API_BASE}/users/check-auth`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Brak User-Agent!
        'Cookie': cookieHeader
      }
    });
    
    const authData3 = await authResponse3.json();
    
    if (authResponse3.ok) {
      console.log('⚠️ Autoryzacja udana BEZ User-Agent (może być problem!)');
    } else {
      console.log('✅ Autoryzacja poprawnie odrzucona bez User-Agent:', authData3.message);
    }
    
  } catch (error) {
    console.error('❌ Błąd podczas testów:', error.message);
  }
}

testFingerprinting();
