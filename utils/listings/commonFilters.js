/**
 * Wspólne funkcje filtrowania - FINAL PRODUCTION
 *
 * POPRAWKI:
 * ✅ Walidacja NaN (safeInt, safeFloat)
 * ✅ Walidacja zakresów (min <= max)
 * ✅ drive (zamiast driveType; kompatybilność zachowana)
 * ✅ seats/doors jako liczby
 * ✅ toIn helper (normalizacja array -> $in) - zastosowany do wszystkich pól multi-select
 * ✅ processAdImages działa także z .lean()
 * ✅ Obsługa koloru (color)
 */

/* ------------------------ Safe Helpers ------------------------ */

const safeInt = (val, fallback = null) => {
  if (val === undefined || val === null || val === "") return fallback;
  const n = parseInt(val, 10);
  return Number.isNaN(n) ? fallback : n;
};

const safeFloat = (val, fallback = null) => {
  if (val === undefined || val === null || val === "") return fallback;
  const n = parseFloat(val);
  return Number.isNaN(n) ? fallback : n;
};

/**
 * Normalizacja wartości tekstowych do formatu:
 * - pojedyncza wartość: "val"
 * - wiele wartości: { $in: ["a", "b"] }
 * Usuwa duplikaty, trymuje, filtruje puste.
 */
const toIn = (v) => {
  const arr = Array.isArray(v) ? v : [v];
  const norm = [
    ...new Set(
      arr
        .map(String)
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  ];
  if (norm.length === 0) return undefined;
  return norm.length > 1 ? { $in: norm } : norm[0];
};

/**
 * Wariant liczbowy doIn (gdyby kiedyś potrzebny dla pól numerycznych)
 */
const toInNumber = (v) => {
  const arr = Array.isArray(v) ? v : [v];
  const norm = [
    ...new Set(arr.map((x) => safeFloat(x, null)).filter((n) => n !== null)),
  ];
  if (norm.length === 0) return undefined;
  return norm.length > 1 ? { $in: norm } : norm[0];
};

/* ------------------------ Filters ------------------------ */

// Statusy aktywne
export const getActiveStatusFilter = () => {
  return { $in: ["active", "opublikowane", "pending", "approved"] };
};

/**
 * Buduje filtr MongoDB na podstawie query params.
 * Zgodny z routerem (m.in. drive, voivodeship, engineSize itp.).
 */
export const createAdFilter = (query = {}) => {
  const filter = {};

  // === PODSTAWOWE FILTRY TEKSTOWE ===

  // Marka (make -> brand mapping)
  const brand = query.brand || query.make;
  if (brand) filter.brand = toIn(brand);

  // Model
  if (query.model) filter.model = toIn(query.model);

  // Generacja
  if (query.generation) filter.generation = toIn(query.generation);

  // Typ nadwozia
  if (query.bodyType) filter.bodyType = toIn(query.bodyType);

  // Rodzaj paliwa
  if (query.fuelType) filter.fuelType = toIn(query.fuelType);

  // Skrzynia biegów
  if (query.transmission) filter.transmission = toIn(query.transmission);

  // Napęd (drive, NIE driveType) – kompatybilność z driveType
  const driveValue = query.drive || query.driveType;
  if (driveValue) {
    // Normalizacja wartości napędu
    const normalizedDrive = toIn(driveValue);
    if (normalizedDrive) {
      // Sprawdź czy to pojedyncza wartość czy tablica
      if (typeof normalizedDrive === "string") {
        // Dla pojedynczej wartości użyj case-insensitive regex
        filter.drive = { $regex: new RegExp(`^${normalizedDrive}$`, "i") };
      } else if (normalizedDrive.$in) {
        // Dla wielu wartości użyj case-insensitive regex dla każdej
        filter.drive = {
          $in: normalizedDrive.$in.map((val) => new RegExp(`^${val}$`, "i")),
        };
      }
    }
  }

  // Kolor (DODANO)
  if (query.color) {
    const normalizedColor = toIn(query.color);
    if (normalizedColor) {
      // Sprawdź czy to pojedyncza wartość czy tablica
      if (typeof normalizedColor === "string") {
        // Dla pojedynczej wartości użyj case-insensitive regex
        filter.color = { $regex: new RegExp(`^${normalizedColor}$`, "i") };
      } else if (normalizedColor.$in) {
        // Dla wielu wartości użyj case-insensitive regex dla każdej
        filter.color = {
          $in: normalizedColor.$in.map((val) => new RegExp(`^${val}$`, "i")),
        };
      }
    }
  }

  // === FILTRY ZAAWANSOWANE (Zastosowano toIn dla obsługi MultiCheckbox) ===

  // Wykończenie lakieru
  if (query.finish) filter.paintFinish = toIn(query.finish);

  // Stan techniczny
  if (query.condition) filter.condition = toIn(query.condition);

  // Wypadkowość
  if (query.accidentStatus) filter.accidentStatus = toIn(query.accidentStatus);

  // Uszkodzenia
  if (query.damageStatus) filter.damageStatus = toIn(query.damageStatus);

  // Tuning
  if (query.tuning) filter.tuning = toIn(query.tuning);

  // Kraj pochodzenia
  if (query.countryOfOrigin)
    filter.countryOfOrigin = toIn(query.countryOfOrigin);

  // Typ sprzedawcy
  if (query.sellerType) filter.sellerType = toIn(query.sellerType);

  // Liczba drzwi (liczba)
  const doors = safeInt(query.doorCount);
  if (doors !== null) filter.doors = doors;

  // Liczba miejsc (liczba)
  const seats = safeInt(query.seats);
  if (seats !== null) filter.seats = seats;

  // Importowany
  if (query.imported)
    filter.imported = query.imported === "tak" || query.imported === true;

  // Zarejestrowany w PL
  if (query.registeredInPL)
    filter.registeredInPL =
      query.registeredInPL === "tak" || query.registeredInPL === true;

  // Pierwszy właściciel
  if (query.firstOwner)
    filter.firstOwner = query.firstOwner === "tak" || query.firstOwner === true;

  // Przystosowany dla niepełnosprawnych
  if (query.disabledAdapted)
    filter.disabledAdapted =
      query.disabledAdapted === "tak" || query.disabledAdapted === true;

  // === LOKALIZACJA ===

  // Województwo
  if (query.region) filter.voivodeship = toIn(query.region);

  // Miasto
  if (query.city) filter.city = toIn(query.city);

  // === KOMPATYBILNOŚĆ WSTECZNA ===
  if (query.country) filter.country = query.country;
  if (query.vehicleCondition) filter.vehicleCondition = query.vehicleCondition;
  if (query.sellingForm) filter.sellingForm = query.sellingForm;

  // === FILTRY BOOLEAN ===
  if (query.vat !== undefined && query.vat !== "") {
    filter.vat = query.vat === "true" || query.vat === true;
  }
  if (query.invoiceOptions !== undefined && query.invoiceOptions !== "") {
    filter.invoiceOptions =
      query.invoiceOptions === "true" || query.invoiceOptions === true;
  }

  // === FILTRY ZAKRESOWE (z walidacją NaN i zakresów) ===

  // Cena
  if (query.minPrice || query.maxPrice || query.priceFrom || query.priceTo) {
    const minPrice = safeFloat(query.minPrice || query.priceFrom);
    const maxPrice = safeFloat(query.maxPrice || query.priceTo);

    if (minPrice !== null || maxPrice !== null) {
      filter.price = {};
      if (minPrice !== null) filter.price.$gte = minPrice;
      if (maxPrice !== null) filter.price.$lte = maxPrice;

      if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
        delete filter.price;
      }
    }
  }

  // Rok produkcji
  if (query.minYear || query.maxYear || query.yearFrom || query.yearTo) {
    const minYear = safeInt(query.minYear || query.yearFrom);
    const maxYear = safeInt(query.maxYear || query.yearTo);

    if (minYear !== null || maxYear !== null) {
      filter.year = {};
      if (minYear !== null) filter.year.$gte = minYear;
      if (maxYear !== null) filter.year.$lte = maxYear;

      if (minYear !== null && maxYear !== null && minYear > maxYear) {
        delete filter.year;
      }
    }
  }

  // Przebieg
  if (
    query.minMileage ||
    query.maxMileage ||
    query.mileageFrom ||
    query.mileageTo
  ) {
    const minMileage = safeInt(query.minMileage || query.mileageFrom);
    const maxMileage = safeInt(query.maxMileage || query.mileageTo);

    if (minMileage !== null || maxMileage !== null) {
      filter.mileage = {};
      if (minMileage !== null) filter.mileage.$gte = minMileage;
      if (maxMileage !== null) filter.mileage.$lte = maxMileage;

      if (
        minMileage !== null &&
        maxMileage !== null &&
        minMileage > maxMileage
      ) {
        delete filter.mileage;
      }
    }
  }

  // Moc silnika
  if (query.enginePowerFrom || query.enginePowerTo) {
    const minPower = safeInt(query.enginePowerFrom);
    const maxPower = safeInt(query.enginePowerTo);

    if (minPower !== null || maxPower !== null) {
      filter.power = {};
      if (minPower !== null) filter.power.$gte = minPower;
      if (maxPower !== null) filter.power.$lte = maxPower;

      if (minPower !== null && maxPower !== null && minPower > maxPower) {
        delete filter.power;
      }
    }
  }

  // Pojemność silnika (UWAGA: używamy pola `engineSize` zgodnie z routerem)
  if (query.engineCapacityFrom || query.engineCapacityTo) {
    const minCapacity = safeFloat(query.engineCapacityFrom);
    const maxCapacity = safeFloat(query.engineCapacityTo);

    if (minCapacity !== null || maxCapacity !== null) {
      filter.engineSize = {};
      if (minCapacity !== null) filter.engineSize.$gte = minCapacity;
      if (maxCapacity !== null) filter.engineSize.$lte = maxCapacity;

      if (
        minCapacity !== null &&
        maxCapacity !== null &&
        minCapacity > maxCapacity
      ) {
        delete filter.engineSize;
      }
    }
  }

  // Waga pojazdu
  if (query.weightFrom || query.weightTo) {
    const minWeight = safeInt(query.weightFrom);
    const maxWeight = safeInt(query.weightTo);

    if (minWeight !== null || maxWeight !== null) {
      filter.weight = {};
      if (minWeight !== null) filter.weight.$gte = minWeight;
      if (maxWeight !== null) filter.weight.$lte = maxWeight;

      if (minWeight !== null && maxWeight !== null && minWeight > maxWeight) {
        delete filter.weight;
      }
    }
  }

  // Status ogłoszenia - domyślnie aktywne (nie nadpisujemy, jeśli przyszło w query)
  if (query.status) {
    filter.status = query.status;
  } else {
    filter.status = getActiveStatusFilter();
  }

  // Typ ogłoszenia
  if (query.listingType) {
    filter.listingType = query.listingType;
  }

  // DODATKOWO: pojedyncze pole power (dla kompatybilności), jeśli nie ustawiono zakresu
  if (query.power && !filter.power) {
    const power = safeInt(query.power);
    if (power !== null) filter.power = power;
  }

  return filter;
};

/* ------------------------ Counters & Utils ------------------------ */

/**
 * Zwraca liczbę aktywnych ogłoszeń (lub zgodnie z nadanym `status` w additionalFilters).
 * Nie nadpisuje `status`, jeśli został jawnie przekazany.
 */
export const getActiveAdsCount = async (Ad, additionalFilters = {}) => {
  const filter = { ...additionalFilters };
  if (!filter.status) {
    filter.status = getActiveStatusFilter();
  }
  return Ad.countDocuments(filter);
};

/**
 * Przetwarzanie obrazów:
 * - działa z dokumentem Mongoose (ma .toObject) i z obiektem z .lean()
 * - dodaje BASE_URL dla ścieżek względnych
 * - fallback do placeholdera, jeśli brak obrazów
 */
export const processAdImages = (ad) => {
  const src =
    ad && typeof ad.toObject === "function" ? ad.toObject() : { ...ad };
  const adObj = src || {};
  const defaultImage = "https://via.placeholder.com/800x600?text=No+Image";

  const array = Array.isArray(adObj.images) ? adObj.images : [];
  const valid = array.filter(Boolean);

  if (valid.length === 0) {
    adObj.images = [defaultImage];
    return adObj;
  }

  const base = process.env.BACKEND_URL || "http://localhost:5000";
  adObj.images = valid.map((url) =>
    String(url).startsWith("http")
      ? url
      : `${base}${url.startsWith("/") ? "" : "/"}${url}`
  );
  return adObj;
};

/* ------------------------ Named Exports (opcjonalnie) ------------------------ */
export { safeInt, safeFloat, toIn, toInNumber };
