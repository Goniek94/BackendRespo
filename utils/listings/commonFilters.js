/**
 * Wspólne funkcje filtrowania dla ogłoszeń
 * Używane przez różne endpointy, żeby zapewnić spójność
 */

// Centralna funkcja zwracająca filtr dla aktywnych ogłoszeń
// Zwraca wszystkie ogłoszenia (active + opublikowane + pending) dla lepszej widoczności w wyszukiwarce
export const getActiveStatusFilter = () => {
  return { $in: ['active', 'opublikowane', 'pending'] };
};

// Funkcja pomocnicza do tworzenia filtru ogłoszeń - kompletna obsługa wszystkich filtrów
export const createAdFilter = (query) => {
  const filter = {};
  
  // Debug: logowanie filtrów
  console.log('Tworzenie filtru z query:', query);
  
  // === PODSTAWOWE FILTRY TEKSTOWE ===
  
  // Marka (make -> brand mapping)
  if (query.make) {
    if (Array.isArray(query.make)) {
      filter.brand = { $in: query.make };
    } else {
      filter.brand = query.make;
    }
  }
  if (query.brand) {
    if (Array.isArray(query.brand)) {
      filter.brand = { $in: query.brand };
    } else {
      filter.brand = query.brand;
    }
  }
  
  // Model
  if (query.model) {
    if (Array.isArray(query.model)) {
      filter.model = { $in: query.model };
    } else {
      filter.model = query.model;
    }
  }
  
  // Generacja
  if (query.generation) {
    if (Array.isArray(query.generation)) {
      filter.generation = { $in: query.generation };
    } else {
      filter.generation = query.generation;
    }
  }
  
  // Typ nadwozia
  if (query.bodyType) {
    if (Array.isArray(query.bodyType)) {
      filter.bodyType = { $in: query.bodyType };
    } else {
      filter.bodyType = query.bodyType;
    }
  }
  
  // Rodzaj paliwa
  if (query.fuelType) {
    if (Array.isArray(query.fuelType)) {
      filter.fuelType = { $in: query.fuelType };
    } else {
      filter.fuelType = query.fuelType;
    }
  }
  
  // Skrzynia biegów
  if (query.transmission) {
    if (Array.isArray(query.transmission)) {
      filter.transmission = { $in: query.transmission };
    } else {
      filter.transmission = query.transmission;
    }
  }
  
  // Napęd
  if (query.driveType) {
    if (Array.isArray(query.driveType)) {
      filter.driveType = { $in: query.driveType };
    } else {
      filter.driveType = query.driveType;
    }
  }
  
  // === FILTRY ZAAWANSOWANE ===
  
  // Wykończenie lakieru
  if (query.finish) filter.paintFinish = query.finish;
  
  // Liczba drzwi
  if (query.doorCount) filter.doors = query.doorCount;
  
  // Liczba miejsc
  if (query.seats) filter.seats = query.seats;
  
  // Stan techniczny
  if (query.condition) filter.condition = query.condition;
  
  // Wypadkowość
  if (query.accidentStatus) filter.accidentStatus = query.accidentStatus;
  
  // Uszkodzenia
  if (query.damageStatus) filter.damageStatus = query.damageStatus;
  
  // Tuning
  if (query.tuning) filter.tuning = query.tuning;
  
  // Kraj pochodzenia
  if (query.countryOfOrigin) filter.countryOfOrigin = query.countryOfOrigin;
  
  // Typ sprzedawcy
  if (query.sellerType) filter.sellerType = query.sellerType;
  
  // Importowany
  if (query.imported) filter.imported = query.imported === 'tak' || query.imported === true;
  
  // Zarejestrowany w PL
  if (query.registeredInPL) filter.registeredInPL = query.registeredInPL === 'tak' || query.registeredInPL === true;
  
  // Pierwszy właściciel
  if (query.firstOwner) filter.firstOwner = query.firstOwner === 'tak' || query.firstOwner === true;
  
  // Przystosowany dla niepełnosprawnych
  if (query.disabledAdapted) filter.disabledAdapted = query.disabledAdapted === 'tak' || query.disabledAdapted === true;
  
  // === LOKALIZACJA ===
  
  // Województwo
  if (query.region) {
    if (Array.isArray(query.region)) {
      filter.voivodeship = { $in: query.region };
    } else {
      filter.voivodeship = query.region;
    }
  }
  
  // Miasto
  if (query.city) {
    if (Array.isArray(query.city)) {
      filter.city = { $in: query.city };
    } else {
      filter.city = query.city;
    }
  }
  
  // === ZACHOWANE DLA KOMPATYBILNOŚCI ===
  if (query.country) filter.country = query.country;
  if (query.vehicleCondition) filter.vehicleCondition = query.vehicleCondition;
  if (query.sellingForm) filter.sellingForm = query.sellingForm;
  
  // === FILTRY BOOLEAN ===
  if (query.vat !== undefined && query.vat !== '') {
    filter.vat = query.vat === 'true' || query.vat === true;
  }
  if (query.invoiceOptions !== undefined && query.invoiceOptions !== '') {
    filter.invoiceOptions = query.invoiceOptions === 'true' || query.invoiceOptions === true;
  }
  
  // === FILTRY ZAKRESOWE ===
  
  // Cena
  if (query.minPrice || query.maxPrice || query.priceFrom || query.priceTo) {
    filter.price = {};
    if (query.minPrice) filter.price.$gte = parseFloat(query.minPrice);
    if (query.maxPrice) filter.price.$lte = parseFloat(query.maxPrice);
    if (query.priceFrom) filter.price.$gte = parseFloat(query.priceFrom);
    if (query.priceTo) filter.price.$lte = parseFloat(query.priceTo);
  }
  
  // Rok produkcji
  if (query.minYear || query.maxYear || query.yearFrom || query.yearTo) {
    filter.year = {};
    if (query.minYear) filter.year.$gte = parseInt(query.minYear);
    if (query.maxYear) filter.year.$lte = parseInt(query.maxYear);
    if (query.yearFrom) filter.year.$gte = parseInt(query.yearFrom);
    if (query.yearTo) filter.year.$lte = parseInt(query.yearTo);
  }
  
  // Przebieg
  if (query.minMileage || query.maxMileage || query.mileageFrom || query.mileageTo) {
    filter.mileage = {};
    if (query.minMileage) filter.mileage.$gte = parseInt(query.minMileage);
    if (query.maxMileage) filter.mileage.$lte = parseInt(query.maxMileage);
    if (query.mileageFrom) filter.mileage.$gte = parseInt(query.mileageFrom);
    if (query.mileageTo) filter.mileage.$lte = parseInt(query.mileageTo);
  }
  
  // Moc silnika
  if (query.enginePowerFrom || query.enginePowerTo) {
    filter.power = {};
    if (query.enginePowerFrom) filter.power.$gte = parseInt(query.enginePowerFrom);
    if (query.enginePowerTo) filter.power.$lte = parseInt(query.enginePowerTo);
  }
  
  // Pojemność silnika
  if (query.engineCapacityFrom || query.engineCapacityTo) {
    filter.engineSize = {}; // Zmienione z engineCapacity na engineSize (zgodnie ze schematem)
    if (query.engineCapacityFrom) filter.engineSize.$gte = parseFloat(query.engineCapacityFrom);
    if (query.engineCapacityTo) filter.engineSize.$lte = parseFloat(query.engineCapacityTo);
  }
  
  // Waga pojazdu
  if (query.weightFrom || query.weightTo) {
    filter.weight = {};
    if (query.weightFrom) filter.weight.$gte = parseInt(query.weightFrom);
    if (query.weightTo) filter.weight.$lte = parseInt(query.weightTo);
  }
  
  // Status ogłoszenia - domyślnie aktywne i opublikowane
  if (query.status) {
    filter.status = query.status;
  } else {
    filter.status = getActiveStatusFilter();
  }
  
  // Typ ogłoszenia
  if (query.listingType) {
    filter.listingType = query.listingType;
  }
  
  // === DODATKOWE FILTRY (zachowane dla kompatybilności) ===
  if (query.power && !filter.power) filter.power = parseInt(query.power);
  if (query.drive) filter.drive = query.drive;
  
  return filter;
};

// Funkcja do pobierania wszystkich aktywnych ogłoszeń
export const getActiveAdsPool = async (Ad) => {
  // Używamy spójnej logiki filtrowania aktywnych ogłoszeń
  const filter = createAdFilter({});
  // NIE usuwamy filtra statusu - chcemy tylko aktywne ogłoszenia
  
  console.log('Filtr dla puli aktywnych ogłoszeń:', filter);
  
  const ads = await Ad.find(filter);
  
  console.log('Liczba ogłoszeń w puli aktywnych:', ads.length);
  console.log('Statusy ogłoszeń w puli:', ads.map(ad => ad.status));
  
  return ads;
};

// Funkcja do pobierania liczby aktywnych ogłoszeń
export const getActiveAdsCount = async (Ad, additionalFilters = {}) => {
  const filter = {
    ...additionalFilters,
    status: getActiveStatusFilter()
  };
  
  const count = await Ad.countDocuments(filter);
  console.log('Liczba aktywnych ogłoszeń:', count);
  
  return count;
};

// Funkcja pomocnicza do przetwarzania obrazów
export const processAdImages = (ad) => {
  const adObj = ad.toObject();
  const defaultImage = "https://via.placeholder.com/800x600?text=No+Image";
  
  if (!adObj.images || adObj.images.length === 0) {
    adObj.images = [defaultImage];
    return adObj;
  }
  
  const validImages = adObj.images.filter(imageUrl => imageUrl);
  
  if (validImages.length > 0) {
    adObj.images = validImages.map(imageUrl => {
      if (imageUrl.startsWith('http')) return imageUrl;
      return `${process.env.BACKEND_URL || 'http://localhost:5000'}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
    });
  } else {
    adObj.images = [defaultImage];
  }
  return adObj;
};
