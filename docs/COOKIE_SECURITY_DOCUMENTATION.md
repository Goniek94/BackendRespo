# 🍪 DOKUMENTACJA BEZPIECZEŃSTWA COOKIES - AUTOSELL.PL

## 📋 PRZEGLĄD

Ten dokument opisuje implementację bezpiecznych cookies w aplikacji Autosell.pl, w tym nazwy cookies, czasy życia, i parametry bezpieczeństwa.

## 🔐 NAZWY COOKIES

### Użytkownicy (User Cookies)
- **`token`** - Access token dla użytkowników
- **`refreshToken`** - Refresh token dla użytkowników

### Administratorzy (Admin Cookies)
- **`admin_token`** - Access token dla administratorów
- **`admin_refreshToken`** - Refresh token dla administratorów

## ⏰ CZASY ŻYCIA TOKENÓW

### Produkcja (NODE_ENV=production)
```javascript
Access Token:  15 minut    (15 * 60 * 1000 ms)
Refresh Token: 7 dni       (7 * 24 * 60 * 60 * 1000 ms)
```

### Staging (NODE_ENV=staging)
```javascript
Access Token:  1 godzina   (60 * 60 * 1000 ms)
Refresh Token: 7 dni       (7 * 24 * 60 * 60 * 1000 ms)
```

### Development (NODE_ENV=development)
```javascript
Access Token:  24 godziny  (24 * 60 * 60 * 1000 ms)
Refresh Token: 24 godziny  (24 * 60 * 60 * 1000 ms)
```

## 🛡️ PARAMETRY BEZPIECZEŃSTWA

### Wszystkie Środowiska
```javascript
httpOnly: true        // Zapobiega dostępowi przez JavaScript (XSS)
path: '/'            // Dostępne dla całej aplikacji
```

### Produkcja i Staging
```javascript
secure: true         // Tylko przez HTTPS
sameSite: 'strict'   // Zapobiega CSRF (produkcja)
sameSite: 'lax'      // Mniej restrykcyjne (staging)
domain: '.autosell.pl' // Domena główna (tylko produkcja)
```

### Dodatkowe Zabezpieczenia Produkcji
```javascript
priority: 'high'     // Wysoki priorytet cookie
partitioned: true    // Partitioned cookies (Chrome)
```

## 📁 STRUKTURA PLIKÓW

### Centralna Konfiguracja
```
config/cookieConfig.js - Główna konfiguracja cookies
```

### Kontrolery Używające Cookies
```
controllers/user/authController.js           - Logowanie użytkowników
controllers/user/verificationController.js   - Weryfikacja użytkowników
admin/controllers/auth/adminLoginController.js - Logowanie administratorów
```

## 🔧 FUNKCJE API

### Użytkownicy
```javascript
import { setAuthCookies, clearAuthCookies } from '../config/cookieConfig.js';

// Ustawienie cookies użytkownika
setAuthCookies(res, accessToken, refreshToken);

// Czyszczenie cookies użytkownika
clearAuthCookies(res);
```

### Administratorzy
```javascript
import { setAdminCookies, clearAdminCookies } from '../config/cookieConfig.js';

// Ustawienie cookies administratora
setAdminCookies(res, accessToken, refreshToken);

// Czyszczenie cookies administratora
clearAdminCookies(res);
```

### Pojedyncze Cookies
```javascript
import { setSecureCookie, clearSecureCookie } from '../config/cookieConfig.js';

// Ustawienie pojedynczego cookie
setSecureCookie(res, 'cookieName', 'value', 'access');

// Czyszczenie pojedynczego cookie
clearSecureCookie(res, 'cookieName');
```

## 🔍 TYPY TOKENÓW

### Dostępne Typy
- **`access`** - Token dostępu (krótki czas życia)
- **`refresh`** - Token odświeżania (długi czas życia)
- **`admin_access`** - Token dostępu administratora
- **`admin_refresh`** - Token odświeżania administratora

### Przykład Użycia
```javascript
// Access token z 15-minutowym czasem życia
setSecureCookie(res, 'token', accessToken, 'access');

// Refresh token z 7-dniowym czasem życia
setSecureCookie(res, 'refreshToken', refreshToken, 'refresh');

// Admin access token
setSecureCookie(res, 'admin_token', adminToken, 'admin_access');
```

## 🧪 TESTOWANIE

### Uruchomienie Testów
```bash
node test-admin-cookie-security-fix.js
```

### Test Sprawdza
- ✅ Dostępność funkcji cookies
- ✅ Poprawność konfiguracji
- ✅ Symulację ustawienia cookies
- ✅ Symulację czyszczenia cookies
- ✅ Nazwy cookies
- ✅ Czasy życia tokenów

## 🚨 ZASADY BEZPIECZEŃSTWA

### ZAWSZE
1. **Używaj centralnej konfiguracji** - Tylko funkcje z `cookieConfig.js`
2. **HttpOnly: true** - Zapobiega atakom XSS
3. **Secure: true w produkcji** - Tylko HTTPS
4. **SameSite: strict w produkcji** - Zapobiega CSRF

### NIGDY
1. **Nie duplikuj konfiguracji** - Nie kopiuj ustawień cookies
2. **Nie używaj długich czasów życia** - Max 15 min dla access token
3. **Nie loguj tokenów** - Nigdy nie zapisuj tokenów w logach
4. **Nie używaj ręcznych ustawień** - Zawsze przez centralne funkcje

## 🔄 ZMIANA KONFIGURACJI

### Zmiana Czasów Życia
Edytuj `config/cookieConfig.js`:
```javascript
const TOKEN_EXPIRY = {
  production: {
    access: 15 * 60 * 1000,           // Zmień tutaj
    refresh: 7 * 24 * 60 * 60 * 1000, // Zmień tutaj
    // ...
  }
};
```

### Zmiana Domeny
Edytuj `config/cookieConfig.js`:
```javascript
const cookieDomain = isProd ? '.twoja-domena.pl' : undefined;
```

### Dodanie Nowego Typu Cookie
1. Dodaj do `TOKEN_EXPIRY`
2. Utwórz dedykowaną funkcję (opcjonalnie)
3. Zaktualizuj dokumentację

## 📊 MONITORING

### Logi Bezpieczeństwa
```javascript
// Logowanie udanego logowania
logger.info('Admin login successful', {
  userId: user._id,
  ip: req.ip,
  userAgent: req.get('User-Agent')
});

// Logowanie nieudanego logowania
logger.warn('Admin login attempt with invalid email', {
  email: email.toLowerCase(),
  ip: req.ip
});
```

### Metryki do Monitorowania
- Liczba nieudanych prób logowania
- Częstotliwość odświeżania tokenów
- Użycie różnych typów cookies
- Błędy związane z cookies

## 🆘 ROZWIĄZYWANIE PROBLEMÓW

### Problem: Cookie nie jest ustawiane
**Rozwiązanie:** Sprawdź czy używasz funkcji z `cookieConfig.js`

### Problem: Cookie nie jest czyszczone
**Rozwiązanie:** Upewnij się, że parametry clearCookie są identyczne z setCookie

### Problem: Token wygasa za szybko
**Rozwiązanie:** Sprawdź konfigurację czasów życia dla danego środowiska

### Problem: Błąd CORS z cookies
**Rozwiązanie:** Sprawdź ustawienia `sameSite` i `domain`

## 📞 KONTAKT

W przypadku pytań dotyczących bezpieczeństwa cookies:
- Sprawdź testy: `test-admin-cookie-security-fix.js`
- Przejrzyj konfigurację: `config/cookieConfig.js`
- Skonsultuj z zespołem bezpieczeństwa

---

**Ostatnia aktualizacja:** 30.07.2025  
**Wersja:** 2.0  
**Status:** ✅ Wszystkie problemy bezpieczeństwa naprawione
