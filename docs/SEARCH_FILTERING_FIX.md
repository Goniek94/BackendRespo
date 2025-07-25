# Naprawa funkcjonalności sortowania, filtrowania i opcji "tylko wyróżnione"

## Opis problemu

Na podstawie analizy kodu zidentyfikowano następujące problemy z funkcjonalnością wyszukiwania i filtrowania:

1. **Niespójność w obsłudze opcji "tylko wyróżnione"** - kod używał różnych parametrów (`listingType`, `featured`, `onlyFeatured`)
2. **Skomplikowana logika sortowania** - nieprzejrzysta hierarchia sortowania w endpoint'cie `/search`
3. **Brak poprawnej obsługi opcji "wszystkie"** - filtr nie pozwalał na wyświetlenie wszystkich typów ogłoszeń

## Wprowadzone zmiany

### 1. Naprawa funkcji `createAdFilter` w `routes/listings/ads/helpers.js`

```javascript
// Listing type and featured filtering
if (query.listingType) {
  if (query.listingType === 'wyróżnione' || query.listingType === 'featured') {
    filter.listingType = 'wyróżnione';
  } else if (query.listingType === 'wszystkie' || query.listingType === 'all') {
    // Don't add listingType filter - show all types
  } else {
    filter.listingType = query.listingType;
  }
}

// Handle "tylko wyróżnione" checkbox
if (query.featured === 'true' || query.featured === true || query.onlyFeatured === 'true' || query.onlyFeatured === true) {
  filter.listingType = 'wyróżnione';
}
```

**Zmiany:**
- Ujednolicono obsługę różnych parametrów dla opcji "tylko wyróżnione"
- Dodano poprawną obsługę opcji "wszystkie" - nie dodaje filtru `listingType`
- Obsługa zarówno parametru `featured` jak i `onlyFeatured`

### 2. Uproszczenie logiki sortowania w endpoint'cie `GET /` w `routes/listings/ads/search.js`

```javascript
// If showing only featured ads, use simple sorting
if (filter.listingType === 'wyróżnione') {
  sortOptions[sortBy] = order === 'desc' ? -1 : 1;
  
  const ads = await Ad.find(filter)
    .sort(sortOptions)
    .skip(skip)
    .limit(parseInt(limit))
    .select('_id brand model headline shortDescription description images mainImage price year mileage fuelType power transmission status listingType createdAt views')
    .lean();
  
  // Add title field from headline
  const adsWithTitle = ads.map(ad => ({
    ...ad,
    title: ad.headline ? ad.headline.substring(0, 120) : ''
  }));
  
  return res.status(200).json({
    ads: adsWithTitle,
    totalPages: Math.ceil(totalAds / parseInt(limit)),
    currentPage: parseInt(page),
    totalAds
  });
}

// For all ads (featured + regular), use aggregation to prioritize featured
const pipeline = [
  { $match: filter },
  { 
    $addFields: { 
      // Featured ads get priority (0), regular ads get lower priority (1)
      featuredPriority: { 
        $cond: { 
          if: { $eq: ["$listingType", "wyróżnione"] }, 
          then: 0, 
          else: 1 
        } 
      } 
    }
  },
  { 
    $sort: { 
      featuredPriority: 1,  // Featured first
      [sortBy]: order === 'desc' ? -1 : 1  // Then by selected sort
    } 
  },
  { $skip: skip },
  { $limit: parseInt(limit) },
  // ... projection
];
```

**Zmiany:**
- Rozdzielono logikę dla filtrowania tylko wyróżnionych vs wszystkich ogłoszeń
- Uproszczono sortowanie - najpierw wyróżnione, potem według wybranego kryterium
- Dodano lepsze logowanie dla debugowania

### 3. Naprawa endpoint'u `/search` w `routes/listings/ads/search.js`

```javascript
// Sorting logic
adsWithScore.sort((a, b) => {
  // If we have search filters, prioritize featured and relevance
  if (hasSearchFilters) {
    // First: Featured ads on top
    if (b.is_featured !== a.is_featured) {
      return b.is_featured - a.is_featured;
    }
    
    // Second: Match score (relevance)
    if (b.match_score !== a.match_score) {
      return b.match_score - a.match_score;
    }
  } else {
    // Without search filters, still prioritize featured ads
    if (b.is_featured !== a.is_featured) {
      return b.is_featured - a.is_featured;
    }
  }
  
  // Finally: Sort by selected criteria
  switch (sortBy) {
    case 'price':
      return order === 'asc' ? a.price - b.price : b.price - a.price;
    case 'year':
      return order === 'asc' ? a.year - b.year : b.year - a.year;
    case 'mileage':
      return order === 'asc' ? a.mileage - b.mileage : b.mileage - a.mileage;
    case 'createdAt':
    default:
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return order === 'asc' ? dateA - dateB : dateB - dateA;
  }
});
```

**Zmiany:**
- Uproszczono logikę sortowania używając `switch` statement
- Zachowano priorytet wyróżnionych ogłoszeń
- Dodano lepsze obsługę różnych kryteriów sortowania

## Obsługiwane parametry

### Filtrowanie typu ogłoszenia:
- `listingType=wyróżnione` - tylko wyróżnione ogłoszenia
- `listingType=wszystkie` - wszystkie typy ogłoszeń
- `featured=true` - tylko wyróżnione ogłoszenia (checkbox)
- `onlyFeatured=true` - tylko wyróżnione ogłoszenia (alternatywny parametr)

### Sortowanie:
- `sortBy=price&order=asc` - sortowanie po cenie rosnąco
- `sortBy=price&order=desc` - sortowanie po cenie malejąco
- `sortBy=year&order=asc` - sortowanie po roku rosnąco
- `sortBy=year&order=desc` - sortowanie po roku malejąco
- `sortBy=mileage&order=asc` - sortowanie po przebiegu rosnąco
- `sortBy=mileage&order=desc` - sortowanie po przebiegu malejąco
- `sortBy=createdAt&order=desc` - sortowanie po dacie utworzenia (domyślne)

## Hierarchia sortowania

1. **Wyróżnione ogłoszenia** - zawsze na górze (jeśli nie filtrujemy tylko wyróżnionych)
2. **Relevance score** - tylko przy wyszukiwaniu z filtrami (endpoint `/search`)
3. **Wybrane kryterium sortowania** - price, year, mileage, createdAt

## Testowanie

Utworzono skrypt testowy `test-search-functionality.js` który sprawdza:
- Sortowanie po różnych kryteriach
- Filtrowanie wyróżnionych ogłoszeń
- Priorytet wyróżnionych ogłoszeń
- Statystyki bazy danych

Uruchomienie testów:
```bash
node test-search-functionality.js
```

## Endpoint'y

### GET /api/listings/ads/
Podstawowe listowanie ogłoszeń z paginacją i sortowaniem.

**Parametry:**
- `page` - numer strony (domyślnie 1)
- `limit` - liczba ogłoszeń na stronę (domyślnie 30)
- `sortBy` - kryterium sortowania (price, year, mileage, createdAt)
- `order` - kierunek sortowania (asc, desc)
- `listingType` - typ ogłoszenia (wyróżnione, wszystkie)
- `featured` - tylko wyróżnione (true/false)

### GET /api/listings/ads/search
Zaawansowane wyszukiwanie z systemem punktacji relevance.

**Parametry:**
- Wszystkie parametry z endpoint'u podstawowego
- Dodatkowe filtry wyszukiwania (brand, model, price range, etc.)

## Status naprawy

✅ **Naprawiono:**
- Filtrowanie "tylko wyróżnione" działa poprawnie
- Opcja "wszystkie" pokazuje wszystkie typy ogłoszeń
- Sortowanie działa zgodnie z wybranymi kryteriami
- Wyróżnione ogłoszenia mają priorytet w wyświetlaniu
- Ujednolicono obsługę różnych parametrów

✅ **Przetestowano:**
- Różne kombinacje sortowania i filtrowania
- Priorytet wyróżnionych ogłoszeń
- Obsługa parametrów z frontendu

## Kompatybilność z frontendem

Zmiany są w pełni kompatybilne z istniejącym frontendem. Backend obsługuje wszystkie możliwe warianty parametrów, które frontend może wysłać.
