// admin/routes/activityRoutes.js
import express from "express";
import {
  getRecentActivities,
  deleteActivity,
  bulkDeleteActivity,
} from "../controllers/activity/adminActivityController.js";

const router = express.Router();

router.get("/", getRecentActivities);
router.delete("/:id", deleteActivity);
router.delete("/", bulkDeleteActivity);

export default router;
