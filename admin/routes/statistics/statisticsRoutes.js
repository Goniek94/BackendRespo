// admin/routes/statisticsRoutes.js
import express from "express";
import { requireAuth } from "../../../middleware/auth.js";
import {
  overviewStats,
  timeseriesStats,
  exportStats,
} from "../../controllers/auth/statistics/statisticsController.js";

const router = express.Router();
router.use(requireAuth);

router.get("/overview", overviewStats);
router.get("/timeseries", timeseriesStats);
router.get("/export", exportStats);

export default router;
