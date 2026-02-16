# 🔔 Konfiguracja Webhooków Tpay

## 📋 Spis treści

1. [Czym są webhooki?](#czym-są-webhooki)
2. [Konfiguracja w panelu Tpay](#konfiguracja-w-panelu-tpay)
3. [URL webhooka](#url-webhooka)
4. [Zabezpieczenia](#zabezpieczenia)
5. [Testowanie webhooków](#testowanie-webhooków)
6. [Flow płatności](#flow-płatności)
7. [Troubleshooting](#troubleshooting)

---

## 🤔 Czym są webhooki?

Webhooki to powiadomienia **server-to-server** wysyłane przez Tpay do Twojego backendu, gdy zmienia się status płatności. Są **kluczowe** dla prawidłowego działania systemu płatności, ponieważ:

- ✅ Aktywują ogłoszenie po opłaceniu
- ✅ Generują numer faktury
- ✅ Wysyłają powiadomienia do użytkownika
- ✅ Działają nawet jeśli użytkownik zamknie przeglądarkę

**WAŻNE:** Bez webhooków ogłoszenia NIE będą aktywowane automatycznie!

---

## ⚙️ Konfiguracja w panelu Tpay

### Krok 1: Zaloguj się do panelu Tpay

1. Przejdź do: https://secure.tpay.com/
2. Zaloguj się na swoje konto

### Krok 2: Przejdź do ustawień powiadomień

1. W menu głównym wybierz **"Ustawienia"**
2. Następnie **"Powiadomienia"** lub **"Notifications"**
3. Znajdź sekcję **"Adres powiadomień"** lub **"Notification URL"**

### Krok 3: Skonfiguruj URL webhooka

#### Dla środowiska PRODUKCYJNEGO:

```
https://twoja-domena.pl/api/transactions/webhook/tpay
```

#### Dla środowiska TESTOWEGO (sandbox):

```
https://twoja-domena-testowa.pl/api/transactions/webhook/tpay
```

#### Dla lokalnego developmentu (z ngrok):

```
https://twoj-ngrok-url.ngrok.io/api/transactions/webhook/tpay
```

### Krok 4: Włącz powiadomienia

- ✅ Zaznacz opcję **"Włącz powiadomienia"**
- ✅ Wybierz format: **"POST"**
- ✅ Zapisz ustawienia

---

## 🔗 URL Webhooka

### Struktura URL

```
POST https://twoja-domena.pl/api/transactions/webhook/tpay
```

### Parametry wysyłane przez Tpay

Tpay wysyła następujące parametry w formacie `application/x-www-form-urlencoded`:

| Parametr    | Opis                               | Przykład                        |
| ----------- | ---------------------------------- | ------------------------------- |
| `tr_id`     | ID transakcji w systemie Tpay      | `TR-XXX-XXXXXX`                 |
| `tr_date`   | Data transakcji                    | `2026-02-16 16:00:00`           |
| `tr_crc`    | Twoje ID transakcji (MongoDB \_id) | `699330e8e084f74d06bfc674`      |
| `tr_amount` | Kwota transakcji                   | `50.00`                         |
| `tr_paid`   | Kwota opłacona                     | `50.00`                         |
| `tr_desc`   | Opis transakcji                    | `Opłata za ogłoszenie: BMW X5`  |
| `tr_status` | Status płatności                   | `TRUE` / `FALSE` / `CHARGEBACK` |
| `tr_error`  | Kod błędu (jeśli wystąpił)         | `none`                          |
| `tr_email`  | Email płacącego                    | `user@example.com`              |
| `md5sum`    | Suma kontrolna MD5                 | `abc123...`                     |

### Statusy płatności

| Status       | Znaczenie                       | Akcja systemu                         |
| ------------ | ------------------------------- | ------------------------------------- |
| `TRUE`       | ✅ Płatność zakończona sukcesem | Aktywuje ogłoszenie, generuje fakturę |
| `FALSE`      | ❌ Płatność odrzucona           | Oznacza transakcję jako `failed`      |
| `CHARGEBACK` | 🔙 Płatność anulowana           | Oznacza transakcję jako `cancelled`   |

---

## 🔒 Zabezpieczenia

### 1. Weryfikacja podpisu MD5

Każde powiadomienie od Tpay zawiera sumę kontrolną `md5sum`, która weryfikuje autentyczność żądania.

**Nasz backend automatycznie weryfikuje podpis** w metodzie `verifyNotificationSignature()`:

```javascript
// services/tpay/tpayService.js
verifyNotificationSignature(notification) {
  const { md5sum, ...params } = notification;

  // Budowanie stringa do weryfikacji
  const verificationString =
    params.tr_id +
    params.tr_date +
    params.tr_crc +
    params.tr_amount +
    params.tr_paid +
    params.tr_desc +
    params.tr_status +
    process.env.TPAY_SECURITY_CODE; // Kod bezpieczeństwa z panelu Tpay

  const calculatedMd5 = crypto
    .createHash('md5')
    .update(verificationString)
    .digest('hex');

  return calculatedMd5 === md5sum;
}
```

### 2. Rate Limiting

Webhook ma ograniczenie liczby żądań (rate limiting):

- **100 żądań na 15 minut** z jednego IP
- Chroni przed atakami DDoS

### 3. Endpoint publiczny (bez auth)

⚠️ **WAŻNE:** Webhook **NIE MOŻE** wymagać autoryzacji (tokena JWT), ponieważ Tpay nie może się uwierzytelnić.

Dlatego endpoint `/api/transactions/webhook/tpay` jest **publiczny**, ale zabezpieczony weryfikacją podpisu MD5.

---

## 🧪 Testowanie Webhooków

### Opcja 1: Użyj ngrok (dla lokalnego developmentu)

1. **Zainstaluj ngrok:**

   ```bash
   npm install -g ngrok
   ```

2. **Uruchom backend lokalnie:**

   ```bash
   npm run dev
   ```

3. **Uruchom ngrok:**

   ```bash
   ngrok http 5000
   ```

4. **Skopiuj URL ngrok:**

   ```
   https://abc123.ngrok.io
   ```

5. **Ustaw w panelu Tpay:**
   ```
   https://abc123.ngrok.io/api/transactions/webhook/tpay
   ```

### Opcja 2: Testowanie ręczne (curl)

Możesz symulować webhook używając `curl`:

```bash
curl -X POST http://localhost:5000/api/transactions/webhook/tpay \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "tr_id=TR-XXX-XXXXXX" \
  -d "tr_date=2026-02-16 16:00:00" \
  -d "tr_crc=699330e8e084f74d06bfc674" \
  -d "tr_amount=50.00" \
  -d "tr_paid=50.00" \
  -d "tr_desc=Test" \
  -d "tr_status=TRUE" \
  -d "tr_error=none" \
  -d "tr_email=test@example.com" \
  -d "md5sum=OBLICZ_MD5"
```

⚠️ **Uwaga:** Musisz obliczyć prawidłowy `md5sum` zgodnie z dokumentacją Tpay.

### Opcja 3: Panel testowy Tpay

W panelu Tpay (sandbox) możesz wykonać testową płatność i sprawdzić, czy webhook działa.

---

## 🔄 Flow Płatności

### 1. Użytkownik wypełnia formularz ogłoszenia

```
Frontend → Backend: POST /api/transactions/tpay/initiate
```

### 2. Backend tworzy ogłoszenie i transakcję

```
Status ogłoszenia: pending_payment
Status transakcji: pending
```

### 3. Backend zwraca URL płatności

```
Backend → Frontend: { paymentUrl: "https://secure.tpay.com/..." }
```

### 4. Użytkownik płaci w Tpay

```
Frontend → Tpay: Przekierowanie do bramki płatności
```

### 5. Tpay wysyła webhook do backendu

```
Tpay → Backend: POST /api/transactions/webhook/tpay
```

### 6. Backend przetwarza webhook

```
✅ Weryfikuje podpis MD5
✅ Aktualizuje status transakcji: completed
✅ Aktywuje ogłoszenie: status = active
✅ Generuje numer faktury
✅ Wysyła powiadomienie do użytkownika
```

### 7. Tpay przekierowuje użytkownika

```
Tpay → Frontend: Przekierowanie do /listing/{adId}/{slug}?payment=success
```

### 8. Frontend sprawdza status płatności

```
Frontend → Backend: GET /api/transactions/{transactionId}/status
Backend → Frontend: { status: "completed", ad: { status: "active" } }
```

### 9. Frontend wyświetla szczegóły ogłoszenia

```
✅ Ogłoszenie jest aktywne i widoczne publicznie
```

---

## 🐛 Troubleshooting

### Problem: Webhook nie działa

**Sprawdź:**

1. ✅ Czy URL webhooka jest prawidłowy?
2. ✅ Czy backend jest dostępny publicznie?
3. ✅ Czy firewall nie blokuje żądań od Tpay?
4. ✅ Czy `TPAY_SECURITY_CODE` w `.env` jest prawidłowy?

**Logi do sprawdzenia:**

```bash
# Backend powinien logować:
🔔 [WEBHOOK] OTRZYMANO POWIADOMIENIE Z TPAY
✅ [WEBHOOK] Podpis zweryfikowany poprawnie
💰 [WEBHOOK] Status płatności: OPŁACONO
```

### Problem: Błąd weryfikacji podpisu

**Przyczyny:**

- ❌ Nieprawidłowy `TPAY_SECURITY_CODE` w `.env`
- ❌ Tpay wysyła dane w innym formacie
- ❌ Próba ataku (fałszywe powiadomienie)

**Rozwiązanie:**

1. Sprawdź `TPAY_SECURITY_CODE` w panelu Tpay
2. Zaktualizuj `.env`
3. Zrestartuj backend

### Problem: Ogłoszenie nie aktywuje się

**Sprawdź:**

1. ✅ Czy webhook został wywołany? (sprawdź logi)
2. ✅ Czy `tr_crc` zawiera prawidłowe ID transakcji?
3. ✅ Czy transakcja istnieje w bazie danych?
4. ✅ Czy ogłoszenie istnieje w bazie danych?

**Logi do sprawdzenia:**

```bash
✅ [WEBHOOK] Znaleziono transakcję
🚗 [WEBHOOK] Aktywacja ogłoszenia...
✅ [WEBHOOK] Ogłoszenie AKTYWOWANE
```

### Problem: Użytkownik nie otrzymuje powiadomienia

**Sprawdź:**

1. ✅ Czy `notificationManager` działa?
2. ✅ Czy użytkownik jest połączony przez Socket.IO?
3. ✅ Czy email jest prawidłowy?

---

## 📝 Checklist Konfiguracji

Przed uruchomieniem produkcyjnym upewnij się, że:

- [ ] URL webhooka jest skonfigurowany w panelu Tpay
- [ ] `TPAY_SECURITY_CODE` jest ustawiony w `.env`
- [ ] Backend jest dostępny publicznie (nie localhost)
- [ ] Firewall nie blokuje żądań od Tpay
- [ ] SSL/HTTPS jest włączony (wymagane w produkcji)
- [ ] Webhook został przetestowany (testowa płatność)
- [ ] Logi pokazują prawidłowe przetwarzanie webhooków
- [ ] Ogłoszenia aktywują się automatycznie po płatności
- [ ] Użytkownicy otrzymują powiadomienia

---

## 🎯 Podsumowanie

✅ **Webhooki są kluczowe** - bez nich ogłoszenia nie będą aktywowane
✅ **Zabezpieczenia działają** - weryfikacja MD5, rate limiting
✅ **Flow jest kompletny** - od formularza do aktywnego ogłoszenia
✅ **Przekierowania działają** - użytkownik wraca do szczegółów ogłoszenia

**Następne kroki:**

1. Skonfiguruj URL webhooka w panelu Tpay
2. Przetestuj płatność w trybie sandbox
3. Sprawdź logi backendu
4. Zweryfikuj, czy ogłoszenie się aktywowało
5. Przejdź do produkcji! 🚀

---

**Pytania? Problemy?**
Sprawdź logi backendu - wszystkie operacje są szczegółowo logowane z prefiksami:

- `[TPAY]` - inicjacja płatności
- `[WEBHOOK]` - przetwarzanie webhooków
- `[STATUS]` - sprawdzanie statusu płatności
