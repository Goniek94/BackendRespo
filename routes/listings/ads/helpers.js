/**
 * Ad Routes Helper Functions
 */

import Ad from "../../../models/listings/ad.js";

const isStr = (v) => typeof v === "string";
const asStr = (v) => (isStr(v) ? v.trim() : undefined);
const asBool = (v) =>
  v === true || v === "true"
    ? true
    : v === false || v === "false"
    ? false
    : undefined;
const asInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
};
const asNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * Creates filter object for ad queries based on request parameters
 * SAFE: rzutowania typów, brak kopiowania obiektów/array z req.query
 */
export const createAdFilter = (query = {}) => {
  const filter = {};

  // Basic text filters
  const brand = asStr(query.brand);
  if (brand) filter.brand = brand;
  const model = asStr(query.model);
  if (model) filter.model = model;
  const generation = asStr(query.generation);
  if (generation) filter.generation = generation;
  const version = asStr(query.version);
  if (version) filter.version = version;

  // Technical data
  const fuelType = asStr(query.fuelType);
  if (fuelType) filter.fuelType = fuelType;
  const transmission = asStr(query.transmission);
  if (transmission) filter.transmission = transmission;
  const driveType = asStr(query.driveType);
  if (driveType) filter.drive = driveType;
  const bodyType = asStr(query.bodyType);
  if (bodyType) filter.bodyType = bodyType;
  const color = asStr(query.color);
  if (color) filter.color = color;
  const finish = asStr(query.finish);
  if (finish) filter.paintFinish = finish;

  // Vehicle condition
  const condition = asStr(query.condition);
  if (condition) filter.condition = condition;
  const accidentStatus = asStr(query.accidentStatus);
  if (accidentStatus) filter.accidentStatus = accidentStatus;
  const damageStatus = asStr(query.damageStatus);
  if (damageStatus) filter.damageStatus = damageStatus;
  const tuning = asStr(query.tuning);
  if (tuning) filter.tuning = tuning;

  // Origin and seller
  const countryOfOrigin = asStr(query.countryOfOrigin);
  if (countryOfOrigin) filter.countryOfOrigin = countryOfOrigin;
  const sellerType = asStr(query.sellerType);
  if (sellerType) filter.sellerType = sellerType;

  // Vehicle status (boolean)
  const imported = asBool(query.imported);
  if (typeof imported === "boolean") filter.imported = imported;
  const registeredInPL = asBool(query.registeredInPL);
  if (typeof registeredInPL === "boolean")
    filter.registeredInPL = registeredInPL;
  const firstOwner = asBool(query.firstOwner);
  if (typeof firstOwner === "boolean") filter.firstOwner = firstOwner;
  const disabledAdapted = asBool(query.disabledAdapted);
  if (typeof disabledAdapted === "boolean")
    filter.disabledAdapted = disabledAdapted;

  // Door and seat count
  const doorCount = asInt(query.doorCount);
  if (doorCount !== undefined) filter.doors = doorCount;
  const seats = asInt(query.seats);
  if (seats !== undefined) filter.seats = seats;

  // Location
  const voivodeship = asStr(query.voivodeship);
  if (voivodeship) filter.voivodeship = voivodeship;
  const city = asStr(query.city);
  if (city) filter.city = city;

  // Range filters
  // Price
  if (query.minPrice || query.maxPrice || query.priceFrom || query.priceTo) {
    const price = {};
    const min = asNum(query.minPrice ?? query.priceFrom);
    const max = asNum(query.maxPrice ?? query.priceTo);
    if (min !== undefined) price.$gte = min;
    if (max !== undefined) price.$lte = max;
    if (Object.keys(price).length) filter.price = price;
  }

  // Production year
  if (query.minYear || query.maxYear || query.yearFrom || query.yearTo) {
    const year = {};
    const minY = asInt(query.minYear ?? query.yearFrom);
    const maxY = asInt(query.maxYear ?? query.yearTo);
    if (minY !== undefined) year.$gte = minY;
    if (maxY !== undefined) year.$lte = maxY;
    if (Object.keys(year).length) filter.year = year;
  }

  // Mileage
  if (
    query.minMileage ||
    query.maxMileage ||
    query.mileageFrom ||
    query.mileageTo
  ) {
    const mileage = {};
    const minM = asInt(query.minMileage ?? query.mileageFrom);
    const maxM = asInt(query.maxMileage ?? query.mileageTo);
    if (minM !== undefined) mileage.$gte = minM;
    if (maxM !== undefined) mileage.$lte = maxM;
    if (Object.keys(mileage).length) filter.mileage = mileage;
  }

  // Engine power
  if (query.enginePowerFrom || query.enginePowerTo) {
    const power = {};
    const pFrom = asInt(query.enginePowerFrom);
    const pTo = asInt(query.enginePowerTo);
    if (pFrom !== undefined) power.$gte = pFrom;
    if (pTo !== undefined) power.$lte = pTo;
    if (Object.keys(power).length) filter.power = power;
  }

  // Engine capacity
  if (query.engineCapacityFrom || query.engineCapacityTo) {
    const engineSize = {};
    const eFrom = asInt(query.engineCapacityFrom);
    const eTo = asInt(query.engineCapacityTo);
    if (eFrom !== undefined) engineSize.$gte = eFrom;
    if (eTo !== undefined) engineSize.$lte = eTo;
    if (Object.keys(engineSize).length) filter.engineSize = engineSize;
  }

  // Vehicle weight
  if (query.weightFrom || query.weightTo) {
    const weight = {};
    const wFrom = asInt(query.weightFrom);
    const wTo = asInt(query.weightTo);
    if (wFrom !== undefined) weight.$gte = wFrom;
    if (wTo !== undefined) weight.$lte = wTo;
    if (Object.keys(weight).length) filter.weight = weight;
  }

  // Ad status - default to active ads only
  const status = asStr(query.status);
  if (status) {
    filter.status = status;
  } else {
    filter.status = { $in: ["active", "opublikowane", "pending"] };
  }

  // Listing type and featured filtering
  const listingType = asStr(query.listingType);
  if (listingType) {
    if (listingType === "wyróżnione" || listingType === "featured") {
      filter.listingType = "wyróżnione";
    } else if (listingType === "wszystkie" || listingType === "all") {
      // brak filtra
    } else {
      filter.listingType = listingType;
    }
  }

  // Handle "tylko wyróżnione"
  const featured = asBool(query.featured) || asBool(query.onlyFeatured);
  if (featured) {
    filter.listingType = "wyróżnione";
  }

  return filter;
};

/**
 * Maps form data from frontend to backend format
 */
export const mapFormDataToBackend = (data) => {
  const fuelTypeMapping = {
    Benzyna: "benzyna",
    Diesel: "diesel",
    Elektryczny: "elektryczny",
    Hybryda: "hybryda",
    Hybrydowy: "hybrydowy",
    "Benzyna+LPG": "benzyna+LPG",
    "Benzyna+CNG": "benzyna+LPG",
    Etanol: "inne",
  };

  const transmissionMapping = {
    Manualna: "manualna",
    Automatyczna: "automatyczna",
    Półautomatyczna: "półautomatyczna",
    "Bezstopniowa CVT": "automatyczna",
  };

  const purchaseOptionsMapping = {
    sprzedaz: "Sprzedaż",
    faktura: "Faktura VAT",
    inne: "Inne",
    najem: "Inne",
    leasing: "Inne",
  };

  return {
    ...data,
    year: parseInt(data.productionYear || data.year || "2010", 10),
    fuelType:
      fuelTypeMapping[data.fuelType] ||
      data.fuelType?.toLowerCase() ||
      "benzyna",
    transmission:
      transmissionMapping[data.transmission] ||
      data.transmission?.toLowerCase() ||
      "manualna",
    purchaseOptions:
      purchaseOptionsMapping[data.purchaseOption] ||
      data.purchaseOptions ||
      "Sprzedaż",
    countryOfOrigin: data.countryOfOrigin || data.country || "",
  };
};

export const processAdImages = (ad) => {
  const adObj = ad.toObject();
  const defaultImage = "https://via.placeholder.com/800x600?text=No+Image";

  if (!adObj.images || adObj.images.length === 0) {
    adObj.images = [defaultImage];
    return adObj;
  }

  const validImages = adObj.images.filter((imageUrl) => imageUrl);

  if (validImages.length > 0) {
    adObj.images = validImages.map((imageUrl) => {
      if (imageUrl.startsWith("http")) return imageUrl;
      return `${process.env.BACKEND_URL || "http://localhost:5000"}${
        imageUrl.startsWith("/") ? "" : "/"
      }${imageUrl}`;
    });
  } else {
    adObj.images = [defaultImage];
  }
  return adObj;
};

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

export const calculateMatchScore = (ad, filters) => {
  let score = 0;
  const normalize = (str) =>
    typeof str === "string" ? str.trim().toLowerCase() : "";

  // brand + model
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
    score += 50;
  }

  // generation, version
  if (
    filters.generation &&
    normalize(ad.generation) === normalize(filters.generation)
  )
    score += 15;
  if (filters.version && normalize(ad.version) === normalize(filters.version))
    score += 10;

  // price
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

  // year
  if (
    filters.minYear &&
    filters.maxYear &&
    ad.year >= parseInt(filters.minYear, 10) &&
    ad.year <= parseInt(filters.maxYear, 10)
  ) {
    score += 20;
  } else if (filters.minYear && ad.year >= parseInt(filters.minYear, 10)) {
    score += 10;
  } else if (filters.maxYear && ad.year <= parseInt(filters.maxYear, 10)) {
    score += 10;
  }

  // mileage
  if (
    filters.mileageFrom &&
    filters.mileageTo &&
    ad.mileage >= parseInt(filters.mileageFrom, 10) &&
    ad.mileage <= parseInt(filters.mileageTo, 10)
  ) {
    score += 15;
  } else if (
    filters.mileageFrom &&
    ad.mileage >= parseInt(filters.mileageFrom, 10)
  ) {
    score += 8;
  } else if (
    filters.mileageTo &&
    ad.mileage <= parseInt(filters.mileageTo, 10)
  ) {
    score += 8;
  }

  // tech
  if (
    filters.fuelType &&
    normalize(ad.fuelType) === normalize(filters.fuelType)
  )
    score += 10;
  if (
    filters.transmission &&
    normalize(ad.transmission) === normalize(filters.transmission)
  )
    score += 8;
  if (filters.driveType && normalize(ad.drive) === normalize(filters.driveType))
    score += 6;

  // body/appearance
  if (
    filters.bodyType &&
    normalize(ad.bodyType) === normalize(filters.bodyType)
  )
    score += 8;
  if (filters.color && normalize(ad.color) === normalize(filters.color))
    score += 5;
  if (filters.finish && normalize(ad.paintFinish) === normalize(filters.finish))
    score += 3;

  // doors/seats
  if (filters.doorCount && ad.doors === parseInt(filters.doorCount, 10))
    score += 4;
  if (filters.seats && ad.seats === parseInt(filters.seats, 10)) score += 4;

  // condition
  if (
    filters.condition &&
    normalize(ad.condition) === normalize(filters.condition)
  )
    score += 7;
  if (
    filters.accidentStatus &&
    normalize(ad.accidentStatus) === normalize(filters.accidentStatus)
  )
    score += 6;
  if (
    filters.damageStatus &&
    normalize(ad.damageStatus) === normalize(filters.damageStatus)
  )
    score += 6;
  if (filters.tuning && normalize(ad.tuning) === normalize(filters.tuning))
    score += 3;

  // origin/seller
  if (
    filters.countryOfOrigin &&
    normalize(ad.countryOfOrigin) === normalize(filters.countryOfOrigin)
  )
    score += 5;
  if (
    filters.sellerType &&
    normalize(ad.sellerType) === normalize(filters.sellerType)
  )
    score += 4;

  // booleans
  if (
    filters.imported !== undefined &&
    ad.imported === (filters.imported === "true" || filters.imported === true)
  )
    score += 3;
  if (
    filters.registeredInPL !== undefined &&
    ad.registeredInPL ===
      (filters.registeredInPL === "true" || filters.registeredInPL === true)
  )
    score += 4;
  if (
    filters.firstOwner !== undefined &&
    ad.firstOwner ===
      (filters.firstOwner === "true" || filters.firstOwner === true)
  )
    score += 5;
  if (
    filters.disabledAdapted !== undefined &&
    ad.disabledAdapted ===
      (filters.disabledAdapted === "true" || filters.disabledAdapted === true)
  )
    score += 2;

  // location
  if (
    filters.voivodeship &&
    normalize(ad.voivodeship) === normalize(filters.voivodeship)
  )
    score += 6;
  if (filters.city && normalize(ad.city) === normalize(filters.city))
    score += 8;

  // power
  if (
    filters.enginePowerFrom &&
    filters.enginePowerTo &&
    ad.power >= parseInt(filters.enginePowerFrom, 10) &&
    ad.power <= parseInt(filters.enginePowerTo, 10)
  ) {
    score += 10;
  } else if (
    filters.enginePowerFrom &&
    ad.power >= parseInt(filters.enginePowerFrom, 10)
  ) {
    score += 5;
  } else if (
    filters.enginePowerTo &&
    ad.power <= parseInt(filters.enginePowerTo, 10)
  ) {
    score += 5;
  }

  // capacity
  if (
    filters.engineCapacityFrom &&
    filters.engineCapacityTo &&
    ad.engineSize >= parseInt(filters.engineCapacityFrom, 10) &&
    ad.engineSize <= parseInt(filters.engineCapacityTo, 10)
  ) {
    score += 8;
  } else if (
    filters.engineCapacityFrom &&
    ad.engineSize >= parseInt(filters.engineCapacityFrom, 10)
  ) {
    score += 4;
  } else if (
    filters.engineCapacityTo &&
    ad.engineSize <= parseInt(filters.engineCapacityTo, 10)
  ) {
    score += 4;
  }

  // weight
  if (
    filters.weightFrom &&
    filters.weightTo &&
    ad.weight >= parseInt(filters.weightFrom, 10) &&
    ad.weight <= parseInt(filters.weightTo, 10)
  ) {
    score += 6;
  } else if (
    filters.weightFrom &&
    ad.weight >= parseInt(filters.weightFrom, 10)
  ) {
    score += 3;
  } else if (filters.weightTo && ad.weight <= parseInt(filters.weightTo, 10)) {
    score += 3;
  }

  // similar ads
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
