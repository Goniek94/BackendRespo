/**
 * Walidacja danych dla tworzenia ogłoszeń
 */

import User from '../../../../models/user/user.js';

/**
 * Walidacja i pobieranie danych użytkownika
 */
export const validateAndGetUser = async (userId) => {
  console.log('=== WALIDACJA UŻYTKOWNIKA ===');
  console.log('ID użytkownika:', userId);
  
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('Użytkownik nie znaleziony');
  }
  
  console.log('Użytkownik znaleziony:', user.name, user.email);
  return user;
};

/**
 * Walidacja wymaganych pól ogłoszenia
 */
export const validateRequiredFields = (mappedData) => {
  console.log('=== WALIDACJA WYMAGANYCH PÓL ===');
  
  const requiredFields = [
    'brand', 'model', 'year', 'price', 'mileage', 
    'fuelType', 'transmission', 'headline', 'description',
    'voivodeship', 'city'
  ];
  
  const missingFields = [];
  
  for (const field of requiredFields) {
    if (!mappedData[field] || mappedData[field] === '') {
      missingFields.push(field);
    }
  }
  
  if (missingFields.length > 0) {
    throw new Error(`Brakujące wymagane pola: ${missingFields.join(', ')}`);
  }
  
  console.log('Wszystkie wymagane pola są wypełnione');
  return true;
};

/**
 * Walidacja wartości numerycznych
 */
export const validateNumericFields = (mappedData) => {
  console.log('=== WALIDACJA WARTOŚCI NUMERYCZNYCH ===');
  
  // Walidacja roku
  const currentYear = new Date().getFullYear();
  if (mappedData.year < 1900 || mappedData.year > currentYear + 1) {
    throw new Error(`Rok produkcji musi być między 1900 a ${currentYear + 1}`);
  }
  
  // Walidacja ceny
  if (mappedData.price <= 0) {
    throw new Error('Cena musi być większa od 0');
  }
  
  // Walidacja przebiegu
  if (mappedData.mileage < 0) {
    throw new Error('Przebieg nie może być ujemny');
  }
  
  // Walidacja mocy (jeśli podana)
  if (mappedData.power && (mappedData.power <= 0 || mappedData.power > 2000)) {
    throw new Error('Moc musi być między 1 a 2000 KM');
  }
  
  // Walidacja pojemności silnika (jeśli podana)
  if (mappedData.engineSize && (mappedData.engineSize <= 0 || mappedData.engineSize > 10000)) {
    throw new Error('Pojemność silnika musi być między 1 a 10000 cm³');
  }
  
  console.log('Walidacja wartości numerycznych zakończona pomyślnie');
  return true;
};

/**
 * Generowanie daty wygaśnięcia ogłoszenia
 */
export const generateExpirationDate = (user) => {
  console.log('=== GENEROWANIE DATY WYGAŚNIĘCIA ===');
  
  let expiresAt = null;
  if (user.role !== 'admin' && user.role !== 'moderator') {
    // Zwykłe ogłoszenia wygasają po 30 dniach od utworzenia
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    console.log('Data wygaśnięcia ustawiona na:', expiresAt);
  } else {
    console.log('Ogłoszenie administratora/moderatora - bez daty wygaśnięcia');
  }
  
  return expiresAt;
};

/**
 * Określenie statusu ogłoszenia na podstawie roli użytkownika
 */
export const determineAdStatus = (user) => {
  console.log('=== OKREŚLANIE STATUSU OGŁOSZENIA ===');
  
  const status = (user.role === 'admin' || user.role === 'moderator') ? 'active' : 'pending';
  console.log('Status ogłoszenia:', status);
  
  return status;
};
