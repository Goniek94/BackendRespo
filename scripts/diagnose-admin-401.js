/**
 * DIAGNOZA BŁĘDU 401 W PANELU ADMIN
 * Sprawdza dlaczego panel admin zwraca 401 mimo prawidłowego tokena
 */

import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

console.log('🔍 DIAGNOZA BŁĘDU 401 W PANELU ADMIN');
console.log('=====================================\n');

// Test tokena z poprzedniej analizy
const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1IjoiNjg4YjRhYmE5YzBmMmZlY2QwMzViMjBhIiwiaiI6IjQyMzlhZDFiIiwiaWF0IjoxNzU3MTg3ODMwLCJleHAiOjE3NTcxODgwMTB9.example';

console.log('1. SPRAWDZENIE KONFIGURACJI JWT:');
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length || 0);
console.log('JWT_REFRESH_SECRET exists:', !!process.env.JWT_REFRESH_SECRET);
console.log();

console.log('2. ANALIZA STRUKTURY TOKENA:');
try {
  // Dekoduj bez weryfikacji żeby zobaczyć strukturę
  const decoded = jwt.decode(testToken);
  console.log('Token payload:', JSON.stringify(decoded, null, 2));
  console.log('Token ma pole "u" (userId):', !!decoded?.u);
  console.log('Token ma pole "j" (sessionId):', !!decoded?.j);
  console.log('Token expiry:', new Date(decoded?.exp * 1000));
  console.log('Current time:', new Date());
  console.log('Token expired:', decoded?.exp * 1000 < Date.now());
} catch (error) {
  console.log('Błąd dekodowania tokena:', error.message);
}
console.log();

console.log('3. SPRAWDZENIE MIDDLEWARE ADMIN AUTH:');
console.log('Middleware szuka tokena w:');
console.log('- req.cookies.token (główne)');
console.log('- Authorization: Bearer header (fallback)');
console.log();

console.log('4. MOŻLIWE PRZYCZYNY BŁĘDU 401:');
console.log('a) Token wygasł (exp < current time)');
console.log('b) Token jest na blackliście');
console.log('c) Użytkownik nie ma roli admin/moderator');
console.log('d) Konto użytkownika jest zablokowane');
console.log('e) Błąd w walidacji JWT_SECRET');
console.log();

console.log('5. REKOMENDACJE:');
console.log('- Sprawdź czy token nie wygasł');
console.log('- Sprawdź czy użytkownik ma rolę admin');
console.log('- Sprawdź czy JWT_SECRET jest prawidłowy');
console.log('- Sprawdź logi serwera dla szczegółów błędu');
