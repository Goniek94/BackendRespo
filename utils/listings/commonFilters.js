/**
 * Wspólne funkcje filtrowania dla ogłoszeń
 * Używane przez różne endpointy, żeby zapewnić spójność
 */

// Centralna funkcja zwracająca filtr dla aktywnych ogłoszeń
// Zwraca wszystkie ogłoszenia (active + pending) dla lepszej widoczności w wyszukiwarce
export const getActiveStatusFilter = () => {
  return { $in: ['active', 'pending'] };
};

// Funkcja pomocnicza do tworzenia filtru ogłoszeń - rozszerzona o wszystkie filtry
export const createAdFilter = (query) => {
  const filter = {};
  
  // Podstawowe filtry tekstowe
  if (query.make) filter.brand = query.make; // make -> brand mapping
  if (query.brand) filter.brand = query.brand;
  
  // Debug: logowanie filtrów
  console.log('Tworzenie filtru z query:', query);
  if (query.model) filter.model = query.model;
  if (query.bodyType) filter.bodyType = query.bodyType;
  if (query.fuelType) filter.fuelType = query.fuelType;
  if (query.transmission) filter.transmission = query.transmission;
  if (query.driveType) filter.driveType = query.driveType;
  if (query.color) filter.color = query.color;
  if (query.doorCount) filter.doorCount = query.doorCount;
  if (query.country) filter.country = query.country;
  if (query.region) filter.region = query.region;
  if (query.city) filter.city = query.city;
  if (query.damageStatus) filter.damageStatus = query.damageStatus;
  if (query.vehicleCondition) filter.vehicleCondition = query.vehicleCondition;
  if (query.sellingForm) filter.sellingForm = query.sellingForm;
  if (query.sellerType) filter.sellerType = query.sellerType;
  if (query.tuning) filter.tuning = query.tuning;
  
  // Filtry boolean
  if (query.vat !== undefined && query.vat !== '') {
    filter.vat = query.vat === 'true' || query.vat === true;
  }
  if (query.invoiceOptions !== undefined && query.invoiceOptions !== '') {
    filter.invoiceOptions = query.invoiceOptions === 'true' || query.invoiceOptions === true;
  }
  
  // Filtry zakresowe
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
    filter.engineCapacity = {};
    if (query.engineCapacityFrom) filter.engineCapacity.$gte = parseFloat(query.engineCapacityFrom);
    if (query.engineCapacityTo) filter.engineCapacity.$lte = parseFloat(query.engineCapacityTo);
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
  
  // Dodatkowe filtry (zachowane dla kompatybilności)
  if (query.generation) filter.generation = query.generation;
  if (query.condition) filter.condition = query.condition;
  if (query.power) filter.power = parseInt(query.power);
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
