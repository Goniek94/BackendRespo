# Naprawa Filtrowania po Kolorze - Podsumowanie

**Data ostatniej aktualizacji:** 5 stycznia 2026, 18:58

## Problem

Wyszukiwarka nie działała poprawnie przy filtrowaniu ogłoszeń po kolorze samochodu:

1. ❌ Kolory były wyświetlane z różnymi wielkościami liter ("BIAŁY", "Biały", "BiaŁy")
2. ❌ Użytkownik widział "Srebrny (2)" ale po kliknięciu dostawał "Nic nie znaleziono"
3. ❌ Kolory nie były grupowane case-insensitive
4. ❌ MongoDB `$toLower` nie obsługiwał polskich znaków diakrytycznych (Ł, Ą, Ó, Ż)

## Analiza

Po przeanalizowaniu kodu i bazy danych zidentyfikowano:

1. ✅ **Model `Ad`** - pole `color` istnieje w schemacie
2. ✅ **Funkcja filtrowania** - `createAdFilter()` obsługuje filtrowanie case-insensitive
3. ❌ **Endpoint `/ads/colors`** - zwracał kolory dokładnie jak w bazie (z różnymi wielkościami liter)
4. ❌ **Baza danych** - kolory zapisane niespójnie:
   - `'BIAŁY' => 1 ogłoszenie`
   - `'Biały' => 3 ogłoszenia`
   - `'CZARNY' => 29 ogłoszeń`
   - `'Czarny' => 20 ogłoszeń`

## Rozwiązanie

### Zmiany w pliku: `routes/listings/adSearchRoutes.js`

#### Endpoint `GET /ads/colors` - CAŁKOWICIE PRZEPISANY

**Poprzednie podejście (NIE DZIAŁAŁO):**

```javascript
// Agregacja MongoDB z $toLower - nie obsługuje polskich znaków
const colorCounts = await Ad.aggregate([
  { $match: activeFilter },
  { $group: { _id: "$color", count: { $sum: 1 } } },
]);
// Zwracało: { "BIAŁY": 1, "Biały": 3, "CZARNY": 29, "Czarny": 20 }
```

**Nowe podejście (DZIAŁA):**

```javascript
// Lista standardowych kolorów z formularza
const standardColors = [
  "Biały",
  "Czarny",
  "Srebrny",
  "Szary",
  "Niebieski",
  "Czerwony",
  "Zielony",
  "Żółty",
  "Brązowy",
  "Złoty",
  "Fioletowy",
  "Pomarańczowy",
  "Inne",
];

// Dla każdego koloru policz case-insensitive
const colorsWithCounts = {};
for (const color of standardColors) {
  const count = await Ad.countDocuments({
    ...activeFilter,
    color: { $regex: new RegExp(`^${color}$`, "i") },
  });
  if (count > 0) {
    colorsWithCounts[color] = count;
  }
}
// Zwraca: { "Biały": 4, "Czarny": 49, "Srebrny": 2 }
```

**Zalety nowego podejścia:**

- ✅ Kolory wyświetlane dokładnie jak w formularzu (ładnie sformatowane)
- ✅ Grupowanie case-insensitive (BIAŁY + Biały + BiaŁy = razem)
- ✅ Obsługa polskich znaków (Ł, Ą, Ó, Ż)
- ✅ Tylko kolory które mają ogłoszenia
- ✅ Zgodność z formularzem dodawania ogłoszenia

## Jak działa filtrowanie po kolorze

### Backend

1. **Endpoint `/ads/colors`** - zwraca obiekt z kolorami i liczbą ogłoszeń:

   ```json
   {
     "BIAŁY": 15,
     "CZARNY": 23,
     "CZERWONY": 8,
     "ZIELONY": 5
   }
   ```

2. **Endpoint `/ads/search?color=ZIELONY`** - zwraca tylko ogłoszenia w kolorze zielonym

   - Filtrowanie jest case-insensitive (nie rozróżnia wielkości liter)
   - Obsługuje wiele kolorów: `/ads/search?color=ZIELONY&color=CZERWONY`

3. **Endpoint `/ads/count?color=ZIELONY`** - zwraca liczbę ogłoszeń w danym kolorze

### Logika filtrowania (utils/listings/commonFilters.js)

```javascript
if (query.color) {
  const normalizedColor = toIn(query.color);
  if (normalizedColor) {
    if (typeof normalizedColor === "string") {
      // Pojedynczy kolor - case-insensitive
      filter.color = { $regex: new RegExp(`^${normalizedColor}$`, "i") };
    } else if (normalizedColor.$in) {
      // Wiele kolorów - case-insensitive dla każdego
      filter.color = {
        $in: normalizedColor.$in.map((val) => new RegExp(`^${val}$`, "i")),
      };
    }
  }
}
```

## Testowanie

### 1. Pobranie dostępnych kolorów z liczbą ogłoszeń

```bash
GET /api/ads/colors
```

### 2. Filtrowanie po jednym kolorze

```bash
GET /api/ads/search?color=ZIELONY
```

### 3. Filtrowanie po wielu kolorach

```bash
GET /api/ads/search?color=ZIELONY&color=CZERWONY
```

### 4. Liczba ogłoszeń w danym kolorze

```bash
GET /api/ads/count?color=ZIELONY
```

## Status

✅ **NAPRAWIONE** - Filtrowanie po kolorze działa poprawnie:

- Frontend otrzymuje informację o kolorze dla każdego ogłoszenia
- Endpoint `/ads/colors` zwraca listę kolorów z liczbą ogłoszeń
- Endpoint `/ads/search` obsługuje filtrowanie po kolorze (pojedynczym lub wielu)
- Filtrowanie jest case-insensitive i obsługuje wiele wartości

## Data naprawy

29.12.2025, 15:05
