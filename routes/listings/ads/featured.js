/**
 * Featured and Rotated Ads Routes
 * Obsługa wyróżnionych i rotowanych ogłoszeń
 */

import { Router } from 'express';
import Ad from '../../../models/ad.js';
import auth from '../../../middleware/auth.js';
import errorHandler from '../../../middleware/errorHandler.js';
import { processAdImages, getRandomAds } from './helpers.js';

const router = Router();

// Cache for ad rotation
const rotationCache = {
  featured: null,
  hot: null,
  regular: null,
  lastRotation: null,
  rotationInterval: 12 * 60 * 60 * 1000 // 12 hours
};

/**
 * GET /user/listings - Get user's ads
 */
router.get('/user/listings', auth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    console.log('Getting user ads:', req.user.userId);
    console.log('Query parameters:', { page, limit });
    
    const userListings = await Ad.find({ owner: req.user.userId })
      .populate('owner', 'role name email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);
    
    console.log('Found user ads:', userListings.length);
    console.log('Ad details:', userListings.map(ad => ({ 
      id: ad._id, 
      brand: ad.brand, 
      model: ad.model,
      listingType: ad.listingType,
      status: ad.status
    })));
    
    // Add additional logging to see full structure of ads
    if (userListings.length > 0) {
      console.log('Full structure of first ad:', JSON.stringify(userListings[0], null, 2));
    }
    
    const total = await Ad.countDocuments({ owner: req.user.userId });
    console.log('Total user ads:', total);
    
    res.status(200).json({
      ads: userListings,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalAds: total
    });
  } catch (err) {
    console.error('Error getting user ads:', err);
    next(err);
  }
}, errorHandler);

/**
 * GET /rotated - Get rotated ads for homepage
 */
router.get('/rotated', async (req, res, next) => {
  try {
    const now = new Date();

    // Log all ads before filtering
    const allAds = await Ad.find({ status: { $in: ['active', 'opublikowane'] } });
    console.log("All ads found in DB:", allAds.map(ad => ({ id: ad._id, listingType: ad.listingType, status: ad.status })));

    // Get 6 newest featured ads
    const featuredAds = await Ad.find({
      status: { $in: ['active', 'opublikowane'] },
      listingType: { $in: ['wyróżnione', 'featured', 'premium'] },
      $or: [
        { expiresAt: { $gt: now } },
        { expiresAt: null },
        { ownerRole: 'admin' }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(6);
    
    console.log(`Found ${featuredAds.length} featured ads.`);

    // Get 6 newest regular ads
    const regularAds = await Ad.find({
      status: { $in: ['active', 'opublikowane'] },
      listingType: { $nin: ['wyróżnione', 'featured', 'premium'] },
      $or: [
        { expiresAt: { $gt: now } },
        { expiresAt: null },
        { ownerRole: 'admin' }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(6);

    console.log(`Found ${regularAds.length} regular ads.`);

    const processedFeatured = featuredAds.map(processAdImages);
    const processedRegular = regularAds.map(processAdImages);

    const featured = processedFeatured.slice(0, 2);
    const hot = processedFeatured.slice(2, 6);
    const regular = processedRegular;

    res.status(200).json({
      featured,
      hot,
      regular
    });

  } catch (err) {
    console.error('Error in /api/ads/rotated endpoint:', err);
    next(err);
  }
}, errorHandler);

/**
 * POST /rotated/refresh - Force new rotation
 */
router.post('/rotated/refresh', auth, async (req, res, next) => {
  try {
    // Reset cache
    rotationCache.lastRotation = null;
    
    // Get new rotated ads
    const now = new Date();
    
    // Get all active ads with mainImageIndex consideration
    const allAds = await Ad.find({ 
      status: { $in: ['active', 'opublikowane', 'pending'] }, // Include all possible active statuses
      $or: [
        { expiresAt: { $gt: now } },  // Non-expired ads
        { expiresAt: null },          // Ads without expiry date (admin)
        { ownerRole: 'admin' }        // All admin ads, regardless of expiry date
      ]
    })
    .select({
      _id: 1,
      brand: 1,
      model: 1,
      generation: 1,
      version: 1,
      year: 1,
      price: 1,
      mileage: 1,
      fuelType: 1,
      transmission: 1,
      headline: 1,
      description: 1,
      images: 1,
      mainImage: 1,
      listingType: 1,
      condition: 1,
      power: 1,
      engineSize: 1,
      drive: 1,
      doors: 1,
      weight: 1,
      createdAt: 1,
    })
    .sort({ createdAt: -1 })
    .limit(100);
    
    console.log('All ads before filtering (refresh):', allAds.map(ad => ({ id: ad._id, listingType: ad.listingType, status: ad.status })));
    
    // Check and transform images for each ad
    const processedAds = allAds.map(ad => {
      const adObj = ad.toObject();
      
      // If ad has no images, skip it
      if (!adObj.images || adObj.images.length === 0) {
        return null;
      }
      
      // Filter only non-empty images
      const validImages = adObj.images.filter(imageUrl => imageUrl);
      
      if (validImages.length > 0) {
        console.log(`Ad ${adObj._id} has ${validImages.length} images`);
        
        // Transform image paths to full URLs
        adObj.images = validImages.map(imageUrl => {
          if (imageUrl.startsWith('http')) {
            return imageUrl;
          } else if (imageUrl.startsWith('/uploads/')) {
            return `${process.env.BACKEND_URL || 'http://localhost:5000'}${imageUrl}`;
          } else if (imageUrl.startsWith('uploads/')) {
            return `${process.env.BACKEND_URL || 'http://localhost:5000'}/${imageUrl}`;
          } else {
            return `${process.env.BACKEND_URL || 'http://localhost:5000'}/uploads/${imageUrl}`;
          }
        });
      } else {
        // If no valid images after filtering, skip ad
        return null;
      }
      
      return adObj;
    }).filter(ad => ad !== null); // Remove empty entries
    
    // Filter ads without images
    const adsWithImages = processedAds.filter(ad => ad.images.length > 0);
    console.log(`After image filtering: ${adsWithImages.length} ads with valid images`);

    // More flexible filtering - considers different possible values for listingType field
    const featuredAds = adsWithImages.filter(ad => {
      // Check different possible values for featured ads
      if (!ad.listingType) return false;
      
      // Don't use toLowerCase() for Polish characters
      const listingType = String(ad.listingType);
      const isFeatured = listingType === 'wyróżnione' || 
                         listingType === 'wyroznione' || 
                         listingType === 'featured' || 
                         listingType === 'premium' ||
                         listingType === 'vip' ||
                         listingType.includes('wyróżnione') || 
                         listingType.includes('wyroznione') || 
                         listingType.includes('featured');
      
      console.log(`Ad ${ad._id}: listingType=${ad.listingType}, isFeatured=${isFeatured}`);
      return isFeatured;
    });
    
    // All remaining ads treat as standard
    const standardAds = adsWithImages.filter(ad => !featuredAds.some(featured => featured._id.toString() === ad._id.toString()));
    
    console.log('Featured ads after filtering (refresh):', featuredAds.length, featuredAds.map(ad => ad._id));
    console.log('Standard ads after filtering (refresh):', standardAds.length, standardAds.map(ad => ad._id));
    
    // Select ads for individual sections
    const featured = getRandomAds(featuredAds, 2);
    
    const remainingFeatured = featuredAds.filter(
      ad => !featured.some(f => f._id.toString() === ad._id.toString())
    );
    const hot = getRandomAds(remainingFeatured, 4);
    
    const regular = getRandomAds(standardAds, 6);
    
    // Update cache
    rotationCache.featured = featured;
    rotationCache.hot = hot;
    rotationCache.regular = regular;
    rotationCache.lastRotation = now;
    
    res.status(200).json({ 
      message: 'Rotation refreshed',
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
