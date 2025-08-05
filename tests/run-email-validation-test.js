/**
 * SIMPLE EMAIL VALIDATION TEST RUNNER
 * 
 * Prosty test runner dla walidacji emaili bez Jest
 */

import mongoose from 'mongoose';
import User from '../models/user/user.js';

// Konfiguracja testowej bazy danych
const MONGODB_TEST_URI = 'mongodb://localhost:27017/marketplace-test-email-validation';

// Kolory dla konsoli
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Funkcje pomocnicze
const log = (message, color = colors.reset) => console.log(`${color}${message}${colors.reset}`);
const success = (message) => log(`✅ ${message}`, colors.green);
const error = (message) => log(`❌ ${message}`, colors.red);
const info = (message) => log(`ℹ️  ${message}`, colors.blue);
const warning = (message) => log(`⚠️  ${message}`, colors.yellow);

// Liczniki testów
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// Funkcja testowa
const test = async (description, testFn) => {
  totalTests++;
  try {
    await testFn();
    success(`${description}`);
    passedTests++;
  } catch (err) {
    error(`${description}`);
    error(`   Error: ${err.message}`);
    failedTests++;
  }
};

// Funkcja expect
const expect = (actual) => ({
  toBe: (expected) => {
    if (actual !== expected) {
      throw new Error(`Expected ${expected}, but got ${actual}`);
    }
  },
  toContain: (expected) => {
    if (!actual.includes(expected)) {
      throw new Error(`Expected "${actual}" to contain "${expected}"`);
    }
  },
  toBeTruthy: () => {
    if (!actual) {
      throw new Error(`Expected truthy value, but got ${actual}`);
    }
  },
  toBeFalsy: () => {
    if (actual) {
      throw new Error(`Expected falsy value, but got ${actual}`);
    }
  }
});

// Główna funkcja testowa
const runEmailValidationTests = async () => {
  info('🧪 Uruchamianie testów walidacji emaili...');
  
  try {
    // Połączenie z bazą danych
    await mongoose.connect(MONGODB_TEST_URI);
    info('📦 Połączono z testową bazą danych');
    
    // Czyszczenie bazy przed testami
    await User.deleteMany({});
    info('🧹 Wyczyszczono bazę danych');
    
    // TESTY WALIDACJI EMAILI
    
    await test('should reject email without @ symbol', async () => {
      const invalidUser = new User({
        name: 'Test',
        lastName: 'User',
        email: 'invalidemail.com', // Brak @
        password: 'TestPassword123',
        phoneNumber: '+48123456789',
        dob: new Date('1990-01-01')
      });

      let validationError;
      try {
        await invalidUser.validate();
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeTruthy();
      expect(validationError.errors.email).toBeTruthy();
      expect(validationError.errors.email.message).toContain('not a valid email');
    });

    await test('should reject email without domain', async () => {
      const invalidUser = new User({
        name: 'Test',
        lastName: 'User',
        email: 'test@', // Brak domeny
        password: 'TestPassword123',
        phoneNumber: '+48123456789',
        dob: new Date('1990-01-01')
      });

      let validationError;
      try {
        await invalidUser.validate();
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeTruthy();
      expect(validationError.errors.email).toBeTruthy();
    });

    await test('should reject email without TLD', async () => {
      const invalidUser = new User({
        name: 'Test',
        lastName: 'User',
        email: 'test@domain', // Brak TLD
        password: 'TestPassword123',
        phoneNumber: '+48123456789',
        dob: new Date('1990-01-01')
      });

      let validationError;
      try {
        await invalidUser.validate();
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeTruthy();
      expect(validationError.errors.email).toBeTruthy();
    });

    await test('should reject email with spaces', async () => {
      const invalidUser = new User({
        name: 'Test',
        lastName: 'User',
        email: 'test @domain.com', // Spacja w emailu
        password: 'TestPassword123',
        phoneNumber: '+48123456789',
        dob: new Date('1990-01-01')
      });

      let validationError;
      try {
        await invalidUser.validate();
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeTruthy();
      expect(validationError.errors.email).toBeTruthy();
    });

    await test('should reject empty email', async () => {
      const invalidUser = new User({
        name: 'Test',
        lastName: 'User',
        email: '', // Pusty email
        password: 'TestPassword123',
        phoneNumber: '+48123456789',
        dob: new Date('1990-01-01')
      });

      let validationError;
      try {
        await invalidUser.validate();
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeTruthy();
      expect(validationError.errors.email).toBeTruthy();
    });

    await test('should accept valid email format', async () => {
      const validUser = new User({
        name: 'Test',
        lastName: 'User',
        email: 'test@example.com', // Poprawny email
        password: 'TestPassword123',
        phoneNumber: '+48123456789',
        dob: new Date('1990-01-01')
      });

      let validationError;
      try {
        await validUser.validate();
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeFalsy();
    });

    await test('should accept email with subdomain', async () => {
      const validUser = new User({
        name: 'Test',
        lastName: 'User',
        email: 'test@mail.example.com', // Email z subdomeną
        password: 'TestPassword123',
        phoneNumber: '+48123456790',
        dob: new Date('1990-01-01')
      });

      let validationError;
      try {
        await validUser.validate();
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeFalsy();
    });

    await test('should accept complex valid email', async () => {
      const validUser = new User({
        name: 'Test',
        lastName: 'User',
        email: 'test.user+123@example-domain.co.uk', // Złożony ale poprawny email
        password: 'TestPassword123',
        phoneNumber: '+48123456791',
        dob: new Date('1990-01-01')
      });

      let validationError;
      try {
        await validUser.validate();
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeFalsy();
    });

  } catch (err) {
    error(`Błąd podczas testów: ${err.message}`);
  } finally {
    // Zamknięcie połączenia z bazą danych
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    info('🔌 Zamknięto połączenie z bazą danych');
  }

  // Podsumowanie
  console.log('\n' + '='.repeat(50));
  info(`📊 PODSUMOWANIE TESTÓW:`);
  info(`   Wszystkie testy: ${totalTests}`);
  success(`   Zaliczone: ${passedTests}`);
  if (failedTests > 0) {
    error(`   Niezaliczone: ${failedTests}`);
  }
  
  if (failedTests === 0) {
    success('🎉 Wszystkie testy walidacji emaili przeszły pomyślnie!');
    success('✅ Walidacja emaili w schemacie użytkownika działa poprawnie');
  } else {
    error('💥 Niektóre testy nie przeszły - sprawdź walidację emaili');
  }
  console.log('='.repeat(50));

  // Kod wyjścia
  process.exit(failedTests > 0 ? 1 : 0);
};

// Uruchomienie testów
runEmailValidationTests().catch(err => {
  error(`Krytyczny błąd: ${err.message}`);
  process.exit(1);
});
