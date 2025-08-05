/**
 * ANALIZA ZAWARTOŚCI TOKENÓW JWT
 * 
 * Ten skrypt analizuje jakie dane zawierają tokeny JWT w aplikacji AutoSell.pl
 * i jak wpływają na rozmiar nagłówków HTTP
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Załaduj zmienne środowiskowe
dotenv.config();

// Konfiguracja JWT (z pliku konfiguracyjnego)
const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'fallback-secret-key',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  algorithm: 'HS256',
  audience: 'autosell-users',
  issuer: 'autosell-api'
};

/**
 * Generuj przykładowy token z różnymi payload'ami
 */
const generateSampleToken = (payload, type = 'access') => {
  const tokenId = crypto.randomBytes(16).toString('hex');
  const currentTime = Math.floor(Date.now() / 1000);
  
  const fullPayload = {
    ...payload,
    type,
    iat: currentTime,
    jti: tokenId
  };
  
  const secret = type === 'refresh' ? JWT_CONFIG.refreshSecret : JWT_CONFIG.secret;
  const expiry = type === 'refresh' ? JWT_CONFIG.refreshTokenExpiry : JWT_CONFIG.accessTokenExpiry;
  
  return jwt.sign(
    fullPayload,
    secret,
    {
      expiresIn: expiry,
      algorithm: JWT_CONFIG.algorithm,
      audience: JWT_CONFIG.audience,
      issuer: JWT_CONFIG.issuer,
      subject: payload.userId?.toString() || 'unknown'
    }
  );
};

/**
 * Dekoduj token i pokaż jego zawartość
 */
const analyzeToken = (token, label) => {
  try {
    // Dekoduj bez weryfikacji (tylko do analizy)
    const decoded = jwt.decode(token, { complete: true });
    
    const tokenSize = Buffer.byteLength(token, 'utf8');
    const headerSize = JSON.stringify(decoded.header).length;
    const payloadSize = JSON.stringify(decoded.payload).length;
    
    console.log(`\n📊 ANALIZA TOKENU: ${label}`);
    console.log('='.repeat(50));
    console.log(`🔍 Rozmiar tokenu: ${tokenSize} bajtów`);
    console.log(`📋 Rozmiar nagłówka: ${headerSize} bajtów`);
    console.log(`📦 Rozmiar payload: ${payloadSize} bajtów`);
    
    console.log('\n🔧 NAGŁÓWEK JWT:');
    console.log(JSON.stringify(decoded.header, null, 2));
    
    console.log('\n📄 PAYLOAD JWT:');
    console.log(JSON.stringify(decoded.payload, null, 2));
    
    // Analiza poszczególnych pól payload
    console.log('\n📊 SZCZEGÓŁY PAYLOAD:');
    Object.entries(decoded.payload).forEach(([key, value]) => {
      const fieldSize = JSON.stringify({ [key]: value }).length;
      console.log(`   ${key}: ${fieldSize} bajtów - ${typeof value} - ${JSON.stringify(value)}`);
    });
    
    return {
      label,
      tokenSize,
      headerSize,
      payloadSize,
      payload: decoded.payload,
      token: token.substring(0, 50) + '...' // Tylko początek dla bezpieczeństwa
    };
    
  } catch (error) {
    console.error(`❌ Błąd analizy tokenu ${label}:`, error.message);
    return null;
  }
};

/**
 * Symuluj różne scenariusze payload'ów
 */
const runTokenAnalysis = () => {
  console.log('🔍 ANALIZA ZAWARTOŚCI TOKENÓW JWT - AutoSell.pl');
  console.log('='.repeat(60));
  
  const results = [];
  
  // 1. AKTUALNY ZOPTYMALIZOWANY TOKEN (po naprawach)
  console.log('\n🎯 SCENARIUSZ 1: AKTUALNY ZOPTYMALIZOWANY TOKEN');
  const optimizedPayload = {
    userId: '507f1f77bcf86cd799439011', // ObjectId MongoDB
    role: 'user'
  };
  
  const optimizedToken = generateSampleToken(optimizedPayload, 'access');
  const optimizedAnalysis = analyzeToken(optimizedToken, 'Zoptymalizowany (AKTUALNY)');
  if (optimizedAnalysis) results.push(optimizedAnalysis);
  
  // 2. STARY TOKEN Z DUŻĄ ILOŚCIĄ DANYCH (przed naprawami)
  console.log('\n⚠️  SCENARIUSZ 2: STARY TOKEN Z DUŻYMI DANYMI');
  const bloatedPayload = {
    userId: '507f1f77bcf86cd799439011',
    email: 'jan.kowalski@example.com',
    name: 'Jan',
    lastName: 'Kowalski',
    role: 'user',
    phoneNumber: '+48123456789',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ipAddress: '192.168.1.100',
    fingerprint: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
    lastActivity: new Date().toISOString(),
    permissions: ['read', 'write', 'delete'],
    preferences: {
      language: 'pl',
      theme: 'dark',
      notifications: true,
      emailAlerts: true
    },
    sessionData: {
      loginTime: new Date().toISOString(),
      deviceInfo: 'Windows 10, Chrome 120',
      location: 'Warsaw, Poland'
    }
  };
  
  const bloatedToken = generateSampleToken(bloatedPayload, 'access');
  const bloatedAnalysis = analyzeToken(bloatedToken, 'Stary z dużymi danymi');
  if (bloatedAnalysis) results.push(bloatedAnalysis);
  
  // 3. TOKEN REFRESH (zwykle większy)
  console.log('\n🔄 SCENARIUSZ 3: TOKEN REFRESH');
  const refreshToken = generateSampleToken(optimizedPayload, 'refresh');
  const refreshAnalysis = analyzeToken(refreshToken, 'Refresh Token');
  if (refreshAnalysis) results.push(refreshAnalysis);
  
  // 4. TOKEN ADMINISTRATORA
  console.log('\n👑 SCENARIUSZ 4: TOKEN ADMINISTRATORA');
  const adminPayload = {
    userId: '507f1f77bcf86cd799439012',
    role: 'admin'
  };
  
  const adminToken = generateSampleToken(adminPayload, 'access');
  const adminAnalysis = analyzeToken(adminToken, 'Administrator');
  if (adminAnalysis) results.push(adminAnalysis);
  
  // 5. PORÓWNANIE ROZMIARÓW
  console.log('\n📊 PORÓWNANIE ROZMIARÓW TOKENÓW');
  console.log('='.repeat(60));
  
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.label}:`);
    console.log(`   📏 Całkowity rozmiar: ${result.tokenSize} bajtów`);
    console.log(`   📦 Payload: ${result.payloadSize} bajtów`);
    console.log(`   🔧 Nagłówek: ${result.headerSize} bajtów`);
    console.log('');
  });
  
  // 6. WPŁYW NA NAGŁÓWKI HTTP
  console.log('\n🌐 WPŁYW NA NAGŁÓWKI HTTP');
  console.log('='.repeat(60));
  
  results.forEach((result) => {
    // Symuluj nagłówek Cookie z tokenem
    const cookieHeader = `token=${result.token}; refreshToken=${result.token}; Path=/; HttpOnly; Secure; SameSite=Strict`;
    const cookieSize = Buffer.byteLength(cookieHeader, 'utf8');
    
    console.log(`🍪 ${result.label}:`);
    console.log(`   Cookie header: ~${cookieSize} bajtów`);
    console.log(`   Wpływ na limit 431: ${cookieSize > 4096 ? '❌ PRZEKRACZA 4KB' : '✅ OK'}`);
    console.log('');
  });
  
  // 7. REKOMENDACJE
  console.log('\n💡 REKOMENDACJE OPTYMALIZACJI');
  console.log('='.repeat(60));
  
  const optimizedSize = results.find(r => r.label.includes('AKTUALNY'))?.tokenSize || 0;
  const bloatedSize = results.find(r => r.label.includes('dużymi danymi'))?.tokenSize || 0;
  
  if (bloatedSize > 0 && optimizedSize > 0) {
    const reduction = ((bloatedSize - optimizedSize) / bloatedSize * 100).toFixed(1);
    console.log(`✅ Redukcja rozmiaru tokenu: ${reduction}% (${bloatedSize} → ${optimizedSize} bajtów)`);
  }
  
  console.log('\n🎯 NAJLEPSZE PRAKTYKI:');
  console.log('1. ✅ Przechowuj tylko userId i role w tokenie');
  console.log('2. ✅ Usuń email, userAgent, ipAddress z payload');
  console.log('3. ✅ Przenieś dane sesji do bazy danych');
  console.log('4. ✅ Używaj krótkich nazw pól (u zamiast userId)');
  console.log('5. ✅ Unikaj zagnieżdżonych obiektów w payload');
  console.log('6. ✅ Regularnie rotuj tokeny (krótszy czas życia)');
  
  console.log('\n🔒 BEZPIECZEŃSTWO:');
  console.log('1. ✅ Mniejszy payload = mniejsze ryzyko wycieku danych');
  console.log('2. ✅ Dane wrażliwe w bazie, nie w tokenie');
  console.log('3. ✅ Fingerprinting na poziomie middleware, nie tokenu');
  console.log('4. ✅ Session tracking w bazie danych');
  
  return results;
};

/**
 * Testuj różne długości payload'ów
 */
const testPayloadSizes = () => {
  console.log('\n🧪 TEST RÓŻNYCH ROZMIARÓW PAYLOAD');
  console.log('='.repeat(60));
  
  const testCases = [
    { name: 'Minimalny', data: { u: '507f1f77bcf86cd799439011', r: 'user' } },
    { name: 'Podstawowy', data: { userId: '507f1f77bcf86cd799439011', role: 'user' } },
    { name: 'Rozszerzony', data: { userId: '507f1f77bcf86cd799439011', role: 'user', email: 'user@example.com' } },
    { name: 'Duży', data: { 
      userId: '507f1f77bcf86cd799439011', 
      role: 'user', 
      email: 'user@example.com',
      name: 'Jan Kowalski',
      permissions: ['read', 'write']
    }},
    { name: 'Bardzo duży', data: {
      userId: '507f1f77bcf86cd799439011',
      email: 'jan.kowalski.bardzo.dlugi.email@example-domain.com',
      role: 'user',
      name: 'Jan',
      lastName: 'Kowalski-Nowak',
      permissions: ['read', 'write', 'delete', 'admin', 'moderate'],
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      preferences: { lang: 'pl', theme: 'dark', notifications: true }
    }}
  ];
  
  testCases.forEach((testCase, index) => {
    const token = generateSampleToken(testCase.data);
    const tokenSize = Buffer.byteLength(token, 'utf8');
    const payloadSize = JSON.stringify(testCase.data).length;
    
    console.log(`${index + 1}. ${testCase.name}:`);
    console.log(`   📦 Payload: ${payloadSize} bajtów`);
    console.log(`   🎫 Token: ${tokenSize} bajtów`);
    console.log(`   🍪 W cookie: ~${tokenSize + 50} bajtów`);
    console.log(`   📊 Status: ${tokenSize > 1000 ? '⚠️  Duży' : tokenSize > 500 ? '⚡ Średni' : '✅ Optymalny'}`);
    console.log('');
  });
};

// Uruchom analizę
const main = () => {
  try {
    const results = runTokenAnalysis();
    testPayloadSizes();
    
    console.log('\n🎯 PODSUMOWANIE');
    console.log('='.repeat(60));
    console.log('✅ Analiza tokenów JWT zakończona');
    console.log('✅ Zidentyfikowano możliwości optymalizacji');
    console.log('✅ Wygenerowano rekomendacje bezpieczeństwa');
    
    return results;
  } catch (error) {
    console.error('❌ Błąd podczas analizy:', error);
    process.exit(1);
  }
};

// Uruchom jeśli skrypt jest wykonywany bezpośrednio
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { runTokenAnalysis, testPayloadSizes, analyzeToken, generateSampleToken };
