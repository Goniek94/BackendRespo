# Models Structure Guide

## Przegląd

Modele zostały zorganizowane w logiczne kategorie dla lepszej struktury i łatwości zarządzania.

## Struktura Folderów

```
models/
├── index.js                    # Główny punkt eksportu wszystkich modeli
├── user/                       # Modele związane z użytkownikami
│   ├── index.js
│   └── user.js
├── listings/                   # Modele związane z ogłoszeniami
│   ├── index.js
│   ├── ad.js
│   └── comment.js
├── payments/                   # Modele związane z płatnościami
│   ├── index.js
│   ├── payment.js
│   ├── Transaction.js
│   └── TransactionHistory.js
├── communication/              # Modele związane z komunikacją
│   ├── index.js
│   ├── message.js
│   └── notification.js
├── security/                   # Modele związane z bezpieczeństwem
│   ├── index.js
│   ├── TokenBlacklist.js
│   └── TokenBlacklistDB.js
├── admin/                      # Modele związane z administracją
│   ├── index.js
│   └── report.js
└── schemas/                    # Schematy walidacji
    ├── basicInfoSchema.js
    ├── metadataSchema.js
    ├── ownerInfoSchema.js
    ├── statisticsSchema.js
    └── technicalDetailsSchema.js
```

## Sposób Importowania

### Nowy sposób (zalecany):

```javascript
// Import z kategorii
import { User } from '../models/user/index.js';
import { Ad, Comment } from '../models/listings/index.js';
import { Payment, Transaction } from '../models/payments/index.js';
import { Message, Notification } from '../models/communication/index.js';
import { TokenBlacklist } from '../models/security/index.js';
import { Report } from '../models/admin/index.js';

// Lub import z głównego index
import { User, Ad, Payment, Message } from '../models/index.js';
```

### Stary sposób (nadal działa):

```javascript
// Dla kompatybilności wstecznej
import User from '../models/user/user.js';
import Ad from '../models/listings/ad.js';
import Payment from '../models/payments/payment.js';
```

## Kategorie Modeli

### 👤 User Models (`models/user/`)
- **user.js** - Model użytkownika

### 📋 Listings Models (`models/listings/`)
- **ad.js** - Model ogłoszenia
- **comment.js** - Model komentarza

### 💳 Payments Models (`models/payments/`)
- **payment.js** - Model płatności
- **Transaction.js** - Model transakcji
- **TransactionHistory.js** - Historia transakcji

### 💬 Communication Models (`models/communication/`)
- **message.js** - Model wiadomości
- **notification.js** - Model powiadomień

### 🔒 Security Models (`models/security/`)
- **TokenBlacklist.js** - Czarna lista tokenów
- **TokenBlacklistDB.js** - Baza danych czarnej listy

### ⚙️ Admin Models (`models/admin/`)
- **report.js** - Model raportów

### 📝 Schemas (`models/schemas/`)
- Schematy walidacji dla różnych części aplikacji

## Korzyści Nowej Struktury

1. **Lepsze Zorganizowanie** - Modele pogrupowane logicznie
2. **Łatwiejsze Zarządzanie** - Szybsze znajdowanie odpowiednich modeli
3. **Skalowalne** - Łatwe dodawanie nowych modeli do odpowiednich kategorii
4. **Kompatybilność Wsteczna** - Stare importy nadal działają
5. **Czytelność Kodu** - Jasne, gdzie znajdować konkretne modele

## Dodawanie Nowych Modeli

1. Umieść nowy model w odpowiedniej kategorii
2. Dodaj export w `index.js` tej kategorii
3. Dodaj export w głównym `models/index.js`
4. Zaktualizuj dokumentację

## Przykłady Użycia

```javascript
// Przykład kontrolera używającego nowe importy
import { User } from '../models/user/index.js';
import { Ad } from '../models/listings/index.js';
import { Payment } from '../models/payments/index.js';

// Lub wszystko z jednego miejsca
import { User, Ad, Payment } from '../models/index.js';

export const getUserAds = async (req, res) => {
  const user = await User.findById(req.user.id);
  const ads = await Ad.find({ userId: user._id });
  res.json({ user, ads });
};
