/**
 * ANALIZA PRZYCZYN DUŻYCH NAGŁÓWKÓW HTTP 431
 * Szczegółowa analiza wszystkich składników nagłówków żądań
 */

import jwt from 'jsonwebtoken';
import fs from 'fs';

console.log('🔍 ANALIZA PRZYCZYN DUŻYCH NAGŁÓWKÓW HTTP 431');
console.log('================================================================================\n');

/**
 * Analiza rozmiaru nagłówków z przykładowego żądania
 */
function analyzeHeaderSize() {
  console.log('📊 ANALIZA SKŁADNIKÓW NAGŁÓWKÓW');
  console.log('============================================================');
  
  // Przykładowe nagłówki z rzeczywistego żądania (na podstawie screenshota)
  const sampleHeaders = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'pl-PL,pl;q=0.9,en;q=0.8',
    'Connection': 'keep-alive',
    'Content-Type': 'application/json',
    'Cookie': 'token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NmRmMGZhMjMxMjI3MGQwYmI3ZDZhMSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzI1NzQ4NzY4LCJleHAiOjE3MjU3NTIzNjh9.abc123; refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NmRmMGZhMjMxMjI3MGQwYmI3ZDZhMSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzI1NzQ4NzY4LCJleHAiOjE3MjY5NTgzNjh9.def456; admin_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NmRmMGZhMjMxMjI3MGQwYmI3ZDZhMSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTcyNTc0ODc2OCwiZXhwIjoxNzI1NzUyMzY4fQ.ghi789; admin_refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NmRmMGZhMjMxMjI3MGQwYmI3ZDZhMSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTcyNTc0ODc2OCwiZXhwIjoxNzI2OTU4MzY4fQ.jkl012; sessionId=sess_1234567890abcdef1234567890abcdef; csrfToken=csrf_abcdef1234567890abcdef1234567890; _ga=GA1.1.123456789.1234567890; _gid=GA1.1.987654321.0987654321; _fbp=fb.1.1234567890123.1234567890; analytics_session=analytics_1234567890abcdef1234567890abcdef',
    'Host': 'localhost:3000',
    'Referer': 'http://localhost:3000/admin/dashboard',
    'Sec-Ch-Ua': '"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
  };
  
  let totalSize = 0;
  const headerAnalysis = [];
  
  // Analiza każdego nagłówka
  Object.entries(sampleHeaders).forEach(([name, value]) => {
    const headerLine = `${name}: ${value}`;
    const size = Buffer.byteLength(headerLine, 'utf8');
    totalSize += size + 2; // +2 dla \r\n
    
    headerAnalysis.push({
      name,
      value: value.length > 100 ? value.substring(0, 100) + '...' : value,
      size,
      percentage: 0 // Będzie obliczone później
    });
  });
  
  // Oblicz procenty
  headerAnalysis.forEach(header => {
    header.percentage = ((header.size / totalSize) * 100).toFixed(1);
  });
  
  // Sortuj według rozmiaru
  headerAnalysis.sort((a, b) => b.size - a.size);
  
  console.log(`📏 Całkowity rozmiar nagłówków: ${totalSize} bajtów`);
  console.log(`🚨 Status: ${totalSize > 8192 ? '❌ PRZEKRACZA 8KB' : totalSize > 4096 ? '⚠️  DUŻY' : '✅ OK'}`);
  console.log('');
  
  console.log('🔝 TOP 10 NAJWIĘKSZYCH NAGŁÓWKÓW:');
  headerAnalysis.slice(0, 10).forEach((header, index) => {
    const icon = header.size > 500 ? '🔴' : header.size > 200 ? '🟡' : '🟢';
    console.log(`   ${index + 1}. ${icon} ${header.name}: ${header.size}B (${header.percentage}%)`);
    if (header.name === 'Cookie') {
      console.log(`      Wartość: ${header.value}`);
    }
  });
  
  return { totalSize, headerAnalysis };
}

/**
 * Szczegółowa analiza cookies
 */
function analyzeCookies() {
  console.log('\n🍪 SZCZEGÓŁOWA ANALIZA COOKIES');
  console.log('============================================================');
  
  // Przykładowy cookie string z rzeczywistego żądania
  const cookieString = 'token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NmRmMGZhMjMxMjI3MGQwYmI3ZDZhMSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzI1NzQ4NzY4LCJleHAiOjE3MjU3NTIzNjh9.abc123; refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NmRmMGZhMjMxMjI3MGQwYmI3ZDZhMSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzI1NzQ4NzY4LCJleHAiOjE3MjY5NTgzNjh9.def456; admin_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NmRmMGZhMjMxMjI3MGQwYmI3ZDZhMSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTcyNTc0ODc2OCwiZXhwIjoxNzI1NzUyMzY4fQ.ghi789; admin_refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NmRmMGZhMjMxMjI3MGQwYmI3ZDZhMSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTcyNTc0ODc2OCwiZXhwIjoxNzI2OTU4MzY4fQ.jkl012; sessionId=sess_1234567890abcdef1234567890abcdef; csrfToken=csrf_abcdef1234567890abcdef1234567890; _ga=GA1.1.123456789.1234567890; _gid=GA1.1.987654321.0987654321; _fbp=fb.1.1234567890123.1234567890; analytics_session=analytics_1234567890abcdef1234567890abcdef';
  
  const cookies = cookieString.split('; ').map(cookie => {
    const [name, value] = cookie.split('=');
    return { name, value, size: Buffer.byteLength(cookie, 'utf8') };
  });
  
  const totalCookieSize = Buffer.byteLength(cookieString, 'utf8');
  
  console.log(`📏 Całkowity rozmiar cookies: ${totalCookieSize} bajtów`);
  console.log(`🚨 Status: ${totalCookieSize > 4096 ? '❌ BARDZO DUŻY' : totalCookieSize > 2048 ? '⚠️  DUŻY' : '✅ OK'}`);
  console.log('');
  
  // Sortuj cookies według rozmiaru
  cookies.sort((a, b) => b.size - a.size);
  
  console.log('🔝 COOKIES WEDŁUG ROZMIARU:');
  cookies.forEach((cookie, index) => {
    const percentage = ((cookie.size / totalCookieSize) * 100).toFixed(1);
    const icon = cookie.size > 150 ? '🔴' : cookie.size > 50 ? '🟡' : '🟢';
    const type = cookie.name.includes('token') ? '[JWT]' : 
                 cookie.name.startsWith('_') ? '[Analytics]' : '[Session]';
    
    console.log(`   ${index + 1}. ${icon} ${cookie.name} ${type}: ${cookie.size}B (${percentage}%)`);
    
    // Analiza tokenów JWT
    if (cookie.name.includes('token') && cookie.value.includes('.')) {
      try {
        const parts = cookie.value.split('.');
        if (parts.length === 3) {
          const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          
          console.log(`      📋 Header: ${JSON.stringify(header)}`);
          console.log(`      📋 Payload: ${JSON.stringify(payload)}`);
          console.log(`      📏 Rozmiary: Header=${parts[0].length}B, Payload=${parts[1].length}B, Signature=${parts[2].length}B`);
        }
      } catch (error) {
        console.log(`      ❌ Nie można zdekodować JWT: ${error.message}`);
      }
    }
  });
  
  return { totalCookieSize, cookies };
}

/**
 * Analiza limitów serwerów
 */
function analyzeServerLimits() {
  console.log('\n🖥️  ANALIZA LIMITÓW SERWERÓW');
  console.log('============================================================');
  
  const limits = [
    { server: 'Apache (domyślny)', limit: 8192, description: 'LimitRequestFieldSize' },
    { server: 'Nginx (domyślny)', limit: 4096, description: 'large_client_header_buffers' },
    { server: 'IIS (domyślny)', limit: 16384, description: 'maxRequestLength' },
    { server: 'Node.js Express', limit: 8192, description: 'Domyślny limit nagłówków' },
    { server: 'Cloudflare', limit: 8192, description: 'Limit proxy' },
    { server: 'AWS ALB', limit: 16384, description: 'Application Load Balancer' }
  ];
  
  console.log('📊 TYPOWE LIMITY SERWERÓW:');
  limits.forEach(({ server, limit, description }) => {
    console.log(`   • ${server}: ${limit}B (${(limit/1024).toFixed(1)}KB) - ${description}`);
  });
  
  return limits;
}

/**
 * Rekomendacje optymalizacji
 */
function generateOptimizationRecommendations(headerAnalysis, cookies, totalSize) {
  console.log('\n💡 REKOMENDACJE OPTYMALIZACJI');
  console.log('============================================================');
  
  const recommendations = [];
  
  // Analiza tokenów JWT
  const jwtCookies = cookies.filter(c => c.name.includes('token'));
  if (jwtCookies.length > 0) {
    const jwtSize = jwtCookies.reduce((sum, c) => sum + c.size, 0);
    recommendations.push({
      priority: 'WYSOKI',
      category: 'JWT Tokens',
      issue: `${jwtCookies.length} tokenów JWT zajmuje ${jwtSize}B (${((jwtSize/totalSize)*100).toFixed(1)}%)`,
      solutions: [
        'Skróć payload JWT - usuń niepotrzebne pola',
        'Użyj krótszych nazw pól (userId -> u, role -> r)',
        'Zmniejsz czas życia tokenów (krótsze exp)',
        'Rozważ użycie session storage zamiast cookies dla niektórych tokenów'
      ]
    });
  }
  
  // Analiza cookies analitycznych
  const analyticsCookies = cookies.filter(c => c.name.startsWith('_'));
  if (analyticsCookies.length > 0) {
    const analyticsSize = analyticsCookies.reduce((sum, c) => sum + c.size, 0);
    recommendations.push({
      priority: 'ŚREDNI',
      category: 'Analytics Cookies',
      issue: `${analyticsCookies.length} cookies analitycznych zajmuje ${analyticsSize}B`,
      solutions: [
        'Przenieś analytics do localStorage',
        'Użyj server-side analytics',
        'Ogranicz liczbę cookies analitycznych',
        'Skróć identyfikatory sesji'
      ]
    });
  }
  
  // Analiza duplikatów
  const duplicateTokens = cookies.filter(c => c.name.includes('admin_'));
  if (duplicateTokens.length > 0) {
    recommendations.push({
      priority: 'WYSOKI',
      category: 'Duplicate Tokens',
      issue: `Wykryto ${duplicateTokens.length} dodatkowych tokenów admin`,
      solutions: [
        'Usuń duplikaty tokenów (admin_token, admin_refreshToken)',
        'Użyj jednego tokena z rolą w payload',
        'Implementuj role-based access control w jednym tokenie'
      ]
    });
  }
  
  // Ogólne rekomendacje
  if (totalSize > 8192) {
    recommendations.push({
      priority: 'KRYTYCZNY',
      category: 'Header Size',
      issue: `Całkowity rozmiar nagłówków: ${totalSize}B przekracza limit 8KB`,
      solutions: [
        'NATYCHMIASTOWE: Zwiększ limit serwera do 16KB',
        'DŁUGOTERMINOWE: Zredukuj rozmiar cookies o 50%',
        'Przenieś część danych do localStorage',
        'Implementuj cookie cleanup middleware'
      ]
    });
  }
  
  // Wyświetl rekomendacje
  recommendations.forEach((rec, index) => {
    const priorityIcon = rec.priority === 'KRYTYCZNY' ? '🚨' : 
                        rec.priority === 'WYSOKI' ? '🔴' : 
                        rec.priority === 'ŚREDNI' ? '🟡' : '🟢';
    
    console.log(`\n${index + 1}. ${priorityIcon} ${rec.category} [${rec.priority}]`);
    console.log(`   Problem: ${rec.issue}`);
    console.log(`   Rozwiązania:`);
    rec.solutions.forEach(solution => {
      console.log(`     • ${solution}`);
    });
  });
  
  return recommendations;
}

/**
 * Generowanie raportu
 */
function generateReport(analysis) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalHeaderSize: analysis.totalSize,
      cookieSize: analysis.cookieSize,
      status: analysis.totalSize > 8192 ? 'CRITICAL' : analysis.totalSize > 4096 ? 'WARNING' : 'OK',
      exceedsLimit: analysis.totalSize > 8192
    },
    headers: analysis.headerAnalysis,
    cookies: analysis.cookies,
    recommendations: analysis.recommendations
  };
  
  // Zapisz raport do pliku
  const reportPath = './docs/HEADER_BLOAT_ANALYSIS_REPORT.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n📄 RAPORT ZAPISANY: ${reportPath}`);
  
  return report;
}

/**
 * Główna funkcja analizy
 */
async function main() {
  try {
    // Analiza nagłówków
    const { totalSize, headerAnalysis } = analyzeHeaderSize();
    
    // Analiza cookies
    const { totalCookieSize, cookies } = analyzeCookies();
    
    // Analiza limitów serwerów
    const serverLimits = analyzeServerLimits();
    
    // Generowanie rekomendacji
    const recommendations = generateOptimizationRecommendations(headerAnalysis, cookies, totalSize);
    
    // Generowanie raportu
    const report = generateReport({
      totalSize,
      headerAnalysis,
      cookieSize: totalCookieSize,
      cookies,
      serverLimits,
      recommendations
    });
    
    console.log('\n================================================================================');
    console.log('📋 PODSUMOWANIE ANALIZY');
    console.log('================================================================================');
    
    console.log(`🔍 Przeanalizowano ${headerAnalysis.length} nagłówków`);
    console.log(`🍪 Znaleziono ${cookies.length} cookies`);
    console.log(`📏 Całkowity rozmiar: ${totalSize} bajtów`);
    console.log(`🚨 Status: ${report.summary.status}`);
    console.log(`💡 Wygenerowano ${recommendations.length} rekomendacji`);
    
    if (report.summary.exceedsLimit) {
      console.log('\n🚨 AKCJA WYMAGANA: Nagłówki przekraczają bezpieczny limit!');
      console.log('   1. Natychmiast zwiększ limit serwera');
      console.log('   2. Zoptymalizuj cookies według rekomendacji');
      console.log('   3. Przetestuj po zmianach');
    }
    
  } catch (error) {
    console.error('❌ BŁĄD PODCZAS ANALIZY:', error.message);
    console.error('🔍 Stack trace:', error.stack);
  }
}

// Uruchom analizę
main().catch(console.error);
