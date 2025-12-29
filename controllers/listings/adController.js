/**
 * Ad Controller - Handles all ad-related API endpoints
 * Manages CRUD operations for advertisements
 */

import Ad from "../../models/listings/ad.js";
import {
  getActiveStatusFilter,
  getActiveAdsCount,
} from "../../utils/listings/commonFilters.js";

/**
 * Controller class for ad endpoints
 */
class AdController {
  /**
   * Get all ads with filtering and pagination
   * GET /api/ads
   */
  static async getAllAds(req, res, next) {
    try {
      const {
        page = 1,
        limit = 30,
        brand,
        model,
        minPrice,
        maxPrice,
        sortBy = "createdAt",
        order = "desc",
        listingType,
      } = req.query;

      // Build filter object - only active ads
      const filter = { status: getActiveStatusFilter() };

      if (brand) filter.brand = brand;
      if (model) filter.model = model;
      if (minPrice)
        filter.price = { ...filter.price, $gte: parseFloat(minPrice) };
      if (maxPrice)
        filter.price = { ...filter.price, $lte: parseFloat(maxPrice) };
      if (listingType) filter.listingType = listingType;

      const sortOptions = {};
      sortOptions[sortBy] = order === "desc" ? -1 : 1;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const ads = await Ad.find(filter)
        .select(
          "_id brand model headline title description year price mileage fuelType transmission power images mainImage status listingType createdAt views favorites"
        )
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit));

      const totalAds = await Ad.countDocuments(filter);

      res.status(200).json({
        ads,
        totalPages: Math.ceil(totalAds / parseInt(limit)),
        currentPage: parseInt(page),
        totalAds,
      });
    } catch (error) {
      console.error("Error in getAllAds:", error);
      next(error);
    }
  }

  /**
   * Get single ad by ID
   * GET /api/ads/:id
   */
  static async getAdById(req, res, next) {
    try {
      const { id } = req.params;

      const ad = await Ad.findById(id);

      if (!ad) {
        return res.status(404).json({
          success: false,
          message: "Ogłoszenie nie zostało znalezione",
        });
      }

      res.status(200).json({
        success: true,
        data: ad,
      });
    } catch (error) {
      console.error("Error in getAdById:", error);
      next(error);
    }
  }

  /**
   * Get count of active ads
   * GET /api/ads/active-count
   */
  static async getActiveAdsCount(req, res, next) {
    try {
      const activeCount = await getActiveAdsCount(Ad);

      res.status(200).json({
        activeCount,
        message: `Znaleziono ${activeCount} aktywnych ogłoszeń w bazie danych`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in getActiveAdsCount:", error);
      next(error);
    }
  }

  /**
   * Search ads with advanced filtering
   * GET /api/ads/search
   */
  static async searchAds(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 30;
      const skip = (page - 1) * limit;
      const { sortBy = "createdAt", order = "desc", sellerType } = req.query;

      console.log("🔍 BACKEND SEARCH - Parametry sortowania:", {
        sortBy,
        order,
      });
      console.log("🔍 BACKEND SEARCH - Parametry filtrowania:", { sellerType });

      // Build filter object - start with active ads only
      const activeFilter = { status: getActiveStatusFilter() };

      // Add seller type filter if provided
      if (sellerType && sellerType !== "all") {
        activeFilter.sellerType = sellerType;
        console.log("🔍 BACKEND SEARCH - Dodano filtr sellerType:", sellerType);
      }

      const allAds = await Ad.find(activeFilter);
      console.log(
        "🔍 BACKEND SEARCH - Znaleziono ogłoszeń po filtrach:",
        allAds.length
      );

      // Calculate match score for each ad
      const adsWithScore = allAds.map((ad) => {
        const match_score = calculateMatchScore(ad, req.query);
        // Check both listingType and featured flag for featured status
        const is_featured =
          ad.listingType === "wyróżnione" ||
          ad.listingType === "featured" ||
          ad.listingType === "premium" ||
          ad.featured === true
            ? 1
            : 0;
        return {
          ...ad.toObject(),
          match_score,
          is_featured,
        };
      });

      // Apply custom sorting based on sortBy parameter
      adsWithScore.sort((a, b) => {
        // Always prioritize featured ads first
        if (b.is_featured !== a.is_featured)
          return b.is_featured - a.is_featured;

        // Then apply user-selected sorting
        let comparison = 0;

        switch (sortBy) {
          case "price":
            comparison = (a.price || 0) - (b.price || 0);
            break;
          case "year":
            comparison = (a.year || 0) - (b.year || 0);
            break;
          case "mileage":
            comparison = (a.mileage || 0) - (b.mileage || 0);
            break;
          case "createdAt":
          default:
            comparison = new Date(a.createdAt) - new Date(b.createdAt);
            break;
        }

        // Apply sort order (desc = -1, asc = 1)
        const sortMultiplier = order === "desc" ? -1 : 1;
        comparison *= sortMultiplier;

        // If values are equal, fall back to match score, then creation date
        if (comparison === 0) {
          if (b.match_score !== a.match_score)
            return b.match_score - a.match_score;
          return new Date(b.createdAt) - new Date(a.createdAt);
        }

        return comparison;
      });

      console.log("✅ BACKEND SEARCH - Posortowane:", {
        total: adsWithScore.length,
        first3: adsWithScore.slice(0, 3).map((ad) => ({
          id: ad._id,
          brand: ad.brand,
          model: ad.model,
          price: ad.price,
          year: ad.year,
          mileage: ad.mileage,
          sortValue: ad[sortBy] || "N/A",
        })),
      });

      // Apply pagination
      const paginatedAds = adsWithScore.slice(skip, skip + limit);

      res.status(200).json({
        ads: paginatedAds,
        currentPage: page,
        totalPages: Math.ceil(adsWithScore.length / limit),
        totalAds: adsWithScore.length,
      });
    } catch (error) {
      console.error("Error in searchAds:", error);
      next(error);
    }
  }

  /**
   * Get unique brands from active ads
   * GET /api/ads/brands
   */
  static async getBrands(req, res, next) {
    try {
      const activeFilter = { status: getActiveStatusFilter() };
      const brands = await Ad.distinct("brand", activeFilter);

      res
        .status(200)
        .json(brands.filter((brand) => brand && brand.trim() !== ""));
    } catch (error) {
      console.error("Error in getBrands:", error);
      next(error);
    }
  }

  /**
   * Get models for a specific brand from active ads
   * GET /api/ads/models
   */
  static async getModels(req, res, next) {
    try {
      const { brand } = req.query;

      if (!brand) {
        return res.status(400).json({
          message: "Parametr brand jest wymagany",
        });
      }

      const activeFilter = {
        brand,
        status: getActiveStatusFilter(),
      };
      const models = await Ad.distinct("model", activeFilter);

      res
        .status(200)
        .json(models.filter((model) => model && model.trim() !== ""));
    } catch (error) {
      console.error("Error in getModels:", error);
      next(error);
    }
  }

  /**
   * Get similar ads based on brand, model, and body type
   * GET /api/ads/:id/similar
   */
  static async getSimilarAds(req, res, next) {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit) || 6;

      // Get the current ad
      const currentAd = await Ad.findById(id);
      if (!currentAd) {
        return res.status(404).json({
          success: false,
          message: "Ogłoszenie nie zostało znalezione",
        });
      }

      // Build filter for similar ads
      const activeFilter = {
        status: getActiveStatusFilter(),
        _id: { $ne: id }, // Exclude current ad
      };

      // Priority search criteria
      const searchCriteria = [
        // 1. Same brand + model + body type
        {
          ...activeFilter,
          brand: currentAd.brand,
          model: currentAd.model,
          bodyType: currentAd.bodyType,
        },
        // 2. Same brand + model (if not enough results)
        {
          ...activeFilter,
          brand: currentAd.brand,
          model: currentAd.model,
        },
        // 3. Same brand + body type (if still not enough)
        {
          ...activeFilter,
          brand: currentAd.brand,
          bodyType: currentAd.bodyType,
        },
        // 4. Same brand only (fallback)
        {
          ...activeFilter,
          brand: currentAd.brand,
        },
      ];

      let similarAds = [];

      // Try each search criteria until we have enough ads
      for (const criteria of searchCriteria) {
        if (similarAds.length >= limit) break;

        const remainingLimit = limit - similarAds.length;
        const foundAds = await Ad.find(criteria)
          .limit(remainingLimit)
          .sort({ createdAt: -1 })
          .select(
            "_id headline brand model year price mileage fuelType mainImage images listingType createdAt bodyType"
          );

        // Add ads that aren't already in the results
        const existingIds = new Set(similarAds.map((ad) => ad._id.toString()));
        const newAds = foundAds.filter(
          (ad) => !existingIds.has(ad._id.toString())
        );

        similarAds.push(...newAds);
      }

      // Limit final results
      similarAds = similarAds.slice(0, limit);

      res.status(200).json({
        success: true,
        data: similarAds,
        count: similarAds.length,
      });
    } catch (error) {
      console.error("Error in getSimilarAds:", error);
      next(error);
    }
  }
}

/**
 * Helper function to calculate match score for search
 */
function calculateMatchScore(ad, filters) {
  let score = 0;

  const normalize = (str) =>
    typeof str === "string" ? str.trim().toLowerCase() : "";

  // Exact brand + model match
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
  }

  // Other filters
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
    score += 5;
  }
  if (
    filters.bodyType &&
    normalize(ad.bodyType) === normalize(filters.bodyType)
  ) {
    score += 5;
  }

  // Color filter - support for multiple colors (array)
  if (filters.color) {
    const colors = Array.isArray(filters.color)
      ? filters.color
      : [filters.color];
    if (colors.some((color) => normalize(ad.color) === normalize(color))) {
      score += 10;
    }
  }

  // Drive type filter
  if (
    filters.driveType &&
    normalize(ad.driveType) === normalize(filters.driveType)
  ) {
    score += 10;
  }

  // Accident status filter - support for multiple values (array)
  if (filters.accidentStatus) {
    const accidentStatuses = Array.isArray(filters.accidentStatus)
      ? filters.accidentStatus
      : [filters.accidentStatus];
    if (
      accidentStatuses.some(
        (status) => normalize(ad.accidentStatus) === normalize(status)
      )
    ) {
      score += 10;
    }
  }

  // Damage status filter - support for multiple values (array)
  if (filters.damageStatus) {
    const damageStatuses = Array.isArray(filters.damageStatus)
      ? filters.damageStatus
      : [filters.damageStatus];
    if (
      damageStatuses.some(
        (status) => normalize(ad.damageStatus) === normalize(status)
      )
    ) {
      score += 10;
    }
  }

  // Country of origin filter - support for multiple countries (array)
  if (filters.countryOfOrigin) {
    const countries = Array.isArray(filters.countryOfOrigin)
      ? filters.countryOfOrigin
      : [filters.countryOfOrigin];
    if (
      countries.some(
        (country) => normalize(ad.countryOfOrigin) === normalize(country)
      )
    ) {
      score += 10;
    }
  }

  // Seller type filter - support for multiple types (array)
  if (filters.sellerType) {
    const sellerTypes = Array.isArray(filters.sellerType)
      ? filters.sellerType
      : [filters.sellerType];
    if (
      sellerTypes.some((type) => normalize(ad.sellerType) === normalize(type))
    ) {
      score += 10;
    }
  }

  // Condition filter - support for multiple conditions (array)
  if (filters.condition) {
    const conditions = Array.isArray(filters.condition)
      ? filters.condition
      : [filters.condition];
    if (
      conditions.some((cond) => normalize(ad.condition) === normalize(cond))
    ) {
      score += 10;
    }
  }

  // Tuning filter - support for multiple values (array)
  if (filters.tuning) {
    const tuningOptions = Array.isArray(filters.tuning)
      ? filters.tuning
      : [filters.tuning];
    if (
      tuningOptions.some((tuning) => normalize(ad.tuning) === normalize(tuning))
    ) {
      score += 10;
    }
  }

  // Engine power range
  if (
    filters.enginePowerFrom &&
    ad.power >= parseInt(filters.enginePowerFrom)
  ) {
    score += 5;
  }
  if (filters.enginePowerTo && ad.power <= parseInt(filters.enginePowerTo)) {
    score += 5;
  }

  // Engine capacity range
  if (
    filters.engineCapacityFrom &&
    ad.engineCapacity >= parseInt(filters.engineCapacityFrom)
  ) {
    score += 5;
  }
  if (
    filters.engineCapacityTo &&
    ad.engineCapacity <= parseInt(filters.engineCapacityTo)
  ) {
    score += 5;
  }

  // Weight range
  if (filters.weightFrom && ad.weight >= parseInt(filters.weightFrom)) {
    score += 5;
  }
  if (filters.weightTo && ad.weight <= parseInt(filters.weightTo)) {
    score += 5;
  }

  // First owner filter
  if (
    filters.firstOwner &&
    normalize(ad.firstOwner) === normalize(filters.firstOwner)
  ) {
    score += 5;
  }

  // Disabled adapted filter
  if (
    filters.disabledAdapted &&
    normalize(ad.disabledAdapted) === normalize(filters.disabledAdapted)
  ) {
    score += 5;
  }

  return score;
}

export default AdController;
