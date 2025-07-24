/**
 * Skrypt do wyczyszczenia cache w przeglądarce
 * Serwuje stronę HTML, która pozwala wyczyścić localStorage
 */

import express from 'express';
import path from 'path';
import fs from 'fs';

// Ścieżki do plików w projekcie frontend
const frontendPath = path.resolve('../marketplace-frontend');
const clearCacheScriptPath = path.join(frontendPath, 'src/clear-cache.js');
const clearCacheHtmlPath = path.join(frontendPath, 'public/clear-cache.html');

// Sprawdź, czy pliki istnieją
if (!fs.existsSync(clearCacheScriptPath)) {
  console.error(`❌ Nie znaleziono pliku ${clearCacheScriptPath}`);
  process.exit(1);
}

if (!fs.existsSync(clearCacheHtmlPath)) {
  console.error(`❌ Nie znaleziono pliku ${clearCacheHtmlPath}`);
  process.exit(1);
}

// Odczytaj zawartość plików
const clearCacheScript = fs.readFileSync(clearCacheScriptPath, 'utf8');
const clearCacheHtml = fs.readFileSync(clearCacheHtmlPath, 'utf8');

// Utwórz serwer Express
const app = express();
const PORT = 3001;

// Serwuj plik JavaScript
app.get('/static/js/clear-cache.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(clearCacheScript);
});

// Endpoint główny, który zwraca stronę HTML
app.get('/', (req, res) => {
  res.send(clearCacheHtml);
});

// Endpoint API do sprawdzenia, czy backend jest dostępny
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Serwer do czyszczenia cache działa poprawnie'
  });
});

// Uruchom serwer
app.listen(PORT, () => {
  console.log(`✅ Serwer uruchomiony na http://localhost:${PORT}`);
  console.log('🔍 Otwórz tę stronę w przeglądarce, aby wyczyścić cache');
  console.log('📋 Dostępne endpointy:');
  console.log(`  - http://localhost:${PORT}/ - Strona główna do czyszczenia cache`);
  console.log(`  - http://localhost:${PORT}/static/js/clear-cache.js - Skrypt JavaScript`);
  console.log(`  - http://localhost:${PORT}/api/health - Endpoint zdrowia API`);
});
