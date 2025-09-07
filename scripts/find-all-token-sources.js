/**
 * SKRYPT DO ZNAJDOWANIA WSZYSTKICH MIEJSC NADAWANIA TOKENÓW
 * 
 * Skanuje cały projekt i znajduje wszystkie miejsca gdzie:
 * - Generowane są tokeny JWT
 * - Ustawiane są cookies z tokenami
 * - Wysyłane są tokeny w odpowiedziach
 * - Używane są funkcje związane z tokenami
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Wzorce do wyszukiwania
const TOKEN_PATTERNS = [
  // Generowanie tokenów JWT
  /jwt\.sign\s*\(/g,
  /generateAccessToken/g,
  /generateRefreshToken/g,
  /generateToken/g,
  /createToken/g,
  
  // Ustawianie cookies
  /res\.cookie\s*\(/g,
  /setAuthCookies/g,
  /setSecureCookie/g,
  /setAdminCookies/g,
  /setAdminCookie/g,
  
  // Wysyłanie tokenów w odpowiedziach
  /token\s*:/g,
  /accessToken/g,
  /refreshToken/g,
  /authToken/g,
  
  // Middleware i funkcje auth
  /authMiddleware/g,
  /authenticate/g,
  /login/g,
  /signin/g,
  /register/g,
  /signup/g
];

// Rozszerzenia plików do skanowania
const EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx'];

// Foldery do pominięcia
const SKIP_FOLDERS = ['node_modules', '.git', 'uploads', 'logs', 'backups'];

const results = {
  tokenGeneration: [],
  cookieSettings: [],
  responseTokens: [],
  authFunctions: [],
  summary: {
    totalFiles: 0,
    matchingFiles: 0,
    totalMatches: 0
  }
};

/**
 * Sprawdź czy plik powinien być skanowany
 */
const shouldScanFile = (filePath) => {
  const ext = path.extname(filePath);
  return EXTENSIONS.includes(ext);
};

/**
 * Sprawdź czy folder powinien być pominięty
 */
const shouldSkipFolder = (folderName) => {
  return SKIP_FOLDERS.includes(folderName);
};

/**
 * Skanuj plik w poszukiwaniu wzorców tokenów
 */
const scanFile = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(projectRoot, filePath);
    
    results.summary.totalFiles++;
    
    let fileMatches = [];
    let hasMatches = false;
    
    // Podziel zawartość na linie dla lepszego kontekstu
    const lines = content.split('\n');
    
    lines.forEach((line, lineIndex) => {
      const lineNumber = lineIndex + 1;
      
      // Sprawdź każdy wzorzec
      TOKEN_PATTERNS.forEach((pattern, patternIndex) => {
        const matches = line.match(pattern);
        if (matches) {
          hasMatches = true;
          results.summary.totalMatches++;
          
          const match = {
            file: relativePath,
            line: lineNumber,
            content: line.trim(),
            pattern: pattern.source,
            type: getPatternType(patternIndex)
          };
          
          fileMatches.push(match);
          
          // Kategoryzuj dopasowania
          switch (getPatternType(patternIndex)) {
            case 'tokenGeneration':
              results.tokenGeneration.push(match);
              break;
            case 'cookieSettings':
              results.cookieSettings.push(match);
              break;
            case 'responseTokens':
              results.responseTokens.push(match);
              break;
            case 'authFunctions':
              results.authFunctions.push(match);
              break;
          }
        }
      });
    });
    
    if (hasMatches) {
      results.summary.matchingFiles++;
      console.log(`📄 ${relativePath}: ${fileMatches.length} dopasowań`);
    }
    
  } catch (error) {
    console.error(`❌ Błąd skanowania ${filePath}:`, error.message);
  }
};

/**
 * Określ typ wzorca na podstawie indeksu
 */
const getPatternType = (patternIndex) => {
  if (patternIndex <= 4) return 'tokenGeneration';
  if (patternIndex <= 9) return 'cookieSettings';
  if (patternIndex <= 13) return 'responseTokens';
  return 'authFunctions';
};

/**
 * Rekurencyjnie skanuj folder
 */
const scanDirectory = (dirPath) => {
  try {
    const items = fs.readdirSync(dirPath);
    
    items.forEach(item => {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        if (!shouldSkipFolder(item)) {
          scanDirectory(itemPath);
        }
      } else if (stat.isFile()) {
        if (shouldScanFile(itemPath)) {
          scanFile(itemPath);
        }
      }
    });
  } catch (error) {
    console.error(`❌ Błąd skanowania folderu ${dirPath}:`, error.message);
  }
};

/**
 * Wyświetl szczegółowe wyniki
 */
const displayResults = () => {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 RAPORT: WSZYSTKIE MIEJSCA NADAWANIA TOKENÓW');
  console.log('='.repeat(80));
  
  console.log(`\n📊 PODSUMOWANIE:`);
  console.log(`   • Przeskanowane pliki: ${results.summary.totalFiles}`);
  console.log(`   • Pliki z dopasowaniami: ${results.summary.matchingFiles}`);
  console.log(`   • Łączna liczba dopasowań: ${results.summary.totalMatches}`);
  
  // 1. GENEROWANIE TOKENÓW
  console.log(`\n🔐 GENEROWANIE TOKENÓW JWT (${results.tokenGeneration.length}):`);
  if (results.tokenGeneration.length > 0) {
    results.tokenGeneration.forEach(match => {
      console.log(`   📍 ${match.file}:${match.line}`);
      console.log(`      ${match.content}`);
      console.log('');
    });
  } else {
    console.log('   ✅ Brak znalezionych miejsc generowania tokenów');
  }
  
  // 2. USTAWIANIE COOKIES
  console.log(`\n🍪 USTAWIANIE COOKIES Z TOKENAMI (${results.cookieSettings.length}):`);
  if (results.cookieSettings.length > 0) {
    results.cookieSettings.forEach(match => {
      console.log(`   📍 ${match.file}:${match.line}`);
      console.log(`      ${match.content}`);
      console.log('');
    });
  } else {
    console.log('   ✅ Brak znalezionych miejsc ustawiania cookies');
  }
  
  // 3. TOKENY W ODPOWIEDZIACH
  console.log(`\n📤 TOKENY W ODPOWIEDZIACH HTTP (${results.responseTokens.length}):`);
  if (results.responseTokens.length > 0) {
    results.responseTokens.forEach(match => {
      console.log(`   📍 ${match.file}:${match.line}`);
      console.log(`      ${match.content}`);
      console.log('');
    });
  } else {
    console.log('   ✅ Brak znalezionych tokenów w odpowiedziach');
  }
  
  // 4. FUNKCJE AUTORYZACJI
  console.log(`\n🔒 FUNKCJE AUTORYZACJI (${results.authFunctions.length}):`);
  if (results.authFunctions.length > 0) {
    // Grupuj po plikach dla lepszej czytelności
    const groupedByFile = {};
    results.authFunctions.forEach(match => {
      if (!groupedByFile[match.file]) {
        groupedByFile[match.file] = [];
      }
      groupedByFile[match.file].push(match);
    });
    
    Object.keys(groupedByFile).forEach(file => {
      console.log(`   📁 ${file}:`);
      groupedByFile[file].forEach(match => {
        console.log(`      📍 Linia ${match.line}: ${match.content}`);
      });
      console.log('');
    });
  } else {
    console.log('   ✅ Brak znalezionych funkcji autoryzacji');
  }
  
  // 5. POTENCJALNE PROBLEMY
  console.log(`\n⚠️  POTENCJALNE PROBLEMY:`);
  
  // Sprawdź czy są różne sposoby generowania tokenów
  const tokenGenFiles = [...new Set(results.tokenGeneration.map(m => m.file))];
  if (tokenGenFiles.length > 3) {
    console.log(`   🚨 Tokeny generowane w ${tokenGenFiles.length} różnych plikach - może powodować niespójności`);
  }
  
  // Sprawdź czy są różne sposoby ustawiania cookies
  const cookieFiles = [...new Set(results.cookieSettings.map(m => m.file))];
  if (cookieFiles.length > 2) {
    console.log(`   🚨 Cookies ustawiane w ${cookieFiles.length} różnych plikach - może powodować konflikty`);
  }
  
  // Sprawdź czy tokeny są wysyłane w odpowiedziach (potencjalny problem bezpieczeństwa)
  const responseTokenFiles = results.responseTokens.filter(m => 
    m.content.includes('token:') || m.content.includes('accessToken') || m.content.includes('refreshToken')
  );
  if (responseTokenFiles.length > 0) {
    console.log(`   🚨 Tokeny mogą być wysyłane w odpowiedziach HTTP - sprawdź bezpieczeństwo`);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ SKANOWANIE ZAKOŃCZONE');
  console.log('='.repeat(80));
};

/**
 * Zapisz wyniki do pliku JSON
 */
const saveResults = () => {
  const outputPath = path.join(projectRoot, 'docs', 'TOKEN_SOURCES_ANALYSIS.json');
  
  try {
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
    console.log(`\n💾 Szczegółowe wyniki zapisane do: ${path.relative(projectRoot, outputPath)}`);
  } catch (error) {
    console.error('❌ Błąd zapisu wyników:', error.message);
  }
};

// GŁÓWNA FUNKCJA
const main = () => {
  console.log('🔍 Rozpoczynam skanowanie projektu w poszukiwaniu wszystkich miejsc nadawania tokenów...\n');
  
  // Skanuj cały projekt
  scanDirectory(projectRoot);
  
  // Wyświetl wyniki
  displayResults();
  
  // Zapisz wyniki
  saveResults();
};

// Uruchom skrypt
main();
