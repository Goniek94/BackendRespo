# System Hierarchicznego Wyszukiwania Pojazdów

## Przegląd

System wyszukiwania pojazdów został zaprojektowany z myślą o inteligentnym sortowaniu wyników według hierarchii dopasowania i statusu ogłoszenia. Implementuje kaskadowe filtrowanie z licznikami oraz przekierowanie na dedykowaną stronę wyników.

## Architektura Systemu

### Backend - Endpointy API

#### 1. `/api/ads/filter-counts` - Kaskadowe Filtrowanie
```javascript
GET /api/ads/filter-counts?brand=BMW&model=X5&yearFrom=2015
```

**Funkcjonalność:**
- Zwraca liczniki dla wszystkich opcji filtrów na podstawie aktualnych wyborów
- Umożliwia dynamiczne ukrywanie/pokazywanie opcji bez wyników
- Wspiera kaskadowe filtrowanie (wybór marki → dostępne modele → dostępne generacje)

**Odpowiedź:**
```json
{
  "totalMatching": 1247,
  "filterCounts": {
    "brands": { "BMW": 1247, "Audi": 0, "Mercedes": 0 },
    "models": { "X5": 1247, "X3": 0, "X1": 0 },
    "generations": { "F15": 847, "E70": 400 },
    "bodyTypes": { "SUV": 1247 },
    "fuelTypes": { "diesel": 890, "benzyna": 357 },
    "transmissions": { "automatyczna": 1100, "manualna": 147 }
  },
  "appliedFilters": { "brand": "BMW", "model": "X5", "yearFrom": "2015" }
}
```

#### 2. `/api/ads/search` - Hierarchiczne Wyszukiwanie
```javascript
GET /api/ads/search?brand=BMW&model=X5&page=1&limit=30
```

**Hierarchia Wyników:**

1. **Wyróżnione + Dokładne Dopasowanie** (matchScore: 100)
   - Ogłoszenia premium pasujące dokładnie do wszystkich kryteriów

2. **Wyróżnione + Częściowe Dopasowanie** (matchScore: 90)
   - Ogłoszenia premium pasujące do większości kryteriów

3. **Zwykłe + Dokładne Dopasowanie** (matchScore: 75)
   - Standardowe ogłoszenia pasujące dokładnie do kryteriów

4. **Zwykłe + Częściowe Dopasowanie** (matchScore: 60)
   - Standardowe ogłoszenia z częściowym dopasowaniem

5. **Podobne Ogłoszenia** (matchScore: 1-50)
   - Ogłoszenia tej samej marki, ale innych modeli

#### 3. `/api/ads/count` - Szybkie Liczenie
```javascript
GET /api/ads/count?brand=BMW&model=X5
```

**Funkcjonalność:**
- Szybki endpoint tylko do liczenia pasujących ogłoszeń
- Używany do aktualizacji przycisku "Pokaż ogłoszenia (X)"

### Frontend - Komponenty

#### 1. `useFilterCounts` Hook
```javascript
const { 
  filterCounts, 
  totalMatching, 
  loading, 
  getBrandCount, 
  getModelCount 
} = useFilterCounts(formData);
```

**Funkcjonalność:**
- Automatyczne pobieranie liczników przy zmianie filtrów
- Debouncing (300ms) dla optymalizacji wydajności
- Helper functions dla łatwego dostępu do liczników

#### 2. `SearchFormButtons` Komponent
```javascript
<SearchFormButtons
  formData={formData}
  showAdvanced={showAdvanced}
  setShowAdvanced={setShowAdvanced}
  matchingResults={matchingResults}
  loading={loading}
/>
```

**Funkcjonalność:**
- Przekierowanie na `/listings` z parametrami wyszukiwania
- Wyświetlanie liczby pasujących wyników w czasie rzeczywistym
- Obsługa stanu ładowania

#### 3. `SearchFormUpdated` - Główny Komponent
```javascript
<SearchFormUpdated 
  initialValues={initialFilters}
  onFilterChange={handleFilterChange}
/>
```

**Funkcjonalność:**
- Zarządzanie stanem wszystkich filtrów
- Integracja z hookami `useCarData`, `useSearchStats`, `useFilterCounts`
- Automatyczne przekierowanie na stronę wyników

## Algorytm Punktowania (Match Score)

### Kryteria Punktowania

| Kryterium | Punkty | Opis |
|-----------|--------|------|
| Dokładna marka + model | 100 | Najwyższy priorytet |
| Dokładna marka | 50 | Wysoki priorytet |
| Generacja | 15 | Średni priorytet |
| Wersja | 10 | Średni priorytet |
| Przedział cenowy | 30 | Wysoki priorytet |
| Rok produkcji | 20 | Średni priorytet |
| Przebieg | 15 | Średni priorytet |
| Rodzaj paliwa | 10 | Niski priorytet |
| Skrzynia biegów | 8 | Niski priorytet |
| Typ nadwozia | 8 | Niski priorytet |
| Lokalizacja (województwo) | 6 | Niski priorytet |
| Lokalizacja (miasto) | 8 | Niski priorytet |

### Przykład Obliczenia

```javascript
// BMW X5 2018, diesel, automatyczna, Warszawa
// Wyszukiwanie: BMW X5, 2015-2020, diesel

const score = 
  100 + // dokładna marka + model
  20 +  // rok w przedziale
  10 +  // diesel
  8 +   // automatyczna
  8;    // Warszawa

// Łączny wynik: 146 punktów
```

## Implementacja Kaskadowego Filtrowania

### 1. Struktura Danych
```javascript
const filterCounts = {
  brands: { "BMW": 1500, "Audi": 1200, "Mercedes": 800 },
  models: { "X5": 400, "X3": 300, "X1": 200 },
  generations: { "F15": 250, "E70": 150 },
  // ... inne filtry
};
```

### 2. Logika Filtrowania
```javascript
// 1. Użytkownik wybiera markę "BMW"
// 2. System pobiera liczniki dla wszystkich filtrów z ograniczeniem do BMW
// 3. Modele bez wyników (count: 0) są ukrywane lub wyszarzone
// 4. Użytkownik wybiera model "X5"
// 5. System aktualizuje liczniki dla generacji, typów nadwozia, etc.
```

### 3. Optymalizacja Wydajności
- **Debouncing**: 300ms opóźnienie przed wysłaniem zapytania
- **Caching**: Wyniki są cache'owane na poziomie hooka
- **Agregacja MongoDB**: Używanie pipeline'ów dla szybkich obliczeń

## Przepływ Użytkownika

### 1. Strona Główna
```
Użytkownik → Formularz wyszukiwania → Wybór filtrów → "Pokaż ogłoszenia (X)"
```

### 2. Przekierowanie
```
/search → /listings?brand=BMW&model=X5&yearFrom=2015&yearTo=2020
```

### 3. Strona Wyników
```
/listings → Hierarchiczne wyniki → Paginacja → Szczegóły ogłoszenia
```

## Konfiguracja i Uruchomienie

### Backend
```bash
# Uruchomienie serwera
npm start

# Testowanie endpointów
curl "http://localhost:5000/api/ads/filter-counts?brand=BMW"
curl "http://localhost:5000/api/ads/search?brand=BMW&page=1"
```

### Frontend
```bash
# Uruchomienie aplikacji
npm start

# Testowanie komponentów
npm test -- SearchFormUpdated
npm test -- useFilterCounts
```

## Monitoring i Debugowanie

### Logi Backend
```javascript
console.log('Pobieranie liczników filtrów z parametrami:', req.query);
console.log('Zwracam liczniki filtrów:', {
  totalMatching: response.totalMatching,
  brandsCount: Object.keys(filterCounts.brands || {}).length
});
```

### Logi Frontend
```javascript
console.log('Pobieranie liczników filtrów dla:', filters);
console.log('Otrzymane liczniki filtrów:', data);
console.log('Przekierowanie na /listings z parametrami:', params.toString());
```

## Rozszerzenia i Ulepszenia

### Planowane Funkcjonalności
1. **Zapisywanie Wyszukiwań** - Możliwość zapisania ulubionych filtrów
2. **Alerty Cenowe** - Powiadomienia o nowych ogłoszeniach
3. **Porównywarka** - Porównanie wybranych pojazdów
4. **Mapa Wyników** - Wizualizacja lokalizacji na mapie
5. **Filtrowanie AI** - Inteligentne sugestie na podstawie historii

### Optymalizacje Wydajności
1. **Redis Cache** - Cache'owanie liczników filtrów
2. **Elasticsearch** - Szybsze wyszukiwanie pełnotekstowe
3. **CDN** - Cache'owanie statycznych zasobów
4. **Lazy Loading** - Ładowanie wyników na żądanie

## Testowanie

### Unit Tests
```javascript
describe('useFilterCounts', () => {
  it('should fetch filter counts on formData change', async () => {
    // Test implementation
  });
});
```

### Integration Tests
```javascript
describe('Search API', () => {
  it('should return hierarchical results', async () => {
    // Test implementation
  });
});
```

### E2E Tests
```javascript
describe('Search Flow', () => {
  it('should redirect to listings page with filters', () => {
    // Test implementation
  });
});
```

## Bezpieczeństwo

### Walidacja Danych
- Sanityzacja parametrów wejściowych
- Ograniczenie liczby wyników na stronę
- Rate limiting dla API

### Autoryzacja
- Opcjonalne logowanie dla zaawansowanych funkcji
- Ograniczenia dla niezalogowanych użytkowników

## Dokumentacja API

Pełna dokumentacja API dostępna w pliku `docs/api/SEARCH_API.md`

## Wsparcie

W przypadku problemów lub pytań:
- GitHub Issues: [link]
- Email: support@marketplace.com
- Dokumentacja: [link]
