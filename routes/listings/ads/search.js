/**
 * Ad Search Routes
 * Obsługa wyszukiwania i filtrowania ogłoszeń
 */

import { Router } from 'express';
import Ad from '../../../models/ad.js';
import errorHandler from '../../../middleware/errorHandler.js';
import { createAdFilter, calculateMatchScore } from './helpers.js';
import { getActiveStatusFilter } from '../../../utils/listings/commonFilters.js';
import { getFilterCounts, getMatchingAdsCount, createPartialFilter } from '../../../utils/listings/aggregationHelpers.js';

const router = Router();

/**
 * GET /filter-counts - Returns counts for all filter options based on current filters
 * Endpoint dla kaskadowego filtrowania - zwraca liczniki dla każdego filtru
 */
router.get('/filter-counts', async (req, res, next) => {
  try {
    console.log('Pobieranie liczników filtrów z parametrami:', req.query);
    
    // Pobierz liczniki dla wszystkich filtrów
    const filterCounts = await getFilterCounts(Ad, req.query);
    
    // Pobierz całkowitą liczbę pasujących ogłoszeń
    const totalCount = await getMatchingAdsCount(Ad, req.query);
    
    const response = {
      totalMatching: totalCount,
      filterCounts: filterCounts,
      appliedFilters: req.query,
      timestamp: new Date().toISOString()
    };
    
    console.log('Zwracam liczniki filtrów:', {
      totalMatching: response.totalMatching,
      brandsCount: Object.keys(filterCounts.brands || {}).length,
      modelsCount: Object.keys(filterCounts.models || {}).length,
      appliedFiltersCount: Object.keys(req.query).length
    });
    
    res.status(200).json(response);
  } catch (err) {
    console.error('Błąd podczas pobierania liczników filtrów:', err);
    res.status(500).json({ 
      error: 'Błąd serwera podczas pobierania liczników filtrów',
      totalMatching: 0,
      filterCounts: {},
      appliedFilters: req.query
    });
  }
}, errorHandler);

/**
 * GET /count - Returns count of ads matching criteria
 * Szybki endpoint tylko do liczenia ogłoszeń (dla przycisku)
 */
router.get('/count', async (req, res, next) => {
  try {
    const count = await getMatchingAdsCount(Ad, req.query);
    
    console.log('Query for ad count with filters:', req.query);
    console.log('Found matching ads:', count);
    
    res.status(200).json({ count });
  } catch (err) {
    console.error('Error counting ads:', err);
    res.status(500).json({ count: 0 });
  }
}, errorHandler);

/**
 * GET / - Basic ad listing with pagination and filtering
 */
router.get('/', async (req, res, next) => {
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
      listingType,
      featured,
      onlyFeatured
    } = req.query;

    // Create filter using helper function
    const filter = createAdFilter(req.query);
    
    // Ensure we only show active ads
    filter.status = getActiveStatusFilter();
    
    console.log('Filter for ad list:', filter);
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Create sort object
    const sortOptions = {};
    
    // If showing only featured ads, use simple sorting
    if (filter.listingType === 'wyróżnione') {
      sortOptions[sortBy] = order === 'desc' ? -1 : 1;
      
      const ads = await Ad.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .select('_id brand model headline shortDescription description images mainImage price year mileage fuelType power transmission status listingType createdAt views')
        .lean();
      
      // Add title field from headline
      const adsWithTitle = ads.map(ad => ({
        ...ad,
        title: ad.headline ? ad.headline.substring(0, 120) : ''
      }));
      
      const totalAds = await Ad.countDocuments(filter);
      
      return res.status(200).json({
        ads: adsWithTitle,
        totalPages: Math.ceil(totalAds / parseInt(limit)),
        currentPage: parseInt(page),
        totalAds
      });
    }
    
    // For all ads (featured + regular), use aggregation to prioritize featured
    const pipeline = [
      { $match: filter },
      { 
        $addFields: { 
          // Featured ads get priority (0), regular ads get lower priority (1)
          featuredPriority: { 
            $cond: { 
              if: { $eq: ["$listingType", "wyróżnione"] }, 
              then: 0, 
              else: 1 
            } 
          } 
        }
      },
      { 
        $sort: { 
          featuredPriority: 1,  // Featured first
          [sortBy]: order === 'desc' ? -1 : 1  // Then by selected sort
        } 
      },
      { $skip: skip },
      { $limit: parseInt(limit) },
      {
        $project: {
          _id: 1,
          brand: 1,
          model: 1,
          headline: 1,
          title: { $substr: ["$headline", 0, 120] },
          shortDescription: 1,
          description: 1,
          images: 1,
          mainImage: 1,
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
        }
      }
    ];

    const ads = await Ad.aggregate(pipeline);
    const totalAds = await Ad.countDocuments(filter);

    console.log('Number of found ads:', ads.length);
    console.log('Featured ads in results:', ads.filter(ad => ad.listingType === 'wyróżnione').length);

    res.status(200).json({
      ads,
      totalPages: Math.ceil(totalAds / parseInt(limit)),
      currentPage: parseInt(page),
      totalAds
    });
  } catch (err) {
    console.error('Error in basic ad listing:', err);
    next(err);
  }
}, errorHandler);

/**
 * GET /search - Advanced ad search with hierarchical sorting and scoring
 * Nowa implementacja z hierarchią wyników:
 * 1. Wyróżnione + dokładne dopasowanie
 * 2. Wyróżnione + częściowe dopasowanie  
 * 3. Zwykłe + dokładne dopasowanie
 * 4. Zwykłe + częściowe dopasowanie
 * 5. Podobne ogłoszenia
 */
router.get('/search', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;
    
    // Get sorting parameters from frontend - mapowanie z frontendu
    let sortBy = 'createdAt';
    let order = 'desc';
    
    // Mapowanie parametrów sortowania z frontendu
    if (req.query.sortBy && req.query.order) {
      sortBy = req.query.sortBy;
      order = req.query.order;
    }

    console.log('Search request:', { query: req.query, page, limit, sortBy, order });

    // Check if user applied any filters (excluding pagination and sorting params)
    const hasFilters = Object.keys(req.query).some(key => 
      !['page', 'limit', 'sortBy', 'order'].includes(key) && req.query[key]
    );

    let results;

    if (hasFilters) {
      // Z filtrami - hierarchiczne sortowanie z uwzględnieniem wyboru użytkownika
      results = await getHierarchicalResults(req.query, sortBy, order);
    } else {
      // Bez filtrów - sortowanie według wyboru użytkownika
      results = await getRandomizedResults(sortBy, order);
    }

    // Pagination
    const paginatedResults = results.slice(skip, skip + limit);

    console.log('Search results:', {
      total: results.length,
      returned: paginatedResults.length,
      hasFilters,
      sortBy,
      order,
      featured: paginatedResults.filter(ad => ad.listingType === 'wyróżnione').length
    });

    res.status(200).json({
      ads: paginatedResults,
      currentPage: page,
      totalPages: Math.ceil(results.length / limit),
      totalAds: results.length,
      hasFilters,
      sortBy,
      order,
      appliedFilters: req.query
    });
  } catch (err) {
    console.error('Error in hierarchical search:', err);
    next(err);
  }
}, errorHandler);

/**
 * Funkcja do hierarchicznego sortowania z filtrami
 */
async function getHierarchicalResults(query, sortBy, order) {
  const baseFilter = createAdFilter(query);
  baseFilter.status = getActiveStatusFilter();
  
  // 1. Wyróżnione + dokładne dopasowanie
  const featuredExact = await Ad.find({
    ...baseFilter,
    listingType: 'wyróżnione'
  }).lean();
  
  // 2. Wyróżnione + częściowe dopasowanie
  const partialFilter = createPartialFilter(baseFilter);
  const featuredPartial = await Ad.find({
    ...partialFilter,
    listingType: 'wyróżnione',
    _id: { $nin: featuredExact.map(ad => ad._id) }
  }).lean();
  
  // 3. Zwykłe + dokładne dopasowanie
  const regularExact = await Ad.find({
    ...baseFilter,
    $or: [
      { listingType: { $ne: 'wyróżnione' } },
      { listingType: { $exists: false } }
    ]
  }).lean();
  
  // 4. Zwykłe + częściowe dopasowanie
  const regularPartial = await Ad.find({
    ...partialFilter,
    $or: [
      { listingType: { $ne: 'wyróżnione' } },
      { listingType: { $exists: false } }
    ],
    _id: { $nin: [...featuredExact, ...regularExact].map(ad => ad._id) }
  }).lean();
  
  // Dodaj metadane i połącz wyniki
  const results = [
    ...featuredExact.map(ad => ({ 
      ...ad, 
      title: ad.headline?.substring(0, 120) || '',
      matchScore: 100, 
      category: 'featured-exact' 
    })),
    ...featuredPartial.map(ad => ({ 
      ...ad, 
      title: ad.headline?.substring(0, 120) || '',
      matchScore: 90, 
      category: 'featured-partial' 
    })),
    ...regularExact.map(ad => ({ 
      ...ad, 
      title: ad.headline?.substring(0, 120) || '',
      matchScore: 75, 
      category: 'regular-exact' 
    })),
    ...regularPartial.map(ad => ({ 
      ...ad, 
      title: ad.headline?.substring(0, 120) || '',
      matchScore: 60, 
      category: 'regular-partial' 
    }))
  ];
  
  // Sortowanie w ramach każdej kategorii
  return sortWithinCategories(results, sortBy, order);
}

/**
 * Funkcja do losowego sortowania bez filtrów
 */
async function getRandomizedResults(sortBy, order) {
  // Wyróżnione - losowa kolejność (ograniczone do 20)
  const featured = await Ad.aggregate([
    { 
      $match: { 
        listingType: 'wyróżnione', 
        status: { $in: ['active', 'opublikowane', 'pending'] }
      } 
    },
    { $sample: { size: 20 } }
  ]);
  
  // Zwykłe - według wybranego sortowania
  const sortOptions = {};
  sortOptions[sortBy] = order === 'desc' ? -1 : 1;
  
  const regular = await Ad.find({
    $or: [
      { listingType: { $ne: 'wyróżnione' } },
      { listingType: { $exists: false } }
    ],
    status: { $in: ['active', 'opublikowane', 'pending'] }
  })
  .sort(sortOptions)
  .limit(50)
  .lean();
  
  return [
    ...featured.map(ad => ({ 
      ...ad, 
      title: ad.headline?.substring(0, 120) || '',
      matchScore: 95, 
      category: 'featured-random' 
    })),
    ...regular.map(ad => ({ 
      ...ad, 
      title: ad.headline?.substring(0, 120) || '',
      matchScore: 50, 
      category: 'regular-chronological' 
    }))
  ];
}

/**
 * Sortowanie w ramach kategorii
 */
function sortWithinCategories(results, sortBy, order) {
  const categories = ['featured-exact', 'featured-partial', 'regular-exact', 'regular-partial'];
  const sortedResults = [];
  
  categories.forEach(category => {
    const categoryAds = results.filter(ad => ad.category === category);
    
    categoryAds.sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return order === 'asc' ? a.price - b.price : b.price - a.price;
        case 'year':
          return order === 'asc' ? a.year - b.year : b.year - a.year;
        case 'mileage':
          return order === 'asc' ? a.mileage - b.mileage : b.mileage - a.mileage;
        case 'createdAt':
        default:
          const dateA = new Date(a.createdAt);
          const dateB = new Date(b.createdAt);
          return order === 'asc' ? dateA - dateB : dateB - dateA;
      }
    });
    
    sortedResults.push(...categoryAds);
  });
  
  return sortedResults;
}

/**
 * GET /brands - Get available brands
 */
router.get('/brands', async (req, res, next) => {
  try {
    const brands = await Ad.distinct('brand');
    res.status(200).json(brands);
  } catch (err) {
    next(err);
  }
}, errorHandler);

/**
 * GET /models - Get models for specific brand
 */
router.get('/models', async (req, res, next) => {
  try {
    const { brand } = req.query;
    if (!brand) {
      return res.status(400).json({ message: 'Brand parameter is required' });
    }
    
    const models = await Ad.distinct('model', { brand });
    res.status(200).json(models);
  } catch (err) {
    next(err);
  }
}, errorHandler);

/**
 * GET /car-data - Get car brands and models data
 */
router.get('/car-data', async (req, res, next) => {
  try {
    // Get all unique brands and models from database
    const ads = await Ad.find({}, 'brand model').lean();
    
    // Create object with brands as keys and model arrays as values
    const carData = {};
    
    ads.forEach(ad => {
      if (ad.brand && ad.model) {
        if (!carData[ad.brand]) {
          carData[ad.brand] = [];
        }
        
        // Add model only if it doesn't exist in array yet
        if (!carData[ad.brand].includes(ad.model)) {
          carData[ad.brand].push(ad.model);
        }
      }
    });
    
    // Sort models for each brand
    Object.keys(carData).forEach(brand => {
      carData[brand].sort();
    });
    
    res.status(200).json(carData);
  } catch (err) {
    console.error('Error getting car brands and models data:', err);
    next(err);
  }
}, errorHandler);

export default router;
