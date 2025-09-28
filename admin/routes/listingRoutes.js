// admin/routes/listingRoutes.js
import express from "express";
import {
  getAds,
  getListingsStats,
  getAdDetails,
  createAd,
  updateAd,
  deleteAd,
  setBulkDiscount,
  getPendingAds,
  approveAd,
  rejectAd,
  moderateAd,
} from "../controllers/listings/adController.js";

const router = express.Router();

/** Listing Management (Admin) */
router.get("/stats", getListingsStats);
router.get("/pending", getPendingAds);
router.get("/", getAds);
router.post("/", createAd);
router.get("/:adId", getAdDetails);
router.put("/:adId", updateAd);
router.delete("/:adId", deleteAd);
router.post("/:adId/approve", approveAd);
router.post("/:adId/reject", rejectAd);
router.post("/:adId/moderate", moderateAd);
router.post("/bulk-discount", setBulkDiscount);

export default router;
