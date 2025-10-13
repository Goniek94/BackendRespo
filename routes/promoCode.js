// routes/promoCode.js
import express from "express";
import {
  validatePromoCode,
  usePromoCode,
} from "../admin/controllers/promotions/promoCodeValidator.js";

const router = express.Router();

/**
 * POST /api/promo-codes/validate
 * Waliduje kod promocyjny (publiczny endpoint)
 */
router.post("/validate", validatePromoCode);

/**
 * POST /api/promo-codes/use
 * Oznacza kod jako użyty (po opłaceniu)
 */
router.post("/use", usePromoCode);

export default router;
