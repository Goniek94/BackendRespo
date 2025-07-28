/**
 * Ad Controller - Handles all ad-related API endpoints
 * Manages CRUD operations for advertisements
 */

import Ad from '../../models/ad.js';
import { getActiveStatusFilter, getActiveAdsCount } from '../../utils/listings/commonFilters.js';

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
        sortBy = 'createdAt', 
        order = 'desc',
        listingType
      } = req.query;

      // Build filter object - only active ads
      const filter = { status: getActiveStatusFilter() };
      
      if (brand) filter.brand = brand;
      if (model) filter.model = model;
      if (minPrice) filter.price = { ...filter.price, $gte: parseFloat(minPrice) };
      if (maxPrice) filter.price = { ...filter.price, $lte: parseFloat(maxPrice) };
      if (listingType) filter.listingType = listingType;

      const sortOptions = {};
      sortOptions[sortBy] = order === 'desc' ? -1 : 1;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const ads = await Ad.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit));

      const totalAds = await Ad.countDocuments(filter);

      res.status(200).json({
        ads,
        totalPages: Math.ceil(totalAds / parseInt(limit)),
        currentPage: parseInt(page),
        totalAds
      });

    } catch (error) {
      console.error('Error in getAllAds:', error);
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
          message: 'Ogłoszenie nie zostało znalezione'
        });
      }

      res.status(200).json({
        success: true,
        data: ad
      });

    } catch (error) {
      console.error('Error in getAdById:', error);
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
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error in getActiveAdsCount:', error);
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

      // Get only active ads
      const activeFilter = { status: getActiveStatusFilter() };
      const allAds = await Ad.find(activeFilter);
      
      // Calculate match score for each ad
      const adsWithScore = allAds.map(ad => {
        const match_score = calculateMatchScore(ad, req.query);
        const is_featured = ad.listingType === 'wyróżnione' ? 1 : 0;
        return {
          ...ad.toObject(),
          match_score,
          is_featured
        };
      });

      // Sort by featured status, then match score, then creation date
      adsWithScore.sort((a, b) => {
        if (b.is_featured !== a.is_featured) return b.is_featured - a.is_featured;
        if (b.match_score !== a.match_score) return b.match_score - a.match_score;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      // Apply pagination
      const paginatedAds = adsWithScore.slice(skip, skip + limit);

      res.status(200).json({
        ads: paginatedAds,
        currentPage: page,
        totalPages: Math.ceil(adsWithScore.length / limit),
        totalAds: adsWithScore.length
      });

    } catch (error) {
      console.error('Error in searchAds:', error);
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
      const brands = await Ad.distinct('brand', activeFilter);
      
      res.status(200).json(brands.filter(brand => brand && brand.trim() !== ''));

    } catch (error) {
      console.error('Error in getBrands:', error);
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
          message: 'Parametr brand jest wymagany' 
        });
      }
      
      const activeFilter = { 
        brand, 
        status: getActiveStatusFilter() 
      };
      const models = await Ad.distinct('model', activeFilter);
      
      res.status(200).json(models.filter(model => model && model.trim() !== ''));

    } catch (error) {
      console.error('Error in getModels:', error);
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
          message: 'Ogłoszenie nie zostało znalezione'
        });
      }

      // Build filter for similar ads
      const activeFilter = { 
        status: getActiveStatusFilter(),
        _id: { $ne: id } // Exclude current ad
      };

      // Priority search criteria
      const searchCriteria = [
        // 1. Same brand + model + body type
        {
          ...activeFilter,
          brand: currentAd.brand,
          model: currentAd.model,
          bodyType: currentAd.bodyType
        },
        // 2. Same brand + model (if not enough results)
        {
          ...activeFilter,
          brand: currentAd.brand,
          model: currentAd.model
        },
        // 3. Same brand + body type (if still not enough)
        {
          ...activeFilter,
          brand: currentAd.brand,
          bodyType: currentAd.bodyType
        },
        // 4. Same brand only (fallback)
        {
          ...activeFilter,
          brand: currentAd.brand
        }
      ];

      let similarAds = [];
      
      // Try each search criteria until we have enough ads
      for (const criteria of searchCriteria) {
        if (similarAds.length >= limit) break;
        
        const remainingLimit = limit - similarAds.length;
        const foundAds = await Ad.find(criteria)
          .limit(remainingLimit)
          .sort({ createdAt: -1 })
          .select('_id headline brand model year price mileage fuelType mainImage images listingType createdAt bodyType');
        
        // Add ads that aren't already in the results
        const existingIds = new Set(similarAds.map(ad => ad._id.toString()));
        const newAds = foundAds.filter(ad => !existingIds.has(ad._id.toString()));
        
        similarAds.push(...newAds);
      }

      // Limit final results
      similarAds = similarAds.slice(0, limit);

      res.status(200).json({
        success: true,
        data: similarAds,
        count: similarAds.length
      });

    } catch (error) {
      console.error('Error in getSimilarAds:', error);
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
    typeof str === 'string' ? str.trim().toLowerCase() : '';

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
  if (filters.fuelType && normalize(ad.fuelType) === normalize(filters.fuelType)) {
    score += 10;
  }
  if (filters.transmission && normalize(ad.transmission) === normalize(filters.transmission)) {
    score += 5;
  }
  if (filters.bodyType && normalize(ad.bodyType) === normalize(filters.bodyType)) {
    score += 5;
  }

  return score;
}

export default AdController;
