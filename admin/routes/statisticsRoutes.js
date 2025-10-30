import express from "express";
import { getStatistics } from "../controllers/statistics/statisticsController.js";
import { requireAdminAuth } from "../middleware/adminAuth.js";

const router = express.Router();

// GET /admin-panel/statistics - główny endpoint (dla kompatybilności)
router.get("/", requireAdminAuth, getStatistics);

// GET /admin-panel/statistics/overview - alias
router.get("/overview", requireAdminAuth, getStatistics);

// GET /admin-panel/statistics/timeseries - alias (dla kompatybilności)
router.get("/timeseries", requireAdminAuth, getStatistics);

export default router;
