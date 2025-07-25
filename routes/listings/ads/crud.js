/**
 * Ad CRUD Routes
 * Operacje tworzenia, odczytu, aktualizacji i usuwania ogłoszeń
 */

import { Router } from 'express';
import Ad from '../../../models/ad.js';
import User from '../../../models/user.js';
import auth from '../../../middleware/auth.js';
import validate from '../../../middleware/validate.js';
import adValidationSchema from '../../../validationSchemas/adValidation.js';
import rateLimit from 'express-rate-limit';
import errorHandler from '../../../middleware/errorHandler.js';
import { notificationService } from '../../../controllers/notifications/notificationController.js';
import { mapFormDataToBackend } from './helpers.js';

const router = Router();

// Rate limiter for adding ads - 1 ad per 5 minutes per user
const createAdLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 1, // 1 ad per 5 minutes
  message: 'You can only add 1 ad per 5 minutes. Please try again later.',
  // Use user ID as key if user is logged in
  keyGenerator: function (req) {
    // If user is logged in, use their ID as key
    if (req.user && req.user.userId) {
      return req.user.userId;
    }
    // Otherwise use IP address
    return req.ip;
  },
  // Don't apply limit for administrators
  skip: function (req) {
    return req.user && req.user.role === 'admin';
  }
});

/**
 * GET /:id - Get ad details and update views
 */
router.get('/:id', async (req, res, next) => {
  // Check if id is not one of our special paths
  if (req.params.id === 'stats' || req.params.id === 'rotated' || 
      req.params.id === 'brands' || req.params.id === 'models' || 
      req.params.id === 'search' || req.params.id === 'user' ||
      req.params.id === 'search-stats') {
    return next();
  }

  try {
    const ad = await Ad.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true, runValidators: false }
    );

    if (!ad) {
      return res.status(404).json({ message: 'Ad not found' });
    }

    // Convert Mongoose document to plain JavaScript object
    const adObj = ad.toObject();
    
    // Check if ad has images
    if (!adObj.images || adObj.images.length === 0) {
      adObj.images = [];
    } else {
      // Filter only non-empty images
      adObj.images = adObj.images.filter(imageUrl => imageUrl);
      
      // If no images after filtering, return empty array
      if (adObj.images.length === 0) {
        adObj.images = [];
      }
      
      // Transform image paths to full URLs
      adObj.images = adObj.images.map(imageUrl => {
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
    }

    console.log(`Returning ad ${adObj._id} with images:`, adObj.images);
    res.status(200).json(adObj);
  } catch (err) {
    next(err);
  }
}, errorHandler);

/**
 * POST /add - Add new ad with Supabase image URLs
 */
router.post('/add', auth, createAdLimiter, validate(adValidationSchema), async (req, res, next) => {
  try {
    console.log('Started adding ad with Supabase');
    console.log('Original data from frontend:', req.body);
    
    // Map data from frontend to backend
    const mappedData = mapFormDataToBackend(req.body);
    
    const {
      brand, model, generation, version, year, price, mileage, fuelType, transmission, vin,
      registrationNumber, headline, description, purchaseOptions, listingType, condition,
      accidentStatus, damageStatus, tuning, imported, registeredInPL, firstOwner, disabledAdapted,
      bodyType, color, lastOfficialMileage, power, engineSize, drive, doors, weight,
      voivodeship, city, rentalPrice, status, sellerType, images, mainImage // Receive URL array and main image
    } = mappedData;

    console.log('Data after mapping:', {
      brand, model, year, price, mileage, fuelType, transmission,
      description, purchaseOptions, listingType, sellerType, images
    });

    // Get user data
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate that `images` array exists and is not empty
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ message: 'Ad must contain at least one image.' });
    }
    console.log(`Received ${images.length} image URLs from Supabase:`, images);

    // Validate that `mainImage` is one of the URLs in `images`
    if (!mainImage || !images.includes(mainImage)) {
        // If no `mainImage` or it's not in `images`, set first image as main
        console.log('No `mainImage` or invalid URL. Setting first image as main.');
        req.body.mainImage = images[0];
    }

    // Generate short description from headline (up to 120 characters)
    const shortDescription = headline
      ? headline.substring(0, 120)
      : '';

    // Create new ad
    const newAd = new Ad({
      // Basic data
      brand,
      model,
      generation,
      version,
      year: parseInt(year),
      price: parseFloat(price),
      mileage: parseInt(mileage),
      fuelType,
      transmission,
      vin: vin || '',
      registrationNumber: registrationNumber || '',
      headline,
      description,
      shortDescription, // <-- added field
      images,
      mainImage: req.body.mainImage, // Use validated or default mainImage
      purchaseOptions,
      negotiable: req.body.negotiable || 'Nie', // <-- added negotiable field
      listingType,
      sellerType, // <-- added sellerType field
      
      // Technical data
      condition,
      accidentStatus,
      damageStatus,
      tuning,
      imported,
      registeredInPL,
      firstOwner,
      disabledAdapted,
      bodyType,
      color,
      lastOfficialMileage: lastOfficialMileage ? parseInt(lastOfficialMileage) : undefined,
      power: power ? parseInt(power) : undefined,
      engineSize: engineSize ? parseInt(engineSize) : undefined,
      drive,
      doors: doors ? parseInt(doors) : undefined,
      weight: weight ? parseInt(weight) : undefined,
      
      // Location
      voivodeship,
      city,
      
      // Rental
      rentalPrice: rentalPrice ? parseFloat(rentalPrice) : undefined,
      
      // Owner data
      owner: req.user.userId,
      ownerName: user.name,
      ownerLastName: user.lastName,
      ownerEmail: user.email,
      ownerPhone: user.phoneNumber,
      ownerRole: user.role, // Add owner role
      
      // Status - always pending (payment simulation)
      status: 'pending'
    });

    console.log('Created ad object, attempting to save to database');
    
    // Save ad to database
    const ad = await newAd.save();
    console.log('Ad saved to database:', ad._id);
    
    // Create notification about ad creation
    try {
      const adTitle = headline || `${brand} ${model}`;
      await notificationService.notifyAdCreated(req.user.userId, adTitle);
      console.log(`Created notification about ad creation for user ${req.user.userId}`);
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't interrupt main process in case of notification error
    }
    
    // Response with created ad
    res.status(201).json(ad);
  } catch (err) {
    console.error('Error adding ad:', err);
    next(err);
  }
}, errorHandler);

/**
 * PUT /:id/status - Change ad status
 */
router.put('/:id/status', auth, async (req, res, next) => {
  const { status } = req.body;

  if (!['pending', 'active', 'rejected', 'needs_changes', 'sold', 'archived'].includes(status)) {
    return res.status(400).json({ message: 'Invalid ad status' });
  }

  try {
    const ad = await Ad.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({ message: 'Ad not found' });
    }

    // Check if user is owner or admin
    if (ad.owner.toString() !== req.user.userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'No permission to change status of this ad' });
    }

    // Save previous status for comparison
    const previousStatus = ad.status;
    
    // Update status
    ad.status = status;
    await ad.save();
    
    // Create notification about ad status change
    if (previousStatus !== status) {
      try {
        const adTitle = ad.headline || `${ad.brand} ${ad.model}`;
        await notificationService.notifyAdStatusChange(ad.owner.toString(), adTitle, status);
        console.log(`Created notification about ad status change for user ${ad.owner}`);
      } catch (notificationError) {
        console.error('Error creating notification:', notificationError);
        // Don't interrupt main process in case of notification error
      }
    }

    res.status(200).json({ message: 'Ad status updated', ad });
  } catch (err) {
    next(err);
  }
}, errorHandler);

/**
 * PATCH /:id/images - Update images in ad
 */
router.patch('/:id/images', auth, async (req, res, next) => {
  try {
    const ad = await Ad.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({ message: 'Ad not found' });
    }

    // Check if user is owner or admin
    if (ad.owner.toString() !== req.user.userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'No permission to update images of this ad' });
    }

    const { images, mainImage } = req.body;

    if (images && Array.isArray(images)) {
      ad.images = images;
    }

    if (mainImage) {
      ad.mainImage = mainImage;
    }

    await ad.save();

    res.status(200).json({ message: 'Ad images updated', ad });
  } catch (err) {
    next(err);
  }
}, errorHandler);

/**
 * PUT /:id/main-image - Set main image of ad
 */
router.put('/:id/main-image', auth, async (req, res, next) => {
  const { mainImageIndex } = req.body;

  try {
    const ad = await Ad.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({ message: 'Ad not found' });
    }

    // Check if user is owner or admin
    if (ad.owner.toString() !== req.user.userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'No permission to change main image of this ad' });
    }

    ad.mainImage = ad.images[mainImageIndex];
    await ad.save();

    res.status(200).json(ad);
  } catch (err) {
    next(err);
  }
}, errorHandler);

/**
 * PUT /:id - Update ad
 */
router.put('/:id', auth, async (req, res, next) => {
  try {
    const ad = await Ad.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({ message: 'Ad not found' });
    }

    // Check if user is owner or admin
    if (ad.owner.toString() !== req.user.userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'No permission to edit this ad' });
    }

    // Fields that can be updated - extended list
    const updatableFields = [
      // Basic information
      'description', 'price', 'city', 'voivodeship', 'color',
      'headline', 'mainImage', 'images', 'mileage', 'negotiable',
      
      // Technical data
      'condition', 'accidentStatus', 'damageStatus', 'tuning', 
      'imported', 'registeredInPL', 'firstOwner', 'disabledAdapted',
      'bodyType', 'lastOfficialMileage', 'power', 'engineSize', 
      'drive', 'doors', 'weight', 'rentalPrice', 'countryOfOrigin',
      
      // Identifiers (only for admins)
      ...(req.user.role === 'admin' ? ['vin', 'registrationNumber'] : []),
      
      // Purchase options
      'purchaseOptions'
    ];

    console.log('Updating ad:', req.params.id);
    console.log('Data to update:', req.body);

    // Update only allowed fields
    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        console.log(`Updating field ${field}: ${ad[field]} -> ${req.body[field]}`);
        ad[field] = req.body[field];
      }
    });

    // Special handling for mainImageIndex - convert to mainImage
    if (req.body.mainImageIndex !== undefined && ad.images && ad.images.length > 0) {
      const index = parseInt(req.body.mainImageIndex);
      if (index >= 0 && index < ad.images.length) {
        ad.mainImage = ad.images[index];
        console.log(`Set main image to index ${index}: ${ad.mainImage}`);
      }
    }

    // Automatic generation of shortDescription from headline or description
    if (req.body.description || req.body.headline) {
      const sourceText = req.body.headline || ad.headline || req.body.description || ad.description;
      ad.shortDescription = sourceText ? sourceText.substring(0, 120) : '';
      console.log('Generated shortDescription:', ad.shortDescription);
    }

    // Save changes
    await ad.save();

    console.log('Ad updated successfully');
    res.status(200).json({ message: 'Ad updated', ad });
  } catch (err) {
    console.error('Error updating ad:', err);
    next(err);
  }
}, errorHandler);

/**
 * DELETE /:id/images/:index - Remove image from ad
 */
router.delete('/:id/images/:index', auth, async (req, res, next) => {
  try {
    const ad = await Ad.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({ message: 'Ad not found' });
    }

    // Check if user is owner or admin
    if (ad.owner.toString() !== req.user.userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'No permission to remove image from this ad' });
    }

    const imageIndex = parseInt(req.params.index);
    
    // Check if index is valid
    if (imageIndex < 0 || imageIndex >= ad.images.length) {
      return res.status(400).json({ message: 'Invalid image index' });
    }

    // Don't allow removing the last image
    if (ad.images.length <= 1) {
      return res.status(400).json({ message: 'Cannot remove the last image from ad' });
    }

    // Remove image from array
    const removedImage = ad.images[imageIndex];
    ad.images.splice(imageIndex, 1);
    
    // If removed image was main, set new main
    if (ad.mainImage === removedImage) {
      ad.mainImage = ad.images[0];
    }

    await ad.save();

    res.status(200).json({ 
      message: 'Image has been removed',
      ad: ad
    });
  } catch (err) {
    console.error('Error removing image:', err);
    next(err);
  }
}, errorHandler);

/**
 * POST /:id/renew - Renew expired ad
 */
router.post('/:id/renew', auth, async (req, res, next) => {
  try {
    const ad = await Ad.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({ message: 'Ad not found' });
    }

    // Check if user is owner or admin
    if (ad.owner.toString() !== req.user.userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'No permission to renew this ad' });
    }

    // Check if ad has archived status
    if (ad.status !== 'archived') {
      return res.status(400).json({ message: 'Only finished ads can be renewed' });
    }

    // Set new expiry date (30 days from now) - only for regular users
    if (ad.ownerRole !== 'admin') {
      const newExpiryDate = new Date();
      newExpiryDate.setDate(newExpiryDate.getDate() + 30);
      ad.expiresAt = newExpiryDate;
    }

    // Change status to active
    ad.status = 'active';
    
    // Save changes
    await ad.save();

    // Create notification about ad renewal
    try {
      const adTitle = ad.headline || `${ad.brand} ${ad.model}`;
      await notificationService.notifyAdStatusChange(ad.owner.toString(), adTitle, 'odnowione');
      console.log(`Created notification about ad renewal for user ${ad.owner}`);
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't interrupt main process in case of notification error
    }

    res.status(200).json({ 
      message: 'Ad has been renewed', 
      ad,
      expiresAt: ad.expiresAt 
    });
  } catch (err) {
    console.error('Error renewing ad:', err);
    next(err);
  }
}, errorHandler);

/**
 * POST /:id/images - Add images to ad
 */
router.post('/:id/images', auth, async (req, res, next) => {
  try {
    const { images } = req.body;
    const ad = await Ad.findByIdAndUpdate(
      req.params.id,
      { $push: { images: { $each: images } } },
      { new: true }
    );
    res.json(ad);
  } catch (err) {
    next(err);
  }
}, errorHandler);

/**
 * DELETE /:id - Delete ad
 */
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const ad = await Ad.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({ message: 'Ad not found' });
    }

    // Check if user is owner or admin
    if (ad.owner.toString() !== req.user.userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'No permission to delete this ad' });
    }

    // Remove ad from database
    await Ad.findByIdAndDelete(req.params.id);

    // Create notification about ad deletion
    try {
      const adTitle = ad.headline || `${ad.brand} ${ad.model}`;
      await notificationService.notifyAdStatusChange(ad.owner.toString(), adTitle, 'usunięte');
      console.log(`Created notification about ad deletion for user ${ad.owner}`);
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't interrupt main process in case of notification error
    }

    res.status(200).json({ message: 'Ad has been deleted' });
  } catch (err) {
    console.error('Error deleting ad:', err);
    next(err);
  }
}, errorHandler);

export default router;
