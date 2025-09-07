/**
 * SKRYPT ANALIZY NAGŁÓWKÓW I TOKENÓW
 * 
 * Sprawdza:
 * 1. Rozmiar tokenów JWT podczas logowania
 * 2. Nagłówki HTTP podczas logowania
 * 3. Nagłówki HTTP podczas dostępu do panelu admin
 * 4. Porównanie przed i po optymalizacjach
 */

import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:5000';

// Funkcja do analizy rozmiaru nagłówków
const analyzeHeaders = (headers) => {
  let totalSize = 0;
  const headerAnalysis = {};
  
  for (const [name, value] of Object.entries(headers.raw())) {
    const headerString = `${name}: ${Array.isArray(value) ? value.join(', ') : value}`;
    const size = Buffer.byteLength(headerString, 'utf8');
    totalSize += size;
    headerAnalysis[name] = {
      value: Array.isArray(value) ? value.join(', ') : value,
      size: size
    };
  }
  
  return { totalSize, headers: headerAnalysis };
};

// Funkcja do analizy tokenów JWT
const analyzeJWT = (token) => {
  try {
    const decoded = jwt.decode(token, { complete: true });
    const tokenSize = Buffer.byteLength(token, 'utf8');
    
    return {
      size: tokenSize,
      header: decoded.header,
      payload: decoded.payload,
      payloadSize: Buffer.byteLength(JSON.stringify(decoded.payload), 'utf8'),
      headerSize: Buffer.byteLength(JSON.stringify(decoded.header), 'utf8')
    };
  } catch (error) {
    return { error: error.message, size: Buffer.byteLength(token, 'utf8') };
  }
};

// Funkcja do analizy cookies
const analyzeCookies = (cookieHeader) => {
  if (!cookieHeader) return { totalSize: 0, cookies: {} };
  
  const cookies = {};
  let totalSize = 0;
  
  const cookiePairs = cookieHeader.split(';');
  for (const pair of cookiePairs) {
    const [name, ...valueParts] = pair.trim().split('=');
    if (name && valueParts.length > 0) {
      const value = valueParts.join('=');
      const size = Buffer.byteLength(`${name}=${value}`, 'utf8');
      totalSize += size;
      
      cookies[name] = {
        value: value.length > 50 ? value.substring(0, 50) + '...' : value,
        size: size,
        isJWT: value.includes('.') && value.split('.').length === 3
      };
      
      // Analiza JWT jeśli to token
      if (cookies[name].isJWT) {
        cookies[name].jwtAnalysis = analyzeJWT(value);
      }
    }
  }
  
  return { totalSize, cookies };
};

// Test 1: Logowanie użytkownika
const testUserLogin = async () => {
  console.log('\n🔐 TEST 1: LOGOWANIE UŻYTKOWNIKA');
  console.log('=' .repeat(50));
  
  try {
    const response = await fetch(`${BASE_URL}/api/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'mateusz.goszczycki1994@gmail.com',
        password: 'Admin123!'
      })
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    // Analiza nagłówków odpowiedzi
    const headerAnalysis = analyzeHeaders(response.headers);
    console.log(`\n📊 NAGŁÓWKI ODPOWIEDZI (${headerAnalysis.totalSize} bajtów):`);
    
    Object.entries(headerAnalysis.headers)
      .sort(([,a], [,b]) => b.size - a.size)
      .forEach(([name, data]) => {
        console.log(`  ${name}: ${data.size}B - ${data.value.substring(0, 100)}${data.value.length > 100 ? '...' : ''}`);
      });
    
    // Analiza cookies
    const setCookieHeaders = response.headers.raw()['set-cookie'] || [];
    console.log(`\n🍪 SET-COOKIE HEADERS (${setCookieHeaders.length} cookies):`);
    
    let totalCookieSize = 0;
    setCookieHeaders.forEach((cookie, index) => {
      const size = Buffer.byteLength(cookie, 'utf8');
      totalCookieSize += size;
      console.log(`  Cookie ${index + 1}: ${size}B - ${cookie.substring(0, 100)}${cookie.length > 100 ? '...' : ''}`);
      
      // Sprawdź czy to JWT
      const cookieValue = cookie.split(';')[0].split('=')[1];
      if (cookieValue && cookieValue.includes('.') && cookieValue.split('.').length === 3) {
        const jwtAnalysis = analyzeJWT(cookieValue);
        console.log(`    JWT Analysis: ${jwtAnalysis.size}B total, payload: ${JSON.stringify(jwtAnalysis.payload)}`);
      }
    });
    
    console.log(`\n📈 PODSUMOWANIE LOGOWANIA:`);
    console.log(`  Całkowity rozmiar nagłówków: ${headerAnalysis.totalSize} bajtów`);
    console.log(`  Całkowity rozmiar cookies: ${totalCookieSize} bajtów`);
    console.log(`  Łączny rozmiar: ${headerAnalysis.totalSize + totalCookieSize} bajtów`);
    
    // Zapisz cookies dla następnego testu
    const cookies = setCookieHeaders.map(cookie => cookie.split(';')[0]).join('; ');
    return cookies;
    
  } catch (error) {
    console.error('❌ Błąd podczas logowania:', error.message);
    return null;
  }
};

// Test 2: Dostęp do panelu admin
const testAdminPanel = async (cookies) => {
  console.log('\n👑 TEST 2: DOSTĘP DO PANELU ADMIN');
  console.log('=' .repeat(50));
  
  if (!cookies) {
    console.log('❌ Brak cookies z logowania - pomijam test');
    return;
  }
  
  try {
    // Analiza cookies przed wysłaniem
    console.log('\n📤 COOKIES WYSYŁANE:');
    const cookieAnalysis = analyzeCookies(cookies);
    console.log(`  Całkowity rozmiar: ${cookieAnalysis.totalSize} bajtów`);
    
    Object.entries(cookieAnalysis.cookies).forEach(([name, data]) => {
      console.log(`  ${name}: ${data.size}B ${data.isJWT ? '(JWT)' : ''}`);
      if (data.jwtAnalysis && !data.jwtAnalysis.error) {
        console.log(`    Payload: ${JSON.stringify(data.jwtAnalysis.payload)}`);
        console.log(`    Rozmiar payload: ${data.jwtAnalysis.payloadSize}B`);
      }
    });
    
    // Żądanie do panelu admin
    const response = await fetch(`${BASE_URL}/api/admin-panel/dashboard`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      }
    });
    
    console.log(`\nStatus: ${response.status} ${response.statusText}`);
    
    // Analiza nagłówków odpowiedzi
    const headerAnalysis = analyzeHeaders(response.headers);
    console.log(`\n📊 NAGŁÓWKI ODPOWIEDZI (${headerAnalysis.totalSize} bajtów):`);
    
    Object.entries(headerAnalysis.headers)
      .sort(([,a], [,b]) => b.size - a.size)
      .forEach(([name, data]) => {
        console.log(`  ${name}: ${data.size}B - ${data.value.substring(0, 100)}${data.value.length > 100 ? '...' : ''}`);
      });
    
    // Sprawdź czy są nowe cookies
    const newSetCookieHeaders = response.headers.raw()['set-cookie'] || [];
    if (newSetCookieHeaders.length > 0) {
      console.log(`\n🍪 NOWE SET-COOKIE HEADERS (${newSetCookieHeaders.length} cookies):`);
      newSetCookieHeaders.forEach((cookie, index) => {
        const size = Buffer.byteLength(cookie, 'utf8');
        console.log(`  Cookie ${index + 1}: ${size}B - ${cookie.substring(0, 100)}${cookie.length > 100 ? '...' : ''}`);
      });
    }
    
    console.log(`\n📈 PODSUMOWANIE PANELU ADMIN:`);
    console.log(`  Rozmiar nagłówków żądania (cookies): ${cookieAnalysis.totalSize} bajtów`);
    console.log(`  Rozmiar nagłówków odpowiedzi: ${headerAnalysis.totalSize} bajtów`);
    console.log(`  Łączny rozmiar: ${cookieAnalysis.totalSize + headerAnalysis.totalSize} bajtów`);
    
    // Sprawdź odpowiedź
    if (response.ok) {
      const data = await response.json();
      console.log(`  Rozmiar odpowiedzi JSON: ${Buffer.byteLength(JSON.stringify(data), 'utf8')} bajtów`);
      console.log(`  Dane dashboard: ${data.success ? 'POBRANE' : 'BŁĄD'}`);
    }
    
  } catch (error) {
    console.error('❌ Błąd podczas dostępu do panelu admin:', error.message);
  }
};

// Test 3: Porównanie z limitami HTTP 431
const checkHTTP431Limits = (loginSize, adminSize) => {
  console.log('\n⚠️  TEST 3: SPRAWDZENIE LIMITÓW HTTP 431');
  console.log('=' .repeat(50));
  
  const limits = {
    'Domyślny limit Node.js': 8192,
    'Nasz zwiększony limit': 32768,
    'Maksymalny limit': 131072
  };
  
  console.log('📏 PORÓWNANIE Z LIMITAMI:');
  Object.entries(limits).forEach(([name, limit]) => {
    const loginStatus = loginSize <= limit ? '✅' : '❌';
    const adminStatus = adminSize <= limit ? '✅' : '❌';
    console.log(`  ${name} (${limit}B):`);
    console.log(`    Logowanie: ${loginStatus} ${loginSize}B`);
    console.log(`    Panel Admin: ${adminStatus} ${adminSize}B`);
  });
  
  console.log('\n🎯 REKOMENDACJE:');
  if (loginSize > 8192 || adminSize > 8192) {
    console.log('  ⚠️  Przekroczono domyślny limit Node.js (8KB)');
  }
  if (loginSize > 32768 || adminSize > 32768) {
    console.log('  ❌ Przekroczono nasz zwiększony limit (32KB)');
  }
  if (loginSize <= 8192 && adminSize <= 8192) {
    console.log('  ✅ Wszystkie żądania mieszczą się w domyślnych limitach');
  }
};

// Główna funkcja
const main = async () => {
  console.log('🔍 ANALIZA NAGŁÓWKÓW I TOKENÓW HTTP 431');
  console.log('Sprawdzanie rozmiaru tokenów i nagłówków podczas logowania i dostępu do panelu admin');
  console.log('=' .repeat(80));
  
  // Test logowania
  const cookies = await testUserLogin();
  
  // Test panelu admin
  await testAdminPanel(cookies);
  
  // Podsumowanie
  console.log('\n📋 FINALNE PODSUMOWANIE');
  console.log('=' .repeat(50));
  console.log('Analiza zakończona. Sprawdź wyniki powyżej.');
  console.log('Jeśli którykolwiek rozmiar przekracza 32KB, może wystąpić błąd HTTP 431.');
};

// Uruchom analizę
main().catch(console.error);
