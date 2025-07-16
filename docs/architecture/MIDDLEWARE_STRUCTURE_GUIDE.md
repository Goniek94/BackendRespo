# 🛡️ Middleware Structure Guide

## 📋 Przegląd

Ten przewodnik opisuje zorganizowaną strukturę middleware w Marketplace Backend, która została przeprojektowana dla lepszej skalowalności i maintainability.

## 🏗️ Struktura Katalogów

```
middleware/
├── index.js                    # Główny punkt eksportu
├── auth/                       # Autoryzacja i uwierzytelnianie
│   ├── index.js               # Eksport auth middleware
│   ├── auth.js                # Główne middleware uwierzytelniania
│   └── roleMiddleware.js      # Middleware ról użytkowników
├── validation/                 # Walidacja danych
│   ├── index.js               # Eksport validation middleware
│   └── validate.js            # Główne middleware walidacji
├── processing/                 # Przetwarzanie danych
│   ├── index.js               # Eksport processing middleware
│   └── imageProcessor.js      # Przetwarzanie obrazów
└── errors/                     # Obsługa błędów
    ├── index.js               # Eksport error middleware
    └── errorHandler.js        # Główny handler błędów
```

## 📦 Kategorie Middleware

### 🔐 Auth (Uwierzytelnianie i Autoryzacja)

**Lokalizacja:** `middleware/auth/`

**Zawiera:**
- `auth.js` - Główne middleware uwierzytelniania JWT
- `roleMiddleware.js` - Kontrola dostępu oparta na rolach

**Użycie:**
```javascript
const { auth } = require('../middleware');

// Podstawowe uwierzytelnianie
router.use(auth.requireAuth);

// Wymaganie roli administratora
router.use(auth.requireAdmin);

// Wymaganie roli moderatora lub administratora
router.use(auth.requireModerator);
```

### ✅ Validation (Walidacja)

**Lokalizacja:** `middleware/validation/`

**Zawiera:**
- `validate.js` - Middleware walidacji schematów

**Użycie:**
```javascript
const { validation } = require('../middleware');

// Walidacja body requestu
router.post('/users', validation.validateBody(userSchema), controller.createUser);

// Walidacja query parametrów
router.get('/users', validation.validateQuery(querySchema), controller.getUsers);

// Walidacja parametrów URL
router.get('/users/:id', validation.validateParams(paramsSchema), controller.getUser);
```

### ⚙️ Processing (Przetwarzanie)

**Lokalizacja:** `middleware/processing/`

**Zawiera:**
- `imageProcessor.js` - Przetwarzanie i optymalizacja obrazów

**Użycie:**
```javascript
const { processing } = require('../middleware');

// Przetwarzanie uploadowanych obrazów
router.post('/upload', processing.processImages, controller.handleUpload);
```

### 🚨 Errors (Obsługa Błędów)

**Lokalizacja:** `middleware/errors/`

**Zawiera:**
- `errorHandler.js` - Centralna obsługa błędów aplikacji

**Użycie:**
```javascript
const { errors } = require('../middleware');

// Na końcu wszystkich routes
app.use(errors.handleErrors);
```

## 🔄 Import i Eksport

### Główny Index (`middleware/index.js`)

Centralny punkt eksportu wszystkich middleware:

```javascript
const middleware = require('./middleware');

// Dostęp do kategorii
middleware.auth.requireAuth
middleware.validation.validate
middleware.processing.processImages
middleware.errors.handleErrors

// Lub bezpośrednie convenience exports
middleware.requireAuth
middleware.validate
middleware.processImages
middleware.handleErrors
```

### Kategorie Index

Każda kategoria ma swój własny `index.js`:

```javascript
// middleware/auth/index.js
module.exports = {
  auth,
  roleMiddleware,
  requireAuth: auth,
  requireAdmin: (req, res, next) => roleMiddleware(['admin'])(req, res, next),
  requireModerator: (req, res, next) => roleMiddleware(['admin', 'moderator'])(req, res, next),
};
```

## 🎯 Wzorce Użycia

### 1. Import w Routes

```javascript
// routes/userRoutes.js
const { auth, validation } = require('../middleware');

router.post('/users', 
  validation.validateBody(createUserSchema),
  auth.requireAdmin,
  userController.createUser
);
```

### 2. Import w App.js

```javascript
// index.js lub app.js
const middleware = require('./middleware');

// Globalne middleware
app.use(middleware.auth.requireAuth);
app.use(middleware.errors.handleErrors);
```

### 3. Conditional Middleware

```javascript
const { auth } = require('../middleware');

// Warunkowo wymagaj uwierzytelniania
const conditionalAuth = (req, res, next) => {
  if (req.path.startsWith('/admin')) {
    return auth.requireAdmin(req, res, next);
  }
  next();
};
```

## 🔧 Rozszerzanie Struktury

### Dodawanie Nowej Kategorii

1. **Utwórz katalog:** `middleware/newCategory/`
2. **Dodaj pliki middleware:** `middleware/newCategory/someMiddleware.js`
3. **Utwórz index:** `middleware/newCategory/index.js`
4. **Zaktualizuj główny index:** `middleware/index.js`

```javascript
// middleware/newCategory/index.js
const someMiddleware = require('./someMiddleware');

module.exports = {
  someMiddleware,
  // convenience exports
};

// middleware/index.js
const newCategory = require('./newCategory');

module.exports = {
  // ... existing categories
  newCategory,
  
  // convenience exports
  someMiddleware: newCategory.someMiddleware,
};
```

### Dodawanie Middleware do Istniejącej Kategorii

1. **Utwórz plik:** `middleware/existingCategory/newMiddleware.js`
2. **Zaktualizuj index kategorii:** `middleware/existingCategory/index.js`

```javascript
// middleware/existingCategory/index.js
const existingMiddleware = require('./existingMiddleware');
const newMiddleware = require('./newMiddleware');

module.exports = {
  existingMiddleware,
  newMiddleware,
  // convenience exports
};
```

## 📋 Najlepsze Praktyki

### 1. Nazewnictwo

- **Pliki:** camelCase (`imageProcessor.js`)
- **Eksporty:** camelCase (`requireAuth`)
- **Katalogi:** lowercase (`auth`, `validation`)

### 2. Dokumentacja

Każdy middleware powinien mieć:
- JSDoc komentarze
- Opis parametrów
- Przykłady użycia
- Informacje o błędach

### 3. Error Handling

```javascript
const someMiddleware = (req, res, next) => {
  try {
    // middleware logic
    next();
  } catch (error) {
    next(error); // Przekaż błąd do error handler
  }
};
```

### 4. Async Middleware

```javascript
const asyncMiddleware = async (req, res, next) => {
  try {
    await someAsyncOperation();
    next();
  } catch (error) {
    next(error);
  }
};
```

## 🔍 Testowanie

### Unit Tests

```javascript
// tests/middleware/auth.test.js
const { auth } = require('../../middleware');

describe('Auth Middleware', () => {
  test('should authenticate valid token', async () => {
    // test implementation
  });
});
```

### Integration Tests

```javascript
// tests/integration/middleware.test.js
const request = require('supertest');
const app = require('../../app');

describe('Middleware Integration', () => {
  test('should require authentication for protected routes', async () => {
    // test implementation
  });
});
```

## 🚀 Migracja z Poprzedniej Struktury

### Przed Reorganizacją

```javascript
// Stara struktura
const auth = require('./middleware/auth');
const validate = require('./middleware/validate');
const errorHandler = require('./middleware/errorHandler');
```

### Po Reorganizacji

```javascript
// Nowa struktura
const { auth, validation, errors } = require('./middleware');

// Lub
const middleware = require('./middleware');
```

## 📈 Korzyści Nowej Struktury

1. **Lepsze Grupowanie** - Logiczne kategorie middleware
2. **Łatwiejsze Importy** - Centralne punkty eksportu
3. **Skalowalność** - Łatwe dodawanie nowych middleware
4. **Maintainability** - Czytelna organizacja kodu
5. **Reusability** - Convenience exports dla częstych przypadków

---

**Ostatnia aktualizacja:** 16.07.2025  
**Wersja:** 2.0.0  
**Status:** Aktywna
