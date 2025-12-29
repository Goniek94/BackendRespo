# 📋 Dokumentacja Flow Płatności z Tpay

## 🎯 Cel

System płatności zintegrowany z Tpay, gdzie ogłoszenie jest publikowane **dopiero po opłaceniu**.

---

## 🔄 Flow Płatności - Krok po Kroku

### 1️⃣ **Użytkownik wypełnia formularz ogłoszenia**

- Dane ogłoszenia są trzymane lokalnie na frontendzie
- **Ogłoszenie NIE jest jeszcze zapisywane w bazie**
- Użytkownik widzi przycisk "Zapłać"

### 2️⃣ **Kliknięcie przycisku "Zapłać"**

Frontend wysyła request do backendu:

```javascript
POST /api/transactions/tpay/initiate
Body: {
  adData: { /* wszystkie dane ogłoszenia */ },
  amount: 50.00,
  type: "standard_listing", // lub "featured_listing"
  invoiceData: { /* opcjonalnie */ }
}
```

### 3️⃣ **Backend tworzy ogłoszenie + transakcję**

**Kontroler:** `transactionController.createTransaction()`

**Krok A:** Utworzenie ogłoszenia

```javascript
const newAd = new Ad({
  ...adData,
  user: userId,
  status: "pending_payment", // ⚠️ KLUCZOWE - czeka na płatność
  // ... inne pola
});
await newAd.save();
```

**Krok B:** Utworzenie transakcji

```javascript
const transaction = new Transaction({
  userId,
  adId: savedAd._id,
  amount: parseFloat(amount),
  status: "pending", // ⚠️ KLUCZOWE - czeka na płatność
  paymentMethod: "tpay",
  // ... inne pola
});
await transaction.save();
```

**Krok C:** Wywołanie API Tpay

```javascript
const tpayData = await tpayService.createTransaction({
  amount,
  description: `Opłata za ogłoszenie: ${ad.brand} ${ad.model}`,
  email: user.email,
  transactionId: savedTransaction._id.toString(),
  returnUrl: `${FRONTEND_URL}/profil/transakcje?status=success`,
  errorUrl: `${FRONTEND_URL}/profil/transakcje?status=error`,
});
```

**Odpowiedź do frontendu:**

```javascript
{
  success: true,
  paymentUrl: "https://secure.tpay.com/...",
  transactionId: "...",
  adId: "..."
}
```

### 4️⃣ **Przekierowanie do Tpay**

Frontend przekierowuje użytkownika:

```javascript
window.location.href = response.data.paymentUrl;
```

Użytkownik trafia do bramki płatności Tpay (bank, BLIK, karta, etc.)

### 5️⃣ **Użytkownik płaci (lub anuluje)**

#### ✅ **Scenariusz A: Płatność udana**

1. Tpay wysyła webhook do backendu:

   ```
   POST /api/transactions/webhook/tpay
   Body: {
     tr_status: "TRUE",
     tr_id: "...",
     tr_crc: "ID_TRANSAKCJI_Z_BAZY",
     // ... inne dane
   }
   ```

2. Backend weryfikuje podpis MD5
3. Backend aktualizuje transakcję:

   ```javascript
   transaction.status = "completed";
   transaction.paidAt = new Date();
   ```

4. Backend aktywuje ogłoszenie:

   ```javascript
   ad.status = "active"; // ⚠️ TERAZ JEST WIDOCZNE!
   ad.expirationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
   ```

5. Backend wysyła powiadomienie do użytkownika

#### ❌ **Scenariusz B: Płatność nieudana**

1. Tpay wysyła webhook:

   ```
   tr_status: "FALSE"
   ```

2. Backend aktualizuje transakcję:

   ```javascript
   transaction.status = "failed";
   ```

3. Ogłoszenie pozostaje ze statusem `"pending_payment"` (nie jest widoczne)

#### 🔙 **Scenariusz C: Użytkownik anulował**

1. Tpay wysyła webhook:

   ```
   tr_status: "CHARGEBACK"
   ```

2. Backend aktualizuje transakcję:

   ```javascript
   transaction.status = "cancelled";
   ```

3. Ogłoszenie pozostaje ze statusem `"pending_payment"` (nie jest widoczne)

---

## 📊 Statusy w Systemie

### Statusy Ogłoszeń (Ad)

| Status            | Opis                      | Widoczne publicznie? |
| ----------------- | ------------------------- | -------------------- |
| `pending_payment` | Czeka na płatność         | ❌ NIE               |
| `pending`         | Czeka na moderację        | ❌ NIE               |
| `active`          | Opłacone i aktywne        | ✅ TAK               |
| `rejected`        | Odrzucone przez moderację | ❌ NIE               |
| `hidden`          | Ukryte przez admina       | ❌ NIE               |
| `archived`        | Zarchiwizowane            | ❌ NIE               |

### Statusy Transakcji (Transaction)

| Status      | Opis                        | Akcja                    |
| ----------- | --------------------------- | ------------------------ |
| `pending`   | Oczekuje na płatność        | Użytkownik może zapłacić |
| `completed` | Opłacona                    | Ogłoszenie aktywowane    |
| `failed`    | Nieudana                    | Można spróbować ponownie |
| `cancelled` | Anulowana przez użytkownika | Można spróbować ponownie |

---

## 🔒 Zabezpieczenia

### 1. Rate Limiting

**Plik:** `middleware/paymentRateLimit.js`

- **Inicjacja płatności:** Max 5 prób na 15 minut (per użytkownik/IP)
- **Webhook:** Max 30 wywołań na minutę (per IP)

### 2. Weryfikacja Podpisu Webhook

**Plik:** `services/tpay/tpayService.js`

```javascript
verifyNotificationSignature(notification) {
  const dataString = `${id}${tr_id}${tr_amount}${tr_crc}${securityCode}`;
  const calculatedMd5 = crypto.createHash("md5").update(dataString).digest("hex");
  return calculatedMd5 === notification.md5sum;
}
```

### 3. Autoryzacja

- Wszystkie endpointy (poza webhookiem) wymagają tokenu JWT
- Webhook jest publiczny, ale weryfikowany przez podpis MD5

---

## 🗂️ Struktura Plików

### Backend

```
controllers/payments/
  └── transactionController.js    # Główna logika płatności

models/payments/
  └── Transaction.js               # Model transakcji (dodano status 'cancelled')

models/listings/
  └── ad.js                        # Model ogłoszenia (status 'pending_payment')

services/tpay/
  └── tpayService.js               # Integracja z API Tpay

middleware/
  └── paymentRateLimit.js          # Rate limiting dla płatności

routes/payments/
  └── transactionRoutes.js         # Routing (z rate limiting)
```

### Frontend (do modyfikacji)

```
components/payment/
  └── PaymentModal.js              # Modal płatności (wymaga modyfikacji)

services/api/
  └── transactionsApi.js           # API client dla transakcji
```

---

## 🛠️ Co Trzeba Zmodyfikować na Frontendzie

### PaymentModal.js

**Obecny kod:**

```javascript
const payload = {
  adId: item.id, // ❌ Zakłada, że ogłoszenie już istnieje
  amount,
  type,
  // ...
};
```

**Nowy kod:**

```javascript
const payload = {
  adData: {
    // ✅ Wysyłamy wszystkie dane ogłoszenia
    brand: formData.brand,
    model: formData.model,
    year: formData.year,
    price: formData.price,
    // ... wszystkie pola z formularza
  },
  amount,
  type,
  invoiceData: invoiceRequested ? invoiceData : null,
};
```

### Formularz Dodawania Ogłoszenia

1. Zbierz wszystkie dane w state
2. Po kliknięciu "Zapłać" → otwórz PaymentModal
3. PaymentModal wysyła dane do backendu
4. Backend tworzy ogłoszenie + transakcję
5. Przekierowanie do Tpay

---

## 📝 Przykładowe Requesty

### Inicjacja Płatności

```bash
POST /api/transactions/tpay/initiate
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "adData": {
    "brand": "BMW",
    "model": "X5",
    "year": 2020,
    "price": 150000,
    "mileage": 50000,
    "fuelType": "Diesel",
    "transmission": "Automatyczna",
    "description": "Piękny samochód...",
    "images": ["url1", "url2"],
    "city": "Warszawa",
    "voivodeship": "mazowieckie"
  },
  "amount": 50.00,
  "type": "standard_listing",
  "invoiceData": {
    "companyName": "Firma Sp. z o.o.",
    "nip": "1234567890",
    "address": "ul. Testowa 1, 00-000 Warszawa"
  }
}
```

### Odpowiedź

```json
{
  "success": true,
  "message": "Transakcja utworzona, przekierowanie do płatności...",
  "paymentUrl": "https://secure.tpay.com/...",
  "transactionId": "67890abcdef",
  "adId": "12345abcdef"
}
```

---

## 🧪 Testowanie

### 1. Test Płatności Udanej

1. Wypełnij formularz ogłoszenia
2. Kliknij "Zapłać"
3. W Tpay wybierz "Test Payment - Success"
4. Sprawdź:
   - ✅ Transakcja ma status `completed`
   - ✅ Ogłoszenie ma status `active`
   - ✅ Ogłoszenie jest widoczne publicznie
   - ✅ Użytkownik otrzymał powiadomienie

### 2. Test Płatności Nieudanej

1. Wypełnij formularz ogłoszenia
2. Kliknij "Zapłać"
3. W Tpay wybierz "Test Payment - Failed"
4. Sprawdź:
   - ✅ Transakcja ma status `failed`
   - ✅ Ogłoszenie ma status `pending_payment`
   - ✅ Ogłoszenie NIE jest widoczne publicznie

### 3. Test Anulowania

1. Wypełnij formularz ogłoszenia
2. Kliknij "Zapłać"
3. W Tpay kliknij "Anuluj"
4. Sprawdź:
   - ✅ Transakcja ma status `cancelled`
   - ✅ Ogłoszenie ma status `pending_payment`
   - ✅ Ogłoszenie NIE jest widoczne publicznie

---

## 🚨 Troubleshooting

### Problem: Webhook nie działa

**Rozwiązanie:**

1. Sprawdź czy URL webhooka jest publiczny (https)
2. Sprawdź logi backendu: `console.log` w `handleTpayWebhook`
3. Sprawdź czy `TPAY_SECURITY_CODE` w `.env` jest poprawny

### Problem: Ogłoszenie nie aktywuje się po płatności

**Rozwiązanie:**

1. Sprawdź logi webhooka
2. Sprawdź czy `tr_status === "TRUE"`
3. Sprawdź czy transakcja została znaleziona w bazie

### Problem: Rate limiting blokuje użytkowników

**Rozwiązanie:**

1. Zwiększ limit w `paymentRateLimit.js`
2. Lub zmień `windowMs` (czas okna)

---

## 📞 Kontakt z Tpay

- **Panel:** https://panel.tpay.com
- **Dokumentacja:** https://docs.tpay.com
- **Support:** support@tpay.com

---

## 👑 Funkcja Admin - Bezpłatna Aktywacja

### Endpoint

```
POST /api/transactions/admin/activate
Authorization: Bearer <ADMIN_JWT_TOKEN>
```

### Request Body

```json
{
  "adData": {
    "brand": "BMW",
    "model": "X5"
    // ... wszystkie dane ogłoszenia
  },
  "type": "standard_listing" // lub "featured_listing"
}
```

### Co się dzieje?

1. ✅ Weryfikacja uprawnień admina (role: `admin` lub `superadmin`)
2. ✅ Utworzenie ogłoszenia ze statusem `active` (od razu widoczne!)
3. ✅ Utworzenie transakcji:
   - Status: `completed`
   - Amount: `0` (bezpłatne)
   - PaymentMethod: `admin`
   - Metadata zawiera info o adminie
4. ✅ Powiadomienie użytkownika (jeśli admin aktywuje dla kogoś innego)

### Odpowiedź

```json
{
  "success": true,
  "message": "Ogłoszenie aktywowane przez administratora",
  "adId": "...",
  "transactionId": "...",
  "ad": {
    "id": "...",
    "brand": "BMW",
    "model": "X5",
    "status": "active",
    "isFeatured": false,
    "expirationDate": "2026-01-22T..."
  }
}
```

### Różnice Admin vs Użytkownik

| Aspekt            | Użytkownik                   | Admin                          |
| ----------------- | ---------------------------- | ------------------------------ |
| Płatność          | ✅ Wymagana przez Tpay       | ❌ Bezpłatna                   |
| Status ogłoszenia | `pending_payment` → `active` | Od razu `active`               |
| Status transakcji | `pending` → `completed`      | Od razu `completed`            |
| Kwota             | 50 PLN (lub inna)            | 0 PLN                          |
| PaymentMethod     | `tpay`                       | `admin`                        |
| Historia          | Widoczna w transakcjach      | Widoczna z oznaczeniem "admin" |

---

## ✅ Checklist Wdrożenia

- [x] Dodano status `cancelled` do modelu Transaction
- [x] Zmodyfikowano `createTransaction` - tworzy ogłoszenie + transakcję
- [x] Ulepszono webhook - obsługa `failed` i `cancelled`
- [x] Dodano rate limiting dla płatności
- [x] Dodano rate limiting dla webhooka
- [x] Dodano metodę płatności `admin` do modelu Transaction
- [x] Utworzono kontroler `adminPaymentController`
- [x] Dodano endpoint `/api/transactions/admin/activate`
- [ ] Zmodyfikować PaymentModal na frontendzie
- [ ] Zmodyfikować formularz dodawania ogłoszenia
- [ ] Dodać przycisk "Admin Płatność" na frontendzie (tylko dla adminów)
- [ ] Przetestować cały flow
- [ ] Wdrożyć na produkcję

---

**Data utworzenia:** 2025-12-23  
**Ostatnia aktualizacja:** 2025-12-23  
**Autor:** Cline AI Assistant  
**Wersja:** 1.1
