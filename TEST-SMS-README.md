# 📱 Test Wysyłania SMS - Instrukcja

## 🎯 Cel

Skrypt `test-sms-sending.js` testuje funkcjonalność wysyłania SMS-ów przez SMSAPI podczas rejestracji użytkowników.

## 📋 Wymagania

1. **Node.js** (wersja 14 lub wyższa)
2. **Konto SMSAPI** (opcjonalne - dla prawdziwych SMS-ów)
3. **Token SMSAPI** (opcjonalne - dla prawdziwych SMS-ów)

## 🚀 Jak uruchomić test

### Opcja 1: Tryb Symulacji (bez prawdziwych SMS-ów)

```bash
cd c:\Users\Mateu\Desktop\Marketplace-Backend
node test-sms-sending.js
```

W tym trybie:

- ✅ Nie wysyła prawdziwych SMS-ów
- ✅ Nie wymaga tokenu SMSAPI
- ✅ Nie kosztuje pieniędzy
- ✅ Testuje logikę aplikacji

### Opcja 2: Prawdziwe SMS-y (wymaga konfiguracji)

1. **Skonfiguruj plik `.env`:**

```env
# SMSAPI Configuration
SMSAPI_TOKEN=twoj_token_z_smsapi
SMSAPI_SENDER=AutoSell
MOCK_SMS=false
TEST_PHONE_NUMBER=+48123456789
```

2. **Uruchom test:**

```bash
node test-sms-sending.js
```

## 🔧 Konfiguracja

### Zmienne środowiskowe w `.env`:

| Zmienna             | Opis                                | Wymagana | Domyślna          |
| ------------------- | ----------------------------------- | -------- | ----------------- |
| `SMSAPI_TOKEN`      | Token API z SMSAPI.pl               | Nie\*    | -                 |
| `SMSAPI_SENDER`     | Nazwa nadawcy SMS                   | Nie      | (domyślna SMSAPI) |
| `MOCK_SMS`          | Tryb symulacji (true/false)         | Nie      | true              |
| `TEST_PHONE_NUMBER` | Numer testowy                       | Nie      | +48732108041      |
| `NODE_ENV`          | Środowisko (development/production) | Nie      | development       |

\*Wymagana tylko dla prawdziwych SMS-ów

### Jak uzyskać SMSAPI_TOKEN:

1. Zarejestruj się na https://www.smsapi.pl/
2. Przejdź do panelu: **Ustawienia → API**
3. Wygeneruj nowy token OAuth
4. Skopiuj token do pliku `.env`

## 📊 Co testuje skrypt?

### Test 1: Wysyłanie kodu weryfikacyjnego

- ✅ Wysyła SMS z 6-cyfrowym kodem
- ✅ Sprawdza odpowiedź z SMSAPI
- ✅ Wyświetla szczegóły wysłanej wiadomości

### Test 2: Walidacja formatu numeru

- ✅ Odrzuca numery bez prefiksu międzynarodowego
- ✅ Wymaga formatu: +48XXXXXXXXX

### Test 3: Walidacja długości kodu

- ✅ Odrzuca kody krótsze niż 4 cyfry
- ✅ Odrzuca kody dłuższe niż 6 cyfr

### Test 4: Walidacja długości kodu (max)

- ✅ Sprawdza górny limit długości kodu

## 📈 Przykładowy wynik testu

### Tryb Symulacji:

```
🧪 ==========================================
🧪 TEST WYSYŁANIA SMS - START
🧪 ==========================================

📋 Konfiguracja testu:
   Numer telefonu: +48732108041
   Kod testowy: 123456
   SMSAPI Token: ❌ Brak
   SMSAPI Sender: (domyślny)
   Mock Mode: ✅ Włączony
   Environment: development

📤 Rozpoczynam test wysyłania SMS...

TEST 1: Wysyłanie kodu weryfikacyjny
─────────────────────────────────────────
====================================
⚠️ SIMULATION MODE: Sending verification code to +48732***
📱 Code: 123456
📝 Message: Twój kod weryfikacyjny AutoSell: 123456

Kod jest ważny przez 10 minut.
====================================

✅ SMS wysłany pomyślnie!

📊 Szczegóły odpowiedzi:
   ID wiadomości: MOCK_abc123def456
   Numer odbiorcy: +48732108041
   Status: delivered
   Symulacja: TAK
   Data utworzenia: 2026-02-19T10:20:00.000Z

📝 Treść wiadomości:
   "Twój kod weryfikacyjny AutoSell: 123456

Kod jest ważny przez 10 minut."

✅ TEST ZAKOŃCZONY SUKCESEM!

📋 PODSUMOWANIE:
   ⚠️  SMS został wysłany w trybie SYMULACJI
   ℹ️  Aby wysłać prawdziwy SMS:
      1. Ustaw SMSAPI_TOKEN w pliku .env
      2. Ustaw MOCK_SMS=false w pliku .env
      3. Uruchom skrypt ponownie
```

## 🐛 Rozwiązywanie problemów

### Błąd: "Phone number must be in international format"

**Rozwiązanie:** Użyj formatu +48XXXXXXXXX (z prefiksem kraju)

### Błąd: "Verification code must be 4-6 digits"

**Rozwiązanie:** Kod musi mieć od 4 do 6 cyfr

### Błąd: "SMS sending failed: SMSAPI error"

**Możliwe przyczyny:**

1. Nieprawidłowy token SMSAPI
2. Brak środków na koncie SMSAPI
3. Problem z połączeniem internetowym
4. Nieprawidłowa konfiguracja SMSAPI

### Błąd: "Failed to parse SMSAPI response"

**Rozwiązanie:** Sprawdź czy token SMSAPI jest poprawny

## 💰 Koszty

- **Tryb symulacji:** DARMOWY
- **Prawdziwe SMS-y:** ~0.08 PLN za SMS (sprawdź cennik SMSAPI)

## 🔒 Bezpieczeństwo

⚠️ **WAŻNE:**

- Nigdy nie commituj pliku `.env` do repozytorium
- Trzymaj token SMSAPI w tajemnicy
- Używaj różnych tokenów dla development i production

## 📞 Wsparcie

Jeśli masz problemy:

1. Sprawdź logi w konsoli
2. Sprawdź konfigurację w pliku `.env`
3. Sprawdź saldo na koncie SMSAPI
4. Sprawdź dokumentację SMSAPI: https://www.smsapi.pl/docs

## ✅ Checklist przed uruchomieniem

- [ ] Node.js zainstalowany
- [ ] Plik `.env` skonfigurowany (jeśli chcesz prawdziwe SMS-y)
- [ ] Token SMSAPI ustawiony (jeśli chcesz prawdziwe SMS-y)
- [ ] Numer testowy ustawiony w `.env` lub skrypcie
- [ ] Backend nie jest uruchomiony (aby uniknąć konfliktów portów)

## 🎓 Dodatkowe informacje

### Struktura odpowiedzi SMSAPI:

```javascript
{
  id: "MOCK_abc123",           // ID wiadomości
  to: "+48732108041",          // Numer odbiorcy
  message: "Twój kod...",      // Treść SMS
  status: "delivered",         // Status wysyłki
  dateCreated: "2026-02-19...", // Data utworzenia
  success: true,               // Czy sukces
  simulated: true              // Czy symulacja
}
```

### Kody statusu SMSAPI:

- `delivered` - Dostarczony
- `pending` - Oczekujący
- `failed` - Nieudany
- `rejected` - Odrzucony
