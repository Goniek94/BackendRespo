// admin/routes/settingsRoutes.js
import express from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireAdminAuth } from "../middleware/adminAuth.js";
import {
  getSettings,
  updateSettings,
} from "../controllers/settings/settingsController.js";

const router = express.Router();

// chronimy wszystko: zwykły auth + admin auth
router.use(requireAuth, requireAdminAuth);

router.get("/", getSettings);
router.put("/", updateSettings);

export default router;
