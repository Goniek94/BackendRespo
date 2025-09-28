/**
 * VALIDATION ROUTES
 * Trasy związane z walidacją danych użytkowników
 */

import express from "express";
import {
  checkEmailExists,
  checkPhoneExists,
} from "../../../controllers/user/index.js";

const router = express.Router();

// Sprawdzanie czy email istnieje
router.post("/check-email", checkEmailExists);

// Sprawdzanie czy telefon istnieje
router.post("/check-phone", checkPhoneExists);

export default router;
