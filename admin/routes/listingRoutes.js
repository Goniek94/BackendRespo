import express from 'express';
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
  moderateAd
} from '../controllers/listings/adController.js';

const router = express.Router();

/**
 * Listing Management Routes
 * Endpoints for admin listing management
 * Authentication is handled by parent router
 */

// GET /admin/listings/stats - Get listings statistics (must be before /:adId)
router.get('/stats', getListingsStats);

// GET /admin/listings/pending - Get pending listings for moderation (must be before /:adId)
router.get('/pending', getPendingAds);

// GET /admin/listings - Get all listings with filtering
router.get('/', getAds);

// POST /admin/listings - Create new listing
router.post('/', createAd);

// GET /admin/listings/:adId - Get single listing details
router.get('/:adId', getAdDetails);

// PUT /admin/listings/:adId - Update listing
router.put('/:adId', updateAd);

// DELETE /admin/listings/:adId - Delete listing
router.delete('/:adId', deleteAd);

// POST /admin/listings/:adId/approve - Approve listing
router.post('/:adId/approve', approveAd);

// POST /admin/listings/:adId/reject - Reject listing
router.post('/:adId/reject', rejectAd);

// POST /admin/listings/:adId/moderate - Moderate listing (general)
router.post('/:adId/moderate', moderateAd);

// POST /admin/listings/bulk-discount - Set bulk discount
router.post('/bulk-discount', setBulkDiscount);

export default router;
