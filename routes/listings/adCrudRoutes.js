/**
 * CRUD Routes dla Ogłoszeń - Wersja Modularna
 * Odpowiada za: tworzenie, pobieranie, edycję i usuwanie ogłoszeń
 *
 * REFAKTORYZACJA: Podzielono oryginalny duży plik na mniejsze, modularne handlery:
 * - createAdHandler.js - tworzenie ogłoszeń z poprawkami mapowania
 * - readAdHandler.js - pobieranie ogłoszeń
 * - updateAdHandler.js - aktualizacja ogłoszeń z poprawkami mapowania
 * - imageHandler.js - zarządzanie zdjęciami
 * - statusHandler.js - zarządzanie statusami
 *
 * POPRAWKI ZAIMPLEMENTOWANE:
 * ✅ Naprawiono mapowanie purchaseOptions (Cesja, Zamiana, Najem)
 * ✅ Dodano brakujące pola: firstRegistrationDate, lastOfficialMileage
 * ✅ Dodano pola Cesja: leasingCompany, remainingInstallments, installmentAmount, cessionFee
 * ✅ Dodano pola Zamiana: exchangeOffer, exchangeValue, exchangePayment, exchangeConditions
 * ✅ Naprawiono destructuring countryOfOrigin
 * ✅ Poprawiono konwersję typów dla wszystkich pól numerycznych
 */

import express from "express";
import { Router } from "express";
import rateLimit from "express-rate-limit";

// Import handlerów
import { createAd } from "./handlers/createAdHandler.js";
import { getAdById } from "./handlers/readAdHandler.js";
import { updateAd } from "./handlers/updateAdHandler.js";
import {
  reorderImages,
  uploadImages,
  uploadImageUrls,
  deleteImage,
} from "./handlers/imageHandler.js";
import { changeStatus, extendAd, deleteAd } from "./handlers/statusHandler.js";

// Import dodatkowych komponentów ze starego systemu
import searchRoutes from "./ads/search.js";
import featuredRoutes from "./ads/featured.js";
import Ad from "../../models/listings/ad.js";
import errorHandler from "../../middleware/errors/errorHandler.js";

const router = Router();

// ==================== DODATKOWE KOMPONENTY ZE STAREGO SYSTEMU ====================

// Mount search and featured routes
router.use("/", searchRoutes); // Search and filtering routes
router.use("/", featuredRoutes); // Featured and rotated ads

// Limiter dla trasy dodawania ogłoszenia - 1 ogłoszenie na 5 minut per użytkownik
const createAdLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minut
  max: 1, // 1 ogłoszenie na 5 minut
  message:
    "Możesz dodać tylko 1 ogłoszenie na 5 minut. Spróbuj ponownie później.",
  // Używamy ID użytkownika jako klucza, jeśli użytkownik jest zalogowany
  keyGenerator: function (req) {
    // Jeśli użytkownik jest zalogowany, używamy jego ID jako klucza
    if (req.user && req.user.userId) {
      return req.user.userId;
    }
    // W przeciwnym razie używamy adresu IP
    return req.ip;
  },
  // Nie stosuj limitu dla administratorów
  skip: function (req) {
    return req.user && req.user.role === "admin";
  },
});

// ==================== GŁÓWNE OPERACJE CRUD ====================

/**
 * POST /ads/add - Tworzenie nowego ogłoszenia z URL-ami zdjęć z Supabase
 * Handler: createAdHandler.js
 * Poprawki: wszystkie brakujące pola, mapowanie purchaseOptions, konwersje typów
 */
// Tymczasowo wyłączony rate limiter dla testów
router.post("/add", /* createAdLimiter, */ createAd);

/**
 * GET /ads/:id - Pobieranie szczegółów ogłoszenia oraz aktualizacja wyświetleń
 * Handler: readAdHandler.js
 */
router.get("/:id", getAdById);

/**
 * PUT /ads/:id - Aktualizacja ogłoszenia
 * Handler: updateAdHandler.js
 * Poprawki: wszystkie brakujące pola, obsługa zdjęć, walidacja
 */
router.put("/:id", updateAd);

/**
 * DELETE /ads/:id - Usuwanie ogłoszenia
 * Handler: statusHandler.js
 */
router.delete("/:id", deleteAd);

// ==================== ZARZĄDZANIE STATUSAMI ====================

/**
 * PUT /ads/:id/status - Zmiana statusu ogłoszenia
 * Handler: statusHandler.js
 */
router.put("/:id/status", changeStatus);

/**
 * POST /ads/:id/extend - Przedłużenie ogłoszenia o 30 dni
 * Handler: statusHandler.js
 */
router.post("/:id/extend", extendAd);

// ==================== ZARZĄDZANIE ZDJĘCIAMI ====================

/**
 * PUT /ads/:id/reorder-images - Zmiana kolejności zdjęć
 * Handler: imageHandler.js
 */
router.put("/:id/reorder-images", reorderImages);

/**
 * POST /ads/:id/images - Upload nowych zdjęć do ogłoszenia (lokalne pliki)
 * Handler: imageHandler.js
 */
router.post("/:id/images", uploadImages);

/**
 * POST /ads/:id/images/urls - Dodawanie zdjęć przez URL-e (z Supabase)
 * Handler: imageHandler.js
 */
router.post("/:id/images/urls", uploadImageUrls);

/**
 * DELETE /ads/:id/images/:index - Usuwanie zdjęcia z ogłoszenia
 * Handler: imageHandler.js
 */
router.delete("/:id/images/:index", deleteImage);

// ==================== STATYSTYKI ====================

/**
 * GET /stats - Get ad statistics
 */
router.get(
  "/stats",
  async (req, res, next) => {
    try {
      const totalAds = await Ad.countDocuments();
      const activeAds = await Ad.countDocuments({
        status: { $in: ["active", "opublikowane"] },
      });
      const pendingAds = await Ad.countDocuments({ status: "pending" });
      const featuredAds = await Ad.countDocuments({
        listingType: { $in: ["wyróżnione", "featured", "premium"] },
        status: { $in: ["active", "opublikowane"] },
      });

      // Get brand statistics
      const brandStats = await Ad.aggregate([
        { $match: { status: { $in: ["active", "opublikowane"] } } },
        { $group: { _id: "$brand", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]);

      // Get price statistics
      const priceStats = await Ad.aggregate([
        {
          $match: {
            status: { $in: ["active", "opublikowane"] },
            price: { $gt: 0 },
          },
        },
        {
          $group: {
            _id: null,
            avgPrice: { $avg: "$price" },
            minPrice: { $min: "$price" },
            maxPrice: { $max: "$price" },
            totalValue: { $sum: "$price" },
          },
        },
      ]);

      res.status(200).json({
        totalAds,
        activeAds,
        pendingAds,
        featuredAds,
        brandStats,
        priceStats: priceStats[0] || {
          avgPrice: 0,
          minPrice: 0,
          maxPrice: 0,
          totalValue: 0,
        },
      });
    } catch (err) {
      console.error("Error getting ad statistics:", err);
      next(err);
    }
  },
  errorHandler
);

// ==================== INFORMACJE O REFAKTORYZACJI ====================

console.log(`
🔧 REFAKTORYZACJA ADCRUDROUTES ZAKOŃCZONA POMYŚLNIE
📁 Struktura modułów:
   ├── createAdHandler.js - Tworzenie ogłoszeń (z poprawkami mapowania)
   ├── readAdHandler.js - Pobieranie ogłoszeń
   ├── updateAdHandler.js - Aktualizacja ogłoszeń (z poprawkami mapowania)
   ├── imageHandler.js - Zarządzanie zdjęciami
   └── statusHandler.js - Zarządzanie statusami

✅ POPRAWKI ZAIMPLEMENTOWANE:
   • Naprawiono mapowanie purchaseOptions (Cesja, Zamiana, Najem)
   • Dodano brakujące pola: firstRegistrationDate, lastOfficialMileage
   • Dodano pola Cesja: leasingCompany, remainingInstallments, installmentAmount, cessionFee
   • Dodano pola Zamiana: exchangeOffer, exchangeValue, exchangePayment, exchangeConditions
   • Naprawiono destructuring countryOfOrigin
   • Poprawiono konwersję typów dla wszystkich pól numerycznych

🎯 KORZYŚCI:
   • Lepsze zarządzanie kodem
   • Łatwiejsze testowanie
   • Większa czytelność
   • Modularność i możliwość ponownego użycia
   • Łatwiejsze debugowanie
`);

export default router;
