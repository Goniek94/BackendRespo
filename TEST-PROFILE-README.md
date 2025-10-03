# 🔍 Skrypt Diagnostyczny - Testowanie Endpointów Profilu

Ten skrypt pomaga zdiagnozować problemy z błędem `ERR_HTTP_HEADERS_SENT` w endpointach profilu użytkownika.

## 📋 Wymagania

- Node.js 18+
- MongoDB uruchomiona i dostępna
- Backend API uruchomiony na porcie 5000 (lub zdefiniowanym w `API_URL`)
- Pakiet `node-fetch` zainstalowany

## 🚀 Instalacja

Jeśli nie masz zainstalowanego `node-fetch`, zainstaluj go:

```bash
npm install node-fetch
```

## ▶️ Uruchomienie

### Krok 1: Uruchom serwer backend

W jednym terminalu uruchom backend:

```bash
cd Marketplace-Backend
npm run dev
# lub
npm start
```

### Krok 2: Uruchom skrypt diagnostyczny

W drugim terminalu:

```bash
cd Marketplace-Backend
node test-profile-endpoints.js
```

## 📊 Co sprawdza skrypt?

1. **Dostępność serwera** - Czy backend odpowiada
2. **Połączenie z bazą danych** - Czy MongoDB jest dostępna
3. **Endpoint GET /api/users/profile** - Pobieranie profilu
4. **Endpoint GET /api/users/dashboard** - Pobieranie dashboardu
5. **Endpoint PUT /api/users/profile** - Aktualizacja profilu

## ✅ Oczekiwany wynik (sukces)

```
============================================================
SPRAWDZANIE DOSTĘPNOŚCI SERWERA
============================================================

✅ Serwer odpowiada na http://localhost:5000

============================================================
DIAGNOSTYKA ENDPOINTÓW PROFILU
============================================================

ℹ️  Łączenie z bazą danych...
✅ Połączono z bazą danych
ℹ️  Szukam użytkownika testowego...
✅ Znaleziono użytkownika: user@example.com (ID: 123...)
ℹ️  Generuję token JWT...
✅ Token wygenerowany

============================================================
TEST 1: Endpoint GET /api/users/profile
============================================================

ℹ️  Status: 200 OK
ℹ️  Długość odpowiedzi: 486 bajtów
ℹ️  Content-Type: application/json; charset=utf-8
✅ Endpoint działa poprawnie
ℹ️  Otrzymano dane użytkownika: user@example.com

... (więcej testów) ...

============================================================
PODSUMOWANIE
============================================================

✅ Testy zakończone
ℹ️  Jeśli wszystkie testy przeszły pomyślnie, problem jest rozwiązany
```

## ❌ Możliwe błędy

### Serwer nie odpowiada

```
❌ Serwer nie odpowiada
⚠️  Upewnij się, że backend działa (npm start lub npm run dev)
```

**Rozwiązanie:** Uruchom backend w osobnym terminalu

### Nie znaleziono użytkownika

```
❌ Nie znaleziono użytkownika testowego
⚠️  Utwórz użytkownika przez rejestrację lub dodaj ręcznie do bazy
```

**Rozwiązanie:** Zarejestruj użytkownika przez aplikację lub utwórz ręcznie w MongoDB

### Błąd 401 Unauthorized

```
ℹ️  Status: 401 Unauthorized
❌ Błąd serwera: Authentication required
```

**Rozwiązanie:** Problem z tokenem JWT lub middleware auth - sprawdź konfigurację JWT_SECRET

### ERR_HTTP_HEADERS_SENT

Jeśli widzisz ten błąd w logach serwera podczas testów, oznacza to:

- Kontroler próbuje wysłać odpowiedź HTTP więcej niż raz
- Brakuje `return` przed `res.json()`
- Kod wykonuje się po już wysłanej odpowiedzi

**Zostało już naprawione w:**

- `profileController.js` - wszystkie catch używają `next(error)`
- `dashboardController.js` - używa `next(error)`
- `app.js` - error handler sprawdza `res.headersSent`
- `profileRoutes.js` - używa `asyncHandler`

## 🔧 Dodatkowa diagnostyka

### Sprawdź logi serwera

Podczas uruchamiania testów, obserwuj terminal z serwerem. Szukaj:

```
❌ Get profile error: Error [ERR_HTTP_HEADERS_SENT]
```

### Sprawdź strukturę odpowiedzi

Skrypt wyświetla:

- Status HTTP (200, 404, 500, etc.)
- Długość odpowiedzi w bajtach
- Content-Type nagłówka
- Pierwsze 500 znaków odpowiedzi (jeśli nie da się sparsować JSON)

## 🐛 Debugging

Jeśli problem nadal występuje:

1. **Sprawdź czy zmiany zostały załadowane:**

   ```bash
   # Zrestartuj serwer
   # Ctrl+C w terminalu z serwerem
   npm run dev
   ```

2. **Sprawdź czy używasz najnowszego kodu:**

   ```bash
   git status
   git diff
   ```

3. **Sprawdź middleware w kolejności:**

   - auth.js - czy nie wysyła podwójnych odpowiedzi
   - trackDailyActive.js - czy zawsze wywołuje next()
   - error handler w app.js - czy sprawdza headersSent

4. **Dodaj dodatkowe logi:**
   ```javascript
   // W kontrolerze
   console.log('🔍 Before response:', res.headersSent);
   res.json({...});
   console.log('🔍 After response:', res.headersSent);
   ```

## 📞 Pomoc

Jeśli skrypt pokazuje błędy, ale nie wiesz jak je naprawić:

1. Skopiuj pełny output skryptu
2. Skopiuj logi z serwera (terminal z `npm run dev`)
3. Sprawdź która funkcja powoduje problem
4. Upewnij się że wszystkie `res.json()` mają `return` przed sobą

## ✨ Co zostało naprawione

- ✅ profileController.js - catch używa next(error)
- ✅ dashboardController.js - catch używa next(error)
- ✅ app.js - error handler sprawdza res.headersSent
- ✅ profileRoutes.js - używa asyncHandler wrapper
- ✅ asyncHandler.js - nowy utility do obsługi async funkcji

\*\*Po uruchomieniu testów, wszystkie endpointy powinny działać bez bł
