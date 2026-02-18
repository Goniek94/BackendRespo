# 🔧 Naprawa Webhooka Tpay - PILNE!

**Problem:** Płatności przechodzą, ale ogłoszenia pozostają w statusie PENDING  
**Przyczyna:** Nieprawidłowy URL webhooka w panelu Tpay  
**Status:** ⚠️ WYMAGA NAPRAWY W PANELU TPAY

---

## 🎯 Problem

Webhook URL w panelu Tpay jest **NIEPRAWIDŁOWY**:

❌ **Aktualnie (ŹLE):**

```
https://api.autosell.pl/transactions/webhook/tpay
```

✅ **Powinno być (DOBRZE):**

```
https://api.autosell.pl/api/transactions/webhook/tpay
```

**Brakuje `/api/` w ścieżce!**

---

## 📝 Jak naprawić w panelu Tpay

### Krok 1: Zaloguj się do panelu Tpay

1. Wejdź na: https://secure.tpay.com/
2. Zaloguj się swoimi danymi

### Krok 2: Przejdź do ustawień powiadomień

1. W menu głównym znajdź **"Ustawienia"** lub **"Konfiguracja"**
2. Szukaj sekcji **"Powiadomienia"** lub **"Webhooks"** lub **"Notifications"**
3. Może być też w **"Integracja"** → **"Powiadomienia"**

### Krok 3: Zmień URL powiadomień

Znajdź pole z URL powiadomień i zmień na:

```
https://api.autosell.pl/api/transactions/webhook/tpay
```

### Krok 4: Zapisz zmiany

1. Kliknij **"Zapisz"** lub **"Save"**
2. Może być wymagane potwierdzenie emailem lub SMS

---

## 🧪 Test po zmianie

### Opcja 1: Test w panelu Tpay

Jeśli panel Tpay ma opcję "Test webhook" lub "Wyślij testowe powiadomienie":

1. Użyj tej opcji
2. Sprawdź logi na VPS czy webhook dotarł

### Opcja 2: Test rzeczywistą płatnością

1. Wejdź na https://autosell.pl
2. Dodaj testowe ogłoszenie
3. Opłać je przez Tpay (możesz użyć trybu testowego jeśli dostępny)
4. Sprawdź czy ogłoszenie zmienia status z PENDING na ACTIVE

---

## 🔍 Weryfikacja czy webhook działa

### Sprawdź logi na VPS:

```bash
ssh root@185.25.151.239
pm2 logs marketplace-backend --lines 100 | grep -i webhook
```

### Szukaj w logach:

- ✅ `🔔 [WEBHOOK] Otrzymano notyfikację`
- ✅ `✅ [WEBHOOK] Transakcja ... zakończona sukcesem`
- ❌ Brak logów = webhook nie dociera

---

## 📊 Struktura endpointu webhooka

Backend nasłuchuje na:

```
POST https://api.autosell.pl/api/transactions/webhook/tpay
```

Routing w backendzie:

```javascript
// routes/payments/transactionRoutes.js
router.post("/webhook/tpay", transactionController.handleTpayWebhook);
```

Pełna ścieżka:

- Base URL: `https://api.autosell.pl`
- API prefix: `/api`
- Route: `/transactions/webhook/tpay`
- **Razem:** `https://api.autosell.pl/api/transactions/webhook/tpay`

---

## ⚠️ Ważne informacje

### Format powiadomień Tpay

Backend akceptuje dwa formaty:

1. **Nowe API (OAuth)** - JSON bez MD5
2. **Stare API** - form-urlencoded z MD5

### Bezpieczeństwo

- Webhook jest dostępny publicznie (musi być dla Tpay)
- Weryfikacja odbywa się przez:
  - HTTPS
  - Opcjonalnie MD5 (dla starego API)
  - IP whitelisting (jeśli skonfigurowane w Tpay)

---

## 🔄 Co się stanie po naprawie

1. **Tpay wyśle powiadomienie** na poprawny URL
2. **Backend otrzyma webhook** i zaloguje: `🔔 [WEBHOOK] Otrzymano notyfikację`
3. **Transakcja zostanie zaktualizowana** na status `completed`
4. **Ogłoszenie zostanie aktywowane** - status zmieni się na `active`
5. **Użytkownik otrzyma powiadomienie** o publikacji ogłoszenia

---

## 🆘 Jeśli nadal nie działa

### Sprawdź czy endpoint jest dostępny:

```bash
curl -X POST https://api.autosell.pl/api/transactions/webhook/tpay \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook"}'
```

Oczekiwana odpowiedź: `TRUE` (Tpay wymaga odpowiedzi "TRUE")

### Sprawdź nginx/firewall:

```bash
ssh root@185.25.151.239
# Sprawdź konfigurację nginx
cat /etc/nginx/sites-available/default | grep -A 10 "api.autosell.pl"

# Sprawdź czy port 5000 jest otwarty
netstat -tulpn | grep 5000
```

---

## 📞 Kontakt do Tpay

Jeśli masz problem ze znalezieniem ustawień webhooka:

- **Email:** bok@tpay.com
- **Telefon:** +48 22 101 02 80
- **Panel pomocy:** https://tpay.com/pomoc

Powiedz im że potrzebujesz zmienić **URL powiadomień (webhook URL)** dla swojego konta.

---

## ✅ Checklist

- [ ] Zalogować się do panelu Tpay
- [ ] Znaleźć ustawienia powiadomień/webhooków
- [ ] Zmienić URL na: `https://api.autosell.pl/api/transactions/webhook/tpay`
- [ ] Zapisać zmiany
- [ ] Przetestować płatność
- [ ] Sprawdzić czy ogłoszenie zmienia status na ACTIVE
- [ ] Sprawdzić logi na VPS

---

## 🎉 Po naprawie

Gdy webhook będzie działać poprawnie:

1. Płatności będą automatycznie aktywować ogłoszenia
2. Użytkownicy dostaną powiadomienia
3. Status transakcji będzie się aktualizował
4. System będzie działał w pełni automatycznie

**Powodzenia!** 🚀
