import express from 'express';
import {
  getAds,
  getAdDetails,
  updateAd,
  deleteAd,
  setBulkDiscount,
  getPendingAds,
  approveAd,
  rejectAd,
  moderateAd
} from '../controllers/listings/adController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

/**
 * Admin Listing Routes
 * Routes for managing ads in admin panel
 * 
 * @author Senior Developer
 * @version 1.0.0
 */

const router = express.Router();

/**
 * Apply admin authentication middleware to all routes
 */
router.use(requireAdminAuth);

/**
 * GET /api/admin-panel/listings
 * Get all ads with filtering and pagination
 */
router.get('/', getAds);

/**
 * GET /api/admin-panel/listings/pending
 * Get pending ads for moderation
 */
router.get('/pending', getPendingAds);

/**
 * GET /api/admin-panel/listings/:adId
 * Get specific ad details
 */
router.get('/:adId', getAdDetails);

/**
 * PUT /api/admin-panel/listings/:adId
 * Update ad details
 */
router.put('/:adId', updateAd);

/**
 * DELETE /api/admin-panel/listings/:adId
 * Delete an ad
 */
router.delete('/:adId', deleteAd);

/**
 * POST /api/admin-panel/listings/bulk-discount
 * Set discount for multiple ads
 */
router.post('/bulk-discount', setBulkDiscount);

/**
 * POST /api/admin-panel/listings/:adId/approve
 * Approve a pending ad
 */
router.post('/:adId/approve', approveAd);

/**
 * POST /api/admin-panel/listings/:adId/reject
 * Reject a pending ad
 */
router.post('/:adId/reject', rejectAd);

/**
 * POST /api/admin-panel/listings/:adId/moderate
 * Moderate an ad (approve/reject/request changes)
 */
router.post('/:adId/moderate', moderateAd);

export default router;
