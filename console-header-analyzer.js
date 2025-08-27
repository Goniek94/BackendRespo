/**
 * Prosty analizator nagłówków - wypisuje wyniki bezpośrednio w konsoli
 * Symuluje różne scenariusze i pokazuje rozmiary nagłówków
 */

import { generateAccessToken, generateRefreshToken } from './middleware/auth.js';

console.log('\n🔍 === ANALIZA ROZMIARÓW NAGŁÓWKÓW HTTP ===\n');

// Symuluj dane użytkownika
const userData = {
  userId: '507f1f77bcf86cd799439011',
  role: 'admin',
  email: 'admin@example.com'
};

// Wygeneruj tokeny
console.log('🔧 Generowanie tokenów...');
const accessToken = generateAccessToken(userData);
const refreshToken = generateRefreshToken(userData);

console.log(`\n📊 ROZMIARY TOKENÓW:`);
console.log(`  Access Token: ${accessToken.length} znaków`);
console.log(`  Refresh Token: ${refreshToken.length} znaków`);
console.log(`  Razem: ${accessToken.length + refreshToken.length} znaków`);

// Symuluj nagłówki HTTP
console.log(`\n🌐 SYMULACJA NAGŁÓWKÓW HTTP:`);

const simulatedHeaders = {
  'Host': 'localhost:3000',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'pl-PL,pl;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Cache-Control': 'max-age=0',
  'Cookie': `token=${accessToken}; refreshToken=${refreshToken}; sessionId=sess_abc123; preferences={"theme":"dark","lang":"pl"}`
};

let totalSize = 0;
const headerSizes = [];

console.log('\n📋 SZCZEGÓŁOWA ANALIZA NAGŁÓWKÓW:');
Object.entries(simulatedHeaders).forEach(([key, value]) => {
  const headerString = `${key}: ${value}`;
  const size = headerString.length;
  totalSize += size;
  
  headerSizes.push({ key, size, value: value.substring(0, 100) + (value.length > 100 ? '...' : '') });
  
  console.log(`  ${key}: ${size} bajtów`);
  if (key === 'Cookie') {
    console.log(`    Wartość: ${value.substring(0, 150)}...`);
    
    // Analiza poszczególnych cookies
    const cookies = value.split('; ');
    console.log(`    Liczba cookies: ${cookies.length}`);
    cookies.forEach(cookie => {
      const [name, val] = cookie.split('=');
      console.log(`      ${name}: ${val ? val.length : 0} znaków`);
    });
  }
});

// Sortuj nagłówki według rozmiaru
headerSizes.sort((a, b) => b.size - a.size);

console.log(`\n📏 NAJWIĘKSZE NAGŁÓWKI (TOP 5):`);
headerSizes.slice(0, 5).forEach((header, index) => {
  console.log(`  ${index + 1}. ${header.key}: ${header.size} bajtów`);
});

console.log(`\n📊 PODSUMOWANIE:`);
console.log(`  Całkowity rozmiar nagłówków: ${totalSize} bajtów (${(totalSize/1024).toFixed(2)} KB)`);
console.log(`  Liczba nagłówków: ${Object.keys(simulatedHeaders).length}`);
console.log(`  Średni rozmiar nagłówka: ${Math.round(totalSize / Object.keys(simulatedHeaders).length)} bajtów`);

// Ostrzeżenia
if (totalSize > 8192) {
  console.log(`  ⚠️  OSTRZEŻENIE: Rozmiar nagłówków przekracza 8KB!`);
}
if (totalSize > 16384) {
  console.log(`  🚨 KRYTYCZNE: Rozmiar nagłówków przekracza 16KB - ryzyko HTTP 431!`);
}

// Symuluj duplikację cookies
console.log(`\n🔄 SYMULACJA DUPLIKACJI COOKIES:`);
const duplicatedCookies = [];
for (let i = 1; i <= 3; i++) {
  duplicatedCookies.push(`token_${i}=${accessToken}`);
  duplicatedCookies.push(`refreshToken_${i}=${refreshToken}`);
}

const duplicatedCookieHeader = `token=${accessToken}; refreshToken=${refreshToken}; ${duplicatedCookies.join('; ')}`;
const duplicatedSize = `Cookie: ${duplicatedCookieHeader}`.length;

console.log(`  Rozmiar nagłówka Cookie z duplikatami: ${duplicatedSize} bajtów (${(duplicatedSize/1024).toFixed(2)} KB)`);
console.log(`  Liczba cookies z duplikatami: ${duplicatedCookieHeader.split('; ').length}`);

if (duplicatedSize > 8192) {
  console.log(`  🚨 DUPLIKACJA POWODUJE PRZEKROCZENIE LIMITU!`);
}

// Analiza JWT tokenów
console.log(`\n🔐 ANALIZA JWT TOKENÓW:`);

function analyzeJWT(token, name) {
  const parts = token.split('.');
  if (parts.length === 3) {
    console.log(`  ${name}:`);
    console.log(`    Header: ${parts[0].length} znaków`);
    console.log(`    Payload: ${parts[1].length} znaków`);
    console.log(`    Signature: ${parts[2].length} znaków`);
    console.log(`    Całkowity rozmiar: ${token.length} znaków`);
    
    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      console.log(`    Payload zawiera:`, Object.keys(payload).join(', '));
    } catch (e) {
      console.log(`    Nie można zdekodować payload`);
    }
  }
}

analyzeJWT(accessToken, 'Access Token');
analyzeJWT(refreshToken, 'Refresh Token');

// Rekomendacje
console.log(`\n💡 REKOMENDACJE OPTYMALIZACJI:`);
console.log(`  1. Skróć payload JWT - usuń niepotrzebne pola`);
console.log(`  2. Użyj krótszych nazw pól w JWT`);
console.log(`  3. Zawsze czyść stare cookies przed ustawieniem nowych`);
console.log(`  4. Monitoruj rozmiar nagłówków Cookie`);
console.log(`  5. Rozważ użycie session storage zamiast dużych cookies`);

console.log(`\n✅ Analiza zakończona!\n`);
