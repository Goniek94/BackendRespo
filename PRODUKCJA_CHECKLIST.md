# ✅ Checklist Wdrożenia Produkcyjnego

## 🎯 Status: GOTOWE DO WDROŻENIA

Data przygotowania: 16.02.2026

---

## 📋 Co zostało skonfigurowane?

### 1. ✅ Środowisko produkcyjne

```env
NODE_ENV=production
FORCE_HTTPS=true
HTTPS_ENABLED=true
```

### 2. ✅ URL-e aplikacji

```env
FRONTEND_URL=https://autosell.pl
BACKEND_URL=https://api.autosell.pl
API_URL=https://api.autosell.pl
```

### 3. ✅ CORS i Cookies

```env
ALLOWED_ORIGINS=https://autosell.pl,https://www.autosell.pl,https://api.autosell.pl
COOKIE_DOMAIN=.autosell.pl
```

### 4. ✅ Tpay - Dane produkcyjne

```env
TPAY_CLIENT_ID=01KGC419CJ2W3A6MHRDC0K6M8H-01KHK8GM4F2JK96MKXTHHAW1S1
TPAY_SECRET=3d9ee976ae62942742b9bb2860682b67706cd2205e6b5a09d337647ce9e36536
TPAY_MERCHANT_ID=185476
TPAY_SECURITY_CODE=6109258a3d5a9076f3160c5462f4bada167ee245293f2d90d3fc406268f01825
```

### 5. ✅ SMS - Produkcja

```env
MOCK_SMS=false  # Prawdziwe SMS-y będą wysyłane!
```

---

## 🚀 Kroki wdrożenia

### Krok 1: Skonfiguruj webhook w panelu Tpay

1. Zaloguj się do: https://secure.tpay.com/
2. Przejdź do: **Ustawienia → Powiadomienia**
3. Ustaw URL webhooka:
   ```
   https://api.autosell.pl/api/transactions/webhook/tpay
   ```
4. Włącz powiadomienia (format: POST)
5. Zapisz ustawienia

### Krok 2: Wdróż backend na serwer

```bash
# Na serwerze produkcyjnym
cd /path/to/Marketplace-Backend
git pull origin main
npm install --production
pm2 restart marketplace-backend
```

### Krok 3: Wdróż frontend

```bash
# Na serwerze produkcyjnym
cd /path/to/marketplace-frontend
git pull origin main
npm install
npm run build
# Skopiuj build do serwera WWW
```

### Krok 4: Sprawdź certyfikat SSL

Upewnij się, że:

- ✅ `https://autosell.pl` działa
- ✅ `https://api.autosell.pl` działa
- ✅ Certyfikat SSL jest ważny

### Krok 5: Testuj płatność produkcyjną

1. Utwórz testowe ogłoszenie
2. Przejdź przez proces płatności
3. Sprawdź logi backendu:
   ```bash
   pm2 logs marketplace-backend
   ```
4. Zweryfikuj, czy:
   - ✅ Płatność przeszła
   - ✅ Webhook został odebrany
   - ✅ Ogłoszenie zostało aktywowane
   - ✅ Faktura została wygenerowana

---

## ⚠️ WAŻNE - Przed uruchomieniem!

### 1. Backup bazy danych

```bash
mongodump --uri="mongodb+srv://..." --out=/backup/$(date +%Y%m%d)
```

### 2. Sprawdź zmienne środowiskowe

```bash
# Na serwerze produkcyjnym
cat .env | grep -E "NODE_ENV|FRONTEND_URL|TPAY"
```

### 3. Sprawdź logi

```bash
# Backend
pm2 logs marketplace-backend --lines 100

# Nginx (jeśli używasz)
tail -f /var/log/nginx/error.log
```

---

## 🔒 Zabezpieczenia

### ✅ Skonfigurowane:

- [x] HTTPS wymuszony
- [x] CORS ograniczony do produkcyjnych domen
- [x] Cookies z flagą `secure`
- [x] Rate limiting włączony
- [x] Weryfikacja podpisu MD5 dla webhooków Tpay
- [x] JWT z silnymi sekretami

### ⚠️ Do sprawdzenia:

- [ ] Firewall - czy port 5000 jest dostępny tylko dla Nginx?
- [ ] MongoDB - czy dostęp jest ograniczony do IP serwera?
- [ ] Backup - czy automatyczne backupy są skonfigurowane?

---

## 📊 Monitoring

### Logi do monitorowania:

1. **Backend:**

   ```bash
   pm2 logs marketplace-backend
   ```

2. **Płatności Tpay:**
   - Szukaj: `[TPAY]`, `[WEBHOOK]`, `[STATUS]`
   - Wszystkie operacje są szczegółowo logowane

3. **Błędy:**
   ```bash
   pm2 logs marketplace-backend --err
   ```

### Metryki do śledzenia:

- Liczba transakcji dziennie
- Procent udanych płatności
- Czas odpowiedzi API
- Błędy 500

---

## 🐛 Troubleshooting

### Problem: Webhook nie działa

**Sprawdź:**

1. Czy URL webhooka jest prawidłowy w panelu Tpay?
2. Czy backend jest dostępny publicznie?
3. Czy firewall nie blokuje żądań od Tpay?
4. Logi backendu:
   ```bash
   pm2 logs marketplace-backend | grep WEBHOOK
   ```

### Problem: Płatność nie aktywuje ogłoszenia

**Sprawdź:**

1. Czy webhook został wywołany? (logi)
2. Czy `TPAY_SECURITY_CODE` jest prawidłowy?
3. Czy transakcja istnieje w bazie?
4. Czy ogłoszenie istnieje w bazie?

### Problem: CORS errors

**Sprawdź:**

1. Czy `ALLOWED_ORIGINS` zawiera wszystkie domeny?
2. Czy frontend używa prawidłowego URL API?
3. Czy certyfikat SSL jest ważny?

---

## 📞 Kontakt w razie problemów

### Tpay Support

- Email: pomoc@tpay.com
- Tel: +48 22 250 41 00
- Panel: https://secure.tpay.com/

### Dokumentacja

- Tpay API: https://docs.tpay.com/
- Webhook: `TPAY_WEBHOOK_KONFIGURACJA.md`

---

## ✅ Checklist końcowy

Przed uruchomieniem produkcyjnym upewnij się, że:

- [ ] `.env` ma `NODE_ENV=production`
- [ ] URL-e są ustawione na produkcyjne domeny
- [ ] HTTPS jest włączony i działa
- [ ] Webhook jest skonfigurowany w panelu Tpay
- [ ] Certyfikat SSL jest ważny
- [ ] Backup bazy danych został wykonany
- [ ] Testowa płatność przeszła pomyślnie
- [ ] Logi nie pokazują błędów
- [ ] Monitoring jest skonfigurowany
- [ ] Zespół wie, jak reagować na problemy

---

## 🎉 Gotowe!

Po wykonaniu wszystkich kroków system jest gotowy do przyjmowania prawdziwych płatności!

**Powodzenia! 🚀**

---

**Ostatnia aktualizacja:** 16.02.2026
**Wersja:** 1.0
**Status:** ✅ GOTOWE DO WDROŻENIA
