// Skrypt do automatycznego naprawienia ścieżek API w frontendzie
const fs = require('fs');
const path = require('path');

const frontendApiDir = '../marketplace-frontend/src/services/api';

// Lista plików do naprawienia
const filesToFix = [
  'authApi.js',
  'favoritesApi.js',
  'messagesApi.js',
  'notificationsApi.js',
  'transactionsApi.js'
];

// Funkcja do naprawienia ścieżek w pliku
function fixApiPaths(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Zamień wszystkie ścieżki które nie zaczynają się od /api/
    content = content.replace(/apiClient\.(get|post|put|delete|patch)\('\/(?!api\/)/g, "apiClient.$1('/api/");
    content = content.replace(/apiClient\.getCached\('\/(?!api\/)/g, "apiClient.getCached('/api/");
    content = content.replace(/apiClient\.clearCache\('\/(?!api\/)/g, "apiClient.clearCache('/api/");
    content = content.replace(/apiClient\.getCache\('\/(?!api\/)/g, "apiClient.getCache('/api/");
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Naprawiono ścieżki w ${filePath}`);
  } catch (error) {
    console.error(`❌ Błąd podczas naprawiania ${filePath}:`, error.message);
  }
}

// Napraw wszystkie pliki
filesToFix.forEach(fileName => {
  const filePath = path.join(frontendApiDir, fileName);
  if (fs.existsSync(filePath)) {
    fixApiPaths(filePath);
  } else {
    console.log(`⚠️ Plik ${filePath} nie istnieje`);
  }
});

console.log('🎉 Zakończono naprawianie ścieżek API');
