# 🔴 ANALIZA PROBLEMÓW SYSTEMU PŁATNOŚCI TPAY

## Data analizy: 2025-12-20

---

## ❌ ZIDENTYFIKOWANE PROBLEMY

### 1. **DUPLIKACJA ROUTINGU PŁATNOŚCI** ⚠️ KRYTYCZNE

**Problem:** Masz DWA różne pliki routingu dla płatności:

- `routes/payments/paymentRoutes.js` - stary, z symulacją
- `routes/payments/transactionRoutes.js` - nowy, z prawdziwą integracją Tpay

**Skutek:**

- Konflikty w endpointach
- Frontend może wywoływać złe API
- Webhook Tpay może nie działać

**Lokalizacja:**

```
routes/payments/paymentRoutes.js - STARY (DO USUNIĘCIA)
routes/payments/transactionRoutes.js - NOWY (PRAWIDŁOWY)
```

---

### 2. **BŁĘDNY URL WEBHOOKA W SERWISIE TPAY** ⚠️ KRYTYCZNE

**Problem:** W `services/tpay/tpayService.js` linia 42:

```javascript
const notificationUrl = `${process.env.API_URL}/payments/tpay/webhook`;
```

**Powinno być:**

```javascript
const notificationUrl = `${process.env.API_URL}/api/transactions/webhook/tpay`;
```

**Dlaczego:**

- Routing w `transactionRoutes.js` definiuje webhook jako `/webhook/tpay`
- Główny routing montuje to pod `/api/transactions`
- Pełny URL: `/api/transactions/webhook/tpay`

---

### 3. **BRAK WALUTY W MODELU TRANSACTION** ⚠️ ŚREDNIE

**Problem:** Model `Transaction.js` nie ma pola `currency`, ale kontroler próbuje go użyć:

```javascript
// W transactionController.js linia 67:
currency: "PLN",
```

**Skutek:** Pole nie jest zapisywane w bazie danych

---

### 4. **NIEPRAWIDŁOWA METODA PŁATNOŚCI W MODELU** ⚠️ ŚREDNIE

**Problem:** Model `Transaction.js` ma enum dla `paymentMethod`:

```javascript
enum: ["card", "blik", "transfer", "paypal", "przelewy24", "payu"];
```

Ale kontroler używa:

```javascript
paymentMethod: "tpay"; // ❌ NIE MA W ENUM!
```

**Skutek:** Walidacja Mongoose odrzuci zapis

---

### 5. **BRAK POLA `paidAt` W MODELU** ⚠️ ŚREDNIE

**Problem:** Kontroler próbuje zapisać `paidAt`:

```javascript
transaction.paidAt = new Date();
```

Ale model nie ma tego pola zdefiniowanego.

---

### 6. **BRAK POLA `providerId` W MODELU** ⚠️ ŚREDNIE

**Problem:** Kontroler próbuje zapisać ID z Tpay:

```javascript
transaction.providerId = tpayData.transactionId;
```

Ale model nie ma tego pola.

---

### 7. **NIEPRAWIDŁOWE DANE DO FAKTURY** ⚠️ NISKIE

**Problem:** Model nie ma pola `invoiceDetails`, ale kontroler próbuje go użyć:

```javascript
invoiceDetails: invoiceData || {},
```

---

## ✅ ROZWIĄZANIA

### Priorytet 1: ROUTING

1. ✅ Usuń stary `paymentRoutes.js` lub oznacz jako deprecated
2. ✅ Popraw URL webhooka w `tpayService.js`
3. ✅ Upewnij się, że frontend wywołuje `/api/transactions/tpay/initiate`

### Priorytet 2: MODEL TRANSACTION

1. ✅ Dodaj brakujące pola:

   - `currency` (String, default: "PLN")
   - `paidAt` (Date)
   - `providerId` (String) - ID transakcji z Tpay
   - `providerTransactionId` (String) - tr_id z Tpay
   - `invoiceDetails` (Mixed)

2. ✅ Popraw enum `paymentMethod`:
   - Dodaj "tpay" do listy

### Priorytet 3: KONFIGURACJA

1. ✅ Sprawdź czy w `.env` są poprawne URLe:

   - `API_URL=https://api.autosell.pl` ✅
   - `FRONTEND_URL=https://autosell.pl` ✅

2. ✅ Skonfiguruj webhook w panelu Tpay:
   - URL: `https://api.autosell.pl/api/transactions/webhook/tpay`
   - Metoda: POST

---

## 🎯 PLAN NAPRAWY

### Krok 1: Napraw Model Transaction

```javascript
// Dodaj do schematu:
currency: { type: String, default: "PLN" },
paidAt: { type: Date, default: null },
providerId: { type: String, default: null },
providerTransactionId: { type: String, default: null },
invoiceDetails: { type: mongoose.Schema.Types.Mixed, default: {} },

// Popraw enum:
paymentMethod: {
  type: String,
  required: true,
  enum: ["card", "blik", "transfer", "paypal", "przelewy24", "payu", "tpay"],
}
```

### Krok 2: Napraw URL Webhooka

```javascript
// services/tpay/tpayService.js
const notificationUrl = `${process.env.API_URL}/api/transactions/webhook/tpay`;
```

### Krok 3: Usuń lub Oznacz Stary Routing

```javascript
// routes/payments/paymentRoutes.js
// DEPRECATED - Użyj transactionRoutes.js
```

### Krok 4: Przetestuj Flow

1. Frontend → `/api/transactions/tpay/initiate`
2. Tpay → Użytkownik płaci
3. Tpay → Webhook `/api/transactions/webhook/tpay`
4. Backend → Aktualizuje status transakcji
5. Backend → Aktywuje ogłoszenie

---

## 📋 CHECKLIST PRZED WDROŻENIEM

- [ ] Model Transaction zaktualizowany
- [ ] URL webhooka poprawiony w serwisie
- [ ] Stary paymentRoutes.js usunięty/oznaczony
- [ ] Webhook skonfigurowany w panelu Tpay
- [ ] Frontend używa poprawnego endpointa
- [ ] Przetestowane na środowisku testowym Tpay
- [ ] Logi działają poprawnie
- [ ] Obsługa błędów działa

---

## 🔗 POPRAWNE ENDPOINTY

### Frontend → Backend:

```
POST /api/transactions/tpay/initiate
GET  /api/transactions
GET  /api/transactions/:id
POST /api/transactions/:id/request-invoice
GET  /api/transactions/:id/download-invoice
```

### Tpay → Backend (Webhook):

```
POST /api/transactions/webhook/tpay
```

---

## 🚨 UWAGA

**PRZED WDROŻENIEM NA PRODUKCJĘ:**

1. Przetestuj na środowisku testowym Tpay
2. Sprawdź czy webhook działa (użyj narzędzi typu ngrok lokalnie)
3. Zweryfikuj czy faktury generują się poprawnie
4. Sprawdź czy ogłoszenia aktywują się po płatności
5. Przetestuj różne scenariusze (sukces, błąd, anulowanie)

---

## 📞 KONTAKT Z TPAY

Panel: https://panel.tpay.com/
Dokumentacja: https://docs.tpay.com/
Support: support@tpay.com
