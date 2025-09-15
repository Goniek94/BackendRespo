/**
 * Debug JWT tokens - sprawdza co jest w tokenach
 */
import jwt from 'jsonwebtoken';

// Przykładowe tokeny z screenshota (skrócone dla bezpieczeństwa)
const exampleTokens = {
  // Te tokeny są z screenshota - bardzo długie!
  token: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...", // 231 znaków
  refreshToken: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..." // 322 znaki
};

function analyzeJWTSize() {
  console.log('🔍 Analiza rozmiaru tokenów JWT...\n');
  
  // Sprawdź typowe rozmiary tokenów
  console.log('📊 ROZMIARY TOKENÓW:');
  console.log(`Token: ${exampleTokens.token.length} znaków`);
  console.log(`RefreshToken: ${exampleTokens.refreshToken.length} znaków`);
  console.log(`Razem: ${exampleTokens.token.length + exampleTokens.refreshToken.length} znaków\n`);
  
  // Porównaj z normalnymi rozmiarami
  console.log('📏 PORÓWNANIE Z NORMALNYMI ROZMIARAMI:');
  console.log('✅ Normalny JWT (podstawowe dane): ~150-200 znaków');
  console.log('⚠️  Średni JWT (więcej danych): ~200-300 znaków');
  console.log('❌ Duży JWT (za dużo danych): >300 znaków');
  console.log(`🔥 TWOJE TOKENY: ${exampleTokens.token.length} + ${exampleTokens.refreshToken.length} = ${exampleTokens.token.length + exampleTokens.refreshToken.length} znaków - ZA DUŻE!\n`);
  
  // Sprawdź co może być w tokenach
  console.log('🤔 CO MOŻE BYĆ W TOKENACH:');
  console.log('- userId (ObjectId): ~24 znaki');
  console.log('- role: ~5-10 znaków');
  console.log('- email: ~20-50 znaków');
  console.log('- permissions: może być bardzo duże!');
  console.log('- userAgent: może być bardzo duże!');
  console.log('- ipAddress: ~15 znaków');
  console.log('- fingerprint: ~32 znaki');
  console.log('- inne metadane: ???\n');
  
  // Rekomendacje
  console.log('💡 REKOMENDACJE:');
  console.log('1. Usuń niepotrzebne dane z tokenów (email, userAgent, permissions)');
  console.log('2. Zostaw tylko: userId, role, type');
  console.log('3. Przenieś permissions do bazy danych');
  console.log('4. Usuń fingerprint z tokenów');
  console.log('5. Cel: token ~100-150 znaków, refreshToken ~100-150 znaków\n');
  
  // Sprawdź middleware auth
  console.log('🔧 SPRAWDŹ W KODZIE:');
  console.log('- middleware/auth.js → generateAccessToken()');
  console.log('- middleware/auth.js → generateRefreshToken()');
  console.log('- Usuń wszystko oprócz: userId, role, type');
}

// Funkcja do dekodowania JWT (bez weryfikacji)
function decodeJWTPayload(token) {
  try {
    // Dekoduj bez weryfikacji (tylko do analizy)
    const decoded = jwt.decode(token);
    return decoded;
  } catch (error) {
    return null;
  }
}

// Uruchom analizę
analyzeJWTSize();

// Jeśli masz prawdziwy token, możesz go zdekodować:
console.log('🔓 ABY ZDEKODOWAĆ PRAWDZIWY TOKEN:');
console.log('1. Skopiuj token z DevTools');
console.log('2. Wklej go tutaj i uruchom ponownie');
console.log('3. Zobaczysz co dokładnie jest w tokenie\n');

export { decodeJWTPayload };
