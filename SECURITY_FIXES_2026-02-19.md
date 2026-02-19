# 🔒 Security Fixes - 19.02.2026

## Podsumowanie naprawionych problemów bezpieczeństwa

Naprawiono 4 krytyczne problemy bezpieczeństwa w kodzie backendu, zgodnie z analizą z dnia 19.02.2026.

---

## ✅ 1. Naprawa generowania tokenów po rejestracji (KRYTYCZNE)

**Plik:** `controllers/user/auth/registerController.js`

**Problem:**

- Generowanie pojedynczego tokena JWT na 7 dni przy rejestracji
- Token zwracany w JSON zamiast HttpOnly cookies
- Brak spójności z systemem dwóch tokenów (Access + Refresh) używanym w reszcie aplikacji
- Brak mechanizmów bezpieczeństwa z `auth.js` (fingerprinting, rotacja tokenów)

**Rozwiązanie:**

```javascript
// PRZED (❌ Niebezpieczne):
const jwt = await import("jsonwebtoken");
const authToken = jwt.default.sign(
  { userId: newUser._id, email: newUser.email, role: newUser.role },
  process.env.JWT_SECRET,
  { expiresIn: "7d" },
);

// PO (✅ Bezpieczne):
import {
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
} from "../../../middleware/auth.js";

const tokenPayload = {
  userId: newUser._id,
  role: newUser.role || "user",
};

const accessToken = generateAccessToken(tokenPayload);
const refreshToken = generateRefreshToken(tokenPayload);
setAuthCookies(res, accessToken, refreshToken);
```

**Korzyści:**

- ✅ Spójność z systemem logowania (dual-token system)
- ✅ Tokeny w bezpiecznych HttpOnly cookies
- ✅ Automatyczna rotacja tokenów
- ✅ Access Token: 15 minut, Refresh Token: 7 dni
- ✅ Wszystkie mechanizmy bezpieczeństwa z `auth.js`

---

## ✅ 2. Zmniejszenie limitów wielkości JSON (Ochrona przed DoS)

**Plik:** `app.js`

**Problem:**

- Limit 50MB dla parsowania JSON i urlencoded
- Podatność na ataki DoS (wyczerpanie pamięci RAM)
- Niepotrzebnie wysoki limit - pliki są przesyłane przez multipart/form-data

**Rozwiązanie:**

```javascript
// PRZED (❌ Podatność DoS):
express.json({ limit: "50mb" });
express.urlencoded({ limit: "50mb" });

// PO (✅ Bezpieczne):
express.json({ limit: "2mb" }); // 🔒 SECURITY: Reduced from 50mb to prevent DoS attacks
express.urlencoded({ limit: "2mb" }); // 🔒 SECURITY: Reduced from 50mb to prevent DoS attacks
```

**Uzasadnienie:**

- Typowy JSON request: kilka KB
- Duże obiekty JSON (np. 100 produktów): ~100-500KB
- **2MB** to więcej niż wystarczająco dla normalnych operacji
- Pliki są przesyłane przez multipart (który już pomijasz w middleware)

**Korzyści:**

- ✅ Ochrona przed atakami DoS
- ✅ Zmniejszone zużycie pamięci RAM
- ✅ Nadal wystarczająco dla wszystkich normalnych operacji

---

## ✅ 3. Zmniejszenie limitu nagłówków HTTP (Ochrona przed DoS)

**Plik:** `index.js`

**Problem:**

- Limit 128KB dla nagłówków HTTP (16x więcej niż standard 8KB)
- Prawdopodobnie "załatanie" błędu 431 Request Header Fields Too Large
- Leczenie objawu zamiast przyczyny
- Podatność na ataki DoS

**Rozwiązanie:**

```javascript
// PRZED (❌ Zbyt wysoki limit):
maxHeaderSize: 131072, // 128KB

// PO (✅ Bezpieczny kompromis):
maxHeaderSize: 16384, // 16KB (2x standard, down from 128KB)
// TODO: Investigate root cause of large headers (likely cookie accumulation)
```

**Następne kroki:**

1. Monitoruj rozmiar nagłówków używając `headerSizeMonitor.js` (już masz!)
2. Zbadaj przyczynę dużych nagłówków (prawdopodobnie nawarstwiające się cookies)
3. Napraw przyczynę (czyszczenie starych cookies, sesji)
4. Rozważ zmniejszenie do 8KB (standard) po naprawieniu przyczyny

**Korzyści:**

- ✅ Zmniejszona podatność na DoS
- ✅ Nadal 2x więcej niż standard (bezpieczny bufor)
- ✅ TODO dodane do zbadania przyczyny

---

## ✅ 4. Zabezpieczenie przed Race Condition (Dobra praktyka)

**Plik:** `controllers/user/auth/registerController.js`

**Problem:**

- Sprawdzanie czy użytkownik istnieje przez `findOne()`, potem `save()`
- Między tymi operacjami może wpaść drugie żądanie
- Oba przejdą `findOne()` i spróbują `save()` → drugi dostanie błąd MongoDB 11000

**Rozwiązanie:**

```javascript
// Dodano obsługę błędu duplikatu w catch:
catch (error) {
  // 🔒 SECURITY: Handle MongoDB duplicate key error (race condition protection)
  if (error.code === 11000) {
    const duplicateField = error.keyPattern?.email ? "email" : "telefon";

    logger.warn("Race condition detected - duplicate user attempt", {
      error: error.message,
      field: duplicateField,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });

    return res.status(400).json({
      success: false,
      message: `Użytkownik z tym ${duplicateField === "email" ? "adresem email" : "numerem telefonu"} już istnieje`,
      code: "USER_ALREADY_EXISTS",
    });
  }
  // ... reszta obsługi błędów
}
```

**Jak to działa:**

- MongoDB ma **unique index** na `email` i `phoneNumber` (w schemacie)
- Jeśli dwa requesty spróbują zapisać tego samego usera → drugi dostanie błąd 11000
- Łapiemy ten błąd i zwracamy przyjazny komunikat

**Korzyści:**

- ✅ Ochrona przed race condition
- ✅ Przyjazny komunikat dla użytkownika
- ✅ Logowanie próby duplikatu
- ✅ Wykorzystanie wbudowanych mechanizmów MongoDB

---

## 📊 Podsumowanie zmian

| #   | Problem               | Priorytet    | Status        | Plik                  |
| --- | --------------------- | ------------ | ------------- | --------------------- |
| 1   | Tokeny po rejestracji | 🔴 KRYTYCZNY | ✅ NAPRAWIONE | registerController.js |
| 2   | Limit JSON 50MB       | 🟠 WYSOKI    | ✅ NAPRAWIONE | app.js                |
| 3   | Limit nagłówków 128KB | 🟡 ŚREDNI    | ✅ NAPRAWIONE | index.js              |
| 4   | Race condition        | 🟢 NISKI     | ✅ NAPRAWIONE | registerController.js |

---

## 🎯 Rekomendacje na przyszłość

### 1. Monitorowanie nagłówków

- Używaj `headerSizeMonitor.js` do śledzenia rozmiaru nagłówków
- Zbadaj przyczynę dużych nagłówków (prawdopodobnie cookies)
- Rozważ implementację automatycznego czyszczenia starych cookies

### 2. Testy bezpieczeństwa

- Przetestuj rejestrację z nowymi tokenami
- Sprawdź czy cookies są poprawnie ustawiane
- Przetestuj scenariusz race condition (dwa równoczesne żądania rejestracji)

### 3. Monitoring produkcyjny

- Monitoruj błędy 431 (Request Header Fields Too Large)
- Monitoruj błędy 413 (Payload Too Large)
- Śledź próby duplikatów (race condition)

---

## 📝 Changelog

**2026-02-19:**

- ✅ Naprawiono generowanie tokenów po rejestracji (dual-token system)
- ✅ Zmniejszono limity JSON z 50MB do 2MB
- ✅ Zmniejszono limit nagłówków z 128KB do 16KB
- ✅ Dodano obsługę race condition przy rejestracji

---

## 🔗 Powiązane pliki

- `controllers/user/auth/registerController.js` - Kontroler rejestracji
- `middleware/auth.js` - System uwierzytelniania (dual-token)
- `app.js` - Konfiguracja Express (parsowanie body)
- `index.js` - Konfiguracja serwera HTTP
- `middleware/headerSizeMonitor.js` - Monitoring nagłówków

---

**Autor:** Cline AI Assistant  
**Data:** 19.02.2026, 22:46  
**Status:** ✅ Wszystkie problemy naprawione
