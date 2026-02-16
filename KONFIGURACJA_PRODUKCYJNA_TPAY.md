# 🚀 KONFIGURACJA PRODUKCYJNA TPAY - SZYBKI START

## Data: 2026-01-07

---

## 📋 CO POTRZEBUJESZ DO URUCHOMIENIA PRODUKCYJNEGO

### 1. **KONTO TPAY PRODUKCYJNE**

#### Rejestracja:

- Wejdź na: https://tpay.com
- Kliknij "Załóż konto" lub "Rejestracja"
- Wypełnij formularz rejestracyjny (dane firmy)

#### Weryfikacja:

- Tpay wymaga weryfikacji firmy (KYC)
- Przygotuj dokumenty:
  - NIP firmy
  - KRS/CEIDG
  - Dowód osobisty właściciela
  - Umowa z Tpay (do podpisania)

#### Czas aktywacji:

- Weryfikacja: 1-3 dni robocze
- Po weryfikacji otrzymasz dostęp do panelu produkcyjnego

---

## 🔑 2. DANE DOSTĘPOWE (POBIERZ Z PANELU TPAY)

Po zalogowaniu do panelu Tpay (https://panel.tpay.com):

### A. Client ID i Secret (OAuth)

**Gdzie znaleźć:**

- Panel Tpay → **Integracja** → **API** → **Klucze OAuth**
- Lub: **Ustawienia** → **Integracja** → **Dane dostępowe**

**Co skopiować:**

```
Client ID: np. 01JWBS1RCBX7T44K5MAKDRPN7Q-01KCR5DAAGMM2A89KV1PAZ4TMW
Client Secret: np. 6ece2b7a2842237777401a19659d450871e5d8dd7c8d68e80c098e65580e48b9
```

### B. Merchant ID

**Gdzie znaleźć:**

- Panel Tpay → **Ustawienia** → **Dane konta**
- Lub na górze strony po zalogowaniu

**Format:**

```
Merchant ID: np. 12345
```

### C. Security Code (Kod bezpieczeństwa)

**Gdzie znaleźć:**

- Panel Tpay → **Integracja** → **Powiadomienia** → **Kod bezpieczeństwa**
- Lub: **Ustawienia** → **Bezpieczeństwo** → **Kod weryfikacyjny**

**Format:**

```
Security Code: np. abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

---

## 🌐 3. KONFIGURACJA WEBHOOKA (NAJWAŻNIEJSZE!)

### Co to jest webhook?

Webhook to adres URL, na który Tpay wysyła powiadomienia o statusie płatności.
**BEZ WEBHOOKA PŁATNOŚCI NIE BĘDĄ DZIAŁAĆ!**

### Gdzie ustawić webhook:

#### Krok 1: Zaloguj się do panelu Tpay

- https://panel.tpay.com

#### Krok 2: Przejdź do ustawień powiadomień

- **Menu** → **Integracja** → **Powiadomienia**
- Lub: **Ustawienia** → **Powiadomienia** → **Konfiguracja**

#### Krok 3: Dodaj URL webhooka

**WAŻNE: URL musi być PUBLICZNY i HTTPS!**

```
URL webhooka: https://twoja-domena.pl/api/transactions/webhook/tpay
Metoda: POST
Format: JSON
```

**Przykłady:**

```
✅ DOBRZE: https://api.autosell.pl/api/transactions/webhook/tpay
✅ DOBRZE: https://marketplace.pl/api/transactions/webhook/tpay
❌ ŹLE: http://localhost:5000/api/transactions/webhook/tpay (nie działa - lokalny)
❌ ŹLE: http://twoja-domena.pl/... (nie działa - brak HTTPS)
```

#### Krok 4: Zapisz ustawienia

- Kliknij **"Zapisz"**
- Tpay może wysłać testowe powiadomienie - to normalne

#### Krok 5: Przetestuj webhook

- Panel Tpay → **Integracja** → **Powiadomienia** → **Test webhooka**
- Kliknij "Wyślij testowe powiadomienie"
- Sprawdź logi backendu czy przyszło

---

## ⚙️ 4. KONFIGURACJA PLIKU .ENV

### Otwórz plik `.env` w backendzie:

```env
# ========================================
# TPAY PRODUCTION CONFIGURATION
# ========================================

# Dane OAuth (z panelu Tpay → Integracja → API)
TPAY_CLIENT_ID=TWOJ_CLIENT_ID_TUTAJ
TPAY_SECRET=TWOJ_CLIENT_SECRET_TUTAJ

# Merchant ID (z panelu Tpay → Ustawienia → Dane konta)
TPAY_MERCHANT_ID=TWOJ_MERCHANT_ID_TUTAJ

# Security Code (z panelu Tpay → Integracja → Powiadomienia)
TPAY_SECURITY_CODE=TWOJ_SECURITY_CODE_TUTAJ

# ========================================
# BACKEND URL (MUSI BYĆ PUBLICZNY HTTPS!)
# ========================================
BACKEND_URL=https://twoja-domena.pl

# ========================================
# FRONTEND URL
# ========================================
FRONTEND_URL=https://twoja-strona.pl

# ========================================
# ŚRODOWISKO
# ========================================
NODE_ENV=production
```

### Przykład wypełniony:

```env
TPAY_CLIENT_ID=01JWBS1RCBX7T44K5MAKDRPN7Q-01KCR5DAAGMM2A89KV1PAZ4TMW
TPAY_SECRET=6ece2b7a2842237777401a19659d450871e5d8dd7c8d68e80c098e65580e48b9
TPAY_MERCHANT_ID=12345
TPAY_SECURITY_CODE=abc123def456ghi789jkl012mno345pqr678stu901vwx234yz

BACKEND_URL=https://api.autosell.pl
FRONTEND_URL=https://autosell.pl

NODE_ENV=production
```

---

## 🚀 5. WDROŻENIE NA SERWER

### Wymagania serwera:

- ✅ Publiczny adres IP lub domena
- ✅ Certyfikat SSL (HTTPS) - **WYMAGANE!**
- ✅ Node.js 18+ zainstalowany
- ✅ MongoDB działający
- ✅ Port 5000 (lub inny) otwarty

### Kroki wdrożenia:

#### 1. Wgraj kod na serwer

```bash
# Przez Git
git clone https://github.com/twoje-repo/backend.git
cd backend

# Lub przez FTP/SFTP
# Wgraj wszystkie pliki
```

#### 2. Zainstaluj zależności

```bash
npm install
```

#### 3. Skonfiguruj .env

```bash
# Skopiuj przykładowy plik
cp .env.example .env

# Edytuj plik
nano .env
# Lub użyj innego edytora (vim, vi, etc.)

# Wklej dane z kroku 4
```

#### 4. Uruchom serwer

```bash
# Opcja 1: PM2 (zalecane dla produkcji)
npm install -g pm2
pm2 start index.js --name marketplace-backend
pm2 save
pm2 startup

# Opcja 2: Bezpośrednio
npm start

# Opcja 3: Screen (jeśli nie masz PM2)
screen -S backend
npm start
# Ctrl+A, D (odłącz screen)
```

#### 5. Sprawdź czy działa

```bash
# Test lokalny
curl http://localhost:5000/api/health

# Test publiczny
curl https://twoja-domena.pl/api/health
```

---

## ✅ 6. CHECKLIST PRZED URUCHOMIENIEM

Sprawdź każdy punkt:

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

### Serwer:

- [ ] Backend wdrożony na serwer
- [ ] Certyfikat SSL zainstalowany (HTTPS działa)
- [ ] MongoDB połączone
- [ ] Serwer dostępny publicznie
- [ ] Port otwarty w firewall

### Konfiguracja:

- [ ] Plik .env wypełniony
- [ ] BACKEND_URL ustawiony na publiczny adres
- [ ] FRONTEND_URL ustawiony poprawnie
- [ ] NODE_ENV=production

---

## 🧪 7. TEST PIERWSZEJ PŁATNOŚCI

### Krok 1: Utwórz testowe ogłoszenie

- Zaloguj się na frontend
- Dodaj nowe ogłoszenie
- Przejdź do płatności

### Krok 2: Wybierz Tpay

- Wybierz metodę płatności: Tpay
- Kliknij "Zapłać"

### Krok 3: Opłać (prawdziwa płatność!)

- Zostaniesz przekierowany do Tpay
- Użyj prawdziwej karty/przelewu
- **UWAGA: To będzie prawdziwa płatność!**
- Zalecam test z małą kwotą (np. 1 zł)

### Krok 4: Sprawdź logi

```bash
# Jeśli używasz PM2:
pm2 logs marketplace-backend

# Jeśli używasz screen:
screen -r backend

# Szukaj w logach:
🔔 [WEBHOOK] OTRZYMANO POWIADOMIENIE Z TPAY
✅ [WEBHOOK] Podpis zweryfikowany poprawnie
💰 [WEBHOOK] Status płatności: OPŁACONO
✅ [WEBHOOK] Ogłoszenie AKTYWOWANE
```

### Krok 5: Zweryfikuj

- [ ] Ogłoszenie widoczne na liście
- [ ] Status ogłoszenia: "active"
- [ ] Transakcja w historii: "Opłacono"
- [ ] Numer faktury wygenerowany

---

## 🐛 8. ROZWIĄZYWANIE PROBLEMÓW

### Problem: "Webhook nie działa"

**Objawy:**

- Płatność przeszła w Tpay
- Ogłoszenie nie aktywuje się
- Brak logów `[WEBHOOK]` w konsoli

**Rozwiązanie:**

1. Sprawdź URL webhooka w panelu Tpay
2. Sprawdź czy serwer jest dostępny:
   ```bash
   curl https://twoja-domena.pl/api/transactions/webhook/tpay
   ```
3. Sprawdź logi serwera:
   ```bash
   pm2 logs marketplace-backend --lines 100
   ```
4. Sprawdź firewall - czy port jest otwarty
5. Sprawdź certyfikat SSL - czy HTTPS działa

### Problem: "Błąd weryfikacji podpisu"

**Objawy:**

- Logi pokazują: `❌ [WEBHOOK] BŁĘDNA SUMA KONTROLNA!`

**Rozwiązanie:**

1. Sprawdź `TPAY_SECURITY_CODE` w .env
2. Porównaj z kodem w panelu Tpay
3. Upewnij się, że nie ma spacji na początku/końcu
4. Zrestartuj serwer po zmianie .env

### Problem: "Transakcja nie znaleziona"

**Objawy:**

- Logi pokazują: `❌ [WEBHOOK] Transakcja nie znaleziona w bazie!`

**Rozwiązanie:**

1. Sprawdź połączenie z MongoDB
2. Sprawdź czy transakcja została utworzona przed płatnością
3. Sprawdź logi inicjacji płatności: `🚀 [TPAY] INICJACJA PŁATNOŚCI`

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

## 📞 9. KONTAKT I WSPARCIE

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

## 🎯 10. PODSUMOWANIE - CO MUSISZ ZROBIĆ

### Minimum do uruchomienia:

1. **Załóż konto Tpay** (https://tpay.com)
2. **Przejdź weryfikację** (1-3 dni)
3. **Pobierz dane z panelu:**
   - Client ID
   - Client Secret
   - Merchant ID
   - Security Code
4. **Ustaw webhook w panelu Tpay:**
   - URL: `https://twoja-domena.pl/api/transactions/webhook/tpay`
5. **Wklej dane do .env**
6. **Wdróż backend na serwer z HTTPS**
7. **Przetestuj pierwszą płatność**

### Czas realizacji:

- Rejestracja Tpay: 10 minut
- Weryfikacja: 1-3 dni robocze
- Konfiguracja: 30 minut
- Wdrożenie: 1-2 godziny
- **RAZEM: 2-4 dni**

---

## ✅ GOTOWE!

Po wykonaniu wszystkich kroków Twój system płatności będzie działał w trybie produkcyjnym!

**Pamiętaj:**

- Webhook MUSI być HTTPS
- Webhook MUSI być publiczny
- Dane w .env MUSZĄ być produkcyjne
- Serwer MUSI być dostępny 24/7

**Powodzenia! 🚀**
