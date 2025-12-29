# 📋 INSTRUKCJA WDROŻENIA SYSTEMU PŁATNOŚCI TPAY

## Data: 2025-12-20

---

## 🎯 CEL

Wdrożenie pełnego systemu płatności Tpay, gdzie:

- Ogłoszenie NIE jest widoczne od razu
- Dopiero po opłaceniu → ogłoszenie staje się aktywne
- Historia transakcji automatycznie się tworzy
- Możliwość generowania faktur

---

## ✅ CO ZOSTAŁO JUŻ ZROBIONE (BACKEND)

1. ✅ Model Transaction - zaktualizowany z wszystkimi polami
2. ✅ Serwis Tpay - poprawiony URL webhooka
3. ✅ Kontroler transakcji - dodane szczegółowe logi
4. ✅ Routing - stary plik oznaczony jako deprecated

---

## 🚀 KROK 1: RESTART SERWERA BACKEND

### Windows (CMD):

```bash
cd C:\Users\Mateu\Desktop\Marketplace-Backend
npm start
```

### Lub jeśli używasz nodemon:

```bash
npm run dev
```

**Co powinieneś zobaczyć:**

```
Server running on port 5000
Connected to MongoDB
```

---

## 🔧 KROK 2: KONFIGURACJA WEBHOOKA W PANELU TPAY

### 2.1. Zaloguj się do panelu Tpay

- Adres: https://panel.tpay.com/
- Użyj swoich danych logowania

### 2.2. Przejdź do ustawień powiadomień

- Menu → Ustawienia → Powiadomienia
- Lub: Menu → Integracja → Powiadomienia

### 2.3. Dodaj URL webhooka

```
URL: https://api.autosell.pl/api/transactions/webhook/tpay
Metoda: POST
```

### 2.4. Zapisz ustawienia

- Kliknij "Zapisz"
- Tpay może wysłać testowe powiadomienie - to normalne

---

## 🧪 KROK 3: TEST NA ŚRODOWISKU TESTOWYM

### 3.1. Sprawdź czy masz klucze testowe w .env

```env
TPAY_CLIENT_ID=01JWBS1RCBX7T44K5MAKDRPN7Q-01KCR5DAAGMM2A89KV1PAZ4TMW
TPAY_SECRET=6ece2b7a2842237777401a19659d450871e5d8dd7c8d68e80c098e65580e48b9
```

### 3.2. Utwórz testowe ogłoszenie

1. Zaloguj się na frontend
2. Kliknij "Dodaj ogłoszenie"
3. Wypełnij formularz
4. Kliknij "Dalej" → "Zapłać"

### 3.3. Wybierz płatność Tpay

1. W modalu płatności wybierz "Tpay"
2. Kliknij "Przejdź do płatności"

### 3.4. Sprawdź logi w konsoli backend

Powinieneś zobaczyć:

```
🚀 [TPAY] ========================================
🚀 [TPAY] INICJACJA PŁATNOŚCI TPAY
🚀 [TPAY] ========================================
📝 [TPAY] Dane wejściowe: { userId: ..., adId: ..., amount: ... }
✅ [TPAY] Znaleziono użytkownika: user@example.com
✅ [TPAY] Znaleziono ogłoszenie: AUDI A4
💾 [TPAY] Tworzenie transakcji w bazie danych...
✅ [TPAY] Transakcja zapisana w bazie z statusem: pending
🌐 [TPAY] Wywołanie API Tpay...
✅ [TPAY] Odpowiedź z Tpay: { transactionId: ..., hasPaymentUrl: true }
🔗 [TPAY] URL płatności: https://secure.tpay.com/...
🚀 [TPAY] PRZEKIEROWANIE DO BRAMKI PŁATNOŚCI
```

### 3.5. Zostaniesz przekierowany do Tpay

- Użyj testowych danych karty (dostępne w dokumentacji Tpay)
- Lub wybierz "Symuluj płatność" jeśli dostępne

### 3.6. Po opłaceniu - sprawdź logi webhooka

```
🔔 [WEBHOOK] ========================================
🔔 [WEBHOOK] OTRZYMANO POWIADOMIENIE Z TPAY
🔔 [WEBHOOK] ========================================
📦 [WEBHOOK] Dane: { tr_status: "TRUE", ... }
✅ [WEBHOOK] Podpis zweryfikowany poprawnie
💰 [WEBHOOK] Status płatności: OPŁACONO
🔍 [WEBHOOK] Szukam transakcji w bazie: ...
✅ [WEBHOOK] Znaleziono transakcję: { id: ..., status: "pending" }
🔄 [WEBHOOK] Aktualizacja statusu transakcji...
✅ [WEBHOOK] Transakcja zaktualizowana:
   - Status: completed
   - Numer faktury: FV/2025/ABC123
   - Data opłacenia: 2025-12-20
🚗 [WEBHOOK] Aktywacja ogłoszenia...
✅ [WEBHOOK] Znaleziono ogłoszenie: AUDI A4
✅ [WEBHOOK] Ogłoszenie AKTYWOWANE
   - Status: active
   - Data wygaśnięcia: 2026-01-19
📧 [WEBHOOK] Wysyłanie powiadomienia do użytkownika...
✅ [WEBHOOK] Powiadomienie wysłane
🎉 [WEBHOOK] TRANSAKCJA SFINALIZOWANA POMYŚLNIE
```

---

## 🔍 KROK 4: WERYFIKACJA

### 4.1. Sprawdź ogłoszenie na liście

- Przejdź na stronę główną
- Ogłoszenie powinno być widoczne
- Status: "active"

### 4.2. Sprawdź historię transakcji

- Przejdź do profilu → Transakcje
- Powinieneś zobaczyć transakcję ze statusem "Opłacono"
- Numer faktury: FV/2025/...

### 4.3. Sprawdź bazę danych MongoDB

```javascript
// W MongoDB Compass lub shell:
db.transactions.find({ status: "completed" }).pretty();
db.ads.find({ status: "active" }).pretty();
```

---

## 🐛 KROK 5: ROZWIĄZYWANIE PROBLEMÓW

### Problem 1: Brak logów w konsoli

**Rozwiązanie:**

- Sprawdź czy serwer działa: `npm start`
- Sprawdź czy port 5000 jest wolny

### Problem 2: Webhook nie działa

**Rozwiązanie:**

- Sprawdź URL w panelu Tpay: `https://api.autosell.pl/api/transactions/webhook/tpay`
- Sprawdź czy serwer jest dostępny z internetu
- Użyj ngrok do testów lokalnych:
  ```bash
  ngrok http 5000
  # Użyj URL z ngrok w panelu Tpay
  ```

### Problem 3: Błąd "Transakcja nie znaleziona"

**Rozwiązanie:**

- Sprawdź logi: szukaj `❌ [WEBHOOK] Transakcja nie znaleziona`
- Sprawdź czy `tr_crc` w webhooku = ID transakcji w bazie
- Sprawdź czy MongoDB jest połączone

### Problem 4: Ogłoszenie nie aktywuje się

**Rozwiązanie:**

- Sprawdź logi: szukaj `🚗 [WEBHOOK] Aktywacja ogłoszenia`
- Sprawdź czy `adId` w transakcji jest poprawne
- Sprawdź status ogłoszenia w bazie: `db.ads.findOne({ _id: ObjectId("...") })`

### Problem 5: Błąd weryfikacji podpisu

**Rozwiązanie:**

- Sprawdź `TPAY_SECURITY_CODE` w .env
- Sprawdź czy kod jest zgodny z panelem Tpay
- Logi pokażą: `❌ [WEBHOOK] BŁĘDNA SUMA KONTROLNA!`

---

## 📊 KROK 6: MONITOROWANIE

### Gdzie szukać logów:

#### Backend (konsola):

```
🚀 [TPAY] - inicjacja płatności
🔔 [WEBHOOK] - powiadomienia z Tpay
📋 [TRANSACTIONS] - historia transakcji
📄 [INVOICE] - generowanie faktur
```

#### MongoDB:

```javascript
// Transakcje
db.transactions.find().sort({ createdAt: -1 }).limit(10);

// Ogłoszenia
db.ads.find({ status: "active" }).sort({ createdAt: -1 }).limit(10);
```

#### Panel Tpay:

- Menu → Transakcje → Historia
- Sprawdź status płatności
- Sprawdź czy webhook został wysłany

---

## 🎯 KROK 7: WDROŻENIE NA PRODUKCJĘ

### 7.1. Zmień klucze na produkcyjne

W pliku `.env.production`:

```env
TPAY_CLIENT_ID=<TWÓJ_PRODUKCYJNY_CLIENT_ID>
TPAY_SECRET=<TWÓJ_PRODUKCYJNY_SECRET>
TPAY_MERCHANT_ID=<TWÓJ_MERCHANT_ID>
TPAY_SECURITY_CODE=<TWÓJ_SECURITY_CODE>
```

### 7.2. Zaktualizuj webhook w panelu Tpay (produkcja)

```
URL: https://api.autosell.pl/api/transactions/webhook/tpay
```

### 7.3. Zrestartuj serwer produkcyjny

```bash
pm2 restart marketplace-backend
# lub
systemctl restart marketplace-backend
```

### 7.4. Przetestuj pierwszą prawdziwą płatność

- Użyj małej kwoty (np. 1 zł)
- Sprawdź wszystkie logi
- Zweryfikuj czy ogłoszenie się aktywowało

---

## 📞 WSPARCIE

### Dokumentacja Tpay:

- https://docs.tpay.com/

### Panel Tpay:

- https://panel.tpay.com/

### Support Tpay:

- Email: support@tpay.com
- Tel: +48 22 290 00 00

---

## ✅ CHECKLIST KOŃCOWY

Przed uruchomieniem na produkcji sprawdź:

- [ ] Serwer backend działa
- [ ] MongoDB połączone
- [ ] Klucze Tpay w .env są poprawne
- [ ] Webhook skonfigurowany w panelu Tpay
- [ ] Przetestowane na środowisku testowym
- [ ] Logi działają poprawnie
- [ ] Ogłoszenia aktywują się po płatności
- [ ] Historia transakcji działa
- [ ] Faktury generują się poprawnie
- [ ] Frontend przekierowuje do Tpay
- [ ] Powrót z Tpay działa

---

## 🎉 GOTOWE!

System płatności Tpay jest w pełni wdrożony i gotowy do użycia!

Jeśli masz pytania lub problemy, sprawdź logi w konsoli - pokażą dokładnie co się dzieje.
