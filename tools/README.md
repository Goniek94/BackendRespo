# 🛠️ Tools Directory / Katalog Narzędzi

## 📋 Overview / Przegląd

This directory contains development tools, utilities, and scripts for the Marketplace Backend project.

Ten katalog zawiera narzędzia deweloperskie, utilitki i skrypty dla projektu Marketplace Backend.

## 🏗️ Directory Structure / Struktura Katalogów

```
tools/
├── README.md                   # This file / Ten plik
├── database/                   # Database utilities / Narzędzia bazodanowe
│   ├── createCarImagesTable.js # Create car images table / Tworzenie tabeli zdjęć
│   └── createCarImagesTable.sql # SQL for car images table / SQL dla tabeli zdjęć
├── maintenance/                # Maintenance scripts / Skrypty konserwacyjne
│   ├── fixAdImages.js          # Fix ad images / Naprawa zdjęć ogłoszeń
│   ├── fixLocalhostToSupabase.js # Fix localhost URLs / Naprawa URL localhost
│   ├── restoreRealImages.js    # Restore real images / Przywracanie prawdziwych zdjęć
│   └── updateAdImagesWithRealCars.js # Update with real car images / Aktualizacja prawdziwymi zdjęciami
└── testing/                    # Development testing / Testy deweloperskie
    ├── checkAndFixAds.js       # Check and fix ads / Sprawdzanie i naprawa ogłoszeń
    ├── checkUserMessages.js    # Check user messages / Sprawdzanie wiadomości użytkowników
    ├── messageTest.js          # Message system test / Test systemu wiadomości
    ├── messageTestByEmail.js   # Message test by email / Test wiadomości przez email
    └── messageTestSendToAd.js  # Test sending to ad / Test wysyłania do ogłoszenia
```

## 📦 Categories / Kategorie

### 🗄️ Database Tools / Narzędzia Bazodanowe

**Location / Lokalizacja:** `tools/database/`

**Purpose / Cel:** Database setup, migration, and schema management scripts.
**Cel:** Skrypty konfiguracji bazy danych, migracji i zarządzania schematami.

**Files / Pliki:**
- `createCarImagesTable.js` - Creates car images table in Supabase / Tworzy tabelę zdjęć samochodów w Supabase
- `createCarImagesTable.sql` - SQL script for car images table / Skrypt SQL dla tabeli zdjęć samochodów

**Usage / Użycie:**
```bash
# Create car images table / Utwórz tabelę zdjęć samochodów
node tools/database/createCarImagesTable.js
```

### 🔧 Maintenance Tools / Narzędzia Konserwacyjne

**Location / Lokalizacja:** `tools/maintenance/`

**Purpose / Cel:** Scripts for data maintenance, fixes, and updates.
**Cel:** Skrypty do konserwacji danych, napraw i aktualizacji.

**Files / Pliki:**
- `fixAdImages.js` - Fixes missing images in ads / Naprawia brakujące zdjęcia w ogłoszeniach
- `fixLocalhostToSupabase.js` - Converts localhost URLs to Supabase / Konwertuje URL localhost na Supabase
- `restoreRealImages.js` - Restores real car images / Przywraca prawdziwe zdjęcia samochodów
- `updateAdImagesWithRealCars.js` - Updates ads with real car images / Aktualizuje ogłoszenia prawdziwymi zdjęciami

**Usage / Użycie:**
```bash
# Fix ad images / Napraw zdjęcia ogłoszeń
node tools/maintenance/fixAdImages.js

# Fix localhost URLs / Napraw URL localhost
node tools/maintenance/fixLocalhostToSupabase.js

# Restore real images / Przywróć prawdziwe zdjęcia
node tools/maintenance/restoreRealImages.js
```

### 🧪 Testing Tools / Narzędzia Testowe

**Location / Lokalizacja:** `tools/testing/`

**Purpose / Cel:** Development testing scripts and debugging utilities.
**Cel:** Skrypty testów deweloperskich i narzędzia debugowania.

**Files / Pliki:**
- `checkAndFixAds.js` - Checks and fixes ad data / Sprawdza i naprawia dane ogłoszeń
- `checkUserMessages.js` - Checks user message system / Sprawdza system wiadomości użytkowników
- `messageTest.js` - Comprehensive message system test / Kompleksowy test systemu wiadomości
- `messageTestByEmail.js` - Tests messages by email / Testuje wiadomości przez email
- `messageTestSendToAd.js` - Tests sending messages to ads / Testuje wysyłanie wiadomości do ogłoszeń

**Usage / Użycie:**
```bash
# Test message system / Testuj system wiadomości
node tools/testing/messageTest.js

# Check user messages / Sprawdź wiadomości użytkowników
node tools/testing/checkUserMessages.js

# Check and fix ads / Sprawdź i napraw ogłoszenia
node tools/testing/checkAndFixAds.js
```

## 🚀 Running Tools / Uruchamianie Narzędzi

### Prerequisites / Wymagania

1. **Environment Variables / Zmienne Środowiskowe:**
   - Ensure `.env` file is configured / Upewnij się, że plik `.env` jest skonfigurowany
   - Required variables / Wymagane zmienne:
     - `MONGO_URI` or `SUPABASE_URL`
     - `SUPABASE_ANON_KEY`
     - `JWT_SECRET`

2. **Dependencies / Zależności:**
   ```bash
   npm install
   ```

### General Usage Pattern / Ogólny Wzorzec Użycia

```bash
# Navigate to project root / Przejdź do katalogu głównego projektu
cd /path/to/marketplace-backend

# Run any tool / Uruchom dowolne narzędzie
node tools/[category]/[script-name].js

# Example / Przykład
node tools/database/createCarImagesTable.js
```

## ⚠️ Important Notes / Ważne Uwagi

### Safety / Bezpieczeństwo

- **Backup First / Najpierw Backup:** Always backup your database before running maintenance scripts
- **Najpierw Backup:** Zawsze zrób backup bazy danych przed uruchomieniem skryptów konserwacyjnych

- **Test Environment / Środowisko Testowe:** Test scripts in development environment first
- **Środowisko Testowe:** Najpierw testuj skrypty w środowisku deweloperskim

- **Review Code / Przejrzyj Kod:** Review script code before execution
- **Przejrzyj Kod:** Przejrzyj kod skryptu przed wykonaniem

### Environment / Środowisko

- **Development Only / Tylko Deweloperskie:** These tools are for development use
- **Tylko Deweloperskie:** Te narzędzia są do użytku deweloperskiego

- **Production Caution / Ostrożność w Produkcji:** Use extreme caution in production
- **Ostrożność w Produkcji:** Zachowaj szczególną ostrożność w produkcji

## 📝 Adding New Tools / Dodawanie Nowych Narzędzi

### Creating New Tool / Tworzenie Nowego Narzędzia

1. **Choose Category / Wybierz Kategorię:**
   - `database/` - Database related / Związane z bazą danych
   - `maintenance/` - Data maintenance / Konserwacja danych
   - `testing/` - Development testing / Testy deweloperskie

2. **File Structure / Struktura Pliku:**
   ```javascript
   import dotenv from 'dotenv';
   
   // Load environment variables / Załaduj zmienne środowiskowe
   dotenv.config();
   
   /**
    * Tool Description / Opis Narzędzia
    * Usage: node tools/category/toolName.js
    */
   async function toolFunction() {
     console.log('🚀 Starting tool... / Uruchamianie narzędzia...');
     
     try {
       // Tool logic here / Logika narzędzia tutaj
       
       console.log('✅ Tool completed successfully! / Narzędzie zakończone pomyślnie!');
     } catch (error) {
       console.error('❌ Error:', error);
       process.exit(1);
     }
   }
   
   // Run tool / Uruchom narzędzie
   toolFunction();
   ```

3. **Update Documentation / Aktualizuj Dokumentację:**
   - Add tool description to this README / Dodaj opis narzędzia do tego README
   - Include usage examples / Dołącz przykłady użycia

## 🔍 Troubleshooting / Rozwiązywanie Problemów

### Common Issues / Częste Problemy

1. **Database Connection / Połączenie z Bazą Danych:**
   ```
   Error: Cannot connect to database
   Solution: Check .env configuration
   ```

2. **Missing Dependencies / Brakujące Zależności:**
   ```
   Error: Module not found
   Solution: Run npm install
   ```

3. **Permission Issues / Problemy z Uprawnieniami:**
   ```
   Error: Access denied
   Solution: Check database permissions
   ```

### Getting Help / Uzyskiwanie Pomocy

- Check tool source code for specific error handling
- Sprawdź kod źródłowy narzędzia dla specyficznej obsługi błędów

- Review environment configuration
- Przejrzyj konfigurację środowiska

- Test with minimal data set first
- Najpierw testuj z minimalnym zestawem danych

---

**Last Updated / Ostatnia Aktualizacja:** 16.07.2025  
**Version / Wersja:** 2.0.0  
**Status:** Active / Aktywny
