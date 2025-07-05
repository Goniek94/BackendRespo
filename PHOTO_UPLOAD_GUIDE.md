# 📸 Przewodnik po systemie przesyłania zdjęć

## Przegląd systemu

System przesyłania zdjęć w Marketplace-Backend został zoptymalizowany dla maksymalnej wydajności i jakości. Automatycznie kompresuje zdjęcia, zachowując wysoką jakość przy mniejszym rozmiarze plików.

## 🔧 Konfiguracja techniczna

### Limity systemowe
- **Maksymalna liczba zdjęć**: 15 na ogłoszenie
- **Maksymalny rozmiar pliku**: 5MB na zdjęcie
- **Obsługiwane formaty**: JPEG, JPG, PNG, WebP
- **Automatyczna kompresja**: Tak (do 1920x1080px, jakość 90%)

### Backend (routes/imageRoutes.js)
```javascript
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB na plik
    files: 15 // maksymalnie 15 plików na raz
  }
});
```

### Frontend (PhotoUploadSection.js)
- Automatyczna kompresja przed uploadem
- Walidacja plików w czasie rzeczywistym
- Interfejs drag & drop
- Podgląd postępu kompresji

## 🚀 Jak używać systemu

### 1. Dodawanie zdjęć
1. Kliknij w obszar "Przeciągnij zdjęcia lub kliknij, aby wybrać"
2. Wybierz do 15 zdjęć (każde max 5MB)
3. System automatycznie skompresuje zdjęcia
4. Obserwuj postęp kompresji w interfejsie

### 2. Zarządzanie zdjęciami
- **Ustawianie głównego zdjęcia**: Kliknij ikonę gwiazdki
- **Usuwanie zdjęć**: Kliknij ikonę X
- **Przeciąganie**: Zmień kolejność przeciągając zdjęcia
- **Usuwanie wszystkich**: Przycisk "Usuń wszystkie"

### 3. Informacje o kompresji
System automatycznie:
- Zmniejsza rozdzielczość do maksymalnie 1920x1080px
- Konwertuje do formatu JPEG z jakością 90%
- Tworzy miniaturki (thumbnails)
- Zachowuje proporcje obrazu

## 📋 Specyfikacja API

### POST /api/images/upload
Przesyłanie zdjęć z automatyczną optymalizacją.

**Parametry:**
- `images[]`: Pliki zdjęć (multipart/form-data)
- `carId`: ID samochodu
- `mainImageIndex`: Indeks głównego zdjęcia (domyślnie 0)

**Odpowiedź:**
```json
{
  "success": true,
  "message": "Przesłano 5 zdjęć",
  "data": [
    {
      "id": "uuid",
      "url": "https://supabase.co/storage/...",
      "thumbnailUrl": "https://supabase.co/storage/.../thumb",
      "isMain": true,
      "metadata": {
        "originalName": "car1.jpg",
        "fileSize": 245760,
        "width": 1920,
        "height": 1080
      }
    }
  ]
}
```

### GET /api/images/:carId
Pobieranie zdjęć dla konkretnego samochodu.

### DELETE /api/images/:id
Usuwanie pojedynczego zdjęcia.

### PUT /api/images/:id/main
Ustawianie zdjęcia jako główne.

## 🔍 Proces kompresji (Frontend)

### 1. Walidacja plików
```javascript
const validation = validateImageFile(file, { 
  maxSizeKB: 5120,
  allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
});
```

### 2. Kompresja obrazów
```javascript
const result = await compressImages(
  validFiles, 
  COMPRESSION_PRESETS.HIGH_QUALITY,
  (progress) => {
    // Callback postępu kompresji
    setCompressionProgress(progress);
  }
);
```

### 3. Presety kompresji
- **HIGH_QUALITY**: 1920x1080px, jakość 90%, max 5MB
- **MEDIUM_QUALITY**: 1280x720px, jakość 80%, max 3MB
- **LOW_QUALITY**: 800x600px, jakość 70%, max 1MB
- **MOBILE**: 1024x768px, jakość 75%, max 2MB

## 🛠️ Optymalizacja backendu (Sharp)

### Główny obraz
```javascript
const optimizedBuffer = await sharp(file.buffer)
  .resize(1920, null, { 
    withoutEnlargement: true,
    fit: 'inside'
  })
  .jpeg({ quality: 85, progressive: true })
  .toBuffer();
```

### Miniaturka
```javascript
const thumbnailBuffer = await sharp(file.buffer)
  .resize(300, 300, { 
    fit: 'cover',
    position: 'center'
  })
  .jpeg({ quality: 80 })
  .toBuffer();
```

## 📊 Monitoring i statystyki

### GET /api/images/stats/:carId
Pobieranie statystyk zdjęć:
```json
{
  "success": true,
  "data": {
    "totalImages": 8,
    "totalSize": 2048576,
    "hasMainImage": true,
    "averageSize": 256072,
    "formats": {
      "image/jpeg": 8
    }
  }
}
```

## 🔒 Bezpieczeństwo

### Walidacja plików
- Sprawdzanie typu MIME
- Ograniczenie rozmiaru pliku
- Walidacja rozszerzeń
- Rate limiting (10 uploadów/minutę)

### Autoryzacja
- Wymagane uwierzytelnienie dla uploadu
- Sprawdzanie uprawnień użytkownika
- Ochrona przed nadużyciami

## 🐛 Rozwiązywanie problemów

### Częste błędy

**"Plik jest za duży"**
- Sprawdź czy plik nie przekracza 5MB
- System automatycznie kompresuje, ale bardzo duże pliki mogą być odrzucone

**"Nieobsługiwany format pliku"**
- Obsługiwane formaty: JPEG, JPG, PNG, WebP
- Sprawdź rozszerzenie pliku

**"Za dużo prób uploadu"**
- Rate limit: 10 uploadów na minutę
- Poczekaj minutę przed kolejną próbą

**"Błąd kompresji obrazu"**
- Plik może być uszkodzony
- Spróbuj z innym plikiem
- Sprawdź czy przeglądarka obsługuje Canvas API

### Debugowanie

**Frontend:**
```javascript
// Sprawdź obsługę kompresji
import { isCompressionSupported } from '../utils/imageCompression';
console.log('Kompresja obsługiwana:', isCompressionSupported());
```

**Backend:**
```javascript
// Logi w imageController.js
console.log('Upload request:', {
  filesCount: files.length,
  carId,
  mainImageIndex
});
```

## 📈 Wydajność

### Optymalizacje
- Kompresja po stronie klienta zmniejsza transfer danych
- Progressive JPEG dla szybszego ładowania
- Miniaturki dla szybkich podglądów
- CDN Supabase dla globalnej dystrybucji

### Metryki
- Średni czas kompresji: ~2-5s na zdjęcie
- Redukcja rozmiaru: 60-80%
- Czas uploadu: zależny od połączenia internetowego

## 🔄 Aktualizacje i migracje

### Historia zmian
- **v1.0**: Podstawowy upload bez kompresji
- **v2.0**: Dodanie kompresji po stronie serwera (Sharp)
- **v3.0**: Kompresja po stronie klienta + optymalizacje
- **v3.1**: Zmiana limitu z 20 na 15 zdjęć, z 10MB na 5MB

### Planowane funkcje
- WebP jako domyślny format wyjściowy
- Lazy loading dla galerii zdjęć
- Batch upload z kolejką
- Automatyczne tagowanie zdjęć AI

## 📞 Wsparcie

W przypadku problemów:
1. Sprawdź logi przeglądarki (F12 → Console)
2. Sprawdź logi serwera
3. Zweryfikuj konfigurację Supabase
4. Skontaktuj się z zespołem deweloperskim

---

*Ostatnia aktualizacja: 7 stycznia 2025*
