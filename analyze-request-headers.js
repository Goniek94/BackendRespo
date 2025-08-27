/**
 * Skrypt do analizy nagłówków HTTP - identyfikuje źródła dużych nagłówków
 * Pomaga zdiagnozować przyczyny błędu HTTP 431 "Request Header Fields Too Large"
 */

import express from 'express';
import cookieParser from 'cookie-parser';
import { generateAccessToken, generateRefreshToken } from './middleware/auth.js';

const app = express();
app.use(cookieParser());

// Middleware do analizy nagłówków
const analyzeHeaders = (req, res, next) => {
  console.log('\n🔍 === ANALIZA NAGŁÓWKÓW HTTP ===');
  console.log('Endpoint:', req.originalUrl);
  console.log('Method:', req.method);
  console.log('Timestamp:', new Date().toISOString());
  
  // Analiza wszystkich nagłówków
  const headers = req.headers;
  let totalHeaderSize = 0;
  const headerAnalysis = {};
  
  console.log('\n📋 WSZYSTKIE NAGŁÓWKI:');
  Object.keys(headers).forEach(key => {
    const value = headers[key];
    const size = `${key}: ${value}`.length;
    totalHeaderSize += size;
    
    headerAnalysis[key] = {
      value: value,
      size: size,
      type: typeof value
    };
    
    console.log(`  ${key}: ${value} (${size} bajtów)`);
  });
  
  // Szczególna analiza cookies
  console.log('\n🍪 ANALIZA COOKIES:');
  if (req.cookies && Object.keys(req.cookies).length > 0) {
    let totalCookieSize = 0;
    Object.keys(req.cookies).forEach(cookieName => {
      const cookieValue = req.cookies[cookieName];
      const cookieSize = `${cookieName}=${cookieValue}`.length;
      totalCookieSize += cookieSize;
      
      console.log(`  ${cookieName}:`);
      console.log(`    Wartość: ${cookieValue.substring(0, 100)}${cookieValue.length > 100 ? '...' : ''}`);
      console.log(`    Rozmiar: ${cookieSize} bajtów`);
      console.log(`    Długość wartości: ${cookieValue.length} znaków`);
      
      // Analiza JWT tokenów
      if (cookieName === 'token' || cookieName === 'refreshToken') {
        try {
          const parts = cookieValue.split('.');
          if (parts.length === 3) {
            console.log(`    JWT części:`);
            console.log(`      Header: ${parts[0].length} znaków`);
            console.log(`      Payload: ${parts[1].length} znaków`);
            console.log(`      Signature: ${parts[2].length} znaków`);
            
            // Dekoduj payload (bez weryfikacji)
            try {
              const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
              console.log(`    JWT Payload:`, JSON.stringify(payload, null, 2));
            } catch (e) {
              console.log(`    Nie można zdekodować payload: ${e.message}`);
            }
          }
        } catch (e) {
          console.log(`    Błąd analizy JWT: ${e.message}`);
        }
      }
    });
    
    console.log(`\n  📊 PODSUMOWANIE COOKIES:`);
    console.log(`    Liczba cookies: ${Object.keys(req.cookies).length}`);
    console.log(`    Całkowity rozmiar cookies: ${totalCookieSize} bajtów`);
  } else {
    console.log('  Brak cookies');
  }
  
  // Analiza User-Agent
  console.log('\n🌐 USER AGENT:');
  const userAgent = req.get('User-Agent') || 'Brak';
  console.log(`  Wartość: ${userAgent}`);
  console.log(`  Rozmiar: ${userAgent.length} bajtów`);
  
  // Analiza innych dużych nagłówków
  console.log('\n📏 NAJWIĘKSZE NAGŁÓWKI:');
  const sortedHeaders = Object.entries(headerAnalysis)
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 10);
  
  sortedHeaders.forEach(([key, info], index) => {
    console.log(`  ${index + 1}. ${key}: ${info.size} bajtów`);
  });
  
  // Podsumowanie
  console.log('\n📊 PODSUMOWANIE:');
  console.log(`  Całkowity rozmiar nagłówków: ${totalHeaderSize} bajtów`);
  console.log(`  Liczba nagłówków: ${Object.keys(headers).length}`);
  console.log(`  Średni rozmiar nagłówka: ${Math.round(totalHeaderSize / Object.keys(headers).length)} bajtów`);
  
  // Ostrzeżenia
  if (totalHeaderSize > 8192) {
    console.log(`  ⚠️  OSTRZEŻENIE: Rozmiar nagłówków (${totalHeaderSize}) przekracza typowy limit 8KB!`);
  }
  if (totalHeaderSize > 16384) {
    console.log(`  🚨 KRYTYCZNE: Rozmiar nagłówków (${totalHeaderSize}) przekracza 16KB - ryzyko HTTP 431!`);
  }
  
  console.log('\n' + '='.repeat(80) + '\n');
  
  next();
};

// Zastosuj middleware do wszystkich requestów
app.use(analyzeHeaders);

// Test endpoint - generuje tokeny i ustawia cookies
app.get('/generate-tokens', (req, res) => {
  console.log('🔧 Generowanie testowych tokenów...');
  
  const userData = {
    userId: '507f1f77bcf86cd799439011',
    role: 'admin', // Użyj admin dla większych tokenów
    email: 'test@example.com',
    permissions: ['read', 'write', 'delete', 'admin']
  };
  
  const accessToken = generateAccessToken(userData);
  const refreshToken = generateRefreshToken(userData);
  
  console.log(`Access token length: ${accessToken.length}`);
  console.log(`Refresh token length: ${refreshToken.length}`);
  
  // Ustaw cookies
  res.cookie('token', accessToken, { 
    httpOnly: true, 
    secure: false, // dla testów lokalnych
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000 // 15 minut
  });
  
  res.cookie('refreshToken', refreshToken, { 
    httpOnly: true, 
    secure: false, // dla testów lokalnych
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dni
  });
  
  // Dodaj dodatkowe cookies dla testów
  res.cookie('sessionId', 'sess_' + Math.random().toString(36).substring(2, 15), {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  });
  
  res.cookie('preferences', JSON.stringify({
    theme: 'dark',
    language: 'pl',
    notifications: true,
    autoSave: true
  }), {
    maxAge: 30 * 24 * 60 * 60 * 1000
  });
  
  res.json({
    message: 'Tokeny wygenerowane i ustawione jako cookies',
    tokenSizes: {
      accessToken: accessToken.length,
      refreshToken: refreshToken.length,
      total: accessToken.length + refreshToken.length
    }
  });
});

// Test endpoint - symuluje wielokrotne ustawienie cookies (duplikacja)
app.get('/duplicate-cookies', (req, res) => {
  console.log('🔄 Symulacja duplikacji cookies...');
  
  // Symuluj błąd - ustaw cookies bez czyszczenia starych
  for (let i = 1; i <= 3; i++) {
    const userData = {
      userId: '507f1f77bcf86cd799439011',
      role: 'admin',
      sessionId: `session_${i}_${Date.now()}`
    };
    
    const token = generateAccessToken(userData);
    
    // BŁĄD: Ustawiamy cookies z różnymi nazwami (symulacja duplikacji)
    res.cookie(`token_${i}`, token, { 
      httpOnly: true, 
      secure: false,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000
    });
  }
  
  res.json({
    message: 'Symulacja duplikacji cookies wykonana',
    warning: 'To może spowodować HTTP 431!'
  });
});

// Test endpoint - czyści wszystkie cookies
app.get('/clear-all', (req, res) => {
  console.log('🧹 Czyszczenie wszystkich cookies...');
  
  // Wyczyść wszystkie znane cookies
  const cookiesToClear = ['token', 'refreshToken', 'sessionId', 'preferences'];
  
  // Dodaj cookies z duplikacji
  for (let i = 1; i <= 3; i++) {
    cookiesToClear.push(`token_${i}`);
  }
  
  cookiesToClear.forEach(cookieName => {
    res.clearCookie(cookieName);
  });
  
  res.json({
    message: 'Wszystkie cookies wyczyszczone',
    cleared: cookiesToClear
  });
});

// Test endpoint - sprawdza obecne cookies
app.get('/check-headers', (req, res) => {
  // Analiza jest już wykonana przez middleware
  res.json({
    message: 'Analiza nagłówków wykonana - sprawdź konsole serwera',
    cookieCount: Object.keys(req.cookies || {}).length,
    headerCount: Object.keys(req.headers).length
  });
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`\n🔍 Analizator nagłówków uruchomiony na porcie ${PORT}`);
  console.log('\nDostępne endpointy:');
  console.log(`- GET http://localhost:${PORT}/check-headers - Analizuje obecne nagłówki`);
  console.log(`- GET http://localhost:${PORT}/generate-tokens - Generuje i ustawia tokeny`);
  console.log(`- GET http://localhost:${PORT}/duplicate-cookies - Symuluje duplikację cookies`);
  console.log(`- GET http://localhost:${PORT}/clear-all - Czyści wszystkie cookies`);
  console.log('\nInstrukcje:');
  console.log('1. Otwórz http://localhost:3002/check-headers - sprawdź początkowy stan');
  console.log('2. Przejdź do http://localhost:3002/generate-tokens - wygeneruj tokeny');
  console.log('3. Sprawdź ponownie http://localhost:3002/check-headers - zobacz wzrost');
  console.log('4. Przetestuj http://localhost:3002/duplicate-cookies - symuluj problem');
  console.log('5. Sprawdź http://localhost:3002/check-headers - zobacz duplikację');
  console.log('6. Wyczyść http://localhost:3002/clear-all i sprawdź ponownie\n');
});
