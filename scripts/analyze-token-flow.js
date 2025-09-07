/**
 * ANALIZA PRZEPŁYWU TOKENÓW
 * Sprawdza jak tokeny są ustawiane przy logowaniu i używane w panelu admin
 */

import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 ANALIZA PRZEPŁYWU TOKENÓW');
console.log('============================\n');

const analyzeTokenFlow = async () => {
  console.log('1. LOGOWANIE UŻYTKOWNIKA:');
  console.log('==========================');
  
  try {
    // Test logowania
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'mateusz.goszczycki1994@gmail.com',
        password: 'Mateusz1994!'
      })
    });
    
    console.log('Status logowania:', loginResponse.status);
    
    if (loginResponse.status === 200) {
      // Sprawdź nagłówki Set-Cookie
      const setCookieHeaders = loginResponse.headers.raw()['set-cookie'] || [];
      console.log('\n📍 TOKENY USTAWIONE PRZY LOGOWANIU:');
      
      let accessToken = null;
      let refreshToken = null;
      
      setCookieHeaders.forEach((cookie, index) => {
        console.log(`Cookie ${index + 1}:`, cookie.substring(0, 100) + '...');
        
        if (cookie.startsWith('token=')) {
          accessToken = cookie.split('token=')[1].split(';')[0];
          console.log('  → ACCESS TOKEN znaleziony');
        }
        
        if (cookie.startsWith('refreshToken=')) {
          refreshToken = cookie.split('refreshToken=')[1].split(';')[0];
          console.log('  → REFRESH TOKEN znaleziony');
        }
      });
      
      // Dekoduj tokeny
      if (accessToken) {
        console.log('\n🔍 ANALIZA ACCESS TOKEN:');
        try {
          const decoded = jwt.decode(accessToken);
          console.log('Payload:', JSON.stringify(decoded, null, 2));
          console.log('Expiry:', new Date(decoded.exp * 1000));
          console.log('Time to expiry:', Math.round((decoded.exp * 1000 - Date.now()) / 1000), 'sekund');
        } catch (error) {
          console.log('Błąd dekodowania access token:', error.message);
        }
      }
      
      if (refreshToken) {
        console.log('\n🔍 ANALIZA REFRESH TOKEN:');
        try {
          const decoded = jwt.decode(refreshToken);
          console.log('Payload:', JSON.stringify(decoded, null, 2));
          console.log('Expiry:', new Date(decoded.exp * 1000));
          console.log('Time to expiry:', Math.round((decoded.exp * 1000 - Date.now()) / 1000), 'sekund');
        } catch (error) {
          console.log('Błąd dekodowania refresh token:', error.message);
        }
      }
      
      // Test dostępu do panelu admin
      console.log('\n\n2. DOSTĘP DO PANELU ADMIN:');
      console.log('===========================');
      
      if (accessToken) {
        try {
          const adminResponse = await fetch('http://localhost:5000/api/admin-panel/dashboard/stats', {
            method: 'GET',
            headers: {
              'Cookie': `token=${accessToken}; refreshToken=${refreshToken}`
            }
          });
          
          console.log('Status panelu admin:', adminResponse.status);
          
          if (adminResponse.status === 200) {
            console.log('✅ SUKCES: Panel admin działa z tokenami z logowania');
            const adminData = await adminResponse.text();
            console.log('Odpowiedź:', adminData.substring(0, 200) + '...');
          } else {
            console.log('❌ BŁĄD: Panel admin nie działa');
            const errorData = await adminResponse.text();
            console.log('Błąd:', errorData);
          }
          
        } catch (error) {
          console.log('❌ Błąd dostępu do panelu admin:', error.message);
        }
      }
      
    } else {
      console.log('❌ Logowanie nie powiodło się');
      const errorData = await loginResponse.text();
      console.log('Błąd:', errorData);
    }
    
  } catch (error) {
    console.log('❌ Błąd podczas testowania:', error.message);
  }
  
  console.log('\n\n3. PODSUMOWANIE PRZEPŁYWU TOKENÓW:');
  console.log('===================================');
  console.log('1. Użytkownik loguje się przez /api/auth/login');
  console.log('2. Serwer ustawia cookies: token (access) + refreshToken');
  console.log('3. Panel admin używa tych samych cookies do uwierzytelniania');
  console.log('4. Admin middleware sprawdza req.cookies.token');
  console.log('5. Jeśli token wygasł, próbuje refresh z req.cookies.refreshToken');
  console.log('\n📋 KLUCZOWE PUNKTY:');
  console.log('- Jeden zestaw tokenów dla całej aplikacji');
  console.log('- Admin panel NIE ma osobnych tokenów');
  console.log('- Używa standardowego middleware auth.js');
  console.log('- Admin middleware to dodatkowa warstwa sprawdzająca role');
};

analyzeTokenFlow().catch(console.error);
