/**
 * Ad Search Routes
 * Obsługa wyszukiwania i filtrowania ogłoszeń (wydajnie i bezpiecznie)
 */

import { Router } from "express";
import Ad from "../../../models/listings/ad.js";
import errorHandler from "../../../middleware/errors/errorHandler.js";
import { createAdFilter } from "./helpers.js";
import { getActiveStatusFilter } from "../../../utils/listings/commonFilters.js";
import {
  getFilterCounts,
  getMatchingAdsCount,
} from "../../../utils/listings/aggregationHelpers.js";

const router = Router();

/* ------------------------ helpers (lokalne) ------------------------ */

const VALID_SORT_FIELDS = ["createdAt", "price", "year", "mileage"];
const VALID_ORDERS = ["asc", "desc"];
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function readPaging(q) {
  const page = clamp(parseInt(q.page, 10) || 1, 1, 1_000_000);
  const limit = clamp(parseInt(q.limit, 10) || 30, 1, 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function readSorting(q) {
  const sortBy = VALID_SORT_FIELDS.includes(q.sortBy) ? q.sortBy : "createdAt";
  const order = VALID_ORDERS.includes(q.order) ? q.order : "desc";
  const mongoOrder = order === "desc" ? -1 : 1;
  return { sortBy, order, mongoOrder };
}

/** Projekcja pól – UŻYWAJ $substrCP + $ifNull (nie $substr!) */
function listProjection() {
  return {
    _id: 1,
    brand: 1,
    model: 1,
    headline: 1,
    title: { $substrCP: [{ $ifNull: ["$headline", ""] }, 0, 120] },
    shortDescription: 1,
    description: 1,
    images: 1,
    mainImage: 1,
    mainImageIndex: 1,
    price: 1,
    year: 1,
    mileage: 1,
    fuelType: 1,
    power: 1,
    engineSize: 1,
    engineCapacity: 1,
    capacity: 1,
    transmission: 1,
    drive: 1,
    city: 1,
    voivodeship: 1,
    location: 1,
    sellerType: 1,
    countryOfOrigin: 1,
    imported: 1,
    status: 1,
    listingType: 1,
    createdAt: 1,
    views: 1,
    favorites: 1,
    featured: 1,
    condition: 1,
    moderation: 1,
  };
}

/** Pipeline do /search: featured first -> matchScore -> sort -> paginacja */
function buildSearchPipeline(filter, q, paging, sorting) {
  const { mongoOrder } = sorting;

  const scoreStages = [];
  const addScore = (cond, points) =>
    scoreStages.push({ $cond: [cond, points, 0] });

  if (q.brand && q.model) {
    addScore(
      {
        $and: [
          { $eq: [{ $toLower: "$brand" }, String(q.brand).toLowerCase()] },
          { $eq: [{ $toLower: "$model" }, String(q.model).toLowerCase()] },
        ],
      },
      100
    );
  } else if (q.brand) {
    addScore(
      { $eq: [{ $toLower: "$brand" }, String(q.brand).toLowerCase()] },
      50
    );
  }

  if (q.generation) {
    addScore(
      {
        $eq: [{ $toLower: "$generation" }, String(q.generation).toLowerCase()],
      },
      15
    );
  }
  if (q.version) {
    addScore(
      { $eq: [{ $toLower: "$version" }, String(q.version).toLowerCase()] },
      10
    );
  }

  if (q.minPrice && q.maxPrice) {
    addScore(
      {
        $and: [
          { $gte: ["$price", Number(q.minPrice)] },
          { $lte: ["$price", Number(q.maxPrice)] },
        ],
      },
      30
    );
  } else if (q.minPrice) {
    addScore({ $gte: ["$price", Number(q.minPrice)] }, 15);
  } else if (q.maxPrice) {
    addScore({ $lte: ["$price", Number(q.maxPrice)] }, 15);
  }

  if (q.minYear && q.maxYear) {
    addScore(
      {
        $and: [
          { $gte: ["$year", Number(q.minYear)] },
          { $lte: ["$year", Number(q.maxYear)] },
        ],
      },
      20
    );
  } else if (q.minYear) {
    addScore({ $gte: ["$year", Number(q.minYear)] }, 10);
  } else if (q.maxYear) {
    addScore({ $lte: ["$year", Number(q.maxYear)] }, 10);
  }

  if (q.mileageFrom && q.mileageTo) {
    addScore(
      {
        $and: [
          { $gte: ["$mileage", Number(q.mileageFrom)] },
          { $lte: ["$mileage", Number(q.mileageTo)] },
        ],
      },
      15
    );
  } else if (q.mileageFrom) {
    addScore({ $gte: ["$mileage", Number(q.mileageFrom)] }, 8);
  } else if (q.mileageTo) {
    addScore({ $lte: ["$mileage", Number(q.mileageTo)] }, 8);
  }

  if (q.fuelType) {
    addScore(
      { $eq: [{ $toLower: "$fuelType" }, String(q.fuelType).toLowerCase()] },
      10
    );
  }
  if (q.transmission) {
    addScore(
      {
        $eq: [
          { $toLower: "$transmission" },
          String(q.transmission).toLowerCase(),
        ],
      },
      8
    );
  }
  if (q.driveType) {
    addScore(
      { $eq: [{ $toLower: "$drive" }, String(q.driveType).toLowerCase()] },
      6
    );
  }

  return [
    { $match: filter },
    {
      $addFields: {
        featuredPriority: {
          $cond: [{ $eq: ["$listingType", "wyróżnione"] }, 0, 1],
        },
      },
    },
    {
      $addFields: {
        matchScore: { $add: scoreStages.length ? scoreStages : [0] },
      },
    },
    {
      $sort: {
        featuredPriority: 1,
        matchScore: -1,
        [sorting.sortBy]: mongoOrder,
        _id: 1,
      },
    },
    { $skip: paging.skip },
    { $limit: paging.limit },
    { $project: listProjection() },
  ];
}

/* -------------------------- ROUTES -------------------------- */

// Kaskadowe liczniki
router.get(
  "/filter-counts",
  async (req, res) => {
    try {
      const filterCounts = await getFilterCounts(Ad, req.query);
      const totalCount = await getMatchingAdsCount(Ad, req.query);
      res.status(200).json({
        totalMatching: totalCount,
        filterCounts,
        appliedFilters: req.query,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      res.status(500).json({
        error: "Błąd serwera podczas pobierania liczników filtrów",
        totalMatching: 0,
        filterCounts: {},
        appliedFilters: req.query,
      });
    }
  },
  errorHandler
);

// Licznik ogłoszeń
router.get(
  "/count",
  async (req, res) => {
    try {
      const count = await getMatchingAdsCount(Ad, req.query);
      res.status(200).json({ count });
    } catch (err) {
      res.status(500).json({ count: 0 });
    }
  },
  errorHandler
);

// Podstawowe listowanie (DB paginacja + agregacja)
router.get(
  "/",
  async (req, res, next) => {
    try {
      const paging = readPaging(req.query);
      const sorting = readSorting(req.query);

      const filter = createAdFilter(req.query);
      filter.status = getActiveStatusFilter();

      if (filter.listingType === "wyróżnione") {
        const ads = await Ad.find(filter)
          .select(
            "_id brand model headline shortDescription description images mainImage price year mileage fuelType power transmission status listingType createdAt views favorites"
          )
          .sort({ [sorting.sortBy]: sorting.mongoOrder, _id: 1 })
          .skip(paging.skip)
          .limit(paging.limit)
          .lean();

        const totalAds = await Ad.countDocuments(filter);
        return res.status(200).json({
          ads: ads.map((ad) => ({
            ...ad,
            title: ad.headline ? ad.headline.substring(0, 120) : "",
          })),
          totalPages: Math.ceil(totalAds / paging.limit),
          currentPage: paging.page,
          totalAds,
        });
      }

      const pipeline = [
        { $match: filter },
        {
          $addFields: {
            featuredPriority: {
              $cond: [{ $eq: ["$listingType", "wyróżnione"] }, 0, 1],
            },
          },
        },
        {
          $sort: {
            featuredPriority: 1,
            [sorting.sortBy]: sorting.mongoOrder,
            _id: 1,
          },
        },
        { $skip: paging.skip },
        { $limit: paging.limit },
        { $project: listProjection() },
      ];

      const [ads, totalAds] = await Promise.all([
        Ad.aggregate(pipeline),
        Ad.countDocuments(filter),
      ]);

      res.status(200).json({
        ads,
        totalPages: Math.ceil(totalAds / paging.limit),
        currentPage: paging.page,
        totalAds,
      });
    } catch (err) {
      next(err);
    }
  },
  errorHandler
);

// Zaawansowane wyszukiwanie (hierarchia w jednym pipeline)
router.get(
  "/search",
  async (req, res, next) => {
    try {
      const paging = readPaging(req.query);
      const sorting = readSorting(req.query);

      const baseFilter = createAdFilter(req.query);
      baseFilter.status = getActiveStatusFilter();

      const pipeline = buildSearchPipeline(
        baseFilter,
        req.query,
        paging,
        sorting
      );

      const [ads, totalAds] = await Promise.all([
        Ad.aggregate(pipeline),
        Ad.countDocuments(baseFilter),
      ]);

      res.status(200).json({
        ads,
        currentPage: paging.page,
        totalPages: Math.ceil(totalAds / paging.limit),
        totalAds,
        hasFilters:
          Object.keys(req.query).some(
            (k) =>
              !["page", "limit", "sortBy", "order"].includes(k) && req.query[k]
          ) || false,
        sortBy: sorting.sortBy,
        order: sorting.order,
        appliedFilters: req.query,
      });
    } catch (err) {
      next(err);
    }
  },
  errorHandler
);

// 🔧 NOWE: statystyki do useSearchStats
router.get(
  "/search-stats",
  async (req, res, next) => {
    try {
      const filter = createAdFilter(req.query);
      filter.status = getActiveStatusFilter();

      const [totalCount, counts] = await Promise.all([
        getMatchingAdsCount(Ad, req.query),
        getFilterCounts(Ad, req.query),
      ]);

      const brandCounts = counts?.brands || {};
      const modelCounts = counts?.models || {};

      res.status(200).json({ totalCount, brandCounts, modelCounts });
    } catch (err) {
      next(err);
    }
  },
  errorHandler
);

// Dostępne marki
router.get(
  "/brands",
  async (_req, res, next) => {
    try {
      const brands = await Ad.distinct("brand");
      res.status(200).json(brands);
    } catch (err) {
      next(err);
    }
  },
  errorHandler
);

// Modele dla marki
router.get(
  "/models",
  async (req, res, next) => {
    try {
      const { brand } = req.query;
      if (!brand) {
        return res.status(400).json({ message: "Brand parameter is required" });
      }
      const models = await Ad.distinct("model", { brand });
      res.status(200).json(models);
    } catch (err) {
      next(err);
    }
  },
  errorHandler
);

// Mapa { brand: [models...] }
router.get(
  "/car-data",
  async (_req, res, next) => {
    try {
      const ads = await Ad.find({}, "brand model").lean();
      const carData = {};
      for (const ad of ads) {
        if (!ad.brand || !ad.model) continue;
        if (!carData[ad.brand]) carData[ad.brand] = [];
        if (!carData[ad.brand].includes(ad.model))
          carData[ad.brand].push(ad.model);
      }
      Object.keys(carData).forEach((b) => carData[b].sort());
      res.status(200).json(carData);
    } catch (err) {
      next(err);
    }
  },
  errorHandler
);

export default router;
