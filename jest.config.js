/**
 * JEST CONFIGURATION
 * 
 * Konfiguracja Jest dla testów backendu Marketplace
 * Obsługuje ES modules i MongoDB
 */

export default {
  // Obsługa ES modules
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(supertest|mongodb-memory-server)/)'
  ],
  
  // Środowisko testowe
  testEnvironment: 'node',
  
  // Wzorce plików testowych
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  
  // Ignorowane foldery
  testPathIgnorePatterns: [
    '/node_modules/',
    '/uploads/',
    '/logs/',
    '/backups/'
  ],
  
  // Setup pliki
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Timeout dla testów
  testTimeout: 30000,
  
  // Pokrycie kodu
  collectCoverage: false,
  collectCoverageFrom: [
    'controllers/**/*.js',
    'models/**/*.js',
    'middleware/**/*.js',
    'routes/**/*.js',
    'utils/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/coverage/**'
  ],
  
  // Reporter
  reporters: ['default'],
  
  // Zmienne środowiskowe dla testów
  setupFiles: ['<rootDir>/tests/jest.env.js'],
  
  // Verbose output
  verbose: true,
  
  // Maksymalna liczba workerów
  maxWorkers: 4,
  
  // Czyszczenie mocków między testami
  clearMocks: true,
  restoreMocks: true,
  
  // Transformacje
  transform: {},
  
  // Rozszerzenia plików
  moduleFileExtensions: ['js', 'json'],
  
};
