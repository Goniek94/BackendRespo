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

const router = express.Router();

/**
 * Listing Management Routes
 * Endpoints for admin listing management
 * All routes protected by adminAuth middleware
 */

// Apply admin authentication to all routes
router.use(requireAdminAuth);

// GET /admin/listings - Get all listings with filtering
router.get('/', getAds);

// GET /admin/listings/stats - Get listings statistics
router.get('/stats', getAds); // Using same controller for now, can be specialized later

// GET /admin/listings/pending - Get pending listings for moderation
router.get('/pending', getPendingAds);

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
