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
import {
  featureAd,
  unfeatureAd,
} from "../controllers/listings/featureController.js";

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

// Additional admin actions for listings - WYRÓŻNIANIE (zmienia listingType)
router.post("/:adId/feature", featureAd);
router.post("/:adId/unfeature", unfeatureAd);

router.post("/:adId/hide", async (req, res) => {
  try {
    const Ad = (await import("../../models/listings/ad.js")).default;
    const { reason } = req.body;

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: "Powód ukrycia musi mieć minimum 10 znaków",
      });
    }

    const ad = await Ad.findById(req.params.adId);
    if (!ad)
      return res
        .status(404)
        .json({ success: false, error: "Ogłoszenie nie znalezione" });

    ad.hidden = true;
    ad.isHidden = true;
    ad.status = "hidden";
    if (!ad.moderation) ad.moderation = {};
    ad.moderation.hiddenAt = new Date();
    ad.moderation.hiddenBy = req.user?.userId || req.user?._id;
    ad.moderation.hideReason = reason.trim();
    await ad.save();

    res.json({
      success: true,
      message: "Ogłoszenie ukryte",
      reason: reason.trim(),
    });
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
