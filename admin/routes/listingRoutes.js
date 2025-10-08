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

// Additional admin actions for listings
router.post("/:adId/feature", async (req, res) => {
  try {
    const Ad = (await import("../../models/listings/ad.js")).default;
    const ad = await Ad.findById(req.params.adId);
    if (!ad)
      return res
        .status(404)
        .json({ success: false, error: "Ogłoszenie nie znalezione" });

    ad.featured = true;
    ad.isFeatured = true;
    if (!ad.promotion) ad.promotion = {};
    ad.promotion.featured = true;
    await ad.save();

    res.json({ success: true, message: "Ogłoszenie wyróżnione" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/:adId/unfeature", async (req, res) => {
  try {
    const Ad = (await import("../../models/listings/ad.js")).default;
    const ad = await Ad.findById(req.params.adId);
    if (!ad)
      return res
        .status(404)
        .json({ success: false, error: "Ogłoszenie nie znalezione" });

    ad.featured = false;
    ad.isFeatured = false;
    if (ad.promotion) ad.promotion.featured = false;
    await ad.save();

    res.json({ success: true, message: "Usunięto wyróżnienie" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/:adId/hide", async (req, res) => {
  try {
    const Ad = (await import("../../models/listings/ad.js")).default;
    const ad = await Ad.findById(req.params.adId);
    if (!ad)
      return res
        .status(404)
        .json({ success: false, error: "Ogłoszenie nie znalezione" });

    ad.hidden = true;
    ad.isHidden = true;
    ad.status = "hidden";
    await ad.save();

    res.json({ success: true, message: "Ogłoszenie ukryte" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/:adId/show", async (req, res) => {
  try {
    const Ad = (await import("../../models/listings/ad.js")).default;
    const ad = await Ad.findById(req.params.adId);
    if (!ad)
      return res
        .status(404)
        .json({ success: false, error: "Ogłoszenie nie znalezione" });

    ad.hidden = false;
    ad.isHidden = false;
    ad.status = "active";
    await ad.save();

    res.json({ success: true, message: "Ogłoszenie pokazane" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/:adId/extend", async (req, res) => {
  try {
    const Ad = (await import("../../models/listings/ad.js")).default;
    const ad = await Ad.findById(req.params.adId);
    if (!ad)
      return res
        .status(404)
        .json({ success: false, error: "Ogłoszenie nie znalezione" });

    const days = req.body.days || 30;
    const currentExpiry = ad.expiresAt ? new Date(ad.expiresAt) : new Date();
    currentExpiry.setDate(currentExpiry.getDate() + days);
    ad.expiresAt = currentExpiry;
    await ad.save();

    res.json({
      success: true,
      message: `Ogłoszenie przedłużone o ${days} dni`,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/:adId/delete", async (req, res) => {
  try {
    const Ad = (await import("../../models/listings/ad.js")).default;
    const result = await Ad.findByIdAndDelete(req.params.adId);
    if (!result)
      return res
        .status(404)
        .json({ success: false, error: "Ogłoszenie nie znalezione" });

    res.json({ success: true, message: "Ogłoszenie usunięte" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/bulk-discount", setBulkDiscount);

export default router;
