import express from 'express';
import { Router } from 'express';
import Ad from '../../models/listings/ad.js';
import errorHandler from '../../middleware/errors/errorHandler.js';

const router = Router();

// Funkcja pomocnicza do tworzenia filtru ogłoszeń - identyczna jak w adRoutes.js
const createAdFilter = (query) => {
  const filter = {};
  
  // Podstawowe filtry tekstowe
  if (query.brand) filter.brand = query.brand;
  if (query.model) filter.model = query.model;
  if (query.generation) filter.generation = query.generation;
  if (query.version) filter.version = query.version;
  
  // Dane techniczne
  if (query.fuelType) filter.fuelType = query.fuelType;
  if (query.transmission) filter.transmission = query.transmission;
  if (query.driveType) filter.drive = query.driveType;
  if (query.bodyType) filter.bodyType = query.bodyType;
  if (query.color) filter.color = query.color;
  if (query.finish) filter.paintFinish = query.finish;
  
  // Stan pojazdu
  if (query.condition) filter.condition = query.condition;
  if (query.accidentStatus) filter.accidentStatus = query.accidentStatus;
  if (query.damageStatus) filter.damageStatus = query.damageStatus;
  if (query.tuning) filter.tuning = query.tuning;
  
  // Pochodzenie i sprzedawca
  if (query.countryOfOrigin) filter.countryOfOrigin = query.countryOfOrigin;
  if (query.sellerType) filter.sellerType = query.sellerType;
  
  // Statusy pojazdu (boolean)
  if (query.imported === 'true' || query.imported === true) filter.imported = true;
  if (query.imported === 'false' || query.imported === false) filter.imported = false;
  if (query.registeredInPL === 'true' || query.registeredInPL === true) filter.registeredInPL = true;
  if (query.registeredInPL === 'false' || query.registeredInPL === false) filter.registeredInPL = false;
  if (query.firstOwner === 'true' || query.firstOwner === true) filter.firstOwner = true;
  if (query.firstOwner === 'false' || query.firstOwner === false) filter.firstOwner = false;
  if (query.disabledAdapted === 'true' || query.disabledAdapted === true) filter.disabledAdapted = true;
  if (query.disabledAdapted === 'false' || query.disabledAdapted === false) filter.disabledAdapted = false;
  
  // Liczba drzwi i miejsc
  if (query.doorCount) filter.doors = parseInt(query.doorCount);
  if (query.seats) filter.seats = parseInt(query.seats);
  
  // Lokalizacja
  if (query.voivodeship) filter.voivodeship = query.voivodeship;
  if (query.city) filter.city = query.city;
  
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
    filter.engineSize = {};
    if (query.engineCapacityFrom) filter.engineSize.$gte = parseInt(query.engineCapacityFrom);
    if (query.engineCapacityTo) filter.engineSize.$lte = parseInt(query.engineCapacityTo);
  }
  
  // Waga pojazdu
  if (query.weightFrom || query.weightTo) {
    filter.weight = {};
    if (query.weightFrom) filter.weight.$gte = parseInt(query.weightFrom);
    if (query.weightTo) filter.weight.$lte = parseInt(query.weightTo);
  }
  
  // Status ogłoszenia - domyślnie tylko aktywne
  if (query.status) {
    filter.status = query.status;
  } else {
    filter.status = 'active';
  }
  
  // Typ ogłoszenia
  if (query.listingType) {
    filter.listingType = query.listingType;
  }
  
  return filter;
};

/**
 * Endpoint zwracający statystyki wyszukiwania z licznikami marek i modeli
 * GET /api/ads/search-stats?brand=BMW&model=X5&priceFrom=50000&priceTo=100000
 * 
 * Zwraca:
 * {
 *   "totalCount": 150,
 *   "brandCounts": { "BMW": 30, "Audi": 25, "Mercedes": 20 },
 *   "modelCounts": { 
 *     "BMW": { "X5": 8, "320d": 12, "X3": 10 },
 *     "Audi": { "A4": 15, "Q5": 10 }
 *   }
 * }
 */
router.get('/', async (req, res, next) => {
  try {
    console.log('--- [DEBUG] /search-stats ---');
    console.log('Parametry zapytania:', req.query);

    // Jeśli nie ma filtrów, zwróć podstawowe statystyki z agregacji
    if (Object.keys(req.query).length === 0) {
      console.log('Brak filtrów - zwracam podstawowe statystyki');
      
      // Użyj agregacji MongoDB dla wydajności
      const brandStats = await Ad.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$brand', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      const modelStats = await Ad.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: { brand: '$brand', model: '$model' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      const brandCounts = {};
      const modelCounts = {};
      let totalCount = 0;

      brandStats.forEach(item => {
        if (item._id) {
          brandCounts[item._id] = item.count;
          totalCount += item.count;
        }
      });

      modelStats.forEach(item => {
        if (item._id && item._id.brand && item._id.model) {
          if (!modelCounts[item._id.brand]) {
            modelCounts[item._id.brand] = {};
          }
          modelCounts[item._id.brand][item._id.model] = item.count;
        }
      });

      return res.status(200).json({
        totalCount,
        brandCounts,
        modelCounts
      });
    }

    // Dla filtrów - użyj prostszego podejścia z createAdFilter
    const filter = createAdFilter(req.query);
    console.log('Utworzony filtr:', JSON.stringify(filter, null, 2));

    // Pobierz tylko potrzebne pola dla wydajności
    const matchingAds = await Ad.find(filter)
      .select('brand model')
      .lean();
    
    console.log(`Znaleziono ${matchingAds.length} pasujących ogłoszeń`);

    // Oblicz liczniki marek i modeli dla pasujących ogłoszeń
    const brandCounts = {};
    const modelCounts = {};

    matchingAds.forEach(ad => {
      if (ad.brand) {
        brandCounts[ad.brand] = (brandCounts[ad.brand] || 0) + 1;
        
        if (ad.model) {
          if (!modelCounts[ad.brand]) {
            modelCounts[ad.brand] = {};
          }
          modelCounts[ad.brand][ad.model] = (modelCounts[ad.brand][ad.model] || 0) + 1;
        }
      }
    });

    console.log('Liczniki marek:', brandCounts);
    console.log('Liczniki modeli:', modelCounts);

    res.status(200).json({
      totalCount: matchingAds.length,
      brandCounts,
      modelCounts
    });

  } catch (err) {
    console.error('Błąd podczas pobierania statystyk wyszukiwania:', err);
    next(err);
  }
}, errorHandler);

export default router;
