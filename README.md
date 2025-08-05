# Marketplace Backend

Backend aplikacji Marketplace - nowoczesna platforma do sprzedaży pojazdów.

## 🚀 Instalacja i uruchomienie

### Wymagania systemowe
- Node.js 18+ 
- MongoDB 5.0+
- npm lub yarn

### Krok po kroku

1. **Sklonuj repozytorium**
   ```bash
   git clone https://github.com/Goniek94/BackendRespo.git
   cd Marketplace-Backend
   ```

2. **Zainstaluj zależności**
   ```bash
   npm install
   ```

3. **Skonfiguruj zmienne środowiskowe**
   ```bash
   # Skopiuj plik przykładowy
   cp .env.example .env
   
   # Edytuj plik .env i wypełnij wymagane wartości:
   # - MONGODB_URI (połączenie z bazą danych)
   # - JWT_SECRET (sekret dla tokenów JWT)
   # - FRONTEND_URL (adres frontendu dla CORS)
   ```

4. **Uruchom aplikację**
   ```bash
   # Tryb development
   npm run dev
   
   # Tryb production
   npm start
   ```

5. **Sprawdź czy działa**
   - Otwórz http://localhost:5000
   - Powinieneś zobaczyć: `{"status":"online","message":"Backend Marketplace działa prawidłowo"}`

### Dodatkowe komendy

```bash
# Generowanie bezpiecznych sekretów
node scripts/generate-secrets.js

# Testy
npm test

# Sprawdzenie stanu bazy danych
node scripts/check-database-content.js
```

## 📋 Optymalizacje i zmiany

Ten dokument zawiera informacje o wprowadzonych optymalizacjach i zmianach w projekcie Marketplace.

## Wprowadzone optymalizacje

### Backend

1. **Reorganizacja tras API** (routes/index.js)
   - Usunięto duplikację kodu przez zastosowanie pętli Object.entries
   - Dodano komentarze wyjaśniające strukturę tras
   - Ograniczono dostęp do panelu admina tylko przez prefiks /api

2. **Refaktoryzacja głównego pliku aplikacji** (index.js)
   - Podzielono kod na mniejsze, bardziej zarządzalne funkcje
   - Dodano zmienną środowiskową dla trybu deweloperskiego
   - Ograniczono logowanie w trybie produkcyjnym
   - Dodano lepszą obsługę błędów i zamykanie serwera w przypadku braku połączenia z bazą danych

3. **Podział modelu Ad na mniejsze części** (models/ad.js)
   - Stworzono osobne schematy dla różnych części modelu:
     - basicInfoSchema.js - podstawowe informacje o pojeździe
     - technicalDetailsSchema.js - dane techniczne pojazdu
     - ownerInfoSchema.js - informacje o właścicielu
     - statisticsSchema.js - statystyki ogłoszenia
     - metadataSchema.js - metadane ogłoszenia
   - Główny model korzysta teraz z tych schematów, co ułatwia zarządzanie i utrzymanie kodu

### Frontend

1. **Optymalizacja konfiguracji API** (src/services/api/config.js)
   - Dodano zmienną środowiskową dla trybu deweloperskiego
   - Stworzono logger, który ogranicza logowanie w trybie produkcyjnym
   - Dodano komentarze wyjaśniające funkcje i ich parametry

2. **Optymalizacja klienta API** (src/services/api/client.js)
   - Zastosowano logger do ograniczenia logowania w trybie produkcyjnym
   - Dodano metodę debug dostępną tylko w trybie deweloperskim
   - Poprawiono obsługę błędów i dodano komentarze JSDoc

3. **Optymalizacja serwisu autoryzacji** (src/services/auth.js)
   - Zastosowano logger do ograniczenia logowania w trybie produkcyjnym
   - Dodano komentarze JSDoc do wszystkich metod
   - Usunięto wyświetlanie wrażliwych danych w logach (np. tokenu)

4. **Refaktoryzacja głównego komponentu App.js**
   - Podzielono duży plik App.js na mniejsze, bardziej zarządzalne komponenty
   - Stworzono osobne komponenty dla różnych typów stron:
     - ProtectedRoute.js - komponent dla tras chronionych
     - LoginPage.js - komponent dla strony logowania
     - HomePage.js - komponent dla strony głównej
     - ListingRoutes.js - komponenty dla stron związanych z ogłoszeniami
     - AppRoutes.js - główny komponent routingu
   - Ograniczono logowanie w trybie produkcyjnym
   - Dodano komentarze JSDoc do wszystkich komponentów

## Korzyści z wprowadzonych zmian

1. **Lepsza wydajność**
   - Ograniczenie logowania w trybie produkcyjnym zmniejsza obciążenie konsoli
   - Mniejsze pliki są łatwiejsze do załadowania i przetworzenia
   - Lepsze zarządzanie pamięcią dzięki podziałowi na mniejsze komponenty

2. **Łatwiejsze utrzymanie kodu**
   - Podział dużych plików na mniejsze ułatwia zarządzanie kodem
   - Dodane komentarze ułatwiają zrozumienie kodu
   - Spójne nazewnictwo i struktura kodu
   - Łatwiejsze testowanie dzięki mniejszym, bardziej wyspecjalizowanym komponentom

3. **Lepsza organizacja projektu**
   - Logiczna struktura folderów i plików
   - Jasne rozdzielenie odpowiedzialności między komponentami
   - Łatwiejsze dodawanie nowych funkcjonalności dzięki modularnej strukturze

## Jak kontynuować optymalizację

1. **Dalsze ograniczenie logowania**
   - Zastosować logger w pozostałych plikach projektu

2. **Optymalizacja komponentów React**
   - Zastosować React.memo dla komponentów, które nie zmieniają się często
   - Zoptymalizować renderowanie list przez zastosowanie wirtualizacji
   - Zastosować React.lazy i Suspense dla komponentów, które nie są potrzebne od razu

3. **Optymalizacja zapytań do bazy danych**
   - Dodać indeksy dla często wyszukiwanych pól
   - Ograniczyć ilość danych pobieranych z bazy przez zastosowanie projekcji

4. **Optymalizacja obrazów** ✅ **ZREALIZOWANE**
   - Zastosowano automatyczną kompresję zdjęć po stronie klienta
   - Dodano system walidacji i optymalizacji obrazów
   - Zaimplementowano interfejs postępu kompresji
   - Zaktualizowano limity: 15 zdjęć max 5MB każde

## Najnowsze zmiany - System przesyłania zdjęć (Styczeń 2025)

### 🔧 Optymalizacja limitów i wydajności

1. **Zaktualizowane limity systemowe**
   - Maksymalna liczba zdjęć: 20 → **15 na ogłoszenie**
   - Maksymalny rozmiar pliku: 10MB → **5MB na zdjęcie**
   - Obsługiwane formaty: JPEG, JPG, PNG, WebP
   - Rate limiting: 10 uploadów na minutę

2. **Automatyczna kompresja po stronie klienta**
   - Nowy moduł `utils/imageCompression.js` z zaawansowanymi funkcjami
   - Kompresja do maksymalnie 1920x1080px z jakością 90%
   - Zachowanie proporcji obrazu i metadanych
   - Presety kompresji dla różnych przypadków użycia

3. **Ulepszone UI/UX**
   - Interfejs postępu kompresji w czasie rzeczywistym
   - Walidacja plików przed uploadem
   - Lepsze komunikaty błędów i ostrzeżeń
   - Wizualne wskaźniki stanu kompresji

### 🛠️ Zmiany techniczne

**Backend (routes/imageRoutes.js, controllers/imageController.js):**
```javascript
// Nowe limity multer
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB na plik
    files: 15 // maksymalnie 15 plików na raz
  }
});
```

**Frontend (PhotoUploadSection.js):**
- Integracja z systemem kompresji
- Asynchroniczne przetwarzanie plików
- Callback postępu kompresji
- Automatyczna walidacja formatów

**Nowy moduł kompresji (utils/imageCompression.js):**
- `compressImage()` - kompresja pojedynczego pliku
- `compressImages()` - batch kompresja z callbackiem postępu
- `validateImageFile()` - walidacja plików przed kompresją
- `createThumbnail()` - generowanie miniaturek
- Presety jakości: HIGH_QUALITY, MEDIUM_QUALITY, LOW_QUALITY, MOBILE

### 📊 Korzyści z optymalizacji

1. **Wydajność**
   - Redukcja rozmiaru plików o 60-80%
   - Szybsze uploady dzięki mniejszym plikom
   - Mniejsze obciążenie serwera i storage

2. **Doświadczenie użytkownika**
   - Wizualny feedback podczas kompresji
   - Automatyczna optymalizacja bez utraty jakości
   - Lepsze komunikaty o błędach

3. **Oszczędności**
   - Mniejsze zużycie storage Supabase
   - Szybsze ładowanie galerii zdjęć
   - Optymalizacja transferu danych

### 📋 Dokumentacja i testy

- **PHOTO_UPLOAD_GUIDE.md** - kompletny przewodnik po systemie
- **test-photo-upload.js** - skrypt testowy sprawdzający wszystkie funkcjonalności
- Przykłady użycia API i konfiguracji
- Instrukcje rozwiązywania problemów

### 🚀 Jak uruchomić testy

```bash
# Uruchom backend
npm start

# W osobnym terminalu uruchom testy
node test-photo-upload.js
```

Testy sprawdzają:
- Limity rozmiaru plików (5MB)
- Limit liczby plików (15)
- Obsługiwane formaty
- Rate limiting
- Dostępność API endpoints
