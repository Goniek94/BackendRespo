// admin/routes/analyticsRoutes.js
import express from "express";
import {
  getActiveUsersToday,
  getActiveUsersRange,
} from "../controllers/analytics/activeUsersController.js";

const router = express.Router();

// Active users endpoints
router.get("/active-users/today", getActiveUsersToday);
router.get("/active-users/range", getActiveUsersRange);

export default router;
