/**
 * Skrypt testowy dla systemu przesyłania zdjęć
 * Testuje nowe limity i funkcjonalności
 */

import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const API_BASE_URL = 'http://localhost:5000';
const TEST_CAR_ID = 'test_car_' + Date.now();

// Kolory dla konsoli
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`)
};

/**
 * Tworzy testowy plik obrazu
 */
function createTestImage(width = 100, height = 100, name = 'test.jpg') {
  // Tworzymy minimalny JPEG header (dla testów)
  const jpegHeader = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43
  ]);
  
  // Dodajemy trochę danych (symulacja obrazu)
  const imageData = Buffer.alloc(1024, 0x80); // 1KB danych
  const fullImage = Buffer.concat([jpegHeader, imageData]);
  
  return {
    buffer: fullImage,
    name: name,
    size: fullImage.length,
    type: 'image/jpeg'
  };
}

/**
 * Tworzy duży plik testowy (ponad limit)
 */
function createLargeTestImage() {
  const jpegHeader = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43
  ]);
  
  // 6MB danych (ponad limit 5MB)
  const imageData = Buffer.alloc(6 * 1024 * 1024, 0x80);
  const fullImage = Buffer.concat([jpegHeader, imageData]);
  
  return {
    buffer: fullImage,
    name: 'large_test.jpg',
    size: fullImage.length,
    type: 'image/jpeg'
  };
}

/**
 * Test 1: Sprawdzenie limitów plików
 */
async function testFileLimits() {
  log.info('Test 1: Sprawdzanie limitów plików...');
  
  try {
    // Test 1a: Normalny upload (powinien przejść)
    const formData = new FormData();
    const testImage = createTestImage(800, 600, 'normal_test.jpg');
    
    formData.append('images', testImage.buffer, {
      filename: testImage.name,
      contentType: testImage.type
    });
    formData.append('carId', TEST_CAR_ID);
    formData.append('mainImageIndex', '0');

    const response = await fetch(`${API_BASE_URL}/api/images/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': 'Bearer test_token' // Zastąp prawdziwym tokenem
      }
    });

    if (response.ok) {
      log.success('Upload normalnego pliku - OK');
    } else {
      const error = await response.text();
      log.warning(`Upload normalnego pliku - błąd: ${error}`);
    }

  } catch (error) {
    log.error(`Test limitów plików - błąd: ${error.message}`);
  }
}

/**
 * Test 2: Sprawdzenie limitu rozmiaru pliku (5MB)
 */
async function testFileSizeLimit() {
  log.info('Test 2: Sprawdzanie limitu rozmiaru pliku (5MB)...');
  
  try {
    const formData = new FormData();
    const largeImage = createLargeTestImage();
    
    formData.append('images', largeImage.buffer, {
      filename: largeImage.name,
      contentType: largeImage.type
    });
    formData.append('carId', TEST_CAR_ID);

    const response = await fetch(`${API_BASE_URL}/api/images/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': 'Bearer test_token'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      if (error.includes('za duży') || error.includes('5MB')) {
        log.success('Limit rozmiaru pliku działa poprawnie - odrzucono plik 6MB');
      } else {
        log.warning(`Nieoczekiwany błąd: ${error}`);
      }
    } else {
      log.error('Plik 6MB został zaakceptowany - limit nie działa!');
    }

  } catch (error) {
    log.error(`Test limitu rozmiaru - błąd: ${error.message}`);
  }
}

/**
 * Test 3: Sprawdzenie limitu liczby plików (15)
 */
async function testFileCountLimit() {
  log.info('Test 3: Sprawdzanie limitu liczby plików (15)...');
  
  try {
    const formData = new FormData();
    
    // Dodaj 16 plików (ponad limit 15)
    for (let i = 0; i < 16; i++) {
      const testImage = createTestImage(200, 200, `test_${i}.jpg`);
      formData.append('images', testImage.buffer, {
        filename: testImage.name,
        contentType: testImage.type
      });
    }
    
    formData.append('carId', TEST_CAR_ID);

    const response = await fetch(`${API_BASE_URL}/api/images/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': 'Bearer test_token'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      if (error.includes('15') || error.includes('limit')) {
        log.success('Limit liczby plików działa poprawnie - odrzucono 16 plików');
      } else {
        log.warning(`Nieoczekiwany błąd: ${error}`);
      }
    } else {
      log.error('16 plików zostało zaakceptowanych - limit nie działa!');
    }

  } catch (error) {
    log.error(`Test limitu liczby plików - błąd: ${error.message}`);
  }
}

/**
 * Test 4: Sprawdzenie obsługiwanych formatów
 */
async function testSupportedFormats() {
  log.info('Test 4: Sprawdzanie obsługiwanych formatów...');
  
  const formats = [
    { ext: 'jpg', type: 'image/jpeg', shouldPass: true },
    { ext: 'png', type: 'image/png', shouldPass: true },
    { ext: 'webp', type: 'image/webp', shouldPass: true },
    { ext: 'gif', type: 'image/gif', shouldPass: false },
    { ext: 'bmp', type: 'image/bmp', shouldPass: false }
  ];

  for (const format of formats) {
    try {
      const formData = new FormData();
      const testImage = createTestImage(200, 200, `test.${format.ext}`);
      
      formData.append('images', testImage.buffer, {
        filename: `test.${format.ext}`,
        contentType: format.type
      });
      formData.append('carId', TEST_CAR_ID);

      const response = await fetch(`${API_BASE_URL}/api/images/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': 'Bearer test_token'
        }
      });

      if (format.shouldPass) {
        if (response.ok) {
          log.success(`Format ${format.ext} - zaakceptowany ✓`);
        } else {
          log.error(`Format ${format.ext} - odrzucony (powinien być zaakceptowany)`);
        }
      } else {
        if (!response.ok) {
          log.success(`Format ${format.ext} - odrzucony ✓`);
        } else {
          log.error(`Format ${format.ext} - zaakceptowany (powinien być odrzucony)`);
        }
      }

    } catch (error) {
      log.error(`Test formatu ${format.ext} - błąd: ${error.message}`);
    }
  }
}

/**
 * Test 5: Sprawdzenie API endpoints
 */
async function testAPIEndpoints() {
  log.info('Test 5: Sprawdzanie dostępności API endpoints...');
  
  const endpoints = [
    { path: '/api/images/upload', method: 'POST', needsAuth: true },
    { path: `/api/images/${TEST_CAR_ID}`, method: 'GET', needsAuth: false },
    { path: '/api/images/test_id', method: 'DELETE', needsAuth: true },
    { path: '/api/images/test_id/main', method: 'PUT', needsAuth: true }
  ];

  for (const endpoint of endpoints) {
    try {
      const options = {
        method: endpoint.method,
        headers: {}
      };

      if (endpoint.needsAuth) {
        options.headers['Authorization'] = 'Bearer test_token';
      }

      if (endpoint.method === 'POST') {
        const formData = new FormData();
        formData.append('carId', TEST_CAR_ID);
        options.body = formData;
      }

      const response = await fetch(`${API_BASE_URL}${endpoint.path}`, options);
      
      // Sprawdzamy czy endpoint odpowiada (nawet jeśli błąd autoryzacji)
      if (response.status !== 404) {
        log.success(`Endpoint ${endpoint.method} ${endpoint.path} - dostępny`);
      } else {
        log.error(`Endpoint ${endpoint.method} ${endpoint.path} - nie znaleziony (404)`);
      }

    } catch (error) {
      log.error(`Test endpoint ${endpoint.path} - błąd: ${error.message}`);
    }
  }
}

/**
 * Test 6: Sprawdzenie rate limiting
 */
async function testRateLimit() {
  log.info('Test 6: Sprawdzanie rate limiting (10 requestów/minutę)...');
  
  try {
    const promises = [];
    
    // Wyślij 12 requestów jednocześnie
    for (let i = 0; i < 12; i++) {
      const formData = new FormData();
      const testImage = createTestImage(100, 100, `rate_test_${i}.jpg`);
      
      formData.append('images', testImage.buffer, {
        filename: testImage.name,
        contentType: testImage.type
      });
      formData.append('carId', `${TEST_CAR_ID}_${i}`);

      const promise = fetch(`${API_BASE_URL}/api/images/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': 'Bearer test_token'
        }
      });
      
      promises.push(promise);
    }

    const responses = await Promise.all(promises);
    const rateLimitedCount = responses.filter(r => r.status === 429).length;
    
    if (rateLimitedCount > 0) {
      log.success(`Rate limiting działa - ${rateLimitedCount} requestów zablokowanych`);
    } else {
      log.warning('Rate limiting może nie działać - wszystkie requesty przeszły');
    }

  } catch (error) {
    log.error(`Test rate limiting - błąd: ${error.message}`);
  }
}

/**
 * Główna funkcja testowa
 */
async function runTests() {
  console.log('\n🧪 TESTY SYSTEMU PRZESYŁANIA ZDJĘĆ\n');
  console.log('='.repeat(50));
  
  log.info(`Testowanie API: ${API_BASE_URL}`);
  log.info(`Test Car ID: ${TEST_CAR_ID}\n`);

  // Sprawdź czy serwer jest dostępny
  try {
    const healthCheck = await fetch(`${API_BASE_URL}/api/images/stats/test`);
    if (healthCheck.status === 404) {
      log.warning('Serwer odpowiada, ale endpoint może nie istnieć');
    }
  } catch (error) {
    log.error(`Serwer niedostępny: ${error.message}`);
    log.error('Upewnij się, że backend działa na porcie 5000');
    return;
  }

  // Uruchom testy
  await testFileLimits();
  await testFileSizeLimit();
  await testFileCountLimit();
  await testSupportedFormats();
  await testAPIEndpoints();
  await testRateLimit();

  console.log('\n' + '='.repeat(50));
  log.info('Testy zakończone!');
  
  console.log('\n📋 PODSUMOWANIE ZMIAN:');
  console.log('• Limit plików: 20 → 15');
  console.log('• Limit rozmiaru: 10MB → 5MB');
  console.log('• Dodano automatyczną kompresję frontend');
  console.log('• Dodano interfejs postępu kompresji');
  console.log('• Zaktualizowano walidację i komunikaty');
  
  console.log('\n📖 Sprawdź PHOTO_UPLOAD_GUIDE.md dla pełnej dokumentacji');
}

// Uruchom testy
runTests().catch(console.error);
