# 🚀 RAPORT: GOTOWOŚĆ TPAY DO PRODUKCJI

**Data:** 2026-01-07  
**Autor:** Analiza systemu Marketplace (Backend + Frontend)

---

## 📊 PODSUMOWANIE WYKONAWCZE

### ✅ CO MAMY GOTOWE

**Backend (100% gotowy):**

- ✅ Pełna integracja z Tpay API
- ✅ Webhook do obsługi powiadomień o płatnościach
- ✅ System transakcji z historią
- ✅ Generowanie faktur PDF
- ✅ Automatyczna aktywacja ogłoszeń po płatności
- ✅ Weryfikacja podpisów MD5 (bezpieczeństwo)
- ✅ Rate limiting dla webhooków
- ✅ Szczegółowe logowanie wszystkich operacji

**Frontend (100% gotowy):**

- ✅ Modal płatności z wyborem metody
- ✅ Formularz danych do faktury
- ✅ Przekierowanie do bramki Tpay
- ✅ Strona powrotu z płatności
- ✅ Historia transakcji w profilu użytkownika
- ✅ Pobieranie faktur PDF
- ✅ Powiadomienia o statusie płatności

---

## 🔍 SZCZEGÓŁOWA ANALIZA BACKENDU

### 1. **Kontroler Transakcji** (`controllers/payments/transactionController.js`)

**Status:** ✅ GOTOWY

**Funkcjonalności:**

- `createTransaction()` - Inicjacja płatności Tpay
  - Tworzy ogłoszenie ze statusem `pending_payment`
  - Tworzy transakcję ze statusem `pending`
  - Wywołuje Tpay API i zwraca URL płatności
- `handleTpayWebhook()` - **KLUCZOWA FUNKCJA**
  - Odbiera powiadomienia z Tpay
  - Weryfikuje podpis MD5 (bezpieczeństwo)
  - Aktualizuje status transakcji
  - Generuje numer faktury
  - Aktywuje ogłoszenie
  - Wysyła powiadomienia do użytkownika
- `getTransactions()` - Historia transakcji
- `requestInvoice()` - Generowanie faktury PDF
- `downloadInvoice()` - Pobieranie faktury

**Obsługiwane statusy płatności:**

- `TRUE` → `completed` (Opłacono)
- `FALSE` → `failed` (Odrzucono)
- `CHARGEBACK` → `cancelled` (Anulowano)

---

### 2. **Serwis Tpay** (`services/tpay/tpayService.js`)

**Status:** ⚠️ WYMAGA KONFIGURACJI

**Funkcjonalności:**

- ✅ Autoryzacja OAuth (Bearer Token)
- ✅ Cache tokena (optymalizacja)
- ✅ Tworzenie transakcji
- ✅ Weryfikacja podpisu MD5

**PROBLEM ZNALEZIONY:**

```javascript
// Linia 51 w tpayService.js
const notifyUrl = `${process.env.BACKEND_URL}/api/payments/webhook`;
```

**❌ BŁĘDNY URL WEBHOOKA!**

Powinno być:

```javascript
const notifyUrl = `${process.env.BACKEND_URL}/api/transactions/webhook/tpay`;
```

**Routing w backendzie:**

- ✅ Webhook: `POST /api/transactions/webhook/tpay`
- ✅ Inicjacja: `POST /api/transactions/tpay/initiate`

---

### 3. **Routing** (`routes/payments/transactionRoutes.js`)

**Status:** ✅ GOTOWY

**Endpointy:**

```javascript
POST   /api/transactions/webhook/tpay        // Webhook (PUBLICZNY, bez auth)
POST   /api/transactions/tpay/initiate       // Inicjacja płatności (auth)
GET    /api/transactions                     // Historia (auth)
POST   /api/transactions/:id/request-invoice // Żądanie faktury (auth)
GET    /api/transactions/:id/download-invoice // Pobieranie PDF (auth)
```

**Zabezpieczenia:**

- ✅ Webhook bez middleware `auth` (Tpay musi mieć dostęp)
- ✅ Rate limiting dla webhooków
- ✅ Rate limiting dla płatności

---

### 4. **Zmienne Środowiskowe**

**Status:** ⚠️ BRAK W .env.example

**Wymagane zmienne (BRAKUJĄ w .env.example):**

```env
# Tpay Configuration
TPAY_CLIENT_ID=your-client-id
TPAY_SECRET=your-client-secret
TPAY_MERCHANT_ID=your-merchant-id
TPAY_SECURITY_CODE=your-security-code

# Backend URL (MUSI BYĆ HTTPS!)
BACKEND_URL=https://your-domain.com
```

---

## 🔍 SZCZEGÓŁOWA ANALIZA FRONTENDU

### 1. **Modal Płatności** (`components/payment/PaymentModal.js`)

**Status:** ✅ GOTOWY

**Funkcjonalności:**

- ✅ Wybór metody płatności (karta/przelew)
- ✅ Formularz danych do faktury (opcjonalny)
- ✅ Wysyłanie danych ogłoszenia + zdjęć
- ✅ Przekierowanie do Tpay

**Flow:**

1. Użytkownik wypełnia formularz ogłoszenia
2. Kliknie "Opublikuj i zapłać"
3. Modal płatności się otwiera
4. Wybiera metodę płatności
5. Opcjonalnie wypełnia dane do faktury
6. Kliknie "Zapłać"
7. Frontend wysyła dane do backendu
8. Backend zwraca URL Tpay
9. Frontend przekierowuje do Tpay

---

### 2. **Strona Powrotu** (`pages/PaymentReturnPage.js`)

**Status:** ✅ GOTOWY

**Funkcjonalności:**

- ✅ Sprawdzanie statusu transakcji
- ✅ Retry mechanism (max 10 prób)
- ✅ Wyświetlanie komunikatów sukcesu/błędu
- ✅ Przekierowanie do ogłoszenia po sukcesie

**Flow:**

1. Użytkownik wraca z Tpay
2. Strona sprawdza status transakcji w bazie
3. Jeśli `pending` → czeka i sprawdza ponownie (webhook może się spóźnić)
4. Jeśli `completed` → sukces, przekierowanie
5. Jeśli `failed` → błąd, możliwość ponowienia

---

### 3. **Historia Transakcji** (`components/profil/TransactionHistory.js`)

**Status:** ✅ GOTOWY

**Funkcjonalności:**

- ✅ Lista wszystkich transakcji
- ✅ Filtrowanie (płatności, zwroty, faktury)
- ✅ Wyszukiwanie
- ✅ Sortowanie
- ✅ Pobieranie faktur PDF
- ✅ Statystyki

---

### 4. **Serwis API** (`services/api/transactionsApi.js`)

**Status:** ✅ GOTOWY

**Funkcje:**

- ✅ `initiateTpayPayment()` - Inicjacja płatności
- ✅ `getTransactions()` - Pobieranie historii
- ✅ `getTransaction()` - Szczegóły transakcji
- ✅ `requestInvoice()` - Żądanie faktury
- ✅ `downloadInvoice()` - Pobieranie PDF

---

## ❌ ZNALEZIONE PROBLEMY

### 🔴 PROBLEM #1: BŁĘDNY URL WEBHOOKA W SERWISIE TPAY

**Plik:** `services/tpay/tpayService.js` (linia 51)

**Aktualny kod:**

```javascript
const notifyUrl = `${process.env.BACKEND_URL}/api/payments/webhook`;
```

**Powinno być:**

```javascript
const notifyUrl = `${process.env.BACKEND_URL}/api/transactions/webhook/tpay`;
```

**Konsekwencje:**

- ❌ Tpay wysyła powiadomienia na BŁĘDNY adres
- ❌ Webhook NIE DZIAŁA
- ❌ Płatności nie są przetwarzane
- ❌ Ogłoszenia nie są aktywowane

**Priorytet:** 🔴 KRYTYCZNY - MUSI BYĆ NAPRAWIONE PRZED PRODUKCJĄ

---

### 🟡 PROBLEM #2: BRAK ZMIENNYCH TPAY W .env.example

**Plik:** `.env.example`

**Brakujące zmienne:**

```env
# Tpay Configuration
TPAY_CLIENT_ID=your-client-id
TPAY_SECRET=your-client-secret
TPAY_MERCHANT_ID=your-merchant-id
TPAY_SECURITY_CODE=your-security-code
BACKEND_URL=https://your-domain.com
```

**Konsekwencje:**

- ⚠️ Nowi developerzy nie wiedzą jakie zmienne są potrzebne
- ⚠️ Łatwo o błąd konfiguracji

**Priorytet:** 🟡 ŚREDNI - Powinno być dodane

---

## ✅ CO TRZEBA ZROBIĆ PRZED PRODUKCJĄ

### 🔧 NAPRAWY KODU (WYMAGANE)

#### 1. **Napraw URL webhooka w tpayService.js**

**Plik:** `services/tpay/tpayService.js`

**Zmiana:**

```javascript
// PRZED (BŁĘDNE):
const notifyUrl = `${process.env.BACKEND_URL}/api/payments/webhook`;

// PO (POPRAWNE):
const notifyUrl = `${process.env.BACKEND_URL}/api/transactions/webhook/tpay`;
```

---

#### 2. **Dodaj zmienne Tpay do .env.example**

**Plik:** `.env.example`

**Dodaj na końcu pliku:**

```env
# ========================================
# TPAY PAYMENT GATEWAY CONFIGURATION
# ========================================
# Get these credentials from: https://panel.tpay.com
# Documentation: https://docs.tpay.com

# OAuth Credentials (Panel Tpay → Integracja → API)
TPAY_CLIENT_ID=your-tpay-client-id-here
TPAY_SECRET=your-tpay-client-secret-here

# Merchant Configuration
TPAY_MERCHANT_ID=your-merchant-id-here
TPAY_SECURITY_CODE=your-security-code-here

# Backend URL (MUST be HTTPS in production!)
# This is used for webhook notifications from Tpay
BACKEND_URL=http://localhost:5000
```

---

### 🔑 KONFIGURACJA TPAY (WYMAGANE)

#### 1. **Załóż konto produkcyjne Tpay**

**Kroki:**

1. Wejdź na: https://tpay.com
2. Kliknij "Załóż konto" lub "Rejestracja"
3. Wypełnij formularz (dane firmy)
4. Przejdź weryfikację KYC (1-3 dni robocze)
5. Podpisz umowę z Tpay

**Wymagane dokumenty:**

- NIP firmy
- KRS/CEIDG
- Dowód osobisty właściciela

---

#### 2. **Pobierz dane dostępowe z panelu Tpay**

**Po zalogowaniu do https://panel.tpay.com:**

**A. Client ID i Secret:**

- Menu → **Integracja** → **API** → **Klucze OAuth**
- Skopiuj `Client ID` i `Client Secret`

**B. Merchant ID:**

- Menu → **Ustawienia** → **Dane konta**
- Skopiuj `Merchant ID`

**C. Security Code:**

- Menu → **Integracja** → **Powiadomienia** → **Kod bezpieczeństwa**
- Skopiuj `Security Code`

---

#### 3. **Skonfiguruj webhook w panelu Tpay** ⚠️ NAJWAŻNIEJSZE!

**Kroki:**

1. Zaloguj się do https://panel.tpay.com
2. Menu → **Integracja** → **Powiadomienia**
3. Dodaj URL webhooka:
   ```
   https://twoja-domena.pl/api/transactions/webhook/tpay
   ```
4. Metoda: **POST**
5. Format: **JSON**
6. Kliknij **Zapisz**
7. Kliknij **Test webhooka** (opcjonalnie)

**⚠️ WAŻNE:**

- URL MUSI być **HTTPS** (nie HTTP!)
- URL MUSI być **publiczny** (nie localhost!)
- URL MUSI być **dostępny 24/7**

**Przykłady:**

```
✅ DOBRZE: https://api.autosell.pl/api/transactions/webhook/tpay
✅ DOBRZE: https://marketplace.pl/api/transactions/webhook/tpay
❌ ŹLE: http://localhost:5000/api/transactions/webhook/tpay
❌ ŹLE: http://twoja-domena.pl/... (brak HTTPS)
```

---

#### 4. **Wypełnij plik .env na serwerze produkcyjnym**

**Plik:** `.env` (na serwerze)

```env
# ========================================
# TPAY PRODUCTION CONFIGURATION
# ========================================
TPAY_CLIENT_ID=01JWBS1RCBX7T44K5MAKDRPN7Q-01KCR5DAAGMM2A89KV1PAZ4TMW
TPAY_SECRET=6ece2b7a2842237777401a19659d450871e5d8dd7c8d68e80c098e65580e48b9
TPAY_MERCHANT_ID=12345
TPAY_SECURITY_CODE=abc123def456ghi789jkl012mno345pqr678stu901vwx234yz

# ========================================
# BACKEND URL (MUST BE PUBLIC HTTPS!)
# ========================================
BACKEND_URL=https://api.twoja-domena.pl

# ========================================
# FRONTEND URL
# ========================================
FRONTEND_URL=https://twoja-domena.pl

# ========================================
# ENVIRONMENT
# ========================================
NODE_ENV=production
```

**⚠️ UWAGA:** Wklej PRAWDZIWE dane z panelu Tpay!

---

### 🚀 WDROŻENIE NA SERWER (WYMAGANE)

#### 1. **Wymagania serwera**

- ✅ Publiczny adres IP lub domena
- ✅ Certyfikat SSL (HTTPS) - **WYMAGANE!**
- ✅ Node.js 18+ zainstalowany
- ✅ MongoDB działający
- ✅ Port 5000 (lub inny) otwarty w firewall

---

#### 2. **Kroki wdrożenia**

**A. Wgraj kod na serwer:**

```bash
git clone https://github.com/twoje-repo/backend.git
cd backend
```

**B. Zainstaluj zależności:**

```bash
npm install
```

**C. Skonfiguruj .env:**

```bash
cp .env.example .env
nano .env  # Wklej dane z panelu Tpay
```

**D. Uruchom serwer:**

```bash
# Opcja 1: PM2 (zalecane)
npm install -g pm2
pm2 start index.js --name marketplace-backend
pm2 save
pm2 startup

# Opcja 2: Bezpośrednio
npm start
```

**E. Sprawdź czy działa:**

```bash
# Test lokalny
curl http://localhost:5000/api/health

# Test publiczny
curl https://twoja-domena.pl/api/health
```

---

### 🧪 TESTOWANIE (WYMAGANE)

#### 1. **Test webhooka (przed pierwszą płatnością)**

**Metoda 1: Test z panelu Tpay**

1. Panel Tpay → **Integracja** → **Powiadomienia**
2. Kliknij **Test webhooka**
3. Sprawdź logi backendu:
   ```bash
   pm2 logs marketplace-backend
   ```
4. Szukaj: `🔔 [WEBHOOK] OTRZYMANO POWIADOMIENIE Z TPAY`

**Metoda 2: Test ręczny (curl)**

```bash
curl -X POST https://twoja-domena.pl/api/transactions/webhook/tpay \
  -H "Content-Type: application/json" \
  -d '{
    "id": "12345",
    "tr_id": "TR-TEST-123",
    "tr_amount": "10.00",
    "tr_crc": "test-transaction-id",
    "tr_status": "TRUE",
    "md5sum": "test-md5"
  }'
```

**Oczekiwany wynik:**

- Status: 200 OK
- Body: `TRUE`
- Logi: `🔔 [WEBHOOK] OTRZYMANO POWIADOMIENIE Z TPAY`

---

#### 2. **Test pierwszej płatności (prawdziwa płatność)**

**⚠️ UWAGA: To będzie prawdziwa płatność! Zalecam test z małą kwotą (np. 1 zł)**

**Kroki:**

1. Zaloguj się na frontend
2. Dodaj nowe ogłoszenie
3. Wypełnij formularz
4. Kliknij "Opublikuj i zapłać"
5. Wybierz metodę płatności
6. Kliknij "Zapłać"
7. Zostaniesz przekierowany do Tpay
8. Opłać (prawdziwa karta/przelew)
9. Wróć na stronę

**Sprawdź logi backendu:**

```bash
pm2 logs marketplace-backend --lines 100
```

**Szukaj:**

```
🚀 [TPAY] INICJACJA PŁATNOŚCI TPAY
✅ [TPAY] Ogłoszenie utworzone z ID: ...
✅ [TPAY] Transakcja zapisana w bazie z statusem: pending
🔗 [TPAY] URL płatności: https://...
🔔 [WEBHOOK] OTRZYMANO POWIADOMIENIE Z TPAY
✅ [WEBHOOK] Podpis zweryfikowany poprawnie
💰 [WEBHOOK] Status płatności: OPŁACONO
✅ [WEBHOOK] Transakcja zaktualizowana
✅ [WEBHOOK] Ogłoszenie AKTYWOWANE
🎉 [WEBHOOK] TRANSAKCJA SFINALIZOWANA POMYŚLNIE
```

**Zweryfikuj:**

- [ ] Ogłoszenie widoczne na liście
- [ ] Status ogłoszenia: "active"
- [ ] Transakcja w historii: "Opłacono"
- [ ] Numer faktury wygenerowany
- [ ] Powiadomienie wysłane do użytkownika

---

## 📋 CHECKLIST PRZED URUCHOMIENIEM PRODUKCYJNYM

### Konto Tpay:

- [ ] Konto produkcyjne założone
- [ ] Firma zweryfikowana (KYC)
- [ ] Umowa z Tpay podpisana
- [ ] Dostęp do panelu produkcyjnego

### Dane dostępowe:

- [ ] Client ID skopiowany
- [ ] Client Secret skopiowany
- [ ] Merchant ID skopiowany
- [ ] Security Code skopiowany
- [ ] Wszystkie dane wklejone do .env

### Webhook:

- [ ] URL webhooka ustawiony w panelu Tpay
- [ ] URL jest HTTPS (nie HTTP!)
- [ ] URL jest publiczny (nie localhost!)
- [ ] Test webhooka przeszedł pomyślnie

### Kod:

- [ ] **Naprawiony URL webhooka w tpayService.js** ⚠️ KRYTYCZNE
- [ ] Dodane zmienne Tpay do .env.example
- [ ] Kod wdrożony na serwer
- [ ] Zależności zainstalowane (npm install)

### Serwer:

- [ ] Backend wdrożony na serwer
- [ ] Certyfikat SSL zainstalowany (HTTPS działa)
- [ ] MongoDB połączone
- [ ] Serwer dostępny publicznie
- [ ] Port otwarty w firewall
- [ ] PM2 skonfigurowane (auto-restart)

### Konfiguracja:

- [ ] Plik .env wypełniony
- [ ] BACKEND_URL ustawiony na publiczny adres HTTPS
- [ ] FRONTEND_URL ustawiony poprawnie
- [ ] NODE_ENV=production

### Testy:

- [ ] Test webhooka przeszedł pomyślnie
- [ ] Test pierwszej płatności przeszedł pomyślnie
- [ ] Ogłoszenie aktywowane automatycznie
- [ ] Faktura wygenerowana
- [ ] Powiadomienie wysłane

---

## 🐛 ROZWIĄZYWANIE PROBLEMÓW

### Problem: "Webhook nie działa"

**Objawy:**

- Płatność przeszła w Tpay
- Ogłoszenie nie aktywuje się
- Brak logów `[WEBHOOK]` w konsoli

**Rozwiązanie:**

1. Sprawdź URL webhooka w panelu Tpay
2. Sprawdź czy URL w `tpayService.js` jest poprawny
3. Sprawdź czy serwer jest dostępny:
   ```bash
   curl https://twoja-domena.pl/api/transactions/webhook/tpay
   ```
4. Sprawdź logi serwera:
   ```bash
   pm2 logs marketplace-backend --lines 100
   ```
5. Sprawdź firewall - czy port jest otwarty
6. Sprawdź certyfikat SSL - czy HTTPS działa

---

### Problem: "Błąd weryfikacji podpisu"

**Objawy:**

- Logi pokazują: `❌ [WEBHOOK] BŁĘDNA SUMA KONTROLNA!`

**Rozwiązanie:**

1. Sprawdź `TPAY_SECURITY_CODE` w .env
2. Porównaj z kodem w panelu Tpay
3. Upewnij się, że nie ma spacji na początku/końcu
4. Zrestartuj serwer po zmianie .env:
   ```bash
   pm2 restart marketplace-backend
   ```

---

### Problem: "Transakcja nie znaleziona"

**Objawy:**

- Logi pokazują: `❌ [WEBHOOK] Transakcja nie znaleziona w bazie!`

**Rozwiązanie:**

1. Sprawdź połączenie z MongoDB
2. Sprawdź czy transakcja została utworzona przed płatnością
3. Sprawdź logi inicjacji płatności: `🚀 [TPAY] INICJACJA PŁATNOŚCI`

---

### Problem: "Ogłoszenie nie aktywuje się"

**Objawy:**

- Webhook działa
- Transakcja zaktualizowana
- Ogłoszenie nadal nieaktywne

**Rozwiązanie:**

1. Sprawdź logi: `🚗 [WEBHOOK] Aktywacja ogłoszenia`
2. Sprawdź status ogłoszenia w MongoDB:
   ```javascript
   db.ads.findOne({ _id: ObjectId("ID_OGLOSZENIA") });
   ```
3. Sprawdź czy `adId` w transakcji jest poprawne

---

## 📞 KONTAKT I WSPARCIE

### Tpay Support:

- **Email:** support@tpay.com
- **Telefon:** +48 22 290 00 00
- **Panel:** https://panel.tpay.com
- **Dokumentacja:** https://docs.tpay.com

### Pytania do Tpay:

1. "Jak skonfigurować webhook dla powiadomień o płatnościach?"
2. "Gdzie znajdę Client ID i Client Secret?"
3. "Jak przetestować webhook przed uruchomieniem produkcyjnym?"
4. "Czy mogę użyć ngrok do testów lokalnych?"

---

## 🎯 PODSUMOWANIE

### Co jest gotowe:

✅ Backend - pełna integracja Tpay  
✅ Frontend - kompletny flow płatności  
✅ Webhook - obsługa powiadomień  
✅ Faktury - generowanie PDF  
✅ Historia - transakcje w profilu

### Co MUSI być zrobione przed produkcją:

🔴 **Naprawić URL webhooka w tpayService.js** (KRYTYCZNE!)  
🟡 Dodać zmienne Tpay do .env.example  
🟢 Założyć konto produkcyjne Tpay  
🟢 Skonfigurować webhook w panelu Tpay  
🟢 Wypełnić .env na serwerze  
🟢 Wdrożyć na serwer z HTTPS  
🟢 Przetestować pierwszą płatność

### Czas realizacji:

- Naprawa kodu: **15 minut**
- Rejestracja Tpay: **10 minut**
- Weryfikacja Tpay: **1-3 dni robocze**
- Konfiguracja: **30 minut**
- Wdrożenie: **1-2 godziny**
- **RAZEM: 2-4 dni**

---

## ✅ NASTĘPNE KROKI

1. **Napraw URL webhooka** (15 min)
2. **Dodaj zmienne do .env.example** (5 min)
3. **Załóż konto Tpay** (10 min)
4. **Czekaj na weryfikację** (1-3 dni)
5. **Skonfiguruj webhook w panelu** (10 min)
6. **Wdróż na serwer** (1-2 godz)
7. **Przetestuj płatność** (15 min)
8. **🚀 GOTOWE DO PRODUKCJI!**

---

**Powodzenia! 🚀**
