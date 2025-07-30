import express from 'express';
import {
  getReports,
  getReportById,
  updateReportStatus,
  deleteReport,
  getReportStats
} from '../controllers/reports/reportController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = express.Router();

/**
 * Report Management Routes
 * Endpoints for admin report management
 * All routes protected by adminAuth middleware
 */

// Apply admin authentication to all routes
router.use(requireAdminAuth);

// GET /admin/reports - Get all reports with filtering
router.get('/', getReports);

// GET /admin/reports/:reportId - Get single report details
router.get('/:reportId', getReportDetails);

// PUT /admin/reports/:reportId - Update report status
router.put('/:reportId', updateReportStatus);

// DELETE /admin/reports/:reportId - Delete report
router.delete('/:reportId', deleteReport);

// POST /admin/reports/:reportId/assign - Assign report to admin
router.post('/:reportId/assign', assignReport);

export default router;
