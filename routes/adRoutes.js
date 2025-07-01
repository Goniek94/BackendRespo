import express from 'express';
import { Router } from 'express';
import auth from '../middleware/auth.js';
import Ad from '../models/ad.js';
import User from '../models/user.js';
import path from 'path';
import fs from 'fs';
import validate from '../middleware/validate.js';
import adValidationSchema from '../validationSchemas/adValidation.js';
import rateLimit from 'express-rate-limit';
import errorHandler from '../middleware/errorHandler.js';
import { notificationService } from '../controllers/notificationController.js';
import { upload, uploadToCloudinaryMiddleware, deleteCloudinaryImage, extractPublicIdFromUrl } from '../middleware/cloudinaryUploader.js';

// Upewniamy się, że folder temp istnieje z odpowiednimi uprawnieniami
if (!fs.existsSync('temp')) {
  console.log('Tworzenie folderu temp...');
  fs.mkdirSync('temp', { recursive: true, mode: 0o755 });
  console.log('Folder temp utworzony pomyślnie!');
}

const router = Router();

// Limiter dla trasy dodawania ogłoszenia - 1 ogłoszenie na 5 minut per użytkownik
const createAdLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minut
  max: 1, // 1 ogłoszenie na 5 minut
  message: 'Możesz dodać tylko 1 ogłoszenie na 5 minut. Spróbuj ponownie później.',
  // Używamy ID użytkownika jako klucza, jeśli użytkownik jest zalogowany
  keyGenerator: function (req) {
    // Jeśli użytkownik jest zalogowany, używamy jego ID jako klucza
    if (req.user && req.user.userId) {
      return req.user.userId;
    }
    // W przeciwnym razie używamy adresu IP
    return req.ip;
  },
  // Nie stosuj limitu dla administratorów
  skip: function (req) {
    return req.user && req.user.role === 'admin';
  }
});

// Funkcja pomocnicza do tworzenia filtru ogłoszeń - zmodyfikowana
const createAdFilter = (query) => {
  const filter = {};
  
  // Podstawowe filtry tekstowe - tylko te, które są w modelu
  if (query.brand) filter.brand = query.brand;
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
  // Jeśli nie podano listingType, NIE filtruj po tym polu (pozwól na brak listingType)
  
  // Dodatkowe filtry
  if (query.generation) filter.generation = query.generation;
  if (query.bodyType) filter.bodyType = query.bodyType;
  if (query.condition) filter.condition = query.condition;
  if (query.power) filter.power = parseInt(query.power);
  if (query.drive) filter.drive = query.drive;
  
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

// Paginacja, filtrowanie i sortowanie ogłoszeń
// Endpoint zwracający liczbę ogłoszeń pasujących do kryteriów
router.get('/count', async (req, res, next) => {
  try {
    const filter = createAdFilter(req.query);
    const count = await Ad.countDocuments(filter);
    
    console.log('Zapytanie o liczbę ogłoszeń z filtrami:', req.query);
    console.log('Znaleziono pasujących ogłoszeń:', count);
    
    res.status(200).json({ count });
  } catch (err) {
    console.error('Błąd podczas liczenia ogłoszeń:', err);
    next(err);
  }
}, errorHandler);

router.get('/', async (req, res, next) => {
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

  // Usuwamy filtr statusu, aby pokazać wszystkie ogłoszenia
  const filter = createAdFilter({ brand, model, minPrice, maxPrice, listingType });
  delete filter.status; // Usuwamy filtr statusu, aby pokazać wszystkie ogłoszenia
  
  console.log('Filtr dla listy ogłoszeń:', filter);
  
  const sortOptions = {};
  sortOptions[sortBy] = order === 'desc' ? -1 : 1;

  try {
    let query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Jeśli filtrujemy tylko wyróżnione ogłoszenia
    if (filter.listingType === 'wyróżnione') {
      query = Ad.find(filter);
    } else {
      // Standardowe zachowanie - wyróżnione na górze, potem reszta
      query = Ad.aggregate([
        { $match: filter },
        { $addFields: { 
          sortOrder: { 
            $cond: { 
              if: { $eq: ["$listingType", "wyróżnione"] }, 
              then: 0, 
              else: 1 
            } 
          } 
        }},
        { $sort: { sortOrder: 1, [sortBy]: order === 'desc' ? -1 : 1 } },
        { $skip: skip },
        { $limit: parseInt(limit) },
        // Dodajemy projection, żeby zawsze zwracać kluczowe pola
        { $project: {
          _id: 1,
          brand: 1,
          model: 1,
          headline: 1,
          shortDescription: 1,
          description: 1,
          images: 1,
          mainImageIndex: 1,
          price: 1,
          year: 1,
          mileage: 1,
          fuelType: 1,
          power: 1,
          transmission: 1,
          status: 1,
          listingType: 1,
          createdAt: 1,
          views: 1
        }}
      ]);
    }

    const ads = await query;
    const totalAds = await Ad.countDocuments(filter);

    console.log('Liczba znalezionych ogłoszeń:', ads.length);
    console.log('Statusy znalezionych ogłoszeń:', ads.map(ad => ad.status));

    // Tymczasowe logowanie pierwszego ogłoszenia do analizy struktury
    if (ads && ads.length > 0) {
      console.log('Przykładowy rekord ogłoszenia zwracany do frontu:', ads[0]);
    }

    res.status(200).json({
      ads,
      totalPages: Math.ceil(totalAds / parseInt(limit)),
      currentPage: parseInt(page),
      totalAds
    });
  } catch (err) {
    next(err);
  }
}, errorHandler);

/**
 * Zaawansowane wyszukiwanie ogłoszeń z systemem punktowym i sortowaniem według dopasowania.
 * Hierarchia sortowania:
 * 1. Wyróżnione + pasujące dokładnie
 * 2. Wyróżnione + pasujące częściowo
 * 3. Zwykłe + pasujące dokładnie
 * 4. Zwykłe + pasujące częściowo
 * 5. Podobne (ta sama marka, inny model)
 * 6. Pozostałe
 * 
 * Zwraca wszystkie ogłoszenia, posortowane według match_score i typu ogłoszenia.
 */
router.get('/search', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;

    // Pobieramy WSZYSTKIE ogłoszenia bez filtrowania po statusie
    const allAds = await Ad.find({});
    
    console.log('Liczba wszystkich ogłoszeń w wyszukiwarce:', allAds.length);
    console.log('Statusy ogłoszeń w wyszukiwarce:', allAds.map(ad => ad.status));

    // Funkcja licząca match_score względem filtrów
    function calculateMatchScore(ad, filters) {
      let score = 0;

      // Pomocnicza funkcja do porównywania stringów bez uwzględniania wielkości liter i białych znaków
      const normalize = (str) =>
        typeof str === 'string' ? str.trim().toLowerCase() : '';

      // Dokładna marka + model
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
        // Dokładna marka
        score += 50;
      }
      // Zakres cenowy
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
      // Zakres rocznika
      if (
        filters.minYear &&
        filters.maxYear &&
        ad.year >= parseInt(filters.minYear) &&
        ad.year <= parseInt(filters.maxYear)
      ) {
        score += 20;
      } else if (filters.minYear && ad.year >= parseInt(filters.minYear)) {
        score += 10;
      } else if (filters.maxYear && ad.year <= parseInt(filters.maxYear)) {
        score += 10;
      }
      // Typ paliwa
      if (
        filters.fuelType &&
        normalize(ad.fuelType) === normalize(filters.fuelType)
      ) {
        score += 10;
      }
      // Skrzynia biegów
      if (
        filters.transmission &&
        normalize(ad.transmission) === normalize(filters.transmission)
      ) {
        score += 5;
      }
      // Dodatkowe filtry (np. bodyType, power, drive)
      if (
        filters.bodyType &&
        normalize(ad.bodyType) === normalize(filters.bodyType)
      ) {
        score += 5;
      }
      if (filters.power && ad.power && ad.power === parseInt(filters.power)) {
        score += 3;
      }
      if (
        filters.drive &&
        normalize(ad.drive) === normalize(filters.drive)
      ) {
        score += 2;
      }
      // Podobne ogłoszenia (ta sama marka, inny model)
      if (
        filters.brand &&
        normalize(ad.brand) === normalize(filters.brand) &&
        filters.model &&
        normalize(ad.model) !== normalize(filters.model)
      ) {
        score += 1;
      }
      return score;
    }

    // Wyciągamy filtry z zapytania
    const filters = req.query;

    // Debug: loguj filtry i pierwsze 3 ogłoszenia po scoringu
    console.log('--- [DEBUG] /ads/search ---');
    console.log('Filtry z frontendu:', filters);

    // Liczymy match_score dla każdego ogłoszenia
    const adsWithScore = allAds.map(ad => {
      const match_score = calculateMatchScore(ad, filters);
      // is_featured: 1 jeśli wyróżnione, 0 jeśli zwykłe
      const is_featured = ad.listingType === 'wyróżnione' ? 1 : 0;
      return {
        ...ad.toObject(),
        match_score,
        is_featured
      };
    });

    // Debug: loguj pierwsze 3 ogłoszenia po scoringu
    console.log('Pierwsze 3 ogłoszenia po scoringu:');
    adsWithScore.slice(0, 3).forEach(ad => {
      console.log({
        brand: ad.brand,
        model: ad.model,
        match_score: ad.match_score,
        is_featured: ad.is_featured
      });
    });

    // Sortowanie: is_featured DESC, match_score DESC, createdAt DESC
    adsWithScore.sort((a, b) => {
      if (b.is_featured !== a.is_featured) return b.is_featured - a.is_featured;
      if (b.match_score !== a.match_score) return b.match_score - a.match_score;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Paginacja
    const paginatedAds = adsWithScore.slice(skip, skip + limit);

    res.status(200).json({
      ads: paginatedAds,
      currentPage: page,
      totalPages: Math.ceil(adsWithScore.length / limit),
      totalAds: adsWithScore.length
    });
  } catch (err) {
    next(err);
  }
}, errorHandler);

// Pobieranie dostępnych marek
router.get('/brands', async (req, res, next) => {
  try {
    const brands = await Ad.distinct('brand');
    res.status(200).json(brands);
  } catch (err) {
    next(err);
  }
}, errorHandler);

// Pobieranie modeli dla danej marki
router.get('/models', async (req, res, next) => {
  try {
    const { brand } = req.query;
    if (!brand) {
      return res.status(400).json({ message: 'Parametr brand jest wymagany' });
    }
    
    const models = await Ad.distinct('model', { brand });
    res.status(200).json(models);
  } catch (err) {
    next(err);
  }
}, errorHandler);

// Pobieranie ogłoszeń użytkownika
router.get('/user/listings', auth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    console.log('Pobieranie ogłoszeń użytkownika:', req.user.userId);
    console.log('Parametry zapytania:', { page, limit });
    
    const userListings = await Ad.find({ owner: req.user.userId })
      .populate('owner', 'role name email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);
    
    console.log('Znalezione ogłoszenia użytkownika:', userListings.length);
    console.log('Szczegóły ogłoszeń:', userListings.map(ad => ({ 
      id: ad._id, 
      brand: ad.brand, 
      model: ad.model,
      listingType: ad.listingType,
      status: ad.status
    })));
    
    // Dodajemy dodatkowe logowanie, aby zobaczyć pełną strukturę ogłoszeń
    if (userListings.length > 0) {
      console.log('Pełna struktura pierwszego ogłoszenia:', JSON.stringify(userListings[0], null, 2));
    }
    
    const total = await Ad.countDocuments({ owner: req.user.userId });
    console.log('Całkowita liczba ogłoszeń użytkownika:', total);
    
    res.status(200).json({
      ads: userListings,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalAds: total
    });
  } catch (err) {
    console.error('Błąd podczas pobierania ogłoszeń użytkownika:', err);
    next(err);
  }
}, errorHandler);


// Pobieranie rotowanych ogłoszeń dla strony głównej
router.get('/rotated', async (req, res, next) => {
  try {
    const now = new Date();

    // Pobierz tylko aktywne, niewygasłe ogłoszenia
    const allAds = await Ad.find({
      status: 'active',
      $or: [
        { expiresAt: { $gt: now } }, // Niewygasłe ogłoszenia
        { expiresAt: null }          // Ogłoszenia bez daty wygaśnięcia (admin)
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
      mainImageIndex: 1,
      listingType: 1,
      condition: 1,
      power: 1,
      engineSize: 1,
      drive: 1,
      doors: 1,
      weight: 1,
      createdAt: 1,
      status: 1,
      cloudinaryIds: 1
    })
    .sort({ createdAt: -1 });

    console.log('Wszystkie ogłoszenia:', allAds.length);
    console.log('Statusy ogłoszeń:', allAds.map(ad => ad.status));

    // Sprawdź i przekształć zdjęcia dla każdego ogłoszenia, zachowaj wszystkie ogłoszenia ale z poprawnymi zdjęciami
    const processedAds = allAds.map(ad => {
      const adObj = ad.toObject();
      
      // Domyślne zdjęcie do użycia, jeśli ogłoszenie nie ma zdjęć Cloudinary
      const defaultImage = "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg";
      
      // Sprawdź, czy ogłoszenie ma zdjęcia
      if (!adObj.images || adObj.images.length === 0) {
        console.log(`Ogłoszenie ${adObj._id} nie ma zdjęć, dodaję domyślne`);
        adObj.images = [defaultImage]; // Dodaj domyślne zdjęcie
        return adObj;
      }
      
      // Przefiltruj obrazy, zatrzymując tylko te z Cloudinary
      const cloudinaryImages = adObj.images.filter(imageUrl => {
        if (!imageUrl) return false;
        return imageUrl.includes('res.cloudinary.com');
      });
      
      // Jeśli mamy zdjęcia Cloudinary, użyj ich
      if (cloudinaryImages.length > 0) {
        console.log(`Ogłoszenie ${adObj._id} ma ${cloudinaryImages.length} zdjęć Cloudinary`);
        adObj.images = cloudinaryImages;
      } else {
        console.log(`Ogłoszenie ${adObj._id} nie ma zdjęć Cloudinary, używam domyślnego`);
        // Jeśli nie ma zdjęć Cloudinary, użyj domyślnego zdjęcia
        adObj.images = [defaultImage];
      }
      
      return adObj;
    });
    
    console.log(`Liczba wszystkich ogłoszeń po przetworzeniu zdjęć: ${processedAds.length}`);

    // Bardziej elastyczne filtrowanie - uwzględnia różne możliwe wartości pola listingType
    const featuredAds = processedAds.filter(ad => {
      if (!ad.listingType) return false;
      const listingType = String(ad.listingType).toLowerCase();
      const isFeatured = listingType === 'wyróżnione' || 
                         listingType === 'wyroznione' || 
                         listingType === 'featured' || 
                         listingType === 'premium' ||
                         listingType === 'vip' ||
                         listingType.includes('wyróżnione') || 
                         listingType.includes('wyroznione') || 
                         listingType.includes('featured');
      return isFeatured;
    });

    // Wszystkie pozostałe ogłoszenia traktuj jako standardowe (w tym te bez listingType)
    const standardAds = processedAds.filter(ad => !featuredAds.some(featured => featured._id.toString() === ad._id.toString()));

    console.log('Wyróżnione ogłoszenia:', featuredAds.length);
    console.log('Standardowe ogłoszenia:', standardAds.length);

    // Zwracamy wszystkie ogłoszenia bez losowego wybierania
    const featured = featuredAds.slice(0, Math.min(2, featuredAds.length));
    const remainingFeatured = featuredAds.filter(
      ad => !featured.some(f => f._id.toString() === ad._id.toString())
    );
    const hot = remainingFeatured.slice(0, Math.min(4, remainingFeatured.length));
    const regular = standardAds.slice(0, Math.min(6, standardAds.length));

    // Aktualizacja cache
    rotationCache.featured = featured;
    rotationCache.hot = hot;
    rotationCache.regular = regular;
    rotationCache.lastRotation = now;

    // Tymczasowe logowanie przykładowego ogłoszenia do analizy images
    if (featured.length > 0) {
      console.log('FEATURED[0] IMAGES:', featured[0].images);
      console.log('FEATURED[0] DETAILS:', {
        id: featured[0]._id,
        brand: featured[0].brand,
        model: featured[0].model,
        listingType: featured[0].listingType,
        status: featured[0].status,
        mainImageIndex: featured[0].mainImageIndex
      });
    }
    if (hot.length > 0) {
      console.log('HOT[0] IMAGES:', hot[0].images);
      console.log('HOT[0] DETAILS:', {
        id: hot[0]._id,
        brand: hot[0].brand,
        model: hot[0].model,
        listingType: hot[0].listingType,
        status: hot[0].status,
        mainImageIndex: hot[0].mainImageIndex
      });
    }
    if (regular.length > 0) {
      console.log('REGULAR[0] IMAGES:', regular[0].images);
      console.log('REGULAR[0] DETAILS:', {
        id: regular[0]._id,
        brand: regular[0].brand,
        model: regular[0].model,
        listingType: regular[0].listingType,
        status: regular[0].status,
        mainImageIndex: regular[0].mainImageIndex
      });
    }

    res.status(200).json({
      featured,
      hot,
      regular,
      nextRotationTime: new Date(rotationCache.lastRotation.getTime() + rotationCache.rotationInterval)
    });
  } catch (err) {
    console.error('Błąd w endpointzie /api/ads/rotated:', err);
    if (err && err.stack) {
      console.error('Stacktrace:', err.stack);
    }
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
    
    // Pobierz wszystkie opublikowane ogłoszenia z uwzględnieniem mainImageIndex
    const allAds = await Ad.find({ 
      status: 'opublikowane'
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
      mainImageIndex: 1,
      listingType: 1,
      condition: 1,
      power: 1,
      engineSize: 1,
      drive: 1,
      doors: 1,
      weight: 1,
      createdAt: 1,
      cloudinaryIds: 1
    })
    .sort({ createdAt: -1 })
    .limit(100);
    
    console.log('Wszystkie ogłoszenia przed filtrowaniem (refresh):', allAds.map(ad => ({ id: ad._id, listingType: ad.listingType, status: ad.status })));
    
    // Sprawdź i przekształć zdjęcia dla każdego ogłoszenia, aby upewnić się, że używamy tylko zdjęć z Cloudinary
    const adsWithValidImages = allAds.map(ad => {
      const adObj = ad.toObject();
      
      // Domyślne zdjęcie do użycia, jeśli ogłoszenie nie ma zdjęć Cloudinary
      const defaultImage = "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg";
      
      // Sprawdź, czy ogłoszenie ma zdjęcia
      if (!adObj.images || adObj.images.length === 0) {
        console.log(`Ogłoszenie ${adObj._id} nie ma zdjęć, dodaję domyślne`);
        adObj.images = [defaultImage]; // Dodaj domyślne zdjęcie
        return adObj;
      }
      
      // Przefiltruj obrazy, zatrzymując tylko te z Cloudinary
      const cloudinaryImages = adObj.images.filter(imageUrl => {
        if (!imageUrl) return false;
        return imageUrl.includes('res.cloudinary.com');
      });
      
      // Jeśli mamy zdjęcia Cloudinary, użyj ich
      if (cloudinaryImages.length > 0) {
        console.log(`Ogłoszenie ${adObj._id} ma ${cloudinaryImages.length} zdjęć Cloudinary`);
        adObj.images = cloudinaryImages;
      } else {
        console.log(`Ogłoszenie ${adObj._id} nie ma zdjęć Cloudinary, używam domyślnego`);
        // Jeśli nie ma zdjęć Cloudinary, użyj domyślnego zdjęcia
        adObj.images = [defaultImage];
      }
      
      return adObj;
    });
    
    // Odfiltruj ogłoszenia bez zdjęć
    const adsWithImages = adsWithValidImages.filter(ad => ad.images.length > 0);
    console.log(`Po filtrowaniu zdjęć: ${adsWithImages.length} ogłoszeń z poprawnymi zdjęciami`);

    // Bardziej elastyczne filtrowanie - uwzględnia różne możliwe wartości pola listingType
    const featuredAds = adsWithImages.filter(ad => {
      // Sprawdź różne możliwe wartości dla wyróżnionych ogłoszeń
      if (!ad.listingType) return false;
      
      // Nie używamy toLowerCase() dla polskich znaków
      const listingType = String(ad.listingType);
      const isFeatured = listingType === 'wyróżnione' || 
                         listingType === 'wyroznione' || 
                         listingType === 'featured' || 
                         listingType === 'premium' ||
                         listingType === 'vip' ||
                         listingType.includes('wyróżnione') || 
                         listingType.includes('wyroznione') || 
                         listingType.includes('featured');
      
      console.log(`Ogłoszenie ${ad._id}: listingType=${ad.listingType}, isFeatured=${isFeatured}`);
      return isFeatured;
    });
    
    // Wszystkie pozostałe ogłoszenia traktuj jako standardowe
    const standardAds = adsWithImages.filter(ad => !featuredAds.some(featured => featured._id.toString() === ad._id.toString()));
    
    console.log('Wyróżnione ogłoszenia po filtrowaniu (refresh):', featuredAds.length, featuredAds.map(ad => ad._id));
    console.log('Standardowe ogłoszenia po filtrowaniu (refresh):', standardAds.length, standardAds.map(ad => ad._id));
    
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

// Pobieranie szczegółów ogłoszenia oraz aktualizacja wyświetleń
router.get('/:id', async (req, res, next) => {
  // Sprawdź, czy id to nie jest jedna z naszych specjalnych ścieżek
  if (req.params.id === 'stats' || req.params.id === 'rotated' || 
      req.params.id === 'brands' || req.params.id === 'models' || 
      req.params.id === 'search' || req.params.id === 'user') {
    return next();
  }

  try {
    const ad = await Ad.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true, runValidators: false }
    );

    if (!ad) {
      return res.status(404).json({ message: 'Ogłoszenie nie znalezione' });
    }

    res.status(200).json(ad);
  } catch (err) {
    next(err);
  }
}, errorHandler);

// Dodawanie ogłoszenia ze zdjęciami w Cloudinary i danymi użytkownika
router.post('/add', auth, createAdLimiter, upload.array('images', 10), uploadToCloudinaryMiddleware, validate(adValidationSchema), async (req, res, next) => {
  try {
    console.log('Rozpoczęto dodawanie ogłoszenia');
    
    const {
      brand, model, generation, version, year, price, mileage, fuelType, transmission, vin,
      registrationNumber, headline, description, purchaseOptions, listingType, condition,
      accidentStatus, damageStatus, tuning, imported, registeredInPL, firstOwner, disabledAdapted,
      bodyType, color, lastOfficialMileage, power, engineSize, drive, doors, weight,
      voivodeship, city, rentalPrice, status, sellerType
    } = req.body;

    console.log('Otrzymane dane ogłoszenia:', {
      brand, model, year, price, mileage, fuelType, transmission,
      description, purchaseOptions, listingType, sellerType
    });

    // Pobieranie danych użytkownika
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'Użytkownik nie znaleziony' });
    }

    // Logowanie plików
    console.log('Odebrano pliki:', req.files ? req.files.length : 0);
    if (req.files && req.files.length > 0) {
      req.files.forEach((file, index) => {
        console.log(`Plik ${index+1}: ${file.originalname}, ${file.mimetype}, ${file.size} bajtów, zapisany jako ${file.filename}`);
      });
    } else {
      console.warn('Brak plików w żądaniu!');
    }

    // Pobieranie URL-i zdjęć z Cloudinary
    const images = req.cloudinaryResults ? req.cloudinaryResults.map(result => result.cloudinaryUrl) : [];
    console.log(`Dodano ${images.length} zdjęć do Cloudinary:`, images);

    // Generowanie krótkiego opisu z nagłówka (do 120 znaków)
    const shortDescription = headline
      ? headline.substring(0, 120)
      : '';

    // Tworzenie nowego ogłoszenia
    const newAd = new Ad({
      // Podstawowe dane
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
      shortDescription, // <-- dodane pole
      images,
      purchaseOptions,
      listingType,
      sellerType, // <-- dodane pole sellerType
      
      // Dane techniczne
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
      
      // Lokalizacja
      voivodeship,
      city,
      
      // Najem
      rentalPrice: rentalPrice ? parseFloat(rentalPrice) : undefined,
      
      // Dane właściciela
      owner: req.user.userId,
      ownerName: user.name,
      ownerLastName: user.lastName,
      ownerEmail: user.email,
      ownerPhone: user.phoneNumber,
      ownerRole: user.role, // Dodanie roli właściciela
      
      // Status - zawsze pending (symulacja płatności)
      status: 'pending'
    });

    console.log('Utworzono obiekt ogłoszenia, próba zapisania w bazie danych');
    
    // Zapisz ogłoszenie w bazie danych
    const ad = await newAd.save();
    console.log('Ogłoszenie zapisane w bazie danych:', ad._id);
    
    // Resetowanie cache rotacji
    rotationCache.lastRotation = null;
    
    // Tworzenie powiadomienia o dodaniu ogłoszenia
    try {
      const adTitle = headline || `${brand} ${model}`;
      await notificationService.notifyAdCreated(req.user.userId, adTitle);
      console.log(`Utworzono powiadomienie o dodaniu ogłoszenia dla użytkownika ${req.user.userId}`);
    } catch (notificationError) {
      console.error('Błąd podczas tworzenia powiadomienia:', notificationError);
      // Nie przerywamy głównego procesu w przypadku błędu powiadomienia
    }
    
    // Odpowiedź z utworzonym ogłoszeniem
    res.status(201).json(ad);
  } catch (err) {
    console.error('Błąd podczas dodawania ogłoszenia:', err);
    next(err);
  }
}, errorHandler);

// Zmiana statusu ogłoszenia
router.put('/:id/status', auth, async (req, res, next) => {
  const { status } = req.body;

  if (!['pending', 'active', 'rejected', 'needs_changes', 'sold', 'archived'].includes(status)) {
    return res.status(400).json({ message: 'Nieprawidłowy status ogłoszenia' });
  }

  try {
    const ad = await Ad.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({ message: 'Ogłoszenie nie znalezione' });
    }

    // Sprawdź czy użytkownik jest właścicielem lub adminem
    if (ad.owner.toString() !== req.user.userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Brak uprawnień do zmiany statusu tego ogłoszenia' });
    }

    // Zapisz poprzedni status do porównania
    const previousStatus = ad.status;
    
    // Aktualizuj status
    ad.status = status;
    await ad.save();
    
    // Tworzenie powiadomienia o zmianie statusu ogłoszenia
    if (previousStatus !== status) {
      try {
        const adTitle = ad.headline || `${ad.brand} ${ad.model}`;
        await notificationService.notifyAdStatusChange(ad.owner.toString(), adTitle, status);
        console.log(`Utworzono powiadomienie o zmianie statusu ogłoszenia dla użytkownika ${ad.owner}`);
      } catch (notificationError) {
        console.error('Błąd podczas tworzenia powiadomienia:', notificationError);
        // Nie przerywamy głównego procesu w przypadku błędu powiadomienia
      }
    }

    res.status(200).json({ message: 'Status ogłoszenia zaktualizowany', ad });
  } catch (err) {
    next(err);
  }
}, errorHandler);

// Ustawienie głównego zdjęcia ogłoszenia
router.put('/:id/main-image', auth, async (req, res, next) => {
  const { mainImageIndex } = req.body;

  try {
    const ad = await Ad.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({ message: 'Ogłoszenie nie znalezione' });
    }

    // Sprawdź czy użytkownik jest właścicielem lub adminem
    if (ad.owner.toString() !== req.user.userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Brak uprawnień do zmiany głównego zdjęcia tego ogłoszenia' });
    }

    // Sprawdź czy indeks jest prawidłowy
    if (mainImageIndex < 0 || mainImageIndex >= ad.images.length) {
      return res.status(400).json({ message: 'Nieprawidłowy indeks zdjęcia' });
    }

    ad.mainImageIndex = mainImageIndex;
    await ad.save();

    res.status(200).json({ message: 'Główne zdjęcie ogłoszenia zaktualizowane', ad });
  } catch (err) {
    next(err);
  }
}, errorHandler);

// Aktualizacja ogłoszenia
router.put('/:id', auth, async (req, res, next) => {
  try {
    const ad = await Ad.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({ message: 'Ogłoszenie nie znalezione' });
    }

    // Sprawdź czy użytkownik jest właścicielem lub adminem
    if (ad.owner.toString() !== req.user.userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Brak uprawnień do edycji tego ogłoszenia' });
    }

    // Pola, które można aktualizować
    const updatableFields = [
      'description', 'price', 'city', 'voivodeship', 'color',
      'headline', 'mainImageIndex'
    ];

    // Aktualizuj tylko dozwolone pola
    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        ad[field] = req.body[field];
      }
    });

    // Zapisz zmiany
    await ad.save();

    res.status(200).json({ message: 'Ogłoszenie zaktualizowane', ad });
  } catch (err) {
    next(err);
  }
}, errorHandler);

// Endpoint do pobierania danych o markach i modelach samochodów
router.get('/car-data', async (req, res, next) => {
  try {
    // Pobierz wszystkie unikalne marki i modele z bazy danych
    const ads = await Ad.find({}, 'brand model').lean();
    
    // Utwórz obiekt z markami jako kluczami i tablicami modeli jako wartościami
    const carData = {};
    
    ads.forEach(ad => {
      if (ad.brand && ad.model) {
        if (!carData[ad.brand]) {
          carData[ad.brand] = [];
        }
        
        // Dodaj model tylko jeśli jeszcze nie istnieje w tablicy
        if (!carData[ad.brand].includes(ad.model)) {
          carData[ad.brand].push(ad.model);
        }
      }
    });
    
    // Posortuj modele dla każdej marki
    Object.keys(carData).forEach(brand => {
      carData[brand].sort();
    });
    
    res.status(200).json(carData);
  } catch (err) {
    console.error('Błąd podczas pobierania danych o markach i modelach:', err);
    next(err);
  }
}, errorHandler);

// Usuwanie zdjęcia z ogłoszenia
router.delete('/:id/images/:index', auth, async (req, res, next) => {
  try {
    const ad = await Ad.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({ message: 'Ogłoszenie nie znalezione' });
    }

    // Sprawdź czy użytkownik jest właścicielem lub adminem
    if (ad.owner.toString() !== req.user.userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Brak uprawnień do usuwania zdjęć z tego ogłoszenia' });
    }

    const index = parseInt(req.params.index);
    
    // Sprawdź czy indeks jest prawidłowy
    if (isNaN(index) || index < 0 || index >= ad.images.length) {
      return res.status(400).json({ message: 'Nieprawidłowy indeks zdjęcia' });
    }

    // Pobierz URL zdjęcia do usunięcia
    const imageUrl = ad.images[index];
    
    // Usuń zdjęcie z Cloudinary
    try {
      const publicId = extractPublicIdFromUrl(imageUrl);
      if (publicId) {
        await deleteCloudinaryImage(publicId);
        console.log(`Usunięto zdjęcie z Cloudinary: ${publicId}`);
      } else {
        console.warn(`Nie można wyodrębnić publicId z URL: ${imageUrl}`);
      }
    } catch (cloudinaryError) {
      console.error('Błąd podczas usuwania zdjęcia z Cloudinary:', cloudinaryError);
      // Nie przerywamy głównego procesu w przypadku błędu Cloudinary
    }

    // Usuń zdjęcie z tablicy zdjęć ogłoszenia
    ad.images.splice(index, 1);
    
    // Jeśli usunięto główne zdjęcie, zresetuj mainImageIndex
    if (ad.mainImageIndex === index) {
      ad.mainImageIndex = 0;
    } else if (ad.mainImageIndex > index) {
      // Jeśli usunięto zdjęcie przed głównym, przesuń indeks
      ad.mainImageIndex--;
    }

    await ad.save();

    res.status(200).json({ message: 'Zdjęcie usunięte', ad });
  } catch (err) {
    console.error('Błąd podczas usuwania zdjęcia:', err);
    next(err);
  }
}, errorHandler);

// Odnowienie wygasłego ogłoszenia
router.post('/:id/renew', auth, async (req, res, next) => {
  try {
    const ad = await Ad.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({ message: 'Ogłoszenie nie znalezione' });
    }

    // Sprawdź czy użytkownik jest właścicielem lub adminem
    if (ad.owner.toString() !== req.user.userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Brak uprawnień do odnowienia tego ogłoszenia' });
    }

    // Sprawdź czy ogłoszenie ma status archived
    if (ad.status !== 'archived') {
      return res.status(400).json({ message: 'Tylko zakończone ogłoszenia mogą być odnowione' });
    }

    // Ustaw nowy termin wygaśnięcia (30 dni od teraz) - tylko dla zwykłych użytkowników
    if (ad.ownerRole !== 'admin') {
      const newExpiryDate = new Date();
      newExpiryDate.setDate(newExpiryDate.getDate() + 30);
      ad.expiresAt = newExpiryDate;
    }

    // Zmień status na active
    ad.status = 'active';
    
    // Zapisz zmiany
    await ad.save();

    // Tworzenie powiadomienia o odnowieniu ogłoszenia
    try {
      const adTitle = ad.headline || `${ad.brand} ${ad.model}`;
      await notificationService.notifyAdStatusChange(ad.owner.toString(), adTitle, 'odnowione');
      console.log(`Utworzono powiadomienie o odnowieniu ogłoszenia dla użytkownika ${ad.owner}`);
    } catch (notificationError) {
      console.error('Błąd podczas tworzenia powiadomienia:', notificationError);
      // Nie przerywamy głównego procesu w przypadku błędu powiadomienia
    }

    res.status(200).json({ 
      message: 'Ogłoszenie zostało odnowione', 
      ad,
      expiresAt: ad.expiresAt 
    });
  } catch (err) {
    console.error('Błąd podczas odnawiania ogłoszenia:', err);
    next(err);
  }
}, errorHandler);

// Dodawanie zdjęć do ogłoszenia
router.post('/:id/images', auth, upload.array('images', 20), uploadToCloudinaryMiddleware, async (req, res, next) => {
  try {
    const ad = await Ad.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({ message: 'Ogłoszenie nie znalezione' });
    }

    // Sprawdź czy użytkownik jest właścicielem lub adminem
    if (ad.owner.toString() !== req.user.userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Brak uprawnień do dodawania zdjęć do tego ogłoszenia' });
    }

    // Sprawdź limit zdjęć
    if (ad.images.length + req.files.length > 20) {
      return res.status(400).json({ 
        message: `Przekroczono limit zdjęć. Maksymalnie można dodać 20 zdjęć. Obecnie masz ${ad.images.length} zdjęć.` 
      });
    }

    // Dodaj nowe zdjęcia z Cloudinary
    const newImages = req.cloudinaryResults ? req.cloudinaryResults.map(result => result.cloudinaryUrl) : [];
    ad.images = [...ad.images, ...newImages];

    await ad.save();

    res.status(200).json({ message: 'Zdjęcia dodane', ad });
  } catch (err) {
    next(err);
  }
}, errorHandler);

export default router;
