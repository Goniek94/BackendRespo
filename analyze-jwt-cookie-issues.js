/**
 * ANALIZA PROBLEMÓW JWT I CIASTECZEK
 * 
 * Skrypt do identyfikacji konkretnych problemów z JWT i ciasteczkami
 * zgodnie z wiadomością użytkownika o 2 problemach JWT i 6 problemach z ciasteczkami
 */

import fs from 'fs';
import path from 'path';

console.log('🔐 ANALIZA PROBLEMÓW JWT I CIASTECZEK');
console.log('=====================================\n');

// Funkcja do analizy pliku
function analyzeFile(filePath, content) {
  const issues = {
    jwt: [],
    cookies: []
  };

  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmedLine = line.trim();
    
    // Analiza problemów JWT
    
    // 1. JWT Problem: Zbyt duże payload (zawiera niepotrzebne dane)
    if (trimmedLine.includes('jwt.sign') && (
        trimmedLine.includes('email') || 
        trimmedLine.includes('userAgent') || 
        trimmedLine.includes('ipAddress') ||
        trimmedLine.includes('fingerprint') ||
        trimmedLine.includes('lastActivity')
    )) {
      issues.jwt.push({
        type: 'LARGE_PAYLOAD',
        severity: 'MEDIUM',
        line: lineNumber,
        content: trimmedLine,
        description: 'JWT payload zawiera niepotrzebne dane zwiększające rozmiar tokena',
        recommendation: 'Usuń niepotrzebne dane z payload JWT - zostaw tylko userId, role, type, iat, jti'
      });
    }
    
    // 2. JWT Problem: Długie czasy wygaśnięcia
    if (trimmedLine.includes('expiresIn') && (
        trimmedLine.includes('24h') || 
        trimmedLine.includes('30d') ||
        trimmedLine.includes('7d')
    )) {
      issues.jwt.push({
        type: 'LONG_EXPIRATION',
        severity: 'MEDIUM',
        line: lineNumber,
        content: trimmedLine,
        description: 'JWT token ma zbyt długi czas wygaśnięcia',
        recommendation: 'Użyj krótszych czasów: 15-60 minut dla access token, max 7 dni dla refresh token'
      });
    }
    
    // Analiza problemów z ciasteczkami
    
    // 1. Cookie Problem: Brak SameSite
    if (trimmedLine.includes('res.cookie') && !trimmedLine.includes('sameSite')) {
      issues.cookies.push({
        type: 'MISSING_SAMESITE',
        severity: 'MEDIUM',
        line: lineNumber,
        content: trimmedLine,
        description: 'Ciasteczko nie ma ustawionego atrybutu SameSite',
        recommendation: 'Dodaj sameSite: "strict" lub "lax" dla ochrony przed CSRF'
      });
    }
    
    // 2. Cookie Problem: Brak Secure w produkcji
    if (trimmedLine.includes('res.cookie') && trimmedLine.includes('secure: false')) {
      issues.cookies.push({
        type: 'INSECURE_COOKIE',
        severity: 'HIGH',
        line: lineNumber,
        content: trimmedLine,
        description: 'Ciasteczko ma wymuszone secure: false',
        recommendation: 'Użyj secure: process.env.NODE_ENV === "production"'
      });
    }
    
    // 3. Cookie Problem: Zbyt długi maxAge
    if (trimmedLine.includes('maxAge') && (
        trimmedLine.includes('24 * 60 * 60 * 1000') ||
        trimmedLine.includes('7 * 24 * 60 * 60 * 1000')
    )) {
      issues.cookies.push({
        type: 'LONG_MAX_AGE',
        severity: 'MEDIUM',
        line: lineNumber,
        content: trimmedLine,
        description: 'Ciasteczko ma zbyt długi czas życia',
        recommendation: 'Użyj krótszych czasów życia dla ciasteczek z tokenami (15-60 minut)'
      });
    }
    
    // 4. Cookie Problem: Brak HttpOnly
    if (trimmedLine.includes('res.cookie') && !trimmedLine.includes('httpOnly')) {
      issues.cookies.push({
        type: 'MISSING_HTTPONLY',
        severity: 'HIGH',
        line: lineNumber,
        content: trimmedLine,
        description: 'Ciasteczko nie ma ustawionego HttpOnly',
        recommendation: 'Dodaj httpOnly: true dla ochrony przed XSS'
      });
    }
    
    // 5. Cookie Problem: Zbyt szeroka ścieżka
    if (trimmedLine.includes('path: "/"') && trimmedLine.includes('token')) {
      issues.cookies.push({
        type: 'BROAD_PATH',
        severity: 'LOW',
        line: lineNumber,
        content: trimmedLine,
        description: 'Ciasteczko z tokenem ma zbyt szeroką ścieżkę',
        recommendation: 'Rozważ ograniczenie ścieżki do konkretnych endpointów'
      });
    }
    
    // 6. Cookie Problem: Brak domeny w produkcji
    if (trimmedLine.includes('domain: undefined') || 
        (trimmedLine.includes('res.cookie') && !trimmedLine.includes('domain'))) {
      issues.cookies.push({
        type: 'MISSING_DOMAIN',
        severity: 'LOW',
        line: lineNumber,
        content: trimmedLine,
        description: 'Ciasteczko nie ma określonej domeny',
        recommendation: 'Ustaw konkretną domenę w produkcji dla lepszego bezpieczeństwa'
      });
    }
  });
  
  return issues;
}

// Pliki do analizy
const filesToAnalyze = [
  'controllers/user/authController.js',
  'middleware/auth.js',
  'config/environments/development.js',
  'config/environments/production.js',
  'admin/controllers/auth/authController.js',
  'admin/middleware/adminAuth.js'
];

let totalJwtIssues = 0;
let totalCookieIssues = 0;

console.log('🔍 Analizuję pliki...\n');

filesToAnalyze.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    console.log(`📁 Analizuję: ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf8');
    const issues = analyzeFile(filePath, content);
    
    if (issues.jwt.length > 0) {
      console.log(`\n🔐 Problemy JWT w ${filePath}:`);
      issues.jwt.forEach((issue, index) => {
        console.log(`   ${index + 1}. [${issue.severity}] ${issue.type} (linia ${issue.line})`);
        console.log(`      Problem: ${issue.description}`);
        console.log(`      Kod: ${issue.content.substring(0, 80)}...`);
        console.log(`      Rozwiązanie: ${issue.recommendation}\n`);
        totalJwtIssues++;
      });
    }
    
    if (issues.cookies.length > 0) {
      console.log(`\n🍪 Problemy z ciasteczkami w ${filePath}:`);
      issues.cookies.forEach((issue, index) => {
        console.log(`   ${index + 1}. [${issue.severity}] ${issue.type} (linia ${issue.line})`);
        console.log(`      Problem: ${issue.description}`);
        console.log(`      Kod: ${issue.content.substring(0, 80)}...`);
        console.log(`      Rozwiązanie: ${issue.recommendation}\n`);
        totalCookieIssues++;
      });
    }
    
    if (issues.jwt.length === 0 && issues.cookies.length === 0) {
      console.log('   ✅ Brak problemów w tym pliku\n');
    }
  } else {
    console.log(`   ⚠️  Plik nie istnieje: ${filePath}\n`);
  }
});

console.log('=====================================');
console.log('📊 PODSUMOWANIE ANALIZY');
console.log('=====================================');
console.log(`🔐 Znalezione problemy JWT: ${totalJwtIssues}`);
console.log(`🍪 Znalezione problemy z ciasteczkami: ${totalCookieIssues}`);
console.log(`📈 Łączna liczba problemów: ${totalJwtIssues + totalCookieIssues}`);

if (totalJwtIssues === 2 && totalCookieIssues === 6) {
  console.log('\n✅ Liczba problemów zgodna z oczekiwaniami (2 JWT + 6 cookies)');
} else {
  console.log(`\n⚠️  Liczba problemów różni się od oczekiwanej (2 JWT + 6 cookies)`);
}

console.log('\n🔧 ZALECENIA:');
console.log('1. Zoptymalizuj payload JWT - usuń niepotrzebne dane');
console.log('2. Skróć czasy wygaśnięcia tokenów');
console.log('3. Dodaj brakujące atrybuty bezpieczeństwa do ciasteczek');
console.log('4. Ustaw odpowiednie domeny i ścieżki dla ciasteczek');
console.log('5. Włącz HTTPS w produkcji dla secure cookies');
console.log('6. Regularnie przeglądaj konfigurację bezpieczeństwa');
