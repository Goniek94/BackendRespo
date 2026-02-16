# Instrukcja dodawania przykładowego ogłoszenia

## Opis

Skrypt `add-sample-ad.js` automatycznie tworzy przykładowe ogłoszenie BMW ze zdjęciami pobranymi z Unsplash i uploadowanymi do Supabase Storage.

## Wymagania

- Działające połączenie z MongoDB
- Skonfigurowany Supabase (zmienne środowiskowe w `.env`)
- Zainstalowane zależności npm

## Jak uruchomić

### 1. Upewnij się, że masz wszystkie zależności

```bash
npm install
```

### 2. Sprawdź konfigurację w `.env`

Upewnij się, że masz ustawione:

```env
MONGODB_URI=mongodb+srv://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
```

### 3. Uruchom skrypt

```bash
node add-sample-ad.js
```

## Co robi skrypt?

1. **Łączy się z MongoDB**
2. **Znajduje lub tworzy użytkownika testowego**
   - Email: test@example.com
   - Imię: Jan Kowalski
3. **Pobiera 4 zdjęcia BMW z Unsplash**

   - Zdjęcie główne
   - Wnętrze
   - Widok z boku
   - Widok z tyłu

4. **Uploaduje zdjęcia do Supabase Storage**

   - Bucket: `autosell`
   - Folder: `ads`
   - Automatyczna optymalizacja przez Sharp (max 800px szerokości)

5. **Tworzy ogłoszenie BMW Seria 3**
   - Marka: BMW
   - Model: Seria 3 (G20)
   - Wersja: 320d xDrive M Sport
   - Rok: 2020
   - Przebieg: 85 000 km
   - Cena: 145 000 PLN
   - Status: `active` (od razu widoczne)
   - Wygasa za: 30 dni

## Przykładowy output

```
🔄 Łączenie z MongoDB...
✅ Połączono z MongoDB
👤 Używam użytkownika: test@example.com (507f1f77bcf86cd799439011)

📸 Uploadowanie zdjęć do Supabase...
📥 Pobieranie obrazu: https://images.unsplash.com/photo-1605559424843...
✅ Pobrano obraz (245678 bytes)
✅ Uploadowano do Supabase: https://zcxakmniknrtvtnyetxd.supabase.co/storage/v1/object/public/autosell/ads/sample-car-1737034924123-0.jpg
...

🚗 Tworzenie przykładowego ogłoszenia...

✅ Przykładowe ogłoszenie zostało utworzone!
📋 Szczegóły:
   ID: 507f191e810c19729de860ea
   Tytuł: BMW Seria 3 320d xDrive M Sport - Stan Idealny
   Marka: BMW Seria 3
   Cena: 145 000 PLN
   Zdjęcia: 4
   Status: active
   Właściciel: test@example.com

📸 Zdjęcia:
   1. https://zcxakmniknrtvtnyetxd.supabase.co/storage/v1/object/public/autosell/ads/sample-car-1737034924123-0.jpg
   2. https://zcxakmniknrtvtnyetxd.supabase.co/storage/v1/object/public/autosell/ads/sample-car-1737034924123-1.jpg
   3. https://zcxakmniknrtvtnyetxd.supabase.co/storage/v1/object/public/autosell/ads/sample-car-1737034924123-2.jpg
   4. https://zcxakmniknrtvtnyetxd.supabase.co/storage/v1/object/public/autosell/ads/sample-car-1737034924123-3.jpg

👋 Rozłączono z MongoDB
```

## Dane utworzonego ogłoszenia

### Informacje podstawowe

- **Tytuł**: BMW Seria 3 320d xDrive M Sport - Stan Idealny
- **Opis**: Szczegółowy opis z emoji, danymi technicznymi, wyposażeniem i historią
- **Cena**: 145 000 PLN (do negocjacji)

### Dane techniczne

- **Silnik**: 2.0 diesel, 190 KM
- **Napęd**: xDrive (4x4)
- **Skrzynia**: Automatyczna 8-biegowa
- **Przebieg**: 85 000 km

### Stan pojazdu

- Bezwypadkowy
- Nieuszkodzony
- Pierwszy właściciel w Polsce
- Serwisowany w ASO

### Lokalizacja

- Województwo: Mazowieckie
- Miasto: Warszawa

## Rozwiązywanie problemów

### Błąd połączenia z MongoDB

```
❌ Błąd połączenia z MongoDB Atlas
```

**Rozwiązanie**: Sprawdź `MONGODB_URI` w pliku `.env`

### Błąd uploadu do Supabase

```
❌ Błąd uploadu do Supabase: Failed to upload
```

**Rozwiązanie**:

- Sprawdź `SUPABASE_URL` i `SUPABASE_ANON_KEY` w `.env`
- Upewnij się, że bucket `autosell` istnieje w Supabase
- Sprawdź uprawnienia do bucketa (powinien być publiczny)

### Nie można pobrać zdjęć z Unsplash

```
❌ Błąd pobierania obrazu: HTTP error! status: 403
```

**Rozwiązanie**:

- Sprawdź połączenie internetowe
- Unsplash może czasowo blokować zbyt wiele żądań
- Skrypt utworzy ogłoszenie bez zdjęć

## Czyszczenie testowych danych

Jeśli chcesz usunąć utworzone ogłoszenie:

```javascript
// W MongoDB shell lub przez Compass
db.ads.deleteOne({ title: "BMW Seria 3 320d xDrive M Sport - Stan Idealny" });
```

Lub usuń użytkownika testowego (wraz z jego ogłoszeniami):

```javascript
db.users.deleteOne({ email: "test@example.com" });
```

## Uwagi

- Skrypt można uruchamiać wielokrotnie - za każdym razem utworzy nowe ogłoszenie
- Zdjęcia są pobierane z Unsplash (darmowe, wysokiej jakości)
- Zdjęcia są automatycznie optymalizowane do max 800px szerokości
- Ogłoszenie jest od razu aktywne (status: `active`)
- Ogłoszenie wygasa automatycznie po 30 dniach

## Modyfikacja skryptu

Możesz łatwo zmodyfikować dane ogłoszenia edytując plik `add-sample-ad.js`:

```javascript
const sampleAd = new Ad({
  title: "Twój tytuł",
  brand: "Inna marka",
  model: "Inny model",
  price: 100000,
  // ... inne pola
});
```

Możesz też zmienić źródła zdjęć w tablicy `SAMPLE_IMAGE_URLS`.
