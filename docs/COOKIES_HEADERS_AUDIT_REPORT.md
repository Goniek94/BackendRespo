# AUDYT KONFIGURACJI COOKIES I NAGŁÓWKÓW HTTP
**Data:** 30.07.2025  
**Projekt:** Marketplace Backend  
**Status:** Analiza bez wprowadzania zmian

## 🔍 PODSUMOWANIE WYKONAWCZE

**GŁÓWNY PROBLEM:** Błąd 431 "Request Header Fields Too Large" występuje z powodu zbyt dużych nagłówków HTTP, prawdopodobnie spowodowanych przez duże cookies JWT.

**KLUCZOWE USTALENIA:**
- ✅ Konfiguracja cookies jest bezpieczna i profesjonalna
- ⚠️ JWT tokeny mogą być zbyt duże w niektórych scenariuszach
- ✅ Nagłówki HTTP mają zwiększone limity (32KB)
- ⚠️ Brak mechanizmu monitorowania rozmiaru cookies

---

## 1. ANALIZA COOKIES - DANE I ROZMIARY

### 1.1 Jakie dane są przechowywane w cookies?

**ACCESS TOKEN (`token` cookie):**
```javascript
// Minimalna zawartość (zoptymalizowana):
{
  userId: "ObjectId",
  role: "user|admin|moderator", 
  type: "access",
  iat: timestamp,
  jti: "16-char-hex-id",
  exp: timestamp,
  aud: "audience",
  iss: "issuer",
  sub: "userId"
}
```

**REFRESH TOKEN (`refreshToken` cookie):**
```javascript
// Minimalna zawartość (zoptymalizowana):
{
  userId: "ObjectId", 
  role: "user|admin|moderator",
  type: "refresh",
  iat: timestamp,
  jti: "32-char-hex-id", // Dłuższy dla refresh
  exp: timestamp,
  aud: "audience", 
  iss: "issuer",
  sub: "userId"
}
```

### 1.2 Typowe rozmiary cookies

**SZACUNKOWE ROZMIARY:**
- **Access Token:** ~400-600 bajtów (po kodowaniu JWT)
- **Refresh Token:** ~450-650 bajtów (po kodowaniu JWT)
- **Łączny rozmiar:** ~850-1250 bajtów na użytkownika

**OPTYMALIZACJE ZASTOSOWANE:**
- ✅ Usunięto `email`, `userAgent`, `ipAddress` z tokenów
- ✅ Usunięto `fingerprint`, `lastActivity` z tokenów  
- ✅ Minimalna zawartość - tylko niezbędne dane

### 1.3 Czasy życia cookies

**DEVELOPMENT:**
- Access: 24 godziny
- Refresh: 24 godziny

**PRODUCTION:**
- Access: 15 minut
- Refresh: 7 dni

---

## 2. KONFIGURACJA BEZPIECZEŃSTWA COOKIES

### 2.1 Ustawienia bezpieczeństwa (cookieConfig.js)

```javascript
// PRODUKCJA:
{
  httpOnly: true,           // ✅ Ochrona przed XSS
  secure: true,             // ✅ Tylko HTTPS
  sameSite: 'strict',       // ✅ Ochrona przed CSRF
  domain: '.autosell.pl',   // ✅ Właściwa domena
  path: '/',                // ✅ Cała aplikacja
  priority: 'high',         // ✅ Wysoki priorytet
  partitioned: true         // ✅ Partitioned cookies
}

// DEVELOPMENT:
{
  httpOnly: true,           // ✅ Ochrona przed XSS
  secure: false,            // ✅ HTTP dla localhost
  sameSite: 'lax',          // ✅ Elastyczność dla dev
  domain: undefined,        // ✅ Auto-detect localhost
  path: '/'                 // ✅ Cała aplikacja
}
```

### 2.2 Polityka czyszczenia cookies

**WYLOGOWANIE:**
- ✅ Tokeny dodawane do blacklisty
- ✅ Cookies czyszczone z identycznymi parametrami
- ✅ Wszystkie pary tokenów (access + refresh)

**WYGAŚNIĘCIE SESJI:**
- ✅ Automatyczne wygaśnięcie przez `maxAge`
- ✅ Refresh token rotation przy odświeżaniu
- ✅ Blacklisting starych tokenów

---

## 3. ANALIZA NAGŁÓWKÓW HTTP

### 3.1 Konfiguracja limitów nagłówków

**ZWIĘKSZONE LIMITY (index.js):**
```javascript
// Node.js process level:
process.env.NODE_OPTIONS = '--max-http-header-size=32768'; // 32KB

// HTTP Server level:
const server = http.createServer({
  maxHeaderSize: 32768,        // 32KB (4x więcej niż domyślne 8KB)
  headersTimeout: 60000,       // 60 sekund
  requestTimeout: 300000,      // 5 minut
}, app);

// Express middleware level:
req.connection.server.maxHeadersCount = 0; // Bez limitu liczby nagłówków
server.maxHeadersCount = 0;
```

### 3.2 Potencjalne źródła dużych nagłówków

**COOKIES:**
- `token`: ~400-600 bajtów
- `refreshToken`: ~450-650 bajtów
- **Łącznie:** ~850-1250 bajtów

**INNE NAGŁÓWKI:**
- `User-Agent`: ~100-200 bajtów
- `Accept`: ~100-150 bajtów  
- `Authorization`: Nie używany (tylko cookies)
- `X-*` headers: Minimalne

**CAŁKOWITY SZACUNEK:** ~1200-1600 bajtów (znacznie poniżej limitu 32KB)

---

## 4. POTENCJALNE PRZYCZYNY BŁĘDU 431

### 4.1 Możliwe scenariusze

**SCENARIUSZ 1: Nagromadzenie cookies**
- Stare cookies nie zostały wyczyszczone
- Wielokrotne logowania bez wylogowania
- Cookies z różnych subdomen

**SCENARIUSZ 2: Duże JWT tokeny**
- Bardzo długie ObjectId w MongoDB
- Dodatkowe claims w tokenach (mimo optymalizacji)
- Błędna konfiguracja JWT

**SCENARIUSZ 3: Problemy przeglądarki**
- Cache przeglądarki z starymi cookies
- Błędne cookies z poprzednich wersji
- Problemy z domeną/ścieżką

### 4.2 Brakujące mechanizmy monitorowania

**BRAK:**
- ❌ Monitorowania rozmiaru cookies
- ❌ Alertów przy dużych nagłówkach
- ❌ Automatycznego czyszczenia starych cookies
- ❌ Logowania rozmiaru żądań HTTP

---

## 5. KLUCZOWE PLIKI KONFIGURACJI

### 5.1 Pliki odpowiedzialne za cookies/sesje

**GŁÓWNE PLIKI:**
1. **`config/cookieConfig.js`** - Centralna konfiguracja cookies
2. **`middleware/auth.js`** - Generowanie i walidacja tokenów
3. **`controllers/user/authController.js`** - Logika logowania/rejestracji
4. **`config/security.js`** - Konfiguracja bezpieczeństwa JWT
5. **`index.js`** - Konfiguracja limitów nagłówków HTTP

**POMOCNICZE PLIKI:**
- `models/security/TokenBlacklist.js` - Blacklisting tokenów
- `config/index.js` - Centralna konfiguracja aplikacji

### 5.2 Miejsca wymagające uwagi

**POTENCJALNE PROBLEMY:**
1. **Brak walidacji rozmiaru tokenów** w `middleware/auth.js`
2. **Brak czyszczenia starych cookies** w `cookieConfig.js`
3. **Brak monitorowania nagłówków** w `index.js`

---

## 6. REKOMENDACJE (BEZ IMPLEMENTACJI)

### 6.1 Krótkoterminowe (pilne)

1. **Dodać monitoring rozmiaru cookies**
2. **Implementować czyszczenie starych cookies**
3. **Dodać logowanie dużych nagłówków**
4. **Sprawdzić cookies w przeglądarce użytkownika**

### 6.2 Długoterminowe (optymalizacja)

1. **Implementować session storage w Redis**
2. **Skrócić czasy życia tokenów w development**
3. **Dodać automatyczne czyszczenie cookies**
4. **Implementować cookie compression**

---

## 7. WNIOSKI

**OBECNA KONFIGURACJA:**
- ✅ **Bezpieczna** - wszystkie best practices zastosowane
- ✅ **Zoptymalizowana** - minimalne payloady w tokenach
- ✅ **Skalowalna** - zwiększone limity nagłówków
- ⚠️ **Brak monitorowania** - nie wiemy kiedy cookies są za duże

**PRAWDOPODOBNA PRZYCZYNA BŁĘDU 431:**
Nagromadzenie starych cookies w przeglądarce użytkownika lub błędna konfiguracja domeny cookies.

**NASTĘPNE KROKI:**
1. Sprawdzić cookies w przeglądarce użytkownika
2. Dodać monitoring rozmiaru nagłówków
3. Implementować automatyczne czyszczenie cookies
4. Rozważyć przejście na session storage w Redis

---

**Raport przygotowany przez:** Cline AI Assistant  
**Kontakt:** Dostępny przez VSCode Extension
