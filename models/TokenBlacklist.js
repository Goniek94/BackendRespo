/**
 * Token blacklist for JWT rotation using MongoDB.
 * Provides persistent storage for blacklisted tokens with automatic cleanup.
 */
import TokenBlacklistDB from './TokenBlacklistDB.js';

// Sprawdź czy połączenie z bazą danych jest aktywne
const isDbConnected = () => {
  return !!TokenBlacklistDB.db && TokenBlacklistDB.db.readyState === 1;
};

// Fallback in-memory cache dla szybszego sprawdzania (bez ciągłego odpytywania DB)
const memoryCache = new Set();

/**
 * Dodaje token do blacklisty
 * @param {string} token - Token JWT do unieważnienia
 * @param {Object} options - Opcje dodatkowe
 * @param {string} options.reason - Powód unieważnienia tokenu
 * @param {string} options.userId - ID użytkownika, którego dotyczy token
 * @returns {Promise} - Promise rozwiązywane po dodaniu tokenu
 */
export const addToBlacklist = async (token, options = {}) => {
  try {
    // Dodaj do pamięci podręcznej
    memoryCache.add(token);
    
    // Sprawdź czy baza danych jest podłączona
    if (isDbConnected()) {
      // Dodaj do bazy danych
      await TokenBlacklistDB.create({
        token,
        reason: options.reason || 'OTHER',
        userId: options.userId || null
      });
    } else {
      console.warn('Baza danych nie jest podłączona. Token dodany tylko do pamięci podręcznej.');
    }
    
    return true;
  } catch (error) {
    console.error('Błąd podczas dodawania tokenu do blacklisty:', error);
    // Nawet jeśli DB zawiedzie, token jest w pamięci
    return false;
  }
};

/**
 * Sprawdza czy token jest na blackliście
 * @param {string} token - Token JWT do sprawdzenia
 * @returns {Promise<boolean>} - Promise rozwiązywane wartością boolean
 */
export const isBlacklisted = async (token) => {
  // Szybkie sprawdzenie w pamięci
  if (memoryCache.has(token)) {
    return true;
  }
  
  // Jeśli baza danych nie jest podłączona, zwróć wynik z pamięci
  if (!isDbConnected()) {
    console.warn('Baza danych nie jest podłączona. Sprawdzanie tokenu tylko w pamięci podręcznej.');
    return memoryCache.has(token);
  }
  
  try {
    // Sprawdzenie w bazie danych
    const blacklistedToken = await TokenBlacklistDB.findOne({ token });
    
    // Jeśli token jest w DB, dodaj go do pamięci podręcznej
    if (blacklistedToken) {
      memoryCache.add(token);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Błąd podczas sprawdzania tokenu w blackliście:', error);
    // W przypadku błędu DB, zwracamy wynik z pamięci
    return memoryCache.has(token);
  }
};

/**
 * Czyści blacklistę (tylko do celów testowych)
 * @returns {Promise} - Promise rozwiązywane po wyczyszczeniu blacklisty
 */
export const clearBlacklist = async () => {
  try {
    // Czyścimy pamięć podręczną
    memoryCache.clear();
    
    // Sprawdź czy baza danych jest podłączona
    if (isDbConnected()) {
      // Czyścimy bazę danych
      await TokenBlacklistDB.deleteMany({});
    } else {
      console.warn('Baza danych nie jest podłączona. Wyczyszczono tylko pamięć podręczną.');
    }
    
    return true;
  } catch (error) {
    console.error('Błąd podczas czyszczenia blacklisty:', error);
    return false;
  }
};

// Dla zachowania kompatybilności wstecznej
export default {
  addToBlacklist,
  isBlacklisted,
  clearBlacklist,
};
