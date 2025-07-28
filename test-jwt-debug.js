/**
 * Test debugowania JWT tokenów
 */

import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api';

// Test data
const testUser = {
  email: 'mateusz.goszczycki1994@gmail.com',
  password: 'Neluchu321.'
};

// Załaduj zmienne środowiskowe
import dotenv from 'dotenv';
dotenv.config();

// JWT secret z konfiguracji (development)
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-change-in-production';

async function debugJWT() {
  console.log('🔍 DEBUGOWANIE JWT TOKENÓW');
  console.log('=' .repeat(50));
  
  try {
    // 1. Logowanie
    console.log('\n1. Logowanie...');
    const loginResponse = await fetch(`${API_BASE}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser)
    });

    const loginData = await loginResponse.json();
    
    if (!loginResponse.ok) {
      console.log('❌ Logowanie nieudane:', loginData.message);
      return;
    }
    
    console.log('✅ Logowanie udane');
    
    // 2. Parsowanie cookies
    const setCookieHeader = loginResponse.headers.get('set-cookie');
    const cookieStrings = setCookieHeader.split(/, (?=\w+=)/);
    
    const cookies = cookieStrings.map(cookieStr => {
      const parts = cookieStr.split(';');
      const [name, value] = parts[0].split('=');
      return { 
        name: name ? name.trim() : '', 
        value: value ? value.trim() : '', 
        full: parts[0] 
      };
    }).filter(cookie => cookie.name && cookie.value);
    
    const accessToken = cookies.find(c => c.name === 'token')?.value;
    const refreshToken = cookies.find(c => c.name === 'refreshToken')?.value;
    
    console.log('\n2. Analiza tokenów:');
    console.log('Access Token:', accessToken ? 'OTRZYMANY' : 'BRAK');
    console.log('Refresh Token:', refreshToken ? 'OTRZYMANY' : 'BRAK');
    
    if (!accessToken) {
      console.log('❌ Brak access tokenu');
      return;
    }
    
    // 3. Dekodowanie tokenu bez weryfikacji
    console.log('\n3. Dekodowanie tokenu (bez weryfikacji):');
    try {
      const decodedWithoutVerify = jwt.decode(accessToken, { complete: true });
      console.log('Header:', JSON.stringify(decodedWithoutVerify.header, null, 2));
      console.log('Payload:', JSON.stringify(decodedWithoutVerify.payload, null, 2));
    } catch (error) {
      console.log('❌ Błąd dekodowania:', error.message);
    }
    
    // 4. Weryfikacja tokenu z różnymi sekretami
    console.log('\n4. Weryfikacja tokenu:');
    
    const secretsToTry = [
      JWT_SECRET,
      'your-jwt-secret-change-in-production',
      process.env.JWT_SECRET,
      'your-secret-key'
    ].filter(Boolean);
    
    console.log('Próbowane sekrety:', secretsToTry.length);
    
    let verificationSuccess = false;
    
    for (let i = 0; i < secretsToTry.length; i++) {
      const secret = secretsToTry[i];
      console.log(`\nPróba ${i + 1}: ${secret.substring(0, 10)}...`);
      
      try {
        const verified = jwt.verify(accessToken, secret);
        console.log('✅ Weryfikacja udana!');
        console.log('Zweryfikowany payload:', JSON.stringify(verified, null, 2));
        verificationSuccess = true;
        break;
      } catch (error) {
        console.log('❌ Weryfikacja nieudana:', error.message);
      }
    }
    
    if (!verificationSuccess) {
      console.log('\n❌ Żaden sekret nie zadziałał!');
      console.log('Sprawdź konfigurację JWT_SECRET w środowisku');
    }
    
    // 5. Test z middleware
    console.log('\n5. Test z middleware:');
    const cookieHeader = cookies.map(c => c.full).join('; ');
    
    const authResponse = await fetch(`${API_BASE}/users/check-auth`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader
      }
    });
    
    const authData = await authResponse.json();
    console.log('Status:', authResponse.status);
    console.log('Response:', authData);
    
  } catch (error) {
    console.error('❌ Błąd:', error.message);
  }
}

debugJWT();
