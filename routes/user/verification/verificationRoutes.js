/**
 * VERIFICATION ROUTES AGGREGATOR
 * Główny plik agregujący wszystkie trasy weryfikacji
 */

import express from "express";
import emailVerificationRoutes from "./emailVerification.js";
import smsVerificationRoutes from "./smsVerification.js";

const router = express.Router();

// Email verification routes
router.use("/", emailVerificationRoutes);

// SMS verification routes
router.use("/", smsVerificationRoutes);

export default router;
