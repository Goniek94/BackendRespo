/**
 * USER ROUTES AGGREGATOR
 * Główny plik agregujący wszystkie trasy użytkowników
 *
 * MODULARYZACJA ZAKOŃCZONA:
 * - auth/ - uwierzytelnianie (rejestracja, logowanie, hasła)
 * - verification/ - weryfikacja (email, SMS, kody)
 * - profile/ - profil użytkownika (dashboard, dane)
 * - validation/ - walidacja danych (sprawdzanie email/telefon)
 */

import express from "express";

// Import modułów tras
import authRoutes from "./auth/authRoutes.js";
import verificationRoutes from "./verification/verificationRoutes.js";
import profileRoutes from "./profile/profileRoutes.js";
import validationRoutes from "./validation/validationRoutes.js";

// Import Socket.IO auth routes
import socketAuthRoutes from "../auth/socketAuth.js";

const router = express.Router();

// Socket.IO authentication routes
router.use("/auth", socketAuthRoutes);

// Validation routes (sprawdzanie dostępności email/telefon)
router.use("/", validationRoutes);

// Authentication routes (rejestracja, logowanie, hasła)
router.use("/", authRoutes);

// Verification routes (weryfikacja email, SMS, kody)
router.use("/", verificationRoutes);

// Profile routes (profil, dashboard, ostatnio oglądane)
router.use("/", profileRoutes);

export default router;
