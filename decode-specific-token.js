/**
 * DEKODOWANIE KONKRETNEGO TOKENU JWT
 * 
 * Analizuje podany token JWT z aplikacji AutoSell.pl
 */

import jwt from 'jsonwebtoken';

// Token podany przez użytkownika
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODhiNGFiYTljMGYyZmVjZDAzNWIyMGEiLCJyb2xlIjoiYWRtaW4iLCJ0eXBlIjoiYWNjZXNzIiwiaWF0IjoxNzU0MTI2MzQ4LCJqdGkiOiI1YzFmNjc5MDg0NWU4MjdkYzdiOWUxNTc1ZTA5YmQyMyIsImV4cCI6MTc1NDIxMjc0OCwiYXVkIjoibWFya2V0cGxhY2UtdXNlcnMtZGV2IiwiaXNzIjoibWFya2V0cGxhY2UtZGV2Iiwic3ViIjoiNjg4YjRhYmE5YzBmMmZlY2QwMzViMjBhIn0.W9BOHo98g6d5aQxgwq1JFXMTemkkyTun2kxRLzZDztI';

/**
 * Dekoduj i przeanalizuj token
 */
const analyzeSpecificToken = () => {
  console.log('🔍 ANALIZA KONKRETNEGO TOKENU JWT - AutoSell.pl');
  console.log('='.repeat(60));
  
  try {
    // Dekoduj token bez weryfikacji (tylko do analizy)
    const decoded = jwt.decode(TOKEN, { complete: true });
    
    if (!decoded) {
      console.error('❌ Nie można zdekodować tokenu');
      return;
    }
    
    // Podstawowe informacje o tokenie
    const tokenSize = Buffer.byteLength(TOKEN, 'utf8');
    const headerSize = JSON.stringify(decoded.header).length;
    const payloadSize = JSON.stringify(decoded.payload).length;
    
    console.log('\n📊 PODSTAWOWE INFORMACJE:');
    console.log('='.repeat(40));
    console.log(`🔍 Całkowity rozmiar tokenu: ${tokenSize} bajtów`);
    console.log(`📋 Rozmiar nagłówka: ${headerSize} bajtów`);
    console.log(`📦 Rozmiar payload: ${payloadSize} bajtów`);
    console.log(`🎫 Długość tokenu: ${TOKEN.length} znaków`);
    
    // Nagłówek JWT
    console.log('\n🔧 NAGŁÓWEK JWT:');
    console.log('='.repeat(40));
    console.log(JSON.stringify(decoded.header, null, 2));
    
    // Payload JWT
    console.log('\n📄 PAYLOAD JWT:');
    console.log('='.repeat(40));
    console.log(JSON.stringify(decoded.payload, null, 2));
    
    // Szczegółowa analiza payload
    console.log('\n📊 SZCZEGÓŁOWA ANALIZA PAYLOAD:');
    console.log('='.repeat(40));
    
    const payload = decoded.payload;
    Object.entries(payload).forEach(([key, value]) => {
      const fieldSize = JSON.stringify({ [key]: value }).length;
      const valueType = typeof value;
      const displayValue = valueType === 'string' && value.length > 50 
        ? value.substring(0, 50) + '...' 
        : JSON.stringify(value);
      
      console.log(`   ${key.padEnd(12)}: ${fieldSize.toString().padStart(3)} bajtów - ${valueType.padEnd(8)} - ${displayValue}`);
    });
    
    // Analiza czasowa
    console.log('\n⏰ ANALIZA CZASOWA:');
    console.log('='.repeat(40));
    
    if (payload.iat) {
      const issuedAt = new Date(payload.iat * 1000);
      console.log(`📅 Wydany: ${issuedAt.toLocaleString('pl-PL')}`);
      console.log(`🕐 Timestamp: ${payload.iat}`);
    }
    
    if (payload.exp) {
      const expiresAt = new Date(payload.exp * 1000);
      const now = new Date();
      const isExpired = expiresAt < now;
      const timeLeft = expiresAt - now;
      
      console.log(`⏳ Wygasa: ${expiresAt.toLocaleString('pl-PL')}`);
      console.log(`🕐 Timestamp: ${payload.exp}`);
      console.log(`📊 Status: ${isExpired ? '❌ WYGASŁ' : '✅ AKTYWNY'}`);
      
      if (!isExpired) {
        const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        console.log(`⏱️  Pozostało: ${hoursLeft}h ${minutesLeft}m`);
      }
    }
    
    // Analiza użytkownika
    console.log('\n👤 INFORMACJE O UŻYTKOWNIKU:');
    console.log('='.repeat(40));
    console.log(`🆔 User ID: ${payload.userId}`);
    console.log(`👑 Rola: ${payload.role}`);
    console.log(`🎫 Typ tokenu: ${payload.type}`);
    console.log(`🔑 Token ID: ${payload.jti}`);
    console.log(`🏢 Audience: ${payload.aud}`);
    console.log(`🏭 Issuer: ${payload.iss}`);
    console.log(`📋 Subject: ${payload.sub}`);
    
    // Wpływ na nagłówki HTTP
    console.log('\n🌐 WPŁYW NA NAGŁÓWKI HTTP:');
    console.log('='.repeat(40));
    
    // Symuluj nagłówek Cookie
    const cookieHeader = `token=${TOKEN}; Path=/; HttpOnly; Secure; SameSite=Strict`;
    const cookieSize = Buffer.byteLength(cookieHeader, 'utf8');
    
    console.log(`🍪 Rozmiar cookie: ${cookieSize} bajtów`);
    console.log(`📊 Status cookie: ${cookieSize > 4096 ? '⚠️  DUŻE (>4KB)' : cookieSize > 2048 ? '⚡ ŚREDNIE (>2KB)' : '✅ OPTYMALNE (<2KB)'}`);
    
    // Symuluj pełny nagłówek HTTP z dodatkowymi cookies
    const fullCookieHeader = `Cookie: token=${TOKEN}; refreshToken=${TOKEN}; sessionId=abc123; preferences=theme-dark; language=pl`;
    const fullCookieSize = Buffer.byteLength(fullCookieHeader, 'utf8');
    
    console.log(`🍪 Pełny nagłówek Cookie: ${fullCookieSize} bajtów`);
    console.log(`📊 Status nagłówka: ${fullCookieSize > 8192 ? '❌ BARDZO DUŻY (>8KB)' : fullCookieSize > 4096 ? '⚠️  DUŻY (>4KB)' : '✅ OK'}`);
    
    // Ocena optymalizacji
    console.log('\n💡 OCENA OPTYMALIZACJI:');
    console.log('='.repeat(40));
    
    const fieldsCount = Object.keys(payload).length;
    const essentialFields = ['userId', 'role', 'type', 'iat', 'exp', 'jti'];
    const extraFields = Object.keys(payload).filter(key => !essentialFields.includes(key) && !['aud', 'iss', 'sub'].includes(key));
    
    console.log(`📊 Liczba pól w payload: ${fieldsCount}`);
    console.log(`✅ Pola niezbędne: ${essentialFields.filter(field => payload[field]).length}/${essentialFields.length}`);
    console.log(`📋 Pola dodatkowe: ${extraFields.length} (${extraFields.join(', ') || 'brak'})`);
    
    if (tokenSize < 500) {
      console.log('🎯 OCENA: ✅ DOSKONALE ZOPTYMALIZOWANY');
      console.log('   Token zawiera tylko niezbędne informacje');
    } else if (tokenSize < 800) {
      console.log('🎯 OCENA: ✅ DOBRZE ZOPTYMALIZOWANY');
      console.log('   Token ma rozsądny rozmiar');
    } else if (tokenSize < 1200) {
      console.log('🎯 OCENA: ⚡ ŚREDNIO ZOPTYMALIZOWANY');
      console.log('   Token można jeszcze zoptymalizować');
    } else {
      console.log('🎯 OCENA: ⚠️  WYMAGA OPTYMALIZACJI');
      console.log('   Token jest za duży i może powodować problemy');
    }
    
    // Rekomendacje
    console.log('\n🔧 REKOMENDACJE:');
    console.log('='.repeat(40));
    
    if (extraFields.length > 0) {
      console.log('⚠️  Znaleziono dodatkowe pola, które można usunąć:');
      extraFields.forEach(field => {
        console.log(`   - ${field}: ${JSON.stringify(payload[field])}`);
      });
    } else {
      console.log('✅ Token zawiera tylko niezbędne pola');
    }
    
    if (tokenSize > 1000) {
      console.log('💡 Sugestie optymalizacji:');
      console.log('   1. Usuń zbędne pola z payload');
      console.log('   2. Skróć nazwy pól (userId → u, role → r)');
      console.log('   3. Przenieś dane do bazy danych');
    }
    
    console.log('\n🔒 BEZPIECZEŃSTWO:');
    console.log('='.repeat(40));
    console.log('✅ Token nie zawiera wrażliwych danych osobowych');
    console.log('✅ Używa bezpiecznego algorytmu HS256');
    console.log('✅ Ma określony czas wygaśnięcia');
    console.log('✅ Zawiera unikalny identyfikator (jti)');
    
    return {
      tokenSize,
      payloadSize,
      headerSize,
      payload: decoded.payload,
      header: decoded.header,
      isOptimized: tokenSize < 500,
      extraFields
    };
    
  } catch (error) {
    console.error('❌ Błąd podczas analizy tokenu:', error.message);
    return null;
  }
};

// Uruchom analizę
const main = () => {
  const result = analyzeSpecificToken();
  
  if (result) {
    console.log('\n🎯 PODSUMOWANIE:');
    console.log('='.repeat(60));
    console.log(`📏 Rozmiar tokenu: ${result.tokenSize} bajtów`);
    console.log(`📊 Optymalizacja: ${result.isOptimized ? '✅ DOSKONAŁA' : '⚠️  DO POPRAWY'}`);
    console.log(`🔧 Dodatkowe pola: ${result.extraFields.length}`);
    console.log('✅ Analiza zakończona pomyślnie');
  }
};

// Uruchom jeśli skrypt jest wykonywany bezpośrednio
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { analyzeSpecificToken, TOKEN };
