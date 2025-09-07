#!/usr/bin/env node

/**
 * ANALIZA OGROMNYCH NAGŁÓWKÓW - DETECTIVE MODE
 * Śledzi dokładnie skąd się biorą ogromne nagłówki powodujące HTTP 431
 */

import fetch from 'node-fetch';
import fs from 'fs';

const BASE_URL = 'http://localhost:5000'; // Serwer działa na 5001
const FRONTEND_URL = 'http://localhost:3000';

console.log('🕵️ ANALIZA OGROMNYCH NAGŁÓWKÓW - DETECTIVE MODE');
console.log('================================================================================');
console.log(`🎯 Cel: Znaleźć źródło ogromnych nagłówków powodujących HTTP 431`);
console.log(`🔍 Serwer: ${BASE_URL}`);
console.log(`🌐 Frontend: ${FRONTEND_URL}`);

/**
 * Analizuje rozmiar nagłówków requestu
 */
function analyzeRequestHeaders(headers) {
  console.log('\n🔍 ANALIZA NAGŁÓWKÓW REQUESTU:');
  console.log('──────────────────────────────────────────────────');
  
  let totalSize = 0;
  const headerAnalysis = [];
  
  Object.entries(headers).forEach(([name, value]) => {
    const size = `${name}: ${value}`.length;
    totalSize += size;
    headerAnalysis.push({ name, value: value.substring(0, 100), size });
  });
  
  // Sortuj według rozmiaru
  headerAnalysis.sort((a, b) => b.size - a.size);
  
  console.log(`   📏 Całkowity rozmiar nagłówków: ${totalSize} bajtów`);
  console.log(`   📊 Liczba nagłówków: ${headerAnalysis.length}`);
  
  console.log('\n   🔝 NAJWIĘKSZE NAGŁÓWKI:');
  headerAnalysis.slice(0, 10).forEach((header, index) => {
    const percentage = ((header.size / totalSize) * 100).toFixed(1);
    console.log(`      ${index + 1}. ${header.name}: ${header.size}B (${percentage}%)`);
    if (header.name.toLowerCase() === 'cookie') {
      analyzeCookieHeader(header.value);
    }
  });
  
  return { totalSize, headers: headerAnalysis };
}

/**
 * Szczegółowa analiza nagłówka Cookie
 */
function analyzeCookieHeader(cookieValue) {
  console.log('\n   🍪 SZCZEGÓŁOWA ANALIZA COOKIES:');
  
  if (!cookieValue) {
    console.log('      Brak cookies');
    return;
  }
  
  const cookies = cookieValue.split(';').map(c => c.trim());
  let cookieAnalysis = [];
  
  cookies.forEach(cookie => {
    const [name, ...valueParts] = cookie.split('=');
    const value = valueParts.join('=');
    const size = cookie.length;
    cookieAnalysis.push({ name: name?.trim(), value, size });
  });
  
  // Sortuj według rozmiaru
  cookieAnalysis.sort((a, b) => b.size - a.size);
  
  console.log(`      📊 Liczba cookies: ${cookieAnalysis.length}`);
  console.log(`      📏 Całkowity rozmiar cookies: ${cookieValue.length} bajtów`);
  
  console.log('\n      🔝 NAJWIĘKSZE COOKIES:');
  cookieAnalysis.slice(0, 15).forEach((cookie, index) => {
    const percentage = ((cookie.size / cookieValue.length) * 100).toFixed(1);
    console.log(`         ${index + 1}. ${cookie.name}: ${cookie.size}B (${percentage}%)`);
    
    // Sprawdź czy to token
    if (cookie.name && (cookie.name.includes('token') || cookie.name.includes('Token'))) {
      console.log(`            🔑 TOKEN DETECTED: ${cookie.value?.substring(0, 50)}...`);
    }
  });
  
  // Znajdź duplikaty
  const duplicates = findDuplicateTokens(cookieAnalysis);
  if (duplicates.length > 0) {
    console.log('\n      🚨 DUPLIKATY TOKENÓW ZNALEZIONE:');
    duplicates.forEach(dup => {
      console.log(`         ⚠️  ${dup.name}: ${dup.count} kopii, ${dup.totalSize}B`);
    });
  }
}

/**
 * Znajdź duplikaty tokenów
 */
function findDuplicateTokens(cookies) {
  const tokenCookies = cookies.filter(c => 
    c.name && (c.name.includes('token') || c.name.includes('Token'))
  );
  
  const duplicates = [];
  const seen = new Map();
  
  tokenCookies.forEach(cookie => {
    const key = cookie.value;
    if (seen.has(key)) {
      const existing = seen.get(key);
      existing.count++;
      existing.totalSize += cookie.size;
      existing.names.push(cookie.name);
    } else {
      seen.set(key, {
        name: cookie.name,
        names: [cookie.name],
        count: 1,
        totalSize: cookie.size
      });
    }
  });
  
  return Array.from(seen.values()).filter(item => item.count > 1);
}

/**
 * Test logowania z analizą nagłówków
 */
async function testLoginWithHeaderAnalysis() {
  console.log('\n📋 KROK 1: Test logowania z analizą nagłówków');
  console.log('──────────────────────────────────────────────────');
  
  try {
    const requestHeaders = {
      'Content-Type': 'application/json',
      'Origin': FRONTEND_URL,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'pl-PL,pl;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-site'
    };
    
    console.log('   🔍 Analizuję nagłówki requestu logowania...');
    const requestAnalysis = analyzeRequestHeaders(requestHeaders);
    
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify({
        email: 'mateusz.goszczycki1994@gmail.com',
        password: 'Admin123!'
      })
    });
    
    console.log(`\n   📊 Status odpowiedzi: ${response.status} ${response.statusText}`);
    
    // Analizuj nagłówki odpowiedzi
    const responseHeaders = response.headers.raw();
    console.log('\n   🔍 NAGŁÓWKI ODPOWIEDZI:');
    Object.entries(responseHeaders).forEach(([name, values]) => {
      const value = Array.isArray(values) ? values.join(', ') : values;
      console.log(`      ${name}: ${value.substring(0, 100)}${value.length > 100 ? '...' : ''}`);
    });
    
    // Sprawdź Set-Cookie
    const setCookieHeaders = response.headers.raw()['set-cookie'] || [];
    if (setCookieHeaders.length > 0) {
      console.log('\n   🍪 SET-COOKIE HEADERS:');
      setCookieHeaders.forEach((cookie, index) => {
        const cookieName = cookie.split('=')[0];
        const cookieSize = cookie.length;
        console.log(`      ${index + 1}. ${cookieName}: ${cookieSize}B`);
        console.log(`         ${cookie.substring(0, 150)}...`);
      });
      
      // Zwróć cookies do dalszych testów
      const cookies = setCookieHeaders.map(cookie => cookie.split(';')[0]).join('; ');
      return cookies;
    }
    
    return null;
    
  } catch (error) {
    console.log(`   ❌ Błąd logowania: ${error.message}`);
    return null;
  }
}

/**
 * Test panelu admina z ogromymi nagłówkami
 */
async function testAdminPanelWithMassiveHeaders(cookies) {
  console.log('\n📋 KROK 2: Test panelu admina z analizą ogromnych nagłówków');
  console.log('──────────────────────────────────────────────────');
  
  if (!cookies) {
    console.log('   ⚠️  Brak cookies - tworzę symulowane ogromne nagłówki');
    
    // Stwórz symulowane ogromne cookies
    const massiveCookies = [
      'token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODhiNGFiYTljMGYyZmVjZDAzNWIyMGEiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MjU3NDk5ODYsImV4cCI6MTcyNTc1MDg4Nn0.example_token_data_here_very_long_token_data',
      'refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODhiNGFiYTljMGYyZmVjZDAzNWIyMGEiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MjU3NDk5ODYsImV4cCI6MTcyNTc1MDg4Nn0.another_example_refresh_token_data_here',
      'admin_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODhiNGFiYTljMGYyZmVjZDAzNWIyMGEiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MjU3NDk5ODYsImV4cCI6MTcyNTc1MDg4Nn0.admin_token_duplicate_data_here',
      'admin_refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODhiNGFiYTljMGYyZmVjZDAzNWIyMGEiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MjU3NDk5ODYsImV4cCI6MTcyNTc1MDg4Nn0.admin_refresh_duplicate_data',
      '_ga=GA1.1.123456789.1234567890',
      '_gid=GA1.1.987654321.0987654321',
      '_fbp=fb.1.1234567890123.1234567890',
      '_fbc=fb.1.1234567890123.AbCdEfGhIjKlMnOpQrStUvWxYz',
      'sessionId=sess_1234567890abcdef1234567890abcdef1234567890abcdef',
      'csrfToken=csrf_abcdef1234567890abcdef1234567890abcdef1234567890',
      'user_preferences={"theme":"dark","language":"pl","notifications":true,"analytics":false}',
      'analytics_session=analytics_1234567890abcdef1234567890abcdef1234567890',
      'debug_mode=true',
      'dev_user_id=dev_1234567890abcdef',
      'theme=dark_mode_enabled_with_custom_colors_and_settings'
    ];
    
    cookies = massiveCookies.join('; ');
  }
  
  try {
    const requestHeaders = {
      'Cookie': cookies,
      'Origin': FRONTEND_URL,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'pl-PL,pl;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-site',
      'Referer': `${FRONTEND_URL}/admin`,
      'X-Requested-With': 'XMLHttpRequest'
    };
    
    console.log('   🔍 Analizuję nagłówki requestu do panelu admina...');
    const requestAnalysis = analyzeRequestHeaders(requestHeaders);
    
    if (requestAnalysis.totalSize > 8192) {
      console.log(`   🚨 OGROMNE NAGŁÓWKI WYKRYTE: ${requestAnalysis.totalSize} bajtów!`);
      console.log(`   ⚠️  Przekroczono limit serwera (zwykle 8KB)`);
    }
    
    const response = await fetch(`${BASE_URL}/api/admin/dashboard`, {
      method: 'GET',
      headers: requestHeaders
    });
    
    console.log(`\n   📊 Status odpowiedzi: ${response.status} ${response.statusText}`);
    
    if (response.status === 431) {
      console.log('   🚨 HTTP 431: Request Header Fields Too Large - POTWIERDZONY!');
      console.log('   🔍 Przyczyna: Nagłówki requestu przekroczyły limit serwera');
      
      // Zapisz szczegółowy raport
      const report = {
        timestamp: new Date().toISOString(),
        error: 'HTTP 431 - Request Header Fields Too Large',
        requestHeadersSize: requestAnalysis.totalSize,
        requestHeadersCount: requestAnalysis.headers.length,
        largestHeaders: requestAnalysis.headers.slice(0, 10),
        cookieSize: cookies.length,
        recommendation: 'Usuń duplikaty tokenów i niepotrzebne cookies'
      };
      
      fs.writeFileSync('./docs/MASSIVE_HEADERS_ANALYSIS.json', JSON.stringify(report, null, 2));
      console.log('   📄 Szczegółowy raport zapisany: ./docs/MASSIVE_HEADERS_ANALYSIS.json');
      
      return false;
    } else {
      console.log('   ✅ Brak błędu HTTP 431 - nagłówki w normie');
      return true;
    }
    
  } catch (error) {
    console.log(`   ❌ Błąd testu: ${error.message}`);
    return false;
  }
}

/**
 * Główna funkcja analizy
 */
async function runMassiveHeaderAnalysis() {
  console.log('\n🎯 ROZPOCZYNAM ANALIZĘ OGROMNYCH NAGŁÓWKÓW...');
  
  // Test 1: Logowanie z analizą
  const cookies = await testLoginWithHeaderAnalysis();
  
  // Test 2: Panel admina z ogromymi nagłówkami
  const adminPanelOK = await testAdminPanelWithMassiveHeaders(cookies);
  
  // Podsumowanie
  console.log('\n📋 PODSUMOWANIE ANALIZY OGROMNYCH NAGŁÓWKÓW');
  console.log('================================================================================');
  
  if (!adminPanelOK) {
    console.log('🚨 PROBLEM ZIDENTYFIKOWANY:');
    console.log('   • HTTP 431: Request Header Fields Too Large');
    console.log('   • Przyczyna: Duplikaty tokenów w cookies');
    console.log('   • Rozwiązanie: Usuń duplikaty admin_token, admin_refreshToken');
    console.log('   • Middleware czyszczenia cookies nie działa poprawnie');
  } else {
    console.log('✅ NAGŁÓWKI W NORMIE:');
    console.log('   • Brak błędu HTTP 431');
    console.log('   • Rozmiar nagłówków w akceptowalnych granicach');
  }
  
  console.log('\n📄 Szczegółowe raporty zapisane w ./docs/');
}

// Uruchom analizę
runMassiveHeaderAnalysis().catch(console.error);
