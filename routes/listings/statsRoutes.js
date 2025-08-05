import express from 'express';
import { Router } from 'express';
import Ad from '../../models/listings/ad.js';
import errorHandler from '../../middleware/errors/errorHandler.js';

const router = Router();

// Endpoint do sprawdzania liczby ogłoszeń w każdej kategorii
router.get('/', async (req, res, next) => {
  try {
    // Pobierz liczbę wszystkich opublikowanych ogłoszeń
    const totalAds = await Ad.countDocuments({ status: 'opublikowane' });
    
    // Pobierz liczbę wyróżnionych ogłoszeń
    const featuredAds = await Ad.countDocuments({ 
      status: 'opublikowane',
      listingType: 'wyróżnione'
    });
    
    // Pobierz liczbę standardowych ogłoszeń
    const standardAds = await Ad.countDocuments({ 
      status: 'opublikowane',
      listingType: 'standardowe'
    });
    
    res.status(200).json({
      total: totalAds,
      featured: featuredAds,
      standard: standardAds
    });
  } catch (err) {
    next(err);
  }
}, errorHandler);

export default router;
