/**
 * Ad Routes Helper Functions
 * Funkcje pomocnicze dla route'ów ogłoszeń
 */

import Ad from '../../../models/listings/ad.js';

/**
 * Creates filter object for ad queries based on request parameters
 * @param {Object} query - Request query parameters
 * @returns {Object} MongoDB filter object
 */
export const createAdFilter = (query) => {
  const filter = {};
  
  // Basic text filters
  if (query.brand) filter.brand = query.brand;
  if (query.model) filter.model = query.model;
  if (query.generation) filter.generation = query.generation;
  if (query.version) filter.version = query.version;
  
  // Technical data
  if (query.fuelType) filter.fuelType = query.fuelType;
  if (query.transmission) filter.transmission = query.transmission;
  if (query.driveType) filter.drive = query.driveType;
  if (query.bodyType) filter.bodyType = query.bodyType;
  if (query.color) filter.color = query.color;
  if (query.finish) filter.paintFinish = query.finish;
  
  // Vehicle condition
  if (query.condition) filter.condition = query.condition;
  if (query.accidentStatus) filter.accidentStatus = query.accidentStatus;
  if (query.damageStatus) filter.damageStatus = query.damageStatus;
  if (query.tuning) filter.tuning = query.tuning;
  
  // Origin and seller
  if (query.countryOfOrigin) filter.countryOfOrigin = query.countryOfOrigin;
  if (query.sellerType) filter.sellerType = query.sellerType;
  
  // Vehicle status (boolean)
  if (query.imported === 'true' || query.imported === true) filter.imported = true;
  if (query.imported === 'false' || query.imported === false) filter.imported = false;
  if (query.registeredInPL === 'true' || query.registeredInPL === true) filter.registeredInPL = true;
  if (query.registeredInPL === 'false' || query.registeredInPL === false) filter.registeredInPL = false;
  if (query.firstOwner === 'true' || query.firstOwner === true) filter.firstOwner = true;
  if (query.firstOwner === 'false' || query.firstOwner === false) filter.firstOwner = false;
  if (query.disabledAdapted === 'true' || query.disabledAdapted === true) filter.disabledAdapted = true;
  if (query.disabledAdapted === 'false' || query.disabledAdapted === false) filter.disabledAdapted = false;
  
  // Door and seat count
  if (query.doorCount) filter.doors = parseInt(query.doorCount);
  if (query.seats) filter.seats = parseInt(query.seats);
  
  // Location
  if (query.voivodeship) filter.voivodeship = query.voivodeship;
  if (query.city) filter.city = query.city;
  
  // Range filters
  // Price
  if (query.minPrice || query.maxPrice || query.priceFrom || query.priceTo) {
    filter.price = {};
    if (query.minPrice) filter.price.$gte = parseFloat(query.minPrice);
    if (query.maxPrice) filter.price.$lte = parseFloat(query.maxPrice);
    if (query.priceFrom) filter.price.$gte = parseFloat(query.priceFrom);
    if (query.priceTo) filter.price.$lte = parseFloat(query.priceTo);
  }
  
  // Production year
  if (query.minYear || query.maxYear || query.yearFrom || query.yearTo) {
    filter.year = {};
    if (query.minYear) filter.year.$gte = parseInt(query.minYear);
    if (query.maxYear) filter.year.$lte = parseInt(query.maxYear);
    if (query.yearFrom) filter.year.$gte = parseInt(query.yearFrom);
    if (query.yearTo) filter.year.$lte = parseInt(query.yearTo);
  }
  
  // Mileage
  if (query.minMileage || query.maxMileage || query.mileageFrom || query.mileageTo) {
    filter.mileage = {};
    if (query.minMileage) filter.mileage.$gte = parseInt(query.minMileage);
    if (query.maxMileage) filter.mileage.$lte = parseInt(query.maxMileage);
    if (query.mileageFrom) filter.mileage.$gte = parseInt(query.mileageFrom);
    if (query.mileageTo) filter.mileage.$lte = parseInt(query.mileageTo);
  }
  
  // Engine power
  if (query.enginePowerFrom || query.enginePowerTo) {
    filter.power = {};
    if (query.enginePowerFrom) filter.power.$gte = parseInt(query.enginePowerFrom);
    if (query.enginePowerTo) filter.power.$lte = parseInt(query.enginePowerTo);
  }
  
  // Engine capacity
  if (query.engineCapacityFrom || query.engineCapacityTo) {
    filter.engineSize = {};
    if (query.engineCapacityFrom) filter.engineSize.$gte = parseInt(query.engineCapacityFrom);
    if (query.engineCapacityTo) filter.engineSize.$lte = parseInt(query.engineCapacityTo);
  }
  
  // Vehicle weight
  if (query.weightFrom || query.weightTo) {
    filter.weight = {};
    if (query.weightFrom) filter.weight.$gte = parseInt(query.weightFrom);
    if (query.weightTo) filter.weight.$lte = parseInt(query.weightTo);
  }
  
  // Ad status - default to active ads only
  if (query.status) {
    filter.status = query.status;
  } else {
    // Import and use the centralized active status filter
    filter.status = { $in: ['active', 'opublikowane', 'pending'] };
  }
  
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
  
  return filter;
};

/**
 * Maps form data from frontend to backend format
 * @param {Object} data - Form data from frontend
 * @returns {Object} Mapped data for backend
 */
export const mapFormDataToBackend = (data) => {
  const fuelTypeMapping = {
    'Benzyna': 'benzyna',
    'Diesel': 'diesel', 
    'Elektryczny': 'elektryczny',
    'Hybryda': 'hybryda',
    'Hybrydowy': 'hybrydowy',
    'Benzyna+LPG': 'benzyna+LPG',
    'Benzyna+CNG': 'benzyna+LPG',
    'Etanol': 'inne'
  };

  const transmissionMapping = {
    'Manualna': 'manualna',
    'Automatyczna': 'automatyczna',
    'Półautomatyczna': 'półautomatyczna',
    'Bezstopniowa CVT': 'automatyczna'
  };

  const purchaseOptionsMapping = {
    'sprzedaz': 'Sprzedaż',
    'faktura': 'Faktura VAT', 
    'inne': 'Inne',
    'najem': 'Inne',
    'leasing': 'Inne'
  };

  return {
    ...data,
    // Map production year
    year: parseInt(data.productionYear || data.year || '2010'),
    // Map fuel type
    fuelType: fuelTypeMapping[data.fuelType] || data.fuelType?.toLowerCase() || 'benzyna',
    // Map transmission
    transmission: transmissionMapping[data.transmission] || data.transmission?.toLowerCase() || 'manualna',
    // Map purchase options
    purchaseOptions: purchaseOptionsMapping[data.purchaseOption] || data.purchaseOptions || 'Sprzedaż',
    // Map country of origin
    countryOfOrigin: data.countryOfOrigin || data.country || ''
  };
};

/**
 * Processes ad images to ensure proper URLs
 * @param {Object} ad - Ad document
 * @returns {Object} Ad object with processed images
 */
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

/**
 * Random selection of ads from array
 * @param {Array} ads - Array of ads
 * @param {number} count - Number of ads to select
 * @returns {Array} Randomly selected ads
 */
export const getRandomAds = (ads, count) => {
  if (!ads || ads.length === 0) return [];
  if (ads.length <= count) return ads;
  
  const shuffled = [...ads];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled.slice(0, count);
};

/**
 * Calculates match score for search relevance
 * @param {Object} ad - Ad document
 * @param {Object} filters - Search filters
 * @returns {number} Match score
 */
export const calculateMatchScore = (ad, filters) => {
  let score = 0;

  // Helper function for string comparison without case sensitivity and whitespace
  const normalize = (str) =>
    typeof str === 'string' ? str.trim().toLowerCase() : '';

  // Exact brand + model (highest priority)
  if (
    filters.brand &&
    filters.model &&
    normalize(ad.brand) === normalize(filters.brand) &&
    normalize(ad.model) === normalize(filters.model)
  ) {
    score += 100;
  } else if (
    filters.brand &&
    normalize(ad.brand) === normalize(filters.brand)
  ) {
    // Exact brand
    score += 50;
  }

  // Generation and version
  if (
    filters.generation &&
    normalize(ad.generation) === normalize(filters.generation)
  ) {
    score += 15;
  }
  if (
    filters.version &&
    normalize(ad.version) === normalize(filters.version)
  ) {
    score += 10;
  }

  // Price range
  if (
    filters.minPrice &&
    filters.maxPrice &&
    ad.price >= parseFloat(filters.minPrice) &&
    ad.price <= parseFloat(filters.maxPrice)
  ) {
    score += 30;
  } else if (filters.minPrice && ad.price >= parseFloat(filters.minPrice)) {
    score += 15;
  } else if (filters.maxPrice && ad.price <= parseFloat(filters.maxPrice)) {
    score += 15;
  }

  // Year range
  if (
    filters.minYear &&
    filters.maxYear &&
    ad.year >= parseInt(filters.minYear) &&
    ad.year <= parseInt(filters.maxYear)
  ) {
    score += 20;
  } else if (filters.minYear && ad.year >= parseInt(filters.minYear)) {
    score += 10;
  } else if (filters.maxYear && ad.year <= parseInt(filters.maxYear)) {
    score += 10;
  }

  // Mileage range
  if (
    filters.mileageFrom &&
    filters.mileageTo &&
    ad.mileage >= parseInt(filters.mileageFrom) &&
    ad.mileage <= parseInt(filters.mileageTo)
  ) {
    score += 15;
  } else if (filters.mileageFrom && ad.mileage >= parseInt(filters.mileageFrom)) {
    score += 8;
  } else if (filters.mileageTo && ad.mileage <= parseInt(filters.mileageTo)) {
    score += 8;
  }

  // Technical data
  if (
    filters.fuelType &&
    normalize(ad.fuelType) === normalize(filters.fuelType)
  ) {
    score += 10;
  }
  if (
    filters.transmission &&
    normalize(ad.transmission) === normalize(filters.transmission)
  ) {
    score += 8;
  }
  if (
    filters.driveType &&
    normalize(ad.drive) === normalize(filters.driveType)
  ) {
    score += 6;
  }

  // Body and appearance
  if (
    filters.bodyType &&
    normalize(ad.bodyType) === normalize(filters.bodyType)
  ) {
    score += 8;
  }
  if (
    filters.color &&
    normalize(ad.color) === normalize(filters.color)
  ) {
    score += 5;
  }
  if (
    filters.finish &&
    normalize(ad.paintFinish) === normalize(filters.finish)
  ) {
    score += 3;
  }

  // Door and seat count
  if (filters.doorCount && ad.doors && ad.doors === parseInt(filters.doorCount)) {
    score += 4;
  }
  if (filters.seats && ad.seats && ad.seats === parseInt(filters.seats)) {
    score += 4;
  }

  // Vehicle condition
  if (
    filters.condition &&
    normalize(ad.condition) === normalize(filters.condition)
  ) {
    score += 7;
  }
  if (
    filters.accidentStatus &&
    normalize(ad.accidentStatus) === normalize(filters.accidentStatus)
  ) {
    score += 6;
  }
  if (
    filters.damageStatus &&
    normalize(ad.damageStatus) === normalize(filters.damageStatus)
  ) {
    score += 6;
  }
  if (
    filters.tuning &&
    normalize(ad.tuning) === normalize(filters.tuning)
  ) {
    score += 3;
  }

  // Origin and seller
  if (
    filters.countryOfOrigin &&
    normalize(ad.countryOfOrigin) === normalize(filters.countryOfOrigin)
  ) {
    score += 5;
  }
  if (
    filters.sellerType &&
    normalize(ad.sellerType) === normalize(filters.sellerType)
  ) {
    score += 4;
  }

  // Vehicle status (boolean)
  if (filters.imported !== undefined && ad.imported === (filters.imported === 'true' || filters.imported === true)) {
    score += 3;
  }
  if (filters.registeredInPL !== undefined && ad.registeredInPL === (filters.registeredInPL === 'true' || filters.registeredInPL === true)) {
    score += 4;
  }
  if (filters.firstOwner !== undefined && ad.firstOwner === (filters.firstOwner === 'true' || filters.firstOwner === true)) {
    score += 5;
  }
  if (filters.disabledAdapted !== undefined && ad.disabledAdapted === (filters.disabledAdapted === 'true' || filters.disabledAdapted === true)) {
    score += 2;
  }

  // Location
  if (
    filters.voivodeship &&
    normalize(ad.voivodeship) === normalize(filters.voivodeship)
  ) {
    score += 6;
  }
  if (
    filters.city &&
    normalize(ad.city) === normalize(filters.city)
  ) {
    score += 8;
  }

  // Engine power ranges
  if (
    filters.enginePowerFrom &&
    filters.enginePowerTo &&
    ad.power >= parseInt(filters.enginePowerFrom) &&
    ad.power <= parseInt(filters.enginePowerTo)
  ) {
    score += 10;
  } else if (filters.enginePowerFrom && ad.power >= parseInt(filters.enginePowerFrom)) {
    score += 5;
  } else if (filters.enginePowerTo && ad.power <= parseInt(filters.enginePowerTo)) {
    score += 5;
  }

  // Engine capacity ranges
  if (
    filters.engineCapacityFrom &&
    filters.engineCapacityTo &&
    ad.engineSize >= parseInt(filters.engineCapacityFrom) &&
    ad.engineSize <= parseInt(filters.engineCapacityTo)
  ) {
    score += 8;
  } else if (filters.engineCapacityFrom && ad.engineSize >= parseInt(filters.engineCapacityFrom)) {
    score += 4;
  } else if (filters.engineCapacityTo && ad.engineSize <= parseInt(filters.engineCapacityTo)) {
    score += 4;
  }

  // Vehicle weight ranges
  if (
    filters.weightFrom &&
    filters.weightTo &&
    ad.weight >= parseInt(filters.weightFrom) &&
    ad.weight <= parseInt(filters.weightTo)
  ) {
    score += 6;
  } else if (filters.weightFrom && ad.weight >= parseInt(filters.weightFrom)) {
    score += 3;
  } else if (filters.weightTo && ad.weight <= parseInt(filters.weightTo)) {
    score += 3;
  }

  // Similar ads (same brand, different model)
  if (
    filters.brand &&
    normalize(ad.brand) === normalize(filters.brand) &&
    filters.model &&
    normalize(ad.model) !== normalize(filters.model)
  ) {
    score += 1;
  }

  return score;
};
