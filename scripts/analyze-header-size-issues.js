/**
 * SKRYPT DO ANALIZY PROBLEMÓW Z ROZMIAREM NAGŁÓWKÓW HTTP
 * 
 * Analizuje:
 * - Rozmiary nagłówków w żądaniach HTTP
 * - Źródła dużych nagłówków (cookies, custom headers)
 * - Limity serwera dla nagłówków
 * - Problemy z tokenami JWT w cookies
 */

import axios from 'axios';
import jwt from 'jsonwebtoken';
import fs from 'fs';

const API_BASE = 'http://localhost:5000';

// Funkcja do obliczania rozmiaru nagłówków
const calculateHeaderSize = (headers) => {
  let totalSize = 0;
  const headerDetails = {};
  
  for (const [key, value] of Object.entries(headers)) {
    const headerSize = `${key}: ${value}\r\n`.length;
    totalSize += headerSize;
    headerDetails[key] = {
      value: typeof value === 'string' ? value.substring(0, 100) + (value.length > 100 ? '...' : '') : value,
      size: headerSize,
      fullSize: `${key}: ${value}\r\n`.length
    };
  }
  
  return { totalSize, headerDetails };
};

// Funkcja do tworzenia testowego tokena o różnych rozmiarach
const createTestToken = (payloadSize = 'small') => {
  let payload;
  
  switch (payloadSize) {
    case 'small':
      payload = { u: '507f1f77bcf86cd799439011', j: 'abc123' };
      break;
    case 'medium':
      payload = {
        u: '507f1f77bcf86cd799439011',
        r: 'user',
        j: 'abc123def456ghi789',
        permissions: ['read', 'write'],
        metadata: { lastLogin: Date.now(), ip: '127.0.0.1' }
      };
      break;
    case 'large':
      payload = {
        u: '507f1f77bcf86cd799439011',
        r: 'admin',
        j: 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567',
        permissions: ['read', 'write', 'delete', 'admin', 'moderate', 'manage_users', 'manage_content'],
        metadata: {
          lastLogin: Date.now(),
          ip: '127.0.0.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          sessionId: 'sess_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567',
          preferences: {
            theme: 'dark',
            language: 'pl',
            notifications: true,
            privacy: { analytics: false, marketing: false }
          }
        },
        history: Array(10).fill(0).map((_, i) => ({ action: `action_${i}`, timestamp: Date.now() - i * 1000 }))
      };
      break;
    case 'huge':
      // Bardzo duży payload
      const hugeData = Array(100).fill(0).map((_, i) => `data_item_${i}_with_long_description_and_metadata`);
      payload = {
        u: '507f1f77bcf86cd799439011',
        r: 'admin',
        j: 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890',
        permissions: Array(20).fill(0).map((_, i) => `permission_${i}_with_detailed_description`),
        metadata: {
          lastLogin: Date.now(),
          ip: '127.0.0.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          sessionId: 'sess_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890abcdef',
          preferences: {
            theme: 'dark',
            language: 'pl',
            notifications: true,
            privacy: { analytics: false, marketing: false, cookies: true, tracking: false }
          },
          settings: {
            dashboard: { layout: 'grid', itemsPerPage: 50, sortBy: 'date' },
            profile: { visibility: 'public', showEmail: false, showPhone: true }
          }
        },
        history: Array(50).fill(0).map((_, i) => ({ 
          action: `detailed_action_${i}_with_comprehensive_metadata_and_description`, 
          timestamp: Date.now() - i * 1000,
          details: `Additional details for action ${i} with more information`
        })),
        data: hugeData
      };
      break;
  }
  
  try {
    return jwt.sign(payload, 'test-secret', { expiresIn: '1h' });
  } catch (error) {
    console.error(`Błąd tworzenia tokena ${payloadSize}:`, error.message);
    return null;
  }
};

// Test różnych rozmiarów nagłówków
const testHeaderSizes = async () => {
  console.log('🔍 ANALIZA ROZMIARÓW NAGŁÓWKÓW HTTP\n');
  
  const testCases = [
    { name: 'Bez cookies', cookies: '' },
    { name: 'Mały token', cookies: `token=${createTestToken('small')}` },
    { name: 'Średni token', cookies: `token=${createTestToken('medium')}` },
    { name: 'Duży token', cookies: `token=${createTestToken('large')}` },
    { name: 'Ogromny token', cookies: `token=${createTestToken('huge')}` },
    { name: 'Podwójne tokeny', cookies: `token=${createTestToken('large')}; refreshToken=${createTestToken('large')}` },
    { name: 'Wszystkie cookies', cookies: `token=${createTestToken('large')}; refreshToken=${createTestToken('large')}; admin_token=${createTestToken('medium')}; sessionId=sess123; csrfToken=csrf456` }
  ];
  
  for (const testCase of testCases) {
    console.log(`📊 Test: ${testCase.name}`);
    
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'pl-PL,pl;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin'
    };
    
    if (testCase.cookies) {
      headers['Cookie'] = testCase.cookies;
    }
    
    const { totalSize, headerDetails } = calculateHeaderSize(headers);
    
    console.log(`   📏 Całkowity rozmiar nagłówków: ${totalSize} bajtów`);
    
    // Sprawdź limity
    const limits = [
      { name: '8KB (typowy limit)', value: 8192, status: totalSize <= 8192 ? '✅' : '❌' },
      { name: '16KB (wyższy limit)', value: 16384, status: totalSize <= 16384 ? '✅' : '❌' },
      { name: '32KB (bardzo wysoki)', value: 32768, status: totalSize <= 32768 ? '✅' : '❌' }
    ];
    
    limits.forEach(limit => {
      console.log(`   ${limit.status} ${limit.name}: ${limit.value}B`);
    });
    
    // Pokaż największe nagłówki
    const sortedHeaders = Object.entries(headerDetails)
      .sort(([,a], [,b]) => b.size - a.size)
      .slice(0, 3);
    
    console.log('   🔝 Największe nagłówki:');
    sortedHeaders.forEach(([key, details]) => {
      console.log(`      ${key}: ${details.size}B - ${details.value}`);
    });
    
    // Test rzeczywistego żądania
    try {
      const response = await axios.get(`${API_BASE}/api/health`, {
        headers,
        timeout: 5000,
        validateStatus: () => true // Akceptuj wszystkie statusy
      });
      
      console.log(`   🌐 Status odpowiedzi: ${response.status}`);
      if (response.status === 431) {
        console.log('   🚨 BŁĄD 431: Request Header Fields Too Large!');
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('   ⚠️  Serwer nie działa - nie można przetestować');
      } else {
        console.log(`   ❌ Błąd żądania: ${error.message}`);
      }
    }
    
    console.log('');
  }
};

// Analiza aktualnych cookies w przeglądarce
const analyzeBrowserCookies = () => {
  console.log('🍪 ANALIZA COOKIES Z PRZEGLĄDARKI\n');
  
  // Symulacja cookies z przeglądarki (na podstawie screenshota)
  const browserCookies = [
    'token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',  // Przykładowy długi token
    'refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    'sessionId=sess_1234567890abcdef',
    'csrfToken=csrf_abcdef1234567890',
    '_ga=GA1.1.123456789.1234567890',
    '_gid=GA1.1.987654321.0987654321'
  ];
  
  let totalCookieSize = 0;
  
  console.log('📋 Analiza poszczególnych cookies:');
  browserCookies.forEach(cookie => {
    const size = cookie.length;
    totalCookieSize += size;
    const [name, value] = cookie.split('=');
    const displayValue = value && value.length > 50 ? value.substring(0, 50) + '...' : value;
    console.log(`   ${name}: ${size}B - ${displayValue}`);
  });
  
  const cookieHeader = `Cookie: ${browserCookies.join('; ')}`;
  const cookieHeaderSize = cookieHeader.length;
  
  console.log(`\n📊 Podsumowanie cookies:`);
  console.log(`   Łączny rozmiar cookies: ${totalCookieSize}B`);
  console.log(`   Rozmiar nagłówka Cookie: ${cookieHeaderSize}B`);
  
  // Sprawdź limity dla samych cookies
  if (cookieHeaderSize > 4096) {
    console.log('   🚨 PROBLEM: Nagłówek Cookie przekracza 4KB!');
  } else if (cookieHeaderSize > 2048) {
    console.log('   ⚠️  OSTRZEŻENIE: Nagłówek Cookie przekracza 2KB');
  } else {
    console.log('   ✅ Rozmiar nagłówka Cookie w normie');
  }
};

// Rekomendacje naprawy
const showRecommendations = () => {
  console.log('💡 REKOMENDACJE NAPRAWY PROBLEMÓW Z NAGŁÓWKAMI\n');
  
  console.log('🔧 1. OPTYMALIZACJA TOKENÓW JWT:');
  console.log('   • Użyj minimalnych payload w tokenach');
  console.log('   • Usuń niepotrzebne pola (metadata, history)');
  console.log('   • Skróć nazwy pól (userId → u, role → r)');
  console.log('   • Przenieś duże dane do bazy danych');
  
  console.log('\n🍪 2. OPTYMALIZACJA COOKIES:');
  console.log('   • Usuń niepotrzebne cookies');
  console.log('   • Skróć nazwy cookies (token → t, refreshToken → rt)');
  console.log('   • Podziel duże tokeny na mniejsze części');
  console.log('   • Użyj session storage zamiast cookies dla dużych danych');
  
  console.log('\n⚙️ 3. KONFIGURACJA SERWERA:');
  console.log('   • Zwiększ limit nagłówków w Express/Node.js');
  console.log('   • Skonfiguruj nginx/Apache dla większych nagłówków');
  console.log('   • Dodaj middleware do monitorowania rozmiaru nagłówków');
  
  console.log('\n🔄 4. ALTERNATYWNE ROZWIĄZANIA:');
  console.log('   • Użyj Authorization: Bearer zamiast cookies');
  console.log('   • Implementuj token refresh w localStorage');
  console.log('   • Przenieś autoryzację do body żądania');
};

// Główna funkcja
const main = async () => {
  console.log('🚀 URUCHAMIANIE ANALIZY PROBLEMÓW Z NAGŁÓWKAMI HTTP\n');
  
  await testHeaderSizes();
  analyzeBrowserCookies();
  showRecommendations();
  
  console.log('\n✅ ANALIZA ZAKOŃCZONA');
  console.log('📄 Sprawdź logi serwera i konfigurację limitów nagłówków');
};

// Uruchom analizę
main().catch(error => {
  console.error('❌ Błąd podczas analizy:', error.message);
});
