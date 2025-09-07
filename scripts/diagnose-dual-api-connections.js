/**
 * DIAGNOZA PODWÓJNYCH POŁĄCZEŃ API
 * Sprawdza czy frontend łączy się jednocześnie z localhost i api.autosell.pl
 * To może powodować kumulację cookies i HTTP 431
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔍 DIAGNOZA PODWÓJNYCH POŁĄCZEŃ API');
console.log('================================================================================');
console.log('🎯 Cel: Sprawdzić czy frontend łączy się z localhost i api.autosell.pl jednocześnie');
console.log('⚠️  Problem: Podwójne połączenia = podwójne cookies = HTTP 431');

const frontendPath = '../marketplace-frontend/src';

/**
 * Szuka wszystkich wystąpień URLi API w kodzie frontend
 */
function findApiUrls() {
  console.log('\n📋 KROK 1: Szukanie wszystkich URLi API w kodzie frontend');
  console.log('──────────────────────────────────────────────────');
  
  const patterns = [
    'api.autosell.pl',
    'autosell.pl',
    'localhost:5000',
    'localhost:5001',
    'localhost:3000',
    'http://localhost',
    'https://api',
    'process.env.REACT_APP_API_URL'
  ];
  
  const results = {};
  
  patterns.forEach(pattern => {
    console.log(`\n🔍 Szukam: "${pattern}"`);
    
    try {
      // Użyj findstr na Windows
      const command = `cd ${frontendPath} && findstr /s /i /n "${pattern}" *.js *.jsx *.ts *.tsx 2>nul`;
      const output = execSync(command, { encoding: 'utf8', shell: true });
      
      if (output.trim()) {
        results[pattern] = output.trim().split('\n');
        console.log(`   ✅ Znaleziono ${results[pattern].length} wystąpień`);
        
        // Pokaż pierwsze 3 wystąpienia
        results[pattern].slice(0, 3).forEach(line => {
          console.log(`      📄 ${line}`);
        });
        
        if (results[pattern].length > 3) {
          console.log(`      ... i ${results[pattern].length - 3} więcej`);
        }
      } else {
        console.log(`   ❌ Nie znaleziono`);
      }
    } catch (error) {
      console.log(`   ⚠️  Błąd wyszukiwania: ${error.message}`);
    }
  });
  
  return results;
}

/**
 * Analizuje pliki konfiguracyjne
 */
function analyzeConfigFiles() {
  console.log('\n📋 KROK 2: Analiza plików konfiguracyjnych');
  console.log('──────────────────────────────────────────────────');
  
  const configFiles = [
    '../marketplace-frontend/.env',
    '../marketplace-frontend/.env.local',
    '../marketplace-frontend/.env.development',
    '../marketplace-frontend/.env.production',
    '../marketplace-frontend/src/services/api/config.js',
    '../marketplace-frontend/src/services/UnifiedNotificationService.js'
  ];
  
  configFiles.forEach(filePath => {
    console.log(`\n📄 Sprawdzam: ${filePath}`);
    
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Szukaj URLi API
        const apiUrls = content.match(/(https?:\/\/[^\s'"]+|localhost:\d+)/g);
        if (apiUrls) {
          console.log(`   🔗 Znalezione URLe:`);
          [...new Set(apiUrls)].forEach(url => {
            console.log(`      • ${url}`);
          });
        } else {
          console.log(`   ✅ Brak hardcoded URLi`);
        }
        
        // Szukaj zmiennych środowiskowych
        const envVars = content.match(/process\.env\.[A-Z_]+/g);
        if (envVars) {
          console.log(`   🔧 Zmienne środowiskowe:`);
          [...new Set(envVars)].forEach(envVar => {
            console.log(`      • ${envVar}`);
          });
        }
      } else {
        console.log(`   ❌ Plik nie istnieje`);
      }
    } catch (error) {
      console.log(`   ⚠️  Błąd odczytu: ${error.message}`);
    }
  });
}

/**
 * Sprawdza aktywne połączenia sieciowe
 */
function checkActiveConnections() {
  console.log('\n📋 KROK 3: Sprawdzanie aktywnych połączeń sieciowych');
  console.log('──────────────────────────────────────────────────');
  
  try {
    console.log('🔍 Sprawdzam połączenia na portach 3000, 5000, 5001...');
    
    const command = 'netstat -an | findstr ":3000\\|:5000\\|:5001"';
    const output = execSync(command, { encoding: 'utf8', shell: true });
    
    if (output.trim()) {
      console.log('📊 Aktywne połączenia:');
      output.trim().split('\n').forEach(line => {
        console.log(`   ${line}`);
      });
    } else {
      console.log('❌ Brak aktywnych połączeń na tych portach');
    }
  } catch (error) {
    console.log(`⚠️  Błąd sprawdzania połączeń: ${error.message}`);
  }
}

/**
 * Generuje raport z rekomendacjami
 */
function generateReport(apiUrls) {
  console.log('\n📋 PODSUMOWANIE I REKOMENDACJE');
  console.log('================================================================================');
  
  const hasLocalhost = Object.keys(apiUrls).some(pattern => 
    pattern.includes('localhost') && apiUrls[pattern]?.length > 0
  );
  
  const hasAutosell = Object.keys(apiUrls).some(pattern => 
    pattern.includes('autosell') && apiUrls[pattern]?.length > 0
  );
  
  if (hasLocalhost && hasAutosell) {
    console.log('🚨 PROBLEM ZIDENTYFIKOWANY:');
    console.log('   • Frontend łączy się JEDNOCZEŚNIE z localhost i autosell.pl');
    console.log('   • To powoduje kumulację cookies z dwóch domen');
    console.log('   • Wynik: Ogromne nagłówki HTTP i błąd 431');
    console.log('');
    console.log('💡 ROZWIĄZANIE:');
    console.log('   1. Ustaw REACT_APP_API_URL=http://localhost:5000 w .env');
    console.log('   2. Usuń wszystkie hardcoded URLe do autosell.pl');
    console.log('   3. Wyczyść cookies przeglądarki');
    console.log('   4. Zrestartuj frontend');
  } else if (hasLocalhost) {
    console.log('✅ KONFIGURACJA LOCALHOST:');
    console.log('   • Frontend używa tylko localhost - to jest OK dla developmentu');
  } else if (hasAutosell) {
    console.log('✅ KONFIGURACJA PRODUKCYJNA:');
    console.log('   • Frontend używa tylko autosell.pl - to jest OK dla produkcji');
  } else {
    console.log('⚠️  BRAK JASNEJ KONFIGURACJI:');
    console.log('   • Nie znaleziono jednoznacznych URLi API');
    console.log('   • Sprawdź zmienne środowiskowe');
  }
  
  // Zapisz szczegółowy raport
  const reportData = {
    timestamp: new Date().toISOString(),
    foundUrls: apiUrls,
    hasLocalhost,
    hasAutosell,
    isDualConnection: hasLocalhost && hasAutosell,
    recommendation: hasLocalhost && hasAutosell ? 
      'CRITICAL: Remove dual API connections' : 
      'OK: Single API endpoint detected'
  };
  
  fs.writeFileSync('./docs/DUAL_API_CONNECTIONS_REPORT.json', JSON.stringify(reportData, null, 2));
  console.log('\n📄 Szczegółowy raport zapisany w ./docs/DUAL_API_CONNECTIONS_REPORT.json');
}

// Uruchom diagnozę
async function runDiagnosis() {
  try {
    const apiUrls = findApiUrls();
    analyzeConfigFiles();
    checkActiveConnections();
    generateReport(apiUrls);
    
    console.log('\n🎯 DIAGNOZA ZAKOŃCZONA');
    console.log('Sprawdź raport i zastosuj rekomendacje aby naprawić HTTP 431');
    
  } catch (error) {
    console.error('❌ Błąd podczas diagnozy:', error);
  }
}

runDiagnosis();
