// admin/routes/promotionRoutes.js
import express from "express";
import {
  listPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
  activatePromotion,
  deactivatePromotion,
  getDiscounts,
  setDiscount,
  setBulkDiscount,
  setUserDiscount,
  setCategoryDiscount,
  addUserBonus,
  getUserBonuses,
  removeUserBonus,
} from "../controllers/promotions/discountController.js";

// jeśli masz middleware admin – użyj właściwej ścieżki
// (ten plik jest w admin/routes, więc middleware zwykle jest w ../middleware )
import { requireAdminAuth } from "../middleware/adminAuth.js";

const router = express.Router();

// CAŁY router zaautoryzowany (jeśli nie chcesz – usuń tę linię)
router.use(requireAdminAuth);

/* ====== PROMOTIONS – CRUD ====== */
router.get("/", listPromotions);
router.post("/", createPromotion);
router.put("/:id", updatePromotion);
router.delete("/:id", deletePromotion);

/* ====== PROMOTIONS – akcje ====== */
router.post("/:id/activate", activatePromotion);
router.post("/:id/deactivate", deactivatePromotion);

/* ====== DISCOUNTS / BONUSES ====== */
router.get("/discounts", getDiscounts);
router.post("/ads/:adId/discount", setDiscount);
router.post("/bulk-discount", setBulkDiscount);
router.post("/users/:userId/discount", setUserDiscount);
router.post("/categories/:category/discount", setCategoryDiscount);

router.post("/users/:userId/bonus", addUserBonus);
router.get("/users/:userId/bonuses", getUserBonuses);
router.delete("/users/:userId/bonuses/:bonusId", removeUserBonus);

export default router;
