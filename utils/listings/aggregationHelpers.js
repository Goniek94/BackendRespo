/**
 * Funkcje agregacji MongoDB dla systemu kaskadowego filtrowania
 * Optymalizowane zapytania do liczenia ogłoszeń dla każdego filtru
 */

import { createAdFilter, getActiveStatusFilter } from "./commonFilters.js";

/**
 * Główna funkcja do pobierania liczników dla wszystkich filtrów
 * @param {Object} Ad - Model MongoDB
 * @param {Object} currentFilters - Aktualne filtry użytkownika
 * @returns {Object} Obiekt z licznikami dla każdego typu filtru
 */
export const getFilterCounts = async (Ad, currentFilters = {}) => {
  try {
    console.log("Pobieranie liczników filtrów dla:", currentFilters);

    // Bazowy filtr z aktualnych wyborów użytkownika
    const baseFilter = createAdFilter(currentFilters);

    // Równoległe wykonanie wszystkich agregacji dla wydajności
    const [
      brandCounts,
      modelCounts,
      generationCounts,
      bodyTypeCounts,
      fuelTypeCounts,
      transmissionCounts,
      driveTypeCounts,
      colorCounts,
      conditionCounts,
      accidentStatusCounts,
      regionCounts,
      cityCounts,
      yearRangeCounts,
      priceRangeCounts,
      mileageRangeCounts,
    ] = await Promise.all([
      getBrandCounts(Ad, baseFilter, currentFilters),
      getModelCounts(Ad, baseFilter, currentFilters),
      getGenerationCounts(Ad, baseFilter, currentFilters),
      getBodyTypeCounts(Ad, baseFilter, currentFilters),
      getFuelTypeCounts(Ad, baseFilter, currentFilters),
      getTransmissionCounts(Ad, baseFilter, currentFilters),
      getDriveTypeCounts(Ad, baseFilter, currentFilters),
      getColorCounts(Ad, baseFilter, currentFilters),
      getConditionCounts(Ad, baseFilter, currentFilters),
      getAccidentStatusCounts(Ad, baseFilter, currentFilters),
      getRegionCounts(Ad, baseFilter, currentFilters),
      getCityCounts(Ad, baseFilter, currentFilters),
      getYearRangeCounts(Ad, baseFilter, currentFilters),
      getPriceRangeCounts(Ad, baseFilter, currentFilters),
      getMileageRangeCounts(Ad, baseFilter, currentFilters),
    ]);

    const result = {
      brands: brandCounts,
      models: modelCounts,
      generations: generationCounts,
      bodyTypes: bodyTypeCounts,
      fuelTypes: fuelTypeCounts,
      transmissions: transmissionCounts,
      driveTypes: driveTypeCounts,
      colors: colorCounts,
      conditions: conditionCounts,
      accidentStatuses: accidentStatusCounts,
      regions: regionCounts,
      cities: cityCounts,
      yearRanges: yearRangeCounts,
      priceRanges: priceRangeCounts,
      mileageRanges: mileageRangeCounts,
    };

    console.log("Liczniki filtrów pobrane pomyślnie");
    return result;
  } catch (error) {
    console.error("Błąd podczas pobierania liczników filtrów:", error);
    throw error;
  }
};

/**
 * Liczniki marek - wykluczając aktualnie wybrane marki
 */
const getBrandCounts = async (Ad, baseFilter, currentFilters) => {
  const filter = { ...baseFilter };
  delete filter.brand; // Usuń filtr marki, żeby zobaczyć wszystkie dostępne marki

  const counts = await Ad.aggregate([
    { $match: filter },
    { $group: { _id: "$brand", count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
  ]);

  return counts.reduce((acc, item) => {
    if (item._id) {
      acc[item._id] = item.count;
    }
    return acc;
  }, {});
};

/**
 * Liczniki modeli - tylko dla wybranych marek
 */
const getModelCounts = async (Ad, baseFilter, currentFilters) => {
  const filter = { ...baseFilter };
  delete filter.model; // Usuń filtr modelu, ale zachowaj markę

  // Jeśli nie wybrano marki, nie pokazuj modeli
  if (!filter.brand) {
    return {};
  }

  const counts = await Ad.aggregate([
    { $match: filter },
    { $group: { _id: "$model", count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
  ]);

  return counts.reduce((acc, item) => {
    if (item._id) {
      acc[item._id] = item.count;
    }
    return acc;
  }, {});
};

/**
 * Liczniki generacji - tylko dla wybranych marek i modeli
 */
const getGenerationCounts = async (Ad, baseFilter, currentFilters) => {
  const filter = { ...baseFilter };
  delete filter.generation; // Usuń filtr generacji, ale zachowaj markę i model

  // Jeśli nie wybrano marki i modelu, nie pokazuj generacji
  if (!filter.brand || !filter.model) {
    return {};
  }

  const counts = await Ad.aggregate([
    { $match: filter },
    { $group: { _id: "$generation", count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
  ]);

  return counts.reduce((acc, item) => {
    if (item._id) {
      acc[item._id] = item.count;
    }
    return acc;
  }, {});
};

/**
 * Liczniki typów nadwozia
 */
const getBodyTypeCounts = async (Ad, baseFilter, currentFilters) => {
  const filter = { ...baseFilter };
  delete filter.bodyType;

  const counts = await Ad.aggregate([
    { $match: filter },
    { $group: { _id: "$bodyType", count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
  ]);

  return counts.reduce((acc, item) => {
    if (item._id) {
      acc[item._id] = item.count;
    }
    return acc;
  }, {});
};

/**
 * Liczniki rodzajów paliwa
 */
const getFuelTypeCounts = async (Ad, baseFilter, currentFilters) => {
  const filter = { ...baseFilter };
  delete filter.fuelType;

  const counts = await Ad.aggregate([
    { $match: filter },
    { $group: { _id: "$fuelType", count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
  ]);

  return counts.reduce((acc, item) => {
    if (item._id) {
      acc[item._id] = item.count;
    }
    return acc;
  }, {});
};

/**
 * Liczniki skrzyń biegów - z normalizacją (case-insensitive grouping)
 */
const getTransmissionCounts = async (Ad, baseFilter, currentFilters) => {
  const filter = { ...baseFilter };
  delete filter.transmission;

  // Lista standardowych skrzyń biegów (dokładnie jak w vehicleOptions.js)
  const standardTransmissions = ["Manualna", "Automatyczna", "Półautomatyczna"];

  // Dla każdej standardowej skrzyni, policz ile ogłoszeń (case-insensitive)
  const transmissionCounts = {};

  for (const transmission of standardTransmissions) {
    const count = await Ad.countDocuments({
      ...filter,
      transmission: { $regex: new RegExp(`^${transmission}$`, "i") },
    });

    // Dodaj tylko jeśli są ogłoszenia z tą skrzynią
    if (count > 0) {
      transmissionCounts[transmission] = count;
    }
  }

  return transmissionCounts;
};

/**
 * Liczniki napędów - z normalizacją (case-insensitive grouping)
 * Wartości zgodne z mapowaniem w createAdHandler.js
 */
const getDriveTypeCounts = async (Ad, baseFilter, currentFilters) => {
  const filter = { ...baseFilter };
  delete filter.drive; // Pole w bazie to "drive", nie "driveType"

  // Lista standardowych napędów - zgodne z wartościami zapisywanymi w bazie
  const standardDriveTypes = [
    "FWD (Przedni)",
    "RWD (Tylny)",
    "AWD (4x4 stały)",
    "4WD (4x4 dołączany)",
  ];

  // Dla każdego standardowego napędu, policz ile ogłoszeń (case-insensitive)
  const driveTypeCounts = {};

  for (const driveType of standardDriveTypes) {
    const count = await Ad.countDocuments({
      ...filter,
      drive: { $regex: new RegExp(`^${driveType}$`, "i") },
    });

    // Dodaj tylko jeśli są ogłoszenia z tym napędem
    if (count > 0) {
      driveTypeCounts[driveType] = count;
    }
  }

  return driveTypeCounts;
};

/**
 * Liczniki kolorów - z normalizacją (case-insensitive grouping)
 */
const getColorCounts = async (Ad, baseFilter, currentFilters) => {
  const filter = { ...baseFilter };
  delete filter.color;

  // Lista standardowych kolorów z formularza (dokładnie jak w vehicleOptions.js)
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

  // Dla każdego standardowego koloru, policz ile ogłoszeń (case-insensitive)
  const colorCounts = {};

  for (const color of standardColors) {
    const count = await Ad.countDocuments({
      ...filter,
      color: { $regex: new RegExp(`^${color}$`, "i") },
    });

    // Dodaj tylko jeśli są ogłoszenia w tym kolorze
    if (count > 0) {
      colorCounts[color] = count;
    }
  }

  return colorCounts;
};

/**
 * Liczniki stanów technicznych
 */
const getConditionCounts = async (Ad, baseFilter, currentFilters) => {
  const filter = { ...baseFilter };
  delete filter.condition;

  const counts = await Ad.aggregate([
    { $match: filter },
    { $group: { _id: "$condition", count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
  ]);

  return counts.reduce((acc, item) => {
    if (item._id) {
      acc[item._id] = item.count;
    }
    return acc;
  }, {});
};

/**
 * Liczniki statusów wypadkowości
 */
const getAccidentStatusCounts = async (Ad, baseFilter, currentFilters) => {
  const filter = { ...baseFilter };
  delete filter.accidentStatus;

  const counts = await Ad.aggregate([
    { $match: filter },
    { $group: { _id: "$accidentStatus", count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
  ]);

  return counts.reduce((acc, item) => {
    if (item._id) {
      acc[item._id] = item.count;
    }
    return acc;
  }, {});
};

/**
 * Liczniki województw
 */
const getRegionCounts = async (Ad, baseFilter, currentFilters) => {
  const filter = { ...baseFilter };
  delete filter.voivodeship;

  const counts = await Ad.aggregate([
    { $match: filter },
    { $group: { _id: "$voivodeship", count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
  ]);

  return counts.reduce((acc, item) => {
    if (item._id) {
      acc[item._id] = item.count;
    }
    return acc;
  }, {});
};

/**
 * Liczniki miast - tylko dla wybranych województw
 */
const getCityCounts = async (Ad, baseFilter, currentFilters) => {
  const filter = { ...baseFilter };
  delete filter.city; // Usuń filtr miasta, ale zachowaj województwo

  // Jeśli nie wybrano województwa, nie pokazuj miast
  if (!filter.voivodeship) {
    return {};
  }

  const counts = await Ad.aggregate([
    { $match: filter },
    { $group: { _id: "$city", count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
  ]);

  return counts.reduce((acc, item) => {
    if (item._id) {
      acc[item._id] = item.count;
    }
    return acc;
  }, {});
};

/**
 * Liczniki zakresów lat - grupowane w przedziały
 */
const getYearRangeCounts = async (Ad, baseFilter, currentFilters) => {
  const filter = { ...baseFilter };
  delete filter.year;

  const counts = await Ad.aggregate([
    { $match: filter },
    {
      $group: {
        _id: {
          $switch: {
            branches: [
              { case: { $gte: ["$year", 2020] }, then: "2020+" },
              { case: { $gte: ["$year", 2015] }, then: "2015-2019" },
              { case: { $gte: ["$year", 2010] }, then: "2010-2014" },
              { case: { $gte: ["$year", 2005] }, then: "2005-2009" },
              { case: { $gte: ["$year", 2000] }, then: "2000-2004" },
            ],
            default: "Starsze",
          },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return counts.reduce((acc, item) => {
    if (item._id) {
      acc[item._id] = item.count;
    }
    return acc;
  }, {});
};

/**
 * Liczniki zakresów cen - grupowane w przedziały
 */
const getPriceRangeCounts = async (Ad, baseFilter, currentFilters) => {
  const filter = { ...baseFilter };
  delete filter.price;

  const counts = await Ad.aggregate([
    { $match: filter },
    {
      $group: {
        _id: {
          $switch: {
            branches: [
              { case: { $lt: ["$price", 10000] }, then: "do 10k" },
              { case: { $lt: ["$price", 25000] }, then: "10k-25k" },
              { case: { $lt: ["$price", 50000] }, then: "25k-50k" },
              { case: { $lt: ["$price", 100000] }, then: "50k-100k" },
              { case: { $lt: ["$price", 200000] }, then: "100k-200k" },
            ],
            default: "200k+",
          },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return counts.reduce((acc, item) => {
    if (item._id) {
      acc[item._id] = item.count;
    }
    return acc;
  }, {});
};

/**
 * Liczniki zakresów przebiegu - grupowane w przedziały
 */
const getMileageRangeCounts = async (Ad, baseFilter, currentFilters) => {
  const filter = { ...baseFilter };
  delete filter.mileage;

  const counts = await Ad.aggregate([
    { $match: filter },
    {
      $group: {
        _id: {
          $switch: {
            branches: [
              { case: { $lt: ["$mileage", 50000] }, then: "do 50k km" },
              { case: { $lt: ["$mileage", 100000] }, then: "50k-100k km" },
              { case: { $lt: ["$mileage", 150000] }, then: "100k-150k km" },
              { case: { $lt: ["$mileage", 200000] }, then: "150k-200k km" },
            ],
            default: "200k+ km",
          },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return counts.reduce((acc, item) => {
    if (item._id) {
      acc[item._id] = item.count;
    }
    return acc;
  }, {});
};

/**
 * Funkcja do szybkiego liczenia ogłoszeń pasujących do filtrów
 * @param {Object} Ad - Model MongoDB
 * @param {Object} filters - Filtry wyszukiwania
 * @returns {Number} Liczba pasujących ogłoszeń
 */
export const getMatchingAdsCount = async (Ad, filters = {}) => {
  try {
    const filter = createAdFilter(filters);
    const count = await Ad.countDocuments(filter);

    console.log(`Liczba ogłoszeń pasujących do filtrów: ${count}`);
    return count;
  } catch (error) {
    console.error("Błąd podczas liczenia ogłoszeń:", error);
    return 0;
  }
};

/**
 * Funkcja do tworzenia częściowego filtru dla hierarchii wyników
 * @param {Object} baseFilter - Bazowy filtr
 * @returns {Object} Częściowy filtr dla podobnych ogłoszeń
 */
export const createPartialFilter = (baseFilter) => {
  const partialFilter = { ...baseFilter };

  // Usuń niektóre restrykcyjne filtry dla częściowego dopasowania
  delete partialFilter.model;
  delete partialFilter.generation;
  delete partialFilter.color;
  delete partialFilter.doors;
  delete partialFilter.seats;

  // Rozluźnij filtry zakresowe
  if (partialFilter.price) {
    if (partialFilter.price.$gte) {
      partialFilter.price.$gte = partialFilter.price.$gte * 0.8; // -20%
    }
    if (partialFilter.price.$lte) {
      partialFilter.price.$lte = partialFilter.price.$lte * 1.2; // +20%
    }
  }

  if (partialFilter.year) {
    if (partialFilter.year.$gte) {
      partialFilter.year.$gte = partialFilter.year.$gte - 2; // -2 lata
    }
    if (partialFilter.year.$lte) {
      partialFilter.year.$lte = partialFilter.year.$lte + 2; // +2 lata
    }
  }

  return partialFilter;
};
