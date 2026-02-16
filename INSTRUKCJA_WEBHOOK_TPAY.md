# 🔔 INSTRUKCJA: JAK USTAWIĆ WEBHOOK W PANELU TPAY

## ⚠️ WAŻNE: BEZ TEGO PŁATNOŚCI NIE BĘDĄ DZIAŁAĆ!

Webhook to adres, na który Tpay wysyła powiadomienia o statusie płatności.
Bez tego ogłoszenia nie będą się aktywować po opłaceniu.

---

## 📋 KROK PO KROKU

### KROK 1: Zaloguj się do panelu Tpay

1. Otwórz przeglądarkę
2. Wejdź na: **https://panel.tpay.com**
3. Zaloguj się swoimi danymi (email + hasło)

---

### KROK 2: Przejdź do ustawień powiadomień

Po zalogowaniu:

**OPCJA A - Jeśli widzisz menu po lewej stronie:**

1. Kliknij **"Integracja"** (lub **"Integration"**)
2. Potem kliknij **"Powiadomienia"** (lub **"Notifications"**)

**OPCJA B - Jeśli menu jest na górze:**

1. Kliknij **"Ustawienia"** (lub **"Settings"**)
2. Potem **"Integracja"** → **"Powiadomienia"**

**OPCJA C - Jeśli nie możesz znaleźć:**

1. Użyj wyszukiwarki w panelu (ikona lupy)
2. Wpisz: "powiadomienia" lub "notifications" lub "webhook"

---

### KROK 3: Dodaj URL webhooka

Znajdziesz sekcję typu:

- "URL powiadomień"
- "Notification URL"
- "Webhook URL"
- "Adres powiadomień"

**W POLE "URL" WKLEJ DOKŁADNIE TO:**

```
https://api.autosell.pl/api/transactions/webhook/tpay
```

⚠️ **UWAGA:**

- Skopiuj DOKŁADNIE ten adres (bez spacji na początku/końcu)
- Musi zaczynać się od `https://` (nie `http://`)
- Nie zmieniaj niczego w tym adresie!

---

### KROK 4: Ustaw metodę i format

Jeśli panel pyta o dodatkowe ustawienia:

**Metoda HTTP:**

- Wybierz: **POST**

**Format danych:**

- Wybierz: **JSON** (jeśli dostępne)
- Lub: **application/json**
- Lub: zostaw domyślne

**Wersja API:**

- Jeśli pyta: wybierz najnowszą (np. "v2" lub "latest")

---

### KROK 5: Zapisz ustawienia

1. Kliknij przycisk **"Zapisz"** (lub **"Save"**)
2. Panel może pokazać komunikat: "Ustawienia zapisane" - to dobrze!

---

### KROK 6: Przetestuj webhook (OPCJONALNIE)

Jeśli panel ma opcję **"Test webhooka"** lub **"Test notification"**:

1. Kliknij ten przycisk
2. Panel wyśle testowe powiadomienie na Twój serwer
3. Jeśli zobaczysz ✅ "Test zakończony sukcesem" - SUPER!
4. Jeśli zobaczysz ❌ błąd - sprawdź czy:
   - Serwer backend jest uruchomiony
   - URL jest dokładnie taki jak podałem
   - Certyfikat SSL działa (https://)

---

## 🎯 PODSUMOWANIE - CO WKLEIĆ I GDZIE

### CO WKLEIĆ:

```
https://api.autosell.pl/api/transactions/webhook/tpay
```

### GDZIE WKLEIĆ:

Panel Tpay → Integracja → Powiadomienia → Pole "URL powiadomień"

### CO USTAWIĆ:

- Metoda: **POST**
- Format: **JSON** (jeśli dostępne)

---

## 📸 JAK TO MOŻE WYGLĄDAĆ W PANELU

Panel może wyglądać mniej więcej tak:

```
┌─────────────────────────────────────────────────┐
│  USTAWIENIA POWIADOMIEŃ                         │
├─────────────────────────────────────────────────┤
│                                                 │
│  URL powiadomień:                               │
│  ┌───────────────────────────────────────────┐ │
│  │ https://api.autosell.pl/api/transactions │ │
│  │ /webhook/tpay                             │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  Metoda HTTP:                                   │
│  ┌─────────┐                                   │
│  │  POST ▼ │                                   │
│  └─────────┘                                   │
│                                                 │
│  Format:                                        │
│  ┌─────────┐                                   │
│  │ JSON  ▼ │                                   │
│  └─────────┘                                   │
│                                                 │
│  [ Zapisz ]  [ Test webhooka ]                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## ✅ JAK SPRAWDZIĆ CZY DZIAŁA?

### Metoda 1: Test z panelu Tpay

1. Kliknij "Test webhooka" w panelu
2. Sprawdź logi backendu:
   ```bash
   pm2 logs marketplace-backend --lines 50
   ```
3. Szukaj linii: `🔔 [WEBHOOK] OTRZYMANO POWIADOMIENIE Z TPAY`

### Metoda 2: Prawdziwa płatność (zalecam małą kwotę, np. 1 zł)

1. Dodaj testowe ogłoszenie na stronie
2. Przejdź przez proces płatności
3. Opłać w Tpay
4. Sprawdź czy ogłoszenie się aktywowało

---

## 🐛 CO JEŚLI COŚ NIE DZIAŁA?

### Problem: "Nie mogę znaleźć ustawień powiadomień"

**Rozwiązanie:**

- Sprawdź czy masz uprawnienia administratora w panelu
- Skontaktuj się z supportem Tpay: support@tpay.com
- Zapytaj: "Gdzie mogę ustawić URL powiadomień webhook?"

### Problem: "Test webhooka kończy się błędem"

**Rozwiązanie:**

1. Sprawdź czy backend jest uruchomiony:
   ```bash
   curl https://api.autosell.pl/api/health
   ```
2. Sprawdź czy URL jest dokładnie taki:
   ```
   https://api.autosell.pl/api/transactions/webhook/tpay
   ```
3. Sprawdź logi backendu:
   ```bash
   pm2 logs marketplace-backend
   ```

### Problem: "Płatność przeszła, ale ogłoszenie się nie aktywowało"

**Rozwiązanie:**

1. Sprawdź logi backendu - czy webhook przyszedł:
   ```bash
   pm2 logs marketplace-backend --lines 100 | grep WEBHOOK
   ```
2. Jeśli nie ma logów `[WEBHOOK]` - webhook nie działa
3. Sprawdź ponownie URL w panelu Tpay
4. Upewnij się, że wdrożyłeś naprawiony kod na serwer

---

## 📞 POMOC

### Tpay Support:

- **Email:** support@tpay.com
- **Telefon:** +48 22 290 00 00
- **Panel:** https://panel.tpay.com

### Co powiedzieć supportowi Tpay:

> "Witam, chcę ustawić URL powiadomień webhook dla mojej integracji.
> Gdzie w panelu mogę to zrobić?
> Mój URL to: https://api.autosell.pl/api/transactions/webhook/tpay"

---

## ✅ CHECKLIST

Po wykonaniu wszystkich kroków zaznacz:

- [ ] Zalogowałem się do panelu Tpay
- [ ] Znalazłem sekcję "Powiadomienia" / "Notifications"
- [ ] Wkleiłem URL: `https://api.autosell.pl/api/transactions/webhook/tpay`
- [ ] Ustawiłem metodę: POST
- [ ] Ustawiłem format: JSON (jeśli dostępne)
- [ ] Kliknąłem "Zapisz"
- [ ] (Opcjonalnie) Przetestowałem webhook
- [ ] Wdrożyłem naprawiony kod na serwer (`git pull && pm2 restart`)

---

## 🚀 GOTOWE!

Po wykonaniu tych kroków Twój system płatności będzie w pełni funkcjonalny!

**Powodzenia! 🎉**
