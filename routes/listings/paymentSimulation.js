/**
 * Symulacja płatności dla ogłoszeń
 * UWAGA: To jest tymczasowe rozwiązanie do testów
 * W produkcji zostanie zastąpione prawdziwą integracją z TPay
 */

import { Router } from "express";
import Ad from "../../models/listings/ad.js";
import auth from "../../middleware/auth.js";
import Notification from "../../models/communication/notification.js";

const router = Router();

/**
 * POST /ads/:adId/simulate-payment
 * Symuluje udaną płatność i publikuje ogłoszenie
 */
router.post("/:adId/simulate-payment", auth, async (req, res) => {
  try {
    const { adId } = req.params;

    // Znajdź ogłoszenie
    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ 
        success: false,
        message: "Ogłoszenie nie zostało znalezione" 
      });
    }

    // Sprawdź czy użytkownik jest właścicielem
    if (ad.owner.toString() !== req.user.userId) {
      return res.status(403).json({ 
        success: false,
        message: "Nie masz uprawnień do tego ogłoszenia" 
      });
    }

    // Sprawdź czy ogłoszenie jest w statusie "pending"
    if (ad.status !== "pending") {
      return res.status(400).json({ 
        success: false,
        message: `Ogłoszenie ma już status: ${ad.status}` 
      });
    }

    // Symulacja płatności - zmień status na "approved"
    ad.status = "approved";
    ad.paidAt = new Date();
    // Ustaw termin wygaśnięcia na 30 dni od teraz
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    ad.expiresAt = expiresAt;
    
    await ad.save();

