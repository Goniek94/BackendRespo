import express from 'express';
import {
  getReports,
  getReportById,
  updateReportStatus,
  deleteReport,
  resolveReport
} from '../controllers/reports/reportController.js';

const router = express.Router();

/**
 * Report Management Routes
 * Endpoints for admin report management
 * Authentication is handled by parent router
 */

// GET /admin/reports - Get all reports with filtering
router.get('/', getReports);

// GET /admin/reports/:reportId - Get single report details
router.get('/:reportId', getReportById);

// PUT /admin/reports/:reportId - Update report status
router.put('/:reportId', updateReportStatus);

// DELETE /admin/reports/:reportId - Delete report
router.delete('/:reportId', deleteReport);

// POST /admin/reports/:reportId/resolve - Resolve report
router.post('/:reportId/resolve', resolveReport);

export default router;
