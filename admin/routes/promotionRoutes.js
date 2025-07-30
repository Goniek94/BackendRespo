import express from 'express';
import {
  getDiscounts,
  setDiscount,
  setBulkDiscount,
  setUserDiscount,
  setCategoryDiscount,
  addUserBonus,
  getUserBonuses,
  removeUserBonus
} from '../controllers/promotions/discountController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = express.Router();

/**
 * Promotion Management Routes
 * Endpoints for admin promotion and discount management
 * All routes protected by adminAuth middleware
 */

// Apply admin authentication to all routes
router.use(requireAdminAuth);

// GET /admin/promotions - Get all discounts with filtering
router.get('/', getDiscounts);

// POST /admin/promotions/ads/:adId/discount - Set discount for single ad
router.post('/ads/:adId/discount', setDiscount);

// POST /admin/promotions/bulk-discount - Set bulk discount for multiple ads
router.post('/bulk-discount', setBulkDiscount);

// POST /admin/promotions/users/:userId/discount - Set discount for all user's ads
router.post('/users/:userId/discount', setUserDiscount);

// POST /admin/promotions/categories/:category/discount - Set discount for category
router.post('/categories/:category/discount', setCategoryDiscount);

// POST /admin/promotions/users/:userId/bonus - Add bonus for user
router.post('/users/:userId/bonus', addUserBonus);

// GET /admin/promotions/users/:userId/bonuses - Get user's bonuses
router.get('/users/:userId/bonuses', getUserBonuses);

// DELETE /admin/promotions/users/:userId/bonuses/:bonusId - Remove user's bonus
router.delete('/users/:userId/bonuses/:bonusId', removeUserBonus);

export default router;
