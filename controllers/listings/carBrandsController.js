/**
 * CarBrands Controller - Handles car brands and models API endpoints
 * Manages operations for car brands from CarBrands collection
 */

import CarBrand from '../../models/listings/CarBrand.js';

/**
 * Controller class for car brands endpoints
 */
class CarBrandsController {
  /**
   * Get all car brands
   * GET /api/car-brands
   */
  static async getAllBrands(req, res, next) {
    try {
      const brands = await CarBrand.getAllBrands();
      const brandNames = brands.map(brand => brand.brand).sort();
      
      console.log(`Pobrano ${brandNames.length} marek z kolekcji CarBrands`);
      
      res.status(200).json({
        success: true,
        data: brandNames,
        count: brandNames.length
      });

    } catch (error) {
      console.error('Error in getAllBrands:', error);
      next(error);
    }
  }

  /**
   * Get models for a specific brand
   * GET /api/car-brands/:brand/models
   */
  static async getModelsByBrand(req, res, next) {
    try {
      const { brand } = req.params;
      
      if (!brand) {
        return res.status(400).json({
          success: false,
          message: 'Parametr brand jest wymagany'
        });
      }

      const brandData = await CarBrand.getModelsByBrand(brand);
      
      if (!brandData) {
        return res.status(404).json({
          success: false,
          message: `Marka "${brand}" nie została znaleziona`
        });
      }

      const models = brandData.models.sort();
      
      console.log(`Pobrano ${models.length} modeli dla marki "${brand}"`);
      
      res.status(200).json({
        success: true,
        data: models,
        brand: brand,
        count: models.length
      });

    } catch (error) {
      console.error('Error in getModelsByBrand:', error);
      next(error);
    }
  }

  /**
   * Get models for a specific brand (query parameter version)
   * GET /api/car-brands/models?brand=X
   */
  static async getModelsQuery(req, res, next) {
    try {
      const { brand } = req.query;
      
      if (!brand) {
        return res.status(400).json({
          success: false,
          message: 'Parametr brand jest wymagany'
        });
      }

      const brandData = await CarBrand.getModelsByBrand(brand);
      
      if (!brandData) {
        return res.status(404).json({
          success: false,
          message: `Marka "${brand}" nie została znaleziona`
        });
      }

      const models = brandData.models.sort();
      
      console.log(`Pobrano ${models.length} modeli dla marki "${brand}" (query)`);
      
      res.status(200).json(models);

    } catch (error) {
      console.error('Error in getModelsQuery:', error);
      next(error);
    }
  }

  /**
   * Get all brands with their models
   * GET /api/car-brands/all-data
   */
  static async getAllBrandsWithModels(req, res, next) {
    try {
      const brandsData = await CarBrand.find({}).sort({ brand: 1 });
      
      const carData = {};
      brandsData.forEach(brandDoc => {
        carData[brandDoc.brand] = brandDoc.models.sort();
      });
      
      console.log(`Pobrano ${Object.keys(carData).length} marek z modelami z kolekcji CarBrands`);
      
      res.status(200).json({
        success: true,
        data: carData,
        brandsCount: Object.keys(carData).length,
        totalModels: Object.values(carData).reduce((sum, models) => sum + models.length, 0)
      });

    } catch (error) {
      console.error('Error in getAllBrandsWithModels:', error);
      next(error);
    }
  }

  /**
   * Search brands by name
   * GET /api/car-brands/search?q=query
   */
  static async searchBrands(req, res, next) {
    try {
      const { q: query } = req.query;
      
      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Zapytanie musi zawierać co najmniej 2 znaki'
        });
      }

      const brands = await CarBrand.searchBrands(query.trim());
      const brandNames = brands.map(brand => brand.brand);
      
      console.log(`Wyszukiwanie "${query}" zwróciło ${brandNames.length} marek`);
      
      res.status(200).json({
        success: true,
        data: brandNames,
        query: query.trim(),
        count: brandNames.length
      });

    } catch (error) {
      console.error('Error in searchBrands:', error);
      next(error);
    }
  }

  /**
   * Search models within a brand
   * GET /api/car-brands/:brand/search?q=query
   */
  static async searchModels(req, res, next) {
    try {
      const { brand } = req.params;
      const { q: query } = req.query;
      
      if (!brand) {
        return res.status(400).json({
          success: false,
          message: 'Parametr brand jest wymagany'
        });
      }

      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Zapytanie musi zawierać co najmniej 2 znaki'
        });
      }

      const brandData = await CarBrand.searchModels(brand, query.trim());
      
      if (!brandData) {
        return res.status(404).json({
          success: false,
          message: `Marka "${brand}" nie została znaleziona`
        });
      }

      const filteredModels = brandData.models.filter(model => 
        model.toLowerCase().includes(query.trim().toLowerCase())
      ).sort();
      
      console.log(`Wyszukiwanie "${query}" w marce "${brand}" zwróciło ${filteredModels.length} modeli`);
      
      res.status(200).json({
        success: true,
        data: filteredModels,
        brand: brand,
        query: query.trim(),
        count: filteredModels.length
      });

    } catch (error) {
      console.error('Error in searchModels:', error);
      next(error);
    }
  }
}

export default CarBrandsController;
