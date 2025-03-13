import express from 'express';
import { Router } from 'express';
import auth from '../middleware/auth.js';
import Ad from '../models/ad.js';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { v2 as cloudinary } from 'cloudinary';
import validate from '../middleware/validate.js';
import adValidationSchema from '../validationSchemas/adValidation.js';
import rateLimit from 'express-rate-limit';
import errorHandler from '../middleware/errorHandler.js';

// Konfiguracja Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Konfiguracja Multer-Storage-Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'ads',
    allowedFormats: ['jpg', 'jpeg', 'png'],
    transformation: [{ width: 800, height: 600, crop: 'limit' }]
  }
});

const upload = multer({ storage: storage });

const router = Router();

// Limiter dla trasy dodawania ogłoszenia
const createAdLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Zbyt wiele prób dodania ogłoszenia. Spróbuj ponownie za 15 minut.'
});

// Funkcja pomocnicza do tworzenia filtru ogłoszeń - zmodyfikowana
const createAdFilter = (query) => {
  const filter = {};
  
  // Podstawowe filtry tekstowe - tylko te, które są w modelu
  if (query.make) filter.make = query.make;
  if (query.model) filter.model = query.model;
  if (query.fuelType) filter.fuelType = query.fuelType;
  if (query.transmission) filter.transmission = query.transmission;
  
  // Filtry zakresowe
  // Cena
  if (query.minPrice || query.maxPrice || query.priceFrom || query.priceTo) {
    filter.price = {};
    if (query.minPrice) filter.price.$gte = parseFloat(query.minPrice);
    if (query.maxPrice) filter.price.$lte = parseFloat(query.maxPrice);
    if (query.priceFrom) filter.price.$gte = parseFloat(query.priceFrom);
    if (query.priceTo) filter.price.$lte = parseFloat(query.priceTo);
  }
  
  // Rok produkcji
  if (query.minYear || query.maxYear || query.yearFrom || query.yearTo) {
    filter.year = {};
    if (query.minYear) filter.year.$gte = parseInt(query.minYear);
    if (query.maxYear) filter.year.$lte = parseInt(query.maxYear);
    if (query.yearFrom) filter.year.$gte = parseInt(query.yearFrom);
    if (query.yearTo) filter.year.$lte = parseInt(query.yearTo);
  }
  
  // Przebieg
  if (query.minMileage || query.maxMileage || query.mileageFrom || query.mileageTo) {
    filter.mileage = {};
    if (query.minMileage) filter.mileage.$gte = parseInt(query.minMileage);
    if (query.maxMileage) filter.mileage.$lte = parseInt(query.maxMileage);
    if (query.mileageFrom) filter.mileage.$gte = parseInt(query.mileageFrom);
    if (query.mileageTo) filter.mileage.$lte = parseInt(query.mileageTo);
  }
  
  // Status ogłoszenia - domyślnie tylko opublikowane
  if (query.status) {
    filter.status = query.status;
  } else {
    filter.status = 'opublikowane';
  }
  
  // Typ ogłoszenia
  if (query.listingType) {
    filter.listingType = query.listingType;
  }
  
  return filter;
};

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

// Dodawanie ogłoszenia z walidacją i weryfikacją zdjęć
router.post('/add', auth, createAdLimiter, upload.array('images', 10), validate(adValidationSchema), async (req, res, next) => {
  try {
    const {
      make, model, year, price, mileage, fuelType, transmission, vin,
      registrationNumber, description, purchaseOptions, listingType
    } = req.body;

    const images = req.files.map(file => file.path);

    const newAd = new Ad({
      make,
      model,
      year,
      price,
      mileage,
      fuelType,
      transmission,
      vin,
      registrationNumber,
      description,
      images,
      purchaseOptions,
      listingType,
      owner: req.user._id,
      status: req.body.status || 'w toku' // Umożliwia bezpośrednie ustawienie statusu "opublikowane"
    });

    const ad = await newAd.save();
    // Resetowanie cache rotacji po dodaniu nowego ogłoszenia
    rotationCache.lastRotation = null;
    
    res.status(201).json(ad);
  } catch (err) {
    next(err);
  }
}, errorHandler);

// Paginacja, filtrowanie i sortowanie ogłoszeń
router.get('/', async (req, res, next) => {
  const { page = 1, limit = 10, make, model, minPrice, maxPrice, sortBy = 'createdAt', order = 'desc' } = req.query;

  const filter = createAdFilter({ make, model, minPrice, maxPrice });
  const sortOrder = order === 'desc' ? -1 : 1;

  try {
    // Pobierz wszystkie potrzebne pola z bazy danych
    const ads = await Ad.find(filter)
      .select('_id make model year price mileage fuelType transmission views status images description listingType')
      .sort({ [sortBy]: sortOrder })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const totalAds = await Ad.countDocuments(filter);

    res.status(200).json({
      ads,
      totalPages: Math.ceil(totalAds / limit),
      currentPage: parseInt(page),
    });
  } catch (err) {
    next(err);
  }
}, errorHandler);

// Zaawansowane wyszukiwanie ogłoszeń
router.get('/search', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || 'createdAt';
    const order = req.query.order || 'desc';
    
    // Tworzenie filtru z parametrów zapytania
    const filter = createAdFilter(req.query);
    
    // Wykonanie zapytania z filtrem i sortowaniem
    const sortOrder = order === 'desc' ? -1 : 1;
    const sortOptions = { [sortBy]: sortOrder };
    
    const ads = await Ad.find(filter)
      .select('_id make model year price mileage fuelType transmission views status images description listingType')
      .sort(sortOptions)
      .limit(limit)
      .skip((page - 1) * limit);
      
    // Liczba wszystkich pasujących ogłoszeń
    const total = await Ad.countDocuments(filter);
    
    res.status(200).json({
      ads,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalAds: total
    });
  } catch (err) {
    next(err);
  }
}, errorHandler);

// Pobieranie dostępnych marek
router.get('/makes', async (req, res, next) => {
  try {
    const makes = await Ad.distinct('make');
    res.status(200).json(makes);
  } catch (err) {
    next(err);
  }
}, errorHandler);

// Pobieranie modeli dla danej marki
router.get('/models', async (req, res, next) => {
  try {
    const { make } = req.query;
    if (!make) {
      return res.status(400).json({ message: 'Parametr make jest wymagany' });
    }
    
    const models = await Ad.distinct('model', { make });
    res.status(200).json(models);
  } catch (err) {
    next(err);
  }
}, errorHandler);

// Zmiana statusu ogłoszenia
router.put('/:id/status', auth, async (req, res, next) => {
  const { status } = req.body;

  if (!['w toku', 'opublikowane', 'archiwalne'].includes(status)) {
    return res.status(400).json({ message: 'Nieprawidłowy status ogłoszenia' });
  }

  try {
    const ad = await Ad.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({ message: 'Ogłoszenie nie znalezione' });
    }

    ad.status = status;
    await ad.save();

    res.status(200).json({ message: 'Status ogłoszenia zaktualizowany', ad });
  } catch (err) {
    next(err);
  }
}, errorHandler);

// Pobieranie szczegółów ogłoszenia oraz aktualizacja wyświetleń
router.get('/:id', async (req, res, next) => {
  try {
    const ad = await Ad.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({ message: 'Ogłoszenie nie znalezione' });
    }

    ad.views += 1;
    await ad.save();

    res.status(200).json(ad);
  } catch (err) {
    next(err);
  }
}, errorHandler);

// Pobieranie rotowanych ogłoszeń dla strony głównej
router.get('/rotated', async (req, res, next) => {
  try {
    const now = new Date();
    
    // Sprawdź czy należy wykonać nową rotację
    const shouldRotate = !rotationCache.lastRotation || 
      (now - rotationCache.lastRotation) > rotationCache.rotationInterval;
    
    if (!shouldRotate && rotationCache.featured) {
      return res.status(200).json({
        featured: rotationCache.featured,
        hot: rotationCache.hot,
        regular: rotationCache.regular,
        nextRotationTime: new Date(rotationCache.lastRotation.getTime() + rotationCache.rotationInterval)
      });
    }
    
    // Pobierz wszystkie opublikowane ogłoszenia
    const allAds = await Ad.find({ 
      status: 'opublikowane' 
    }).sort({ createdAt: -1 }).limit(100);
    
    // Podziel na wyróżnione i standardowe
    const featuredAds = allAds.filter(ad => ad.listingType === 'wyróżnione');
    const standardAds = allAds.filter(ad => ad.listingType === 'standardowe');
    
    // Wybierz ogłoszenia do poszczególnych sekcji
    const featured = getRandomAds(featuredAds, 2); // 2 główne wyróżnione
    
    // Wybierz "gorące oferty" z pozostałych wyróżnionych ogłoszeń
    const remainingFeatured = featuredAds.filter(
      ad => !featured.some(f => f._id.toString() === ad._id.toString())
    );
    const hot = getRandomAds(remainingFeatured, 4); // 4 "gorące oferty"
    
    // Wybierz standardowe ogłoszenia
    const regular = getRandomAds(standardAds, 6); // 6 zwykłych ogłoszeń
    
    // Aktualizacja cache
    rotationCache.featured = featured;
    rotationCache.hot = hot;
    rotationCache.regular = regular;
    rotationCache.lastRotation = now;
    
    res.status(200).json({
      featured,
      hot,
      regular,
      nextRotationTime: new Date(rotationCache.lastRotation.getTime() + rotationCache.rotationInterval)
    });
  } catch (err) {
    next(err);
  }
}, errorHandler);

// Wymuszenie nowej rotacji
router.post('/rotated/refresh', auth, async (req, res, next) => {
  try {
    // Resetuj cache
    rotationCache.lastRotation = null;
    
    // Pobierz nowe rotowane ogłoszenia
    const now = new Date();
    
    // Pobierz wszystkie opublikowane ogłoszenia
    const allAds = await Ad.find({ 
      status: 'opublikowane' 
    }).sort({ createdAt: -1 }).limit(100);
    
    // Podziel na wyróżnione i standardowe
    const featuredAds = allAds.filter(ad => ad.listingType === 'wyróżnione');
    const standardAds = allAds.filter(ad => ad.listingType === 'standardowe');
    
    // Wybierz ogłoszenia do poszczególnych sekcji
    const featured = getRandomAds(featuredAds, 2);
    
    const remainingFeatured = featuredAds.filter(
      ad => !featured.some(f => f._id.toString() === ad._id.toString())
    );
    const hot = getRandomAds(remainingFeatured, 4);
    
    const regular = getRandomAds(standardAds, 6);
    
    // Aktualizacja cache
    rotationCache.featured = featured;
    rotationCache.hot = hot;
    rotationCache.regular = regular;
    rotationCache.lastRotation = now;
    
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