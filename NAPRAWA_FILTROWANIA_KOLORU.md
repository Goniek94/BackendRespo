# Naprawa Filtrowania po Kolorze - Podsumowanie

## Problem

Wyszukiwarka nie działała poprawnie przy filtrowaniu ogłoszeń po kolorze samochodu. Użytkownik nie mógł zobaczyć, ile jest ogłoszeń w danym kolorze ani wyfiltrować ogłoszeń według koloru.

## Analiza

Po przeanalizowaniu kodu zidentyfikowano, że:

1. ✅ **Model `Ad`** - pole `color` istnieje w schemacie (models/listings/ad.js, linia 62)
2. ✅ **Funkcja filtrowania** - `createAdFilter()` w utils/listings/commonFilters.js już obsługuje filtrowanie po kolorze (linie 107-122)
3. ✅ **Endpoint `/ads/colors`** - już istnieje i zwraca kolory z liczbą ogłoszeń (routes/listings/adSearchRoutes.js, linie 147-172)
4. ❌ **Problem**: Pole `color` nie było uwzględnione w projekcji MongoDB dla głównych endpointów wyszukiwania

## Rozwiązanie

### Zmiany w pliku: `routes/listings/adSearchRoutes.js`

#### 1. Endpoint `GET /ads` (linia 77)

Dodano pole `color: 1` do projekcji MongoDB, aby frontend otrzymywał informację o kolorze dla każdego ogłoszenia.

```javascript
$project: {
  // ... inne pola
  color: 1, // DODANO: pole koloru dla filtrowania
}
```

#### 2. Endpoint `GET /ads/search` (linia 343)

Dodano pole `color: 1` do projekcji MongoDB w endpoincie wyszukiwania z paginacją.

```javascript
$project: {
  // ... inne pola
  color: 1, // DODANO: pole koloru dla filtrowania
}
```

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
