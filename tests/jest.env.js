/**
 * JEST ENVIRONMENT SETUP
 * 
 * Konfiguracja zmiennych środowiskowych dla testów
 */

// Ustawienie zmiennych środowiskowych dla testów
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-testing-only';
process.env.MONGODB_TEST_URI = 'mongodb://localhost:27017/marketplace-test';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.PORT = '5001';

// Wyłączenie logowania w testach
process.env.LOG_LEVEL = 'error';

// Mock dla zewnętrznych serwisów
process.env.MOCK_EMAIL = 'true';
process.env.MOCK_SMS = 'true';
process.env.MOCK_PAYMENTS = 'true';

console.log('🧪 Jest environment variables loaded');
