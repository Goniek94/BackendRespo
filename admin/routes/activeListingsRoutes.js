// admin/routes/activeListingsRoutes.js
import express from "express";
import {
  getActiveListings,
  getActiveListingsCount,
  getFeaturedActiveListings,
  getFeaturedActiveCount,
  debugFeaturedListings,
} from "../controllers/listings/activeListingsController.js";

const router = express.Router();

// /api/admin-panel/listings/active
router.get("/active", getActiveListings);
router.get("/active/count", getActiveListingsCount);

// 🔥 wyróżnione (HOT też) - /api/admin-panel/listings/active/featured
router.get("/active/featured", getFeaturedActiveListings);
router.get("/active/featured/count", getFeaturedActiveCount);
router.get("/active/featured/debug", debugFeaturedListings);

export default router;
