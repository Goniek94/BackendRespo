/**
 * Rotation Routes dla Ogłoszeń
 * Odpowiada za: rotację ogłoszeń na stronie głównej i promowanie
 */

import express from 'express';
import { Router } from 'express';
import auth from '../../middleware/auth.js';
import Ad from '../../models/listings/ad.js';
import errorHandler from '../../middleware/errors/errorHandler.js';
import { getActiveAdsPool, processAdImages } from '../../utils/listings/commonFilters.js';

const router = Router();

// Cache dla rotacji ogłoszeń
const rotationCache = {
  featured: null,
  hot: null,
  regular: null,
  lastRotation: null,
  rotationInterval: 12 * 60 * 60 * 1000 // 12 godzin
};

// Funkcja do losowego wyboru ogłoszeń
const getRandomAds = (ads, count) => {
  if (!ads || ads.length === 0) return [];
  if (ads.length <= count) return ads;
  
  const shuffled = [...ads];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled.slice(0, count);
};

// GET /ads/rotated - Pobieranie rotowanych ogłoszeń dla strony głównej
router.get('/rotated', async (req, res, next) => {
  try {
    // Używamy tej samej puli ogłoszeń co endpoint /ads
    const allAds = await getActiveAdsPool(Ad);
    
    console.log("Wszystkie ogłoszenia z puli aktywnych (rotated):", allAds.map(ad => ({ 
      id: ad._id, 
      listingType: ad.listingType, 
      status: ad.status,
      brand: ad.brand,
      model: ad.model
    })));

    // Podziel ogłoszenia na wyróżnione i zwykłe
    const featuredAds = allAds.filter(ad => {
      if (!ad.listingType) return false;
      
      const listingType = String(ad.listingType);
      return listingType === 'wyróżnione' || 
             listingType === 'wyroznione' || 
             listingType === 'featured' || 
             listingType === 'premium' ||
             listingType === 'vip' ||
             listingType.includes('wyróżnione') || 
             listingType.includes('wyroznione') || 
             listingType.includes('featured');
    });
    
    const regularAds = allAds.filter(ad => !featuredAds.some(featured => featured._id.toString() === ad._id.toString()));
    
    console.log(`Wyróżnione ogłoszenia: ${featuredAds.length}`);
    console.log(`Zwykłe ogłoszenia: ${regularAds.length}`);

    // Przetwórz obrazy
    const processedFeatured = featuredAds.map(processAdImages);
    const processedRegular = regularAds.map(processAdImages);

    // Losuj ogłoszenia w układzie 2+4+6
    const featured = getRandomAds(processedFeatured, 2);
    const hot = getRandomAds(processedFeatured.filter(ad => !featured.some(f => f._id.toString() === ad._id.toString())), 4);
    const regular = getRandomAds(processedRegular, 6);

    res.status(200).json({
      featured,
      hot,
      regular
    });

  } catch (err) {
    console.error('Błąd w endpointcie /api/ads/rotated:', err);
    next(err);
  }
}, errorHandler);

// POST /ads/rotated/refresh - Wymuszenie nowej rotacji
router.post('/rotated/refresh', auth, async (req, res, next) => {
  try {
    // Resetuj cache
    rotationCache.lastRotation = null;
    
    // Używamy tej samej puli ogłoszeń co endpoint /ads
    const allAds = await getActiveAdsPool(Ad);
    
    console.log('Wszystkie ogłoszenia z puli aktywnych (refresh):', allAds.map(ad => ({ 
      id: ad._id, 
      listingType: ad.listingType, 
      status: ad.status,
      brand: ad.brand,
      model: ad.model
    })));

    // Podziel ogłoszenia na wyróżnione i zwykłe
    const featuredAds = allAds.filter(ad => {
      if (!ad.listingType) return false;
      
      const listingType = String(ad.listingType);
      return listingType === 'wyróżnione' || 
             listingType === 'wyroznione' || 
             listingType === 'featured' || 
             listingType === 'premium' ||
             listingType === 'vip' ||
             listingType.includes('wyróżnione') || 
             listingType.includes('wyroznione') || 
             listingType.includes('featured');
    });
    
    const regularAds = allAds.filter(ad => !featuredAds.some(featured => featured._id.toString() === ad._id.toString()));
    
    console.log(`Wyróżnione ogłoszenia (refresh): ${featuredAds.length}`);
    console.log(`Zwykłe ogłoszenia (refresh): ${regularAds.length}`);

    // Przetwórz obrazy
    const processedFeatured = featuredAds.map(processAdImages);
    const processedRegular = regularAds.map(processAdImages);

    // Losuj ogłoszenia w układzie 2+4+6
    const featured = getRandomAds(processedFeatured, 2);
    const hot = getRandomAds(processedFeatured.filter(ad => !featured.some(f => f._id.toString() === ad._id.toString())), 4);
    const regular = getRandomAds(processedRegular, 6);
    
    // Aktualizacja cache
    rotationCache.featured = featured;
    rotationCache.hot = hot;
    rotationCache.regular = regular;
    rotationCache.lastRotation = new Date();
    
    res.status(200).json({ 
      message: 'Rotacja odświeżona',
      featured,
      hot,
      regular,
      nextRotationTime: new Date(rotationCache.lastRotation.getTime() + rotationCache.rotationInterval)
    });
  } catch (err) {
    next(err);
  }
}, errorHandler);

export default router;
