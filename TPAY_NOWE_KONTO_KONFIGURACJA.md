# 🎉 KONFIGURACJA NOWEGO KONTA TPAY - ZAKOŃCZONA

## Data aktualizacji: 2026-02-16

---

## ✅ CO ZOSTAŁO ZAKTUALIZOWANE

### 1. **Plik `.env` - Nowe dane Tpay**

Zaktualizowano wszystkie klucze API Tpay na nowe konto:

```env
# --- Konfiguracja Płatności TPAY (Produkcja) ---
# Updated: 2026-02-16 | New Tpay account credentials
TPAY_CLIENT_ID=01KGC419CJ2W3A6MHRDCO6K6M8H-01KHK8GM4F2JK96MKXTHHAW1S1
TPAY_SECRET=1fa9d302c1c30e35cbeb67045724e36fe4cee843fdc7d5f656529f834a0b1713
TPAY_MERCHANT_ID=185476
TPAY_SECURITY_CODE=6109258a3d5a9076f3160c5462f4bada167ee245293f2d90d3fc406268f01825
```

### 2. **Webhook w panelu Tpay**

✅ Skonfigurowano URL webhooka w panelu Tpay:

```
https://api.autosell.pl/api/transactions/webhook/tpay
```

### 3. **Weryfikacja konfiguracji**

✅ Sprawdzono:

- `services/tpay/tpayService.js` - automatycznie pobiera dane z `.env`
- `routes/payments/transactionRoutes.js` - routing webhooka jest poprawny
- `controllers/payments/transactionController.js` - używa tpayService

---

## 🚀 JAK URUCHOMIĆ NOWĄ KONFIGURACJĘ

### KROK 1: Zrestartuj serwer backend

#### Jeśli używasz PM2:

```bash
cd C:\Users\Mateu\Desktop\Marketplace-Backend
pm2 restart marketplace-backend
pm2 logs marketplace-backend
```

#### Jeśli używasz nodemon/npm:

```bash
cd C:\Users\Mateu\Desktop\Marketplace-Backend
# Zatrzymaj serwer (Ctrl+C)
npm start
# lub
npm run dev
```

#### Jeśli używasz screen:

```bash
screen -r backend
# Zatrzym serwer (Ctrl+C)
npm start
# Odłącz screen: Ctrl+A, D
```

### KROK 2: Sprawdź logi startowe

Po restarcie powinieneś zobaczyć:

```
Server running on port 5000
Connected to MongoDB
```

**WAŻNE:** Sprawdź czy NIE MA błędów związanych z Tpay!

---

## 🧪 JAK PRZETESTOWAĆ PŁATNOŚCI

### Test 1: Utwórz testowe ogłoszenie

1. Zaloguj się na frontend: `http://localhost:3000` lub `https://autosell.pl`
2. Kliknij **"Dodaj ogłoszenie"**
3. Wypełnij formularz
4. Kliknij **"Dalej"** → **"Zapłać"**

### Test 2: Wybierz płatność Tpay

1. W modalu płatności wybierz **"Tpay"**
2. Kliknij **"Przejdź do płatności"**

### Test 3: Sprawdź logi backendu

Powinieneś zobaczyć w konsoli:

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

### Test 4: Opłać transakcję

1. Zostaniesz przekierowany do bramki Tpay
2. Użyj prawdziwej karty/przelewu (to produkcja!)
3. **UWAGA:** Zalecam test z małą kwotą (np. 1 zł)

### Test 5: Sprawdź webhook

Po opłaceniu, w logach backendu powinieneś zobaczyć:

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
   - Numer faktury: FV/2026/...
   - Data opłacenia: 2026-02-16
🚗 [WEBHOOK] Aktywacja ogłoszenia...
✅ [WEBHOOK] Znaleziono ogłoszenie: AUDI A4
✅ [WEBHOOK] Ogłoszenie AKTYWOWANE
   - Status: active
   - Data wygaśnięcia: 2026-03-18
📧 [WEBHOOK] Wysyłanie powiadomienia do użytkownika...
✅ [WEBHOOK] Powiadomienie wysłane
🎉 [WEBHOOK] TRANSAKCJA SFINALIZOWANA POMYŚLNIE
```

### Test 6: Weryfikacja

✅ Sprawdź czy:

- Ogłoszenie jest widoczne na liście
- Status ogłoszenia: **"active"**
- Transakcja w profilu: **"Opłacono"**
- Numer faktury wygenerowany: **FV/2026/...**

---

## 🔍 ROZWIĄZYWANIE PROBLEMÓW

### Problem 1: "Błąd autoryzacji Tpay"

**Objawy:**

- Logi pokazują: `❌ [TpayService] Błąd autoryzacji`

**Rozwiązanie:**

1. Sprawdź czy `.env` ma poprawne dane:
   ```bash
   cat .env | grep TPAY
   ```
2. Sprawdź czy nie ma spacji na początku/końcu kluczy
3. Zrestartuj serwer po zmianie `.env`

### Problem 2: "Webhook nie działa"

**Objawy:**

- Płatność przeszła w Tpay
- Ogłoszenie nie aktywuje się
- Brak logów `[WEBHOOK]` w konsoli

**Rozwiązanie:**

1. Sprawdź URL webhooka w panelu Tpay:
   - Powinien być: `https://api.autosell.pl/api/transactions/webhook/tpay`
2. Sprawdź czy serwer jest dostępny publicznie:
   ```bash
   curl https://api.autosell.pl/api/health
   ```
3. Sprawdź logi serwera:
   ```bash
   pm2 logs marketplace-backend --lines 100
   ```
4. Sprawdź firewall - czy port jest otwarty
5. Sprawdź czy serwer backend jest uruchomiony

### Problem 3: "Błąd weryfikacji podpisu"

**Objawy:**

- Logi pokazują: `❌ [WEBHOOK] BŁĘDNA SUMA KONTROLNA!`

**Rozwiązanie:**

1. Sprawdź `TPAY_SECURITY_CODE` w `.env`
2. Porównaj z kodem w panelu Tpay (Integracje → Testowanie powiadomień)
3. Upewnij się, że nie ma spacji na początku/końcu
4. Zrestartuj serwer po zmianie

### Problem 4: "Transakcja nie znaleziona"

**Objawy:**

- Logi pokazują: `❌ [WEBHOOK] Transakcja nie znaleziona w bazie!`

**Rozwiązanie:**

1. Sprawdź połączenie z MongoDB
2. Sprawdź czy transakcja została utworzona przed płatnością
3. Sprawdź logi inicjacji płatności: `🚀 [TPAY] INICJACJA PŁATNOŚCI`

### Problem 5: "Ogłoszenie nie aktywuje się"

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

## 📊 MONITOROWANIE

### Gdzie szukać logów:

#### Backend (konsola):

```bash
# PM2
pm2 logs marketplace-backend

# Screen
screen -r backend

# Bezpośrednio
# Logi są w konsoli gdzie uruchomiłeś npm start
```

#### MongoDB:

```javascript
// Ostatnie 10 transakcji
db.transactions.find().sort({ createdAt: -1 }).limit(10);

// Aktywne ogłoszenia
db.ads.find({ status: "active" }).sort({ createdAt: -1 }).limit(10);

// Transakcje z ostatniej godziny
db.transactions
  .find({
    createdAt: { $gte: new Date(Date.now() - 3600000) },
  })
  .sort({ createdAt: -1 });
```

#### Panel Tpay:

- Menu → **Transakcje** → **Historia**
- Sprawdź status płatności
- Sprawdź czy webhook został wysłany

---

## 📞 KONTAKT I WSPARCIE

### Tpay Support:

- **Email:** support@tpay.com
- **Telefon:** +48 22 290 00 00
- **Panel:** https://panel.tpay.com
- **Dokumentacja:** https://docs.tpay.com

### Pytania do Tpay:

1. "Webhook nie działa - jak mogę przetestować połączenie?"
2. "Gdzie mogę zobaczyć logi webhooków w panelu?"
3. "Jak mogę przetestować płatność bez obciążania karty?"

---

## 📋 CHECKLIST KOŃCOWY

Przed uznaniem za w pełni działające, sprawdź:

- [x] Plik `.env` zaktualizowany z nowymi kluczami
- [x] Webhook skonfigurowany w panelu Tpay
- [ ] Serwer backend zrestartowany
- [ ] Test płatności wykonany pomyślnie
- [ ] Ogłoszenie aktywuje się po płatności
- [ ] Webhook działa (logi pokazują powiadomienia)
- [ ] Transakcja zapisuje się w bazie
- [ ] Faktura generuje się poprawnie
- [ ] Brak błędów w logach

---

## 🎯 PODSUMOWANIE

### Co zostało zmienione:

1. ✅ **CLIENT_ID** - nowy klucz OAuth
2. ✅ **SECRET** - nowy klucz OAuth
3. ✅ **MERCHANT_ID** - nowy ID sprzedawcy (185476)
4. ✅ **SECURITY_CODE** - nowy kod bezpieczeństwa
5. ✅ **Webhook URL** - skonfigurowany w panelu Tpay

### Co działa automatycznie:

- `tpayService.js` - automatycznie używa nowych kluczy z `.env`
- `transactionController.js` - używa tpayService
- `transactionRoutes.js` - routing webhooka jest poprawny

### Co musisz zrobić:

1. **Zrestartuj serwer backend** (PM2/nodemon/screen)
2. **Przetestuj płatność** (zalecam małą kwotę)
3. **Sprawdź logi** (czy wszystko działa)

---

## ✅ GOTOWE!

System płatności Tpay jest skonfigurowany z nowym kontem i gotowy do użycia!

**Następny krok:** Zrestartuj serwer i przetestuj pierwszą płatność! 🚀

---

**Autor:** Cline AI Assistant  
**Data:** 2026-02-16  
**Wersja:** 1.0
