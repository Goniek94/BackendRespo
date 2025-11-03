/**
 * VERIFICATION ROUTES AGGREGATOR
 * Główny plik agregujący wszystkie trasy weryfikacji
 */

import express from "express";
import emailVerificationRoutes from "./emailVerification.js";
import smsVerificationRoutes from "./smsVerification.js";
import preRegistrationRoutes from "./preRegistrationVerification.js";

const router = express.Router();

// Pre-registration verification routes (BEFORE account creation)
router.use("/pre-register", preRegistrationRoutes);

// Email verification routes (AFTER account creation)
router.use("/", emailVerificationRoutes);

// SMS verification routes (AFTER account creation)
router.use("/", smsVerificationRoutes);

export default router;
