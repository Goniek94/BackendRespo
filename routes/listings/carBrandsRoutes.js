import express from 'express';
import CarBrandsController from '../../controllers/listings/carBrandsController.js';

const router = express.Router();

/**
 * Car Brands Routes
 * Handles all car brands and models related endpoints
 */

// GET /api/car-brands - Get all car brands
router.get('/', CarBrandsController.getAllBrands);

// GET /api/car-brands/all-data - Get all brands with their models
router.get('/all-data', CarBrandsController.getAllBrandsWithModels);

// GET /api/car-brands/search?q=query - Search brands by name
router.get('/search', CarBrandsController.searchBrands);

// GET /api/car-brands/models?brand=X - Get models for brand (query parameter)
router.get('/models', CarBrandsController.getModelsQuery);

// GET /api/car-brands/:brand/models - Get models for specific brand
router.get('/:brand/models', CarBrandsController.getModelsByBrand);

// GET /api/car-brands/:brand/:model/generations - Get generations for specific brand and model
router.get('/:brand/:model/generations', CarBrandsController.getGenerationsByModel);

// GET /api/car-brands/:brand/search?q=query - Search models within a brand
router.get('/:brand/search', CarBrandsController.searchModels);

export default router;
