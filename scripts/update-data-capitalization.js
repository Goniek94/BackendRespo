/**
 * Skrypt do aktualizacji kapitalizacji danych w bazie danych
 * Aktualizuje istniejące ogłoszenia, aby wartości jak "tak", "nie", "prywatny" były z dużej litery
 */

import mongoose from 'mongoose';
import Ad from '../models/listings/ad.js';

// Połączenie z bazą danych
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/marketplace', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Połączono z bazą danych MongoDB');
  } catch (error) {
    console.error('Błąd połączenia z bazą danych:', error);
    process.exit(1);
  }
};

// Funkcje kapitalizacji
const capitalizeBooleanValue = (value) => {
  if (!value) return value;
  const lowerValue = value.toLowerCase();
  if (lowerValue === 'tak') return 'Tak';
  if (lowerValue === 'nie') return 'Nie';
  if (lowerValue === 'prywatny') return 'Prywatny';
  if (lowerValue === 'sprzedaż') return 'Sprzedaż';
  return value;
};

const capitalizeAccidentStatus = (value) => {
  if (!value) return value;
  const lowerValue = value.toLowerCase();
  if (lowerValue === 'bezwypadkowy') return 'Bezwypadkowy';
  if (lowerValue === 'powypadkowy') return 'Powypadkowy';
  if (lowerValue === 'tak') return 'Tak';
  if (lowerValue === 'nie') return 'Nie';
  return value;
};

const capitalizeDamageStatus = (value) => {
  if (!value) return value;
  const lowerValue = value.toLowerCase();
  if (lowerValue === 'nieuszkodzony') return 'Nieuszkodzony';
  if (lowerValue === 'uszkodzony') return 'Uszkodzony';
  if (lowerValue === 'tak') return 'Tak';
  if (lowerValue === 'nie') return 'Nie';
  return value;
};

const capitalizeCondition = (value) => {
  if (!value) return value;
  const lowerValue = value.toLowerCase();
  if (lowerValue === 'nowy') return 'Nowy';
  if (lowerValue === 'używany' || lowerValue === 'uzywany') return 'Używany';
  return value;
};

const capitalizePurchaseOptions = (value) => {
  if (!value) return value;
  const lowerValue = value.toLowerCase();
  if (lowerValue === 'sprzedaż' || lowerValue === 'sprzedaz') return 'Sprzedaż';
  if (lowerValue === 'faktura vat') return 'Faktura VAT';
  if (lowerValue === 'inne') return 'Inne';
  return value;
};

// Główna funkcja aktualizacji
const updateDataCapitalization = async () => {
  try {
    console.log('Rozpoczynam aktualizację kapitalizacji danych...');
    
    // Pobierz wszystkie ogłoszenia
    const ads = await Ad.find({});
    console.log(`Znaleziono ${ads.length} ogłoszeń do aktualizacji`);
    
    let updatedCount = 0;
    
    for (const ad of ads) {
      let hasChanges = false;
      const updates = {};
      
      // Aktualizuj pola techniczne
      if (ad.condition) {
        const newCondition = capitalizeCondition(ad.condition);
        if (newCondition !== ad.condition) {
          updates.condition = newCondition;
          hasChanges = true;
        }
      }
      
      if (ad.accidentStatus) {
        const newAccidentStatus = capitalizeAccidentStatus(ad.accidentStatus);
        if (newAccidentStatus !== ad.accidentStatus) {
          updates.accidentStatus = newAccidentStatus;
          hasChanges = true;
        }
      }
      
      if (ad.damageStatus) {
        const newDamageStatus = capitalizeDamageStatus(ad.damageStatus);
        if (newDamageStatus !== ad.damageStatus) {
          updates.damageStatus = newDamageStatus;
          hasChanges = true;
        }
      }
      
      // Pola boolean-like
      const booleanFields = ['tuning', 'imported', 'registeredInPL', 'firstOwner', 'disabledAdapted', 'negotiable'];
      for (const field of booleanFields) {
        if (ad[field]) {
          const newValue = capitalizeBooleanValue(ad[field]);
          if (newValue !== ad[field]) {
            updates[field] = newValue;
            hasChanges = true;
          }
        }
      }
      
      // Opcje zakupu
      if (ad.purchaseOptions) {
        const newPurchaseOptions = capitalizePurchaseOptions(ad.purchaseOptions);
        if (newPurchaseOptions !== ad.purchaseOptions) {
          updates.purchaseOptions = newPurchaseOptions;
          hasChanges = true;
        }
      }
      
      // Jeśli są zmiany, zaktualizuj ogłoszenie
      if (hasChanges) {
        await Ad.findByIdAndUpdate(ad._id, updates);
        updatedCount++;
        console.log(`Zaktualizowano ogłoszenie ${ad._id}: ${JSON.stringify(updates)}`);
      }
    }
    
    console.log(`\nAktualizacja zakończona!`);
    console.log(`Zaktualizowano ${updatedCount} z ${ads.length} ogłoszeń`);
    
  } catch (error) {
    console.error('Błąd podczas aktualizacji danych:', error);
  }
};

// Uruchom skrypt
const runScript = async () => {
  await connectDB();
  await updateDataCapitalization();
  await mongoose.connection.close();
  console.log('Połączenie z bazą danych zostało zamknięte');
  process.exit(0);
};

runScript();
