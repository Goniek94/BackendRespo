# Routes Structure Guide

## 📁 Nowa Struktura Routes

Struktura routes została zreorganizowana w logiczne kategorie dla lepszej czytelności i łatwości zarządzania.

### 🗂️ Struktura Folderów

```
routes/
├── index.js                    # Główny plik routingu z importami
├── user/                       # Routes związane z użytkownikami
│   ├── index.js               # Eksport wszystkich user routes
│   └── userRoutes.js          # Główne routes użytkowników
├── listings/                   # Routes związane z ogłoszeniami
│   ├── index.js               # Eksport wszystkich listing routes
│   ├── adRoutes.js            # Routes ogłoszeń
│   ├── commentRoutes.js       # Routes komentarzy
│   ├── favoriteRoutes.js      # Routes ulubionych
│   └── statsRoutes.js         # Routes statystyk
├── media/                      # Routes związane z mediami
│   ├── index.js               # Eksport wszystkich media routes
│   └── imageRoutes.js         # Routes obrazów
├── communication/              # Routes komunikacji
│   ├── index.js               # Eksport wszystkich communication routes
│   └── messagesRoutes.js      # Routes wiadomości
├── notifications/              # Routes powiadomień
│   ├── index.js               # Eksport wszystkich notification routes
│   └── notificationRoutes.js  # Routes powiadomień
├── payments/                   # Routes płatności
│   ├── index.js               # Eksport wszystkich payment routes
│   ├── paymentRoutes.js       # Routes płatności
│   └── transactionRoutes.js   # Routes transakcji
├── admin/                      # Routes administracyjne
│   ├── index.js               # Eksport wszystkich admin routes
│   └── adminRoutes.js         # Routes panelu admin
└── external/                   # Routes zewnętrznych API
    ├── index.js               # Eksport wszystkich external routes
    └── cepikRoutes.js         # Routes CEPIK API
```

### 🔄 Kategorie Routes

#### 👤 User Routes (`/user/`)
- **userRoutes.js** - Rejestracja, logowanie, profil, ustawienia

#### 📋 Listings Routes (`/listings/`)
- **adRoutes.js** - CRUD operacje na ogłoszeniach
- **commentRoutes.js** - System komentarzy
- **favoriteRoutes.js** - Zarządzanie ulubionymi
- **statsRoutes.js** - Statystyki ogłoszeń

#### 🖼️ Media Routes (`/media/`)
- **imageRoutes.js** - Upload i zarządzanie obrazami

#### 💬 Communication Routes (`/communication/`)
- **messagesRoutes.js** - Prywatne wiadomości między użytkownikami

#### 🔔 Notifications Routes (`/notifications/`)
- **notificationRoutes.js** - Powiadomienia i alerty

#### 💳 Payments Routes (`/payments/`)
- **paymentRoutes.js** - Przetwarzanie płatności
- **transactionRoutes.js** - Historia transakcji

#### 🛠️ Admin Routes (`/admin/`)
- **adminRoutes.js** - Panel administracyjny (legacy)

#### 🌐 External Routes (`/external/`)
- **cepikRoutes.js** - Integracja z bazą CEPIK

### 📦 Pliki Index

Każdy folder zawiera plik `index.js` który:
- Eksportuje wszystkie routes z danej kategorii
- Zapewnia backward compatibility
- Umożliwia łatwy import całych modułów

```javascript
// Przykład: routes/user/index.js
export { default as userRoutes } from './userRoutes.js';
export { default } from './userRoutes.js';
```

### 🔗 Import Routes

#### Nowy sposób (zalecany):
```javascript
// Import konkretnych routes
import userRoutes from './user/userRoutes.js';
import adRoutes from './listings/adRoutes.js';

// Import całych modułów
import * as userRoutesModule from './user/index.js';
import * as listingsRoutesModule from './listings/index.js';
```

#### Stary sposób (nadal działa):
```javascript
// Backward compatibility
import userRoutes from './userRoutes.js';
import adRoutes from './adRoutes.js';
```

### 🚀 Korzyści Nowej Struktury

1. **Lepsze Zorganizowanie** - Logiczne grupowanie powiązanych routes
2. **Łatwiejsze Znajdowanie** - Intuicyjna struktura folderów
3. **Modularność** - Każda kategoria jest niezależnym modułem
4. **Skalowalność** - Łatwe dodawanie nowych routes w odpowiednich kategoriach
5. **Backward Compatibility** - Stare importy nadal działają
6. **Czytelność Kodu** - Jasne rozdzielenie odpowiedzialności

### 📝 Konwencje Nazewnictwa

- **Foldery**: Liczba mnoga, małe litery (np. `users`, `listings`)
- **Pliki**: camelCase z sufiksem `Routes.js` (np. `userRoutes.js`)
- **Eksporty**: Konsystentne nazewnictwo w plikach index

### 🔄 Migracja

Przy dodawaniu nowych routes:
1. Umieść plik w odpowiedniej kategorii
2. Dodaj eksport do pliku `index.js` w tej kategorii
3. Zaktualizuj główny `routes/index.js` jeśli potrzeba
4. Zachowaj backward compatibility dla istniejących importów

### 🛡️ Bezpieczeństwo

Każda kategoria routes może mieć swoje własne:
- Middleware autoryzacji
- Walidatory
- Rate limiting
- Logowanie

Ta struktura ułatwia implementację bezpieczeństwa na poziomie kategorii.
