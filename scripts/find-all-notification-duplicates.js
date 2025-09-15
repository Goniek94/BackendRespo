#!/usr/bin/env node

/**
 * KOMPLETNE SPRAWDZENIE WSZYSTKICH DUPLIKACJI POWIADOMIEŃ
 * 
 * Ten skrypt sprawdza:
 * 1. Backend - wszystkie implementacje powiadomień
 * 2. Frontend - wszystkie komponenty i serwisy powiadomień
 * 3. Duplikacje między różnymi częściami systemu
 * 4. Konflikty w implementacjach
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 KOMPLETNE SPRAWDZENIE DUPLIKACJI POWIADOMIEŃ');
console.log('===============================================');

// Funkcja do rekurencyjnego przeszukiwania plików
function findFiles(dir, extensions = ['.js', '.jsx', '.ts', '.tsx']) {
  const files = [];
  
  function searchDir(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Pomiń node_modules, .git, dist, build
          if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(item)) {
            searchDir(fullPath);
          }
        } else if (stat.isFile()) {
          const ext = path.extname(item);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Ignoruj błędy dostępu do katalogów
    }
  }
  
  searchDir(dir);
  return files;
}

// Funkcja do przeszukiwania zawartości pliku
function searchInFile(filePath, patterns) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const results = [];
    
    patterns.forEach(pattern => {
      const regex = new RegExp(pattern.regex, 'gi');
      const matches = content.match(regex);
      
      if (matches) {
        results.push({
          pattern: pattern.name,
          matches: matches,
          count: matches.length,
          lines: getMatchingLines(content, regex)
        });
      }
    });
    
    return results.length > 0 ? results : null;
  } catch (error) {
    return null;
  }
}

// Funkcja do znajdowania linii z dopasowaniami
function getMatchingLines(content, regex) {
  const lines = content.split('\n');
  const matchingLines = [];
  
  lines.forEach((line, index) => {
    if (regex.test(line)) {
      matchingLines.push({
        lineNumber: index + 1,
        content: line.trim()
      });
    }
  });
  
  return matchingLines.slice(0, 5); // Maksymalnie 5 linii
}

async function analyzeNotificationDuplicates() {
  console.log('\n1️⃣ Przeszukiwanie plików backend...');
  
  // Wzorce do wyszukiwania
  const patterns = [
    { name: 'NotificationService/Manager', regex: 'notification(Service|Manager)' },
    { name: 'Notification imports', regex: 'import.*[Nn]otification' },
    { name: 'Notification creation', regex: '(createNotification|notifyNew|notifyAd)' },
    { name: 'Socket notification', regex: '(sendNotification|socketService)' },
    { name: 'Notification models', regex: 'models.*[Nn]otification' },
    { name: 'Notification routes', regex: 'notifications.*routes' },
    { name: 'Notification controllers', regex: 'notifications.*controller' },
    { name: 'UnifiedNotification', regex: '[Uu]nifiedNotification' },
    { name: 'NotificationContext', regex: '[Nn]otificationContext' },
    { name: 'useNotifications', regex: 'useNotifications' }
  ];

  // Backend files
  const backendFiles = findFiles('.', ['.js']);
  console.log(`📁 Znaleziono ${backendFiles.length} plików backend`);

  // Frontend files
  const frontendFiles = findFiles('../marketplace-frontend', ['.js', '.jsx']);
  console.log(`📁 Znaleziono ${frontendFiles.length} plików frontend`);

  const allFiles = [...backendFiles, ...frontendFiles];
  console.log(`📊 Łącznie ${allFiles.length} plików do przeszukania`);

  console.log('\n2️⃣ Analizowanie duplikacji...');

  const duplicates = {
    backend: {},
    frontend: {},
    summary: {
      backendFiles: 0,
      frontendFiles: 0,
      totalMatches: 0,
      patterns: {}
    }
  };

  // Przeszukaj wszystkie pliki
  allFiles.forEach(filePath => {
    const results = searchInFile(filePath, patterns);
    
    if (results) {
      const isBackend = !filePath.includes('marketplace-frontend');
      const category = isBackend ? 'backend' : 'frontend';
      const relativePath = path.relative(isBackend ? '.' : '../marketplace-frontend', filePath);
      
      duplicates[category][relativePath] = results;
      duplicates.summary[category + 'Files']++;
      
      results.forEach(result => {
        duplicates.summary.totalMatches += result.count;
        if (!duplicates.summary.patterns[result.pattern]) {
          duplicates.summary.patterns[result.pattern] = 0;
        }
        duplicates.summary.patterns[result.pattern] += result.count;
      });
    }
  });

  console.log('\n3️⃣ RAPORT DUPLIKACJI:');
  console.log('======================');

  console.log(`📊 Pliki backend z powiadomieniami: ${duplicates.summary.backendFiles}`);
  console.log(`📊 Pliki frontend z powiadomieniami: ${duplicates.summary.frontendFiles}`);
  console.log(`📊 Łączna liczba dopasowań: ${duplicates.summary.totalMatches}`);

  console.log('\n📈 Statystyki wzorców:');
  Object.entries(duplicates.summary.patterns).forEach(([pattern, count]) => {
    console.log(`   ${pattern}: ${count} dopasowań`);
  });

  console.log('\n🔴 BACKEND - Pliki z powiadomieniami:');
  console.log('=====================================');
  
  Object.entries(duplicates.backend).forEach(([file, results]) => {
    console.log(`\n📄 ${file}:`);
    results.forEach(result => {
      console.log(`   🔍 ${result.pattern}: ${result.count} dopasowań`);
      result.lines.slice(0, 2).forEach(line => {
        console.log(`      L${line.lineNumber}: ${line.content.substring(0, 80)}...`);
      });
    });
  });

  console.log('\n🔵 FRONTEND - Pliki z powiadomieniami:');
  console.log('======================================');
  
  Object.entries(duplicates.frontend).forEach(([file, results]) => {
    console.log(`\n📄 ${file}:`);
    results.forEach(result => {
      console.log(`   🔍 ${result.pattern}: ${result.count} dopasowań`);
      result.lines.slice(0, 2).forEach(line => {
        console.log(`      L${line.lineNumber}: ${line.content.substring(0, 80)}...`);
      });
    });
  });

  console.log('\n4️⃣ ANALIZA DUPLIKACJI:');
  console.log('=======================');

  // Znajdź potencjalne duplikacje
  const potentialDuplicates = [];
  
  // Sprawdź czy są podobne nazwy plików
  const backendNotificationFiles = Object.keys(duplicates.backend).filter(f => 
    f.toLowerCase().includes('notification')
  );
  const frontendNotificationFiles = Object.keys(duplicates.frontend).filter(f => 
    f.toLowerCase().includes('notification')
  );

  console.log(`🚨 Backend - pliki z 'notification' w nazwie: ${backendNotificationFiles.length}`);
  backendNotificationFiles.forEach(file => console.log(`   📄 ${file}`));

  console.log(`🚨 Frontend - pliki z 'notification' w nazwie: ${frontendNotificationFiles.length}`);
  frontendNotificationFiles.forEach(file => console.log(`   📄 ${file}`));

  // Sprawdź serwisy
  const backendServices = Object.keys(duplicates.backend).filter(f => 
    f.includes('service') && f.toLowerCase().includes('notification')
  );
  const frontendServices = Object.keys(duplicates.frontend).filter(f => 
    f.includes('service') || f.includes('Service')
  );

  console.log(`\n🔧 Backend - serwisy powiadomień: ${backendServices.length}`);
  backendServices.forEach(file => console.log(`   🛠️ ${file}`));

  console.log(`🔧 Frontend - serwisy powiadomień: ${frontendServices.length}`);
  frontendServices.forEach(file => console.log(`   🛠️ ${file}`));

  // Sprawdź komponenty
  const frontendComponents = Object.keys(duplicates.frontend).filter(f => 
    f.includes('component') || f.includes('Component') || f.includes('/notifications/')
  );

  console.log(`\n🧩 Frontend - komponenty powiadomień: ${frontendComponents.length}`);
  frontendComponents.forEach(file => console.log(`   🧩 ${file}`));

  console.log('\n5️⃣ REKOMENDACJE:');
  console.log('=================');

  if (backendServices.length > 1) {
    console.log('❌ PROBLEM: Wiele serwisów powiadomień w backend');
    console.log('💡 ROZWIĄZANIE: Zunifikuj do jednego serwisu (notificationManager.js)');
  }

  if (frontendServices.length > 1) {
    console.log('❌ PROBLEM: Wiele serwisów powiadomień w frontend');
    console.log('💡 ROZWIĄZANIE: Użyj tylko UnifiedNotificationService.js');
  }

  if (frontendComponents.length > 3) {
    console.log('❌ PROBLEM: Za dużo komponentów powiadomień');
    console.log('💡 ROZWIĄZANIE: Zunifikuj komponenty do jednego głównego');
  }

  console.log('\n✅ NASTĘPNE KROKI:');
  console.log('1. Usuń nieużywane pliki powiadomień');
  console.log('2. Zunifikuj serwisy do jednego');
  console.log('3. Zunifikuj komponenty do jednego głównego');
  console.log('4. Zaktualizuj importy w całym projekcie');

  // Zapisz raport do pliku
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: duplicates.summary,
    backend: duplicates.backend,
    frontend: duplicates.frontend,
    recommendations: [
      'Zunifikuj serwisy backend do notificationManager.js',
      'Użyj tylko UnifiedNotificationService.js w frontend',
      'Zunifikuj komponenty powiadomień',
      'Usuń nieużywane pliki'
    ]
  };

  fs.writeFileSync('NOTIFICATION_DUPLICATES_REPORT.json', JSON.stringify(reportData, null, 2));
  console.log('\n💾 Raport zapisany do: NOTIFICATION_DUPLICATES_REPORT.json');
}

analyzeNotificationDuplicates().catch(console.error);
