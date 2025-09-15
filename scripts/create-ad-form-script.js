/**
 * SKRYPT DODAWANIA OGŁOSZENIA PRZEZ FORMULARZ
 * Kompletny skrypt z obsługą autoryzacji, walidacji i uploadu zdjęć
 */

import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';

// Kolory dla konsoli
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Konfiguracja
const BASE_URL = 'http://localhost:5000';
const API_URL = `${BASE_URL}/api`;

// Dane użytkownika (zmień na swoje)
const USER_CREDENTIALS = {
  email: 'mateusz.goszczycki1994@gmail.com',
  password: 'Admin123!'
};

/**
 * Funkcja logowania użytkownika
 */
async function loginUser() {
  try {
    log('🔐 Logowanie użytkownika...', 'yellow');
    
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(USER_CREDENTIALS)
    });

    if (response.status === 200) {
      const cookies = response.headers.get('set-cookie');
      if (cookies) {
        log('✅ Logowanie pomyślne!', 'green');
        return cookies;
      }
    }
    
    const result = await response.text();
    log(`❌ Błąd logowania (${response.status}): ${result}`, 'red');
    return null;
  } catch (error) {
    log(`❌ Błąd podczas logowania: ${error.message}`, 'red');
    return null;
  }
}

/**
 * Funkcja dodawania ogłoszenia z danymi z formularza
 */
async function createAdFromForm(cookies, adData, imagePaths = []) {
  try {
    log('\n🚀 DODAWANIE OGŁOSZENIA...', 'yellow');
    
    // Walidacja podstawowych danych
    const requiredFields = ['brand', 'model', 'year', 'price', 'mileage', 'description'];
    for (const field of requiredFields) {
      if (!adData[field]) {
        throw new Error(`Pole ${field} jest wymagane`);
      }
    }
    
    // Przygotuj FormData
    const formData = new FormData();
    
    // Dodaj wszystkie dane ogłoszenia
    Object.keys(adData).forEach(key => {
      if (adData[key] !== undefined && adData[key] !== null) {
        formData.append(key, adData[key]);
      }
    });
    
    // Dodaj zdjęcia jeśli są podane
    if (imagePaths && imagePaths.length > 0) {
      log(`📸 Dodawanie ${imagePaths.length} zdjęć...`, 'blue');
      
      for (let i = 0; i < imagePaths.length; i++) {
        const imagePath = imagePaths[i];
        if (fs.existsSync(imagePath)) {
          const fileStream = fs.createReadStream(imagePath);
          const fileName = path.basename(imagePath);
          formData.append('images', fileStream, fileName);
          log(`  ✅ Dodano: ${fileName}`, 'green');
        } else {
          log(`  ❌ Plik nie istnieje: ${imagePath}`, 'red');
        }
      }
      
      // Użyj endpointu z uploadem
      const endpoint = `${API_URL}/ads/add-with-upload`;
      return await sendAdRequest(endpoint, formData, cookies, true);
    } else {
      // Użyj endpointu bez uploadu (z URL-ami zdjęć)
      const endpoint = `${API_URL}/ads/add`;
      return await sendAdRequest(endpoint, adData, cookies, false);
    }
    
  } catch (error) {
    log(`❌ BŁĄD podczas tworzenia ogłoszenia: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Funkcja wysyłania requestu
 */
async function sendAdRequest(endpoint, data, cookies, isFormData) {
  try {
    const requestOptions = {
      method: 'POST',
      headers: {
        'Cookie': cookies
      }
    };
    
    if (isFormData) {
      requestOptions.body = data;
    } else {
      requestOptions.headers['Content-Type'] = 'application/json';
      requestOptions.body = JSON.stringify(data);
    }
    
    const response = await fetch(endpoint, requestOptions);
    const result = await response.text();
    
    log('\n📊 WYNIK DODAWANIA OGŁOSZENIA:', 'bright');
    log(`Status: ${response.status}`, 'cyan');
    
    if (response.status === 201) {
      log('✅ SUKCES! Ogłoszenie zostało utworzone!', 'green');
      
      try {
        const jsonResult = JSON.parse(result);
        if (jsonResult.ad) {
          log(`🆔 ID ogłoszenia: ${jsonResult.ad._id}`, 'blue');
          log(`📝 Tytuł: ${jsonResult.ad.headline || 'Brak tytułu'}`, 'blue');
          log(`🚗 Pojazd: ${jsonResult.ad.brand} ${jsonResult.ad.model}`, 'blue');
          log(`💰 Cena: ${jsonResult.ad.price} PLN`, 'blue');
          log(`📍 Lokalizacja: ${jsonResult.ad.city || 'Brak'}, ${jsonResult.ad.voivodeship || 'Brak'}`, 'blue');
          
          if (jsonResult.ad.images && jsonResult.ad.images.length > 0) {
            log(`📸 Zdjęcia: ${jsonResult.ad.images.length}`, 'green');
          }
        }
      } catch (e) {
        log('Response:', 'cyan');
        log(result, 'cyan');
      }
      
      return true;
    } else if (response.status === 429) {
      log('⏰ RATE LIMITING: Możesz dodać tylko 1 ogłoszenie na 5 minut', 'yellow');
      log('💡 Poczekaj 5 minut lub użyj konta administratora', 'yellow');
      return false;
    } else {
      log('❌ BŁĄD podczas tworzenia ogłoszenia', 'red');
      log('Response:', 'yellow');
      log(result, 'yellow');
      return false;
    }
    
  } catch (error) {
    log(`❌ BŁĄD requestu: ${error.message}`, 'red');
    return false;
  }
}

/**
 * PRZYKŁAD UŻYCIA - Dodawanie ogłoszenia z danymi z formularza
 */
async function addCarListing() {
  log('🚗 DODAWANIE OGŁOSZENIA SAMOCHODU', 'bright');
  log('=' .repeat(50), 'cyan');
  
  // 1. Zaloguj użytkownika
  const cookies = await loginUser();
  if (!cookies) {
    log('❌ Nie udało się zalogować', 'red');
    return;
  }
  
  // 2. Dane ogłoszenia (przykład - zmień na swoje)
  const carData = {
    // PODSTAWOWE DANE (WYMAGANE)
    brand: 'AUDI',
    model: 'A4',
    year: '2019',
    price: '85000',
    mileage: '120000',
    description: 'Sprzedam Audi A4 w bardzo dobrym stanie. Auto serwisowane w ASO, wszystkie przeglądy na bieżąco. Silnik 2.0 TDI, bardzo ekonomiczny.',
    
    // DANE TECHNICZNE
    fuelType: 'diesel',
    transmission: 'automatyczna',
    generation: 'B9',
    version: '2.0 TDI QUATTRO',
    bodyType: 'sedan',
    color: 'CZARNY',
    paintFinish: 'metalik',
    drive: 'AWD',
    power: '190',
    engineSize: '1968',
    doors: '4',
    seats: '5',
    
    // STAN I HISTORIA
    condition: 'używany',
    accidentStatus: 'Nie',
    damageStatus: 'Nie',
    tuning: 'Nie',
    imported: 'Nie',
    registeredInPL: 'Tak',
    firstOwner: 'Nie',
    disabledAdapted: 'Nie',
    
    // LOKALIZACJA
    voivodeship: 'mazowieckie',
    city: 'Warszawa',
    
    // OPCJE SPRZEDAŻY
    sellerType: 'prywatny',
    listingType: 'standardowe',
    purchaseOptions: 'sprzedaż',
    negotiable: 'Tak',
    
    // OPCJONALNE
    headline: 'Audi A4 2.0 TDI Quattro - Idealny stan!',
    vin: '', // opcjonalne
    registrationNumber: '', // opcjonalne
    firstRegistrationDate: '2019-03-15'
  };
  
  // 3. Ścieżki do zdjęć - używamy tylko obsługiwanych formatów (JPEG, JPG, PNG, WEBP)
  const imagePaths = [
    'public/autosell-logo.png',
    'public/favicon-32x32.png',
    'public/favicon-16x16.png',
    'public/autosell-logo.png', // duplikujemy PNG żeby mieć 5 zdjęć
    'public/favicon-32x32.png'  // duplikujemy PNG żeby mieć 5 zdjęć
  ];
  
  // 4. Dodaj ogłoszenie
  const success = await createAdFromForm(cookies, carData, imagePaths);
  
  // 5. Podsumowanie
  if (success) {
    log('\n🎉 OGŁOSZENIE ZOSTAŁO DODANE POMYŚLNIE!', 'green');
  } else {
    log('\n❌ DODAWANIE OGŁOSZENIA NIEUDANE', 'red');
  }
}

/**
 * PRZYKŁAD 2 - Dodawanie ogłoszenia z gotowymi URL-ami zdjęć
 */
async function addCarListingWithUrls() {
  log('🚗 DODAWANIE OGŁOSZENIA Z URL-AMI ZDJĘĆ', 'bright');
  log('=' .repeat(50), 'cyan');
  
  const cookies = await loginUser();
  if (!cookies) return;
  
  const carData = {
    brand: 'BMW',
    model: 'X3',
    year: '2020',
    price: '180000',
    mileage: '45000',
    description: 'BMW X3 w doskonałym stanie, pierwszy właściciel, serwisowany w ASO.',
    fuelType: 'diesel',
    transmission: 'automatyczna',
    bodyType: 'suv',
    color: 'BIAŁY',
    drive: 'AWD',
    condition: 'używany',
    voivodeship: 'śląskie',
    city: 'Katowice',
    sellerType: 'prywatny',
    listingType: 'standardowe',
    purchaseOptions: 'sprzedaż',
    headline: 'BMW X3 - Pierwszy właściciel, ASO',
    
    // URL-e zdjęć (przykład - zmień na prawdziwe)
    images: [
      'https://example.com/bmw-x3-1.jpg',
      'https://example.com/bmw-x3-2.jpg',
      'https://example.com/bmw-x3-3.jpg',
      'https://example.com/bmw-x3-4.jpg',
      'https://example.com/bmw-x3-5.jpg'
    ],
    mainImage: 'https://example.com/bmw-x3-1.jpg'
  };
  
  const success = await createAdFromForm(cookies, carData);
  
  if (success) {
    log('\n🎉 OGŁOSZENIE ZOSTAŁO DODANE POMYŚLNIE!', 'green');
  } else {
    log('\n❌ DODAWANIE OGŁOSZENIA NIEUDANE', 'red');
  }
}

/**
 * FUNKCJA POMOCNICZA - Sprawdzanie błędów w systemie
 */
async function diagnoseSystem() {
  log('🔍 DIAGNOZA SYSTEMU DODAWANIA OGŁOSZEŃ', 'bright');
  log('=' .repeat(50), 'cyan');
  
  // 1. Test połączenia z serwerem
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    if (response.status === 200) {
      log('✅ Serwer działa poprawnie', 'green');
    } else {
      log('⚠️  Serwer odpowiada, ale może mieć problemy', 'yellow');
    }
  } catch (error) {
    log('❌ Serwer nie odpowiada', 'red');
    return;
  }
  
  // 2. Test autoryzacji
  const cookies = await loginUser();
  if (cookies) {
    log('✅ Autoryzacja działa poprawnie', 'green');
  } else {
    log('❌ Problem z autoryzacją', 'red');
    return;
  }
  
  // 3. Test endpointów
  try {
    const testResponse = await fetch(`${API_URL}/ads/stats`, {
      headers: { 'Cookie': cookies }
    });
    
    if (testResponse.status === 200) {
      log('✅ Endpointy ogłoszeń działają', 'green');
    } else {
      log('⚠️  Problemy z endpointami ogłoszeń', 'yellow');
    }
  } catch (error) {
    log('❌ Błąd testowania endpointów', 'red');
  }
  
  log('\n📋 DIAGNOZA ZAKOŃCZONA', 'bright');
}

// GŁÓWNE MENU
function showMenu() {
  log('\n🚗 SKRYPT DODAWANIA OGŁOSZEŃ', 'bright');
  log('=' .repeat(40), 'cyan');
  log('1. Dodaj ogłoszenie z uploadem zdjęć', 'blue');
  log('2. Dodaj ogłoszenie z URL-ami zdjęć', 'blue');
  log('3. Diagnoza systemu', 'blue');
  log('=' .repeat(40), 'cyan');
  log('\n💡 Aby uruchomić konkretną funkcję, odkomentuj odpowiednią linię na końcu pliku', 'yellow');
}

// URUCHOMIENIE
showMenu();

// Odkomentuj jedną z poniższych linii aby uruchomić konkretną funkcję:
addCarListing();           // Dodawanie z uploadem plików
// addCarListingWithUrls();   // Dodawanie z URL-ami
// diagnoseSystem();          // Diagnoza systemu

export { createAdFromForm, loginUser, diagnoseSystem };
