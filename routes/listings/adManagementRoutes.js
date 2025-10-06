/**
 * Management Routes dla Ogłoszeń
 * Odpowiada za: zarządzanie statusem, zdjęciami i ogłoszeniami użytkownika
 */

import express from "express";
import { Router } from "express";
import auth from "../../middleware/auth.js";
import Ad from "../../models/listings/ad.js";
import errorHandler from "../../middleware/errors/errorHandler.js";
import notificationManager from "../../services/notificationManager.js";

const router = Router();

// GET /ads/user/listings - Pobieranie ogłoszeń użytkownika
router.get(
  "/user/listings",
  auth,
  async (req, res, next) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      console.log("Pobieranie ogłoszeń użytkownika:", req.user.userId);
      console.log("Parametry zapytania:", { page, limit });

      const userListings = await Ad.find({ owner: req.user.userId })
        .populate("owner", "role name email")
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);

      // Process listings to ensure headline is present
      const processedListings = userListings.map((ad) => {
        const adObject = ad.toObject();

        // Debug: Check original values
        console.log(`\n📋 Processing ad ${adObject._id}:`);
        console.log(`  - Original headline: "${adObject.headline}"`);
        console.log(
          `  - Original description: "${
            adObject.description
              ? adObject.description.substring(0, 100)
              : "BRAK"
          }"`
        );

        // BUILD HEADLINE if missing or empty
        if (!adObject.headline || adObject.headline.trim() === "") {
          if (adObject.description && adObject.description.trim() !== "") {
            adObject.headline = adObject.description.substring(0, 50) + "...";
            console.log(
              `  ✅ Built headline from description: "${adObject.headline}"`
            );
          } else {
            adObject.headline = `${adObject.year}, ${adObject.mileage || 0} km`;
            console.log(`  ⚠️ Used fallback headline: "${adObject.headline}"`);
          }
        } else {
          console.log(`  ✓ Using existing headline: "${adObject.headline}"`);
        }

        return adObject;
      });

      console.log(
        "Znalezione ogłoszenia użytkownika:",
        processedListings.length
      );
      console.log(
        "Szczegóły ogłoszeń:",
        processedListings.map((ad) => ({
          id: ad._id,
          brand: ad.brand,
          model: ad.model,
          headline: ad.headline,
          listingType: ad.listingType,
          status: ad.status,
        }))
      );

      const total = await Ad.countDocuments({ owner: req.user.userId });
      console.log("Całkowita liczba ogłoszeń użytkownika:", total);

      res.status(200).json({
        ads: processedListings,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalAds: total,
      });
    } catch (err) {
      console.error("Błąd podczas pobierania ogłoszeń użytkownika:", err);
      next(err);
    }
  },
  errorHandler
);

// PUT /ads/:id/status - Zmiana statusu ogłoszenia
router.put(
  "/:id/status",
  auth,
  async (req, res, next) => {
    const { status } = req.body;

    if (
      ![
        "pending",
        "active",
        "rejected",
        "needs_changes",
        "sold",
        "archived",
      ].includes(status)
    ) {
      return res
        .status(400)
        .json({ message: "Nieprawidłowy status ogłoszenia" });
    }

    try {
      const ad = await Ad.findById(req.params.id);

      if (!ad) {
        return res.status(404).json({ message: "Ogłoszenie nie znalezione" });
      }

      // Sprawdź czy użytkownik jest właścicielem lub adminem
      if (
        ad.owner.toString() !== req.user.userId.toString() &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({
          message: "Brak uprawnień do zmiany statusu tego ogłoszenia",
        });
      }

      // Zapisz poprzedni status do porównania
      const previousStatus = ad.status;

      // Aktualizuj status
      ad.status = status;
      await ad.save();

      // Tworzenie powiadomienia o zmianie statusu ogłoszenia
      if (previousStatus !== status) {
        try {
          const adTitle = ad.headline || `${ad.brand} ${ad.model}`;
          await notificationManager.notifyAdStatusChange(
            ad.owner.toString(),
            adTitle,
            status
          );
          console.log(
            `Utworzono powiadomienie o zmianie statusu ogłoszenia dla użytkownika ${ad.owner}`
          );
        } catch (notificationError) {
          console.error(
            "Błąd podczas tworzenia powiadomienia:",
            notificationError
          );
          // Nie przerywamy głównego procesu w przypadku błędu powiadomienia
        }
      }

      res.status(200).json({ message: "Status ogłoszenia zaktualizowany", ad });
    } catch (err) {
      next(err);
    }
  },
  errorHandler
);

// PATCH /ads/:id/images - Aktualizacja zdjęć w ogłoszeniu
router.patch(
  "/:id/images",
  auth,
  async (req, res, next) => {
    try {
      const ad = await Ad.findById(req.params.id);

      if (!ad) {
        return res.status(404).json({ message: "Ogłoszenie nie znalezione" });
      }

      // Sprawdź czy użytkownik jest właścicielem lub adminem
      if (
        ad.owner.toString() !== req.user.userId.toString() &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({
          message: "Brak uprawnień do aktualizacji zdjęć tego ogłoszenia",
        });
      }

      const { images, mainImage } = req.body;

      if (images && Array.isArray(images)) {
        ad.images = images;
      }

      if (mainImage) {
        ad.mainImage = mainImage;
      }

      await ad.save();

      res
        .status(200)
        .json({ message: "Zdjęcia ogłoszenia zaktualizowane", ad });
    } catch (err) {
      next(err);
    }
  },
  errorHandler
);

// PUT /ads/:id/main-image - Ustawienie głównego zdjęcia ogłoszenia
router.put(
  "/:id/main-image",
  auth,
  async (req, res, next) => {
    const { mainImageIndex } = req.body;

    try {
      const ad = await Ad.findById(req.params.id);

      if (!ad) {
        return res.status(404).json({ message: "Ogłoszenie nie znalezione" });
      }

      // Sprawdź czy użytkownik jest właścicielem lub adminem
      if (
        ad.owner.toString() !== req.user.userId.toString() &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({
          message: "Brak uprawnień do zmiany głównego zdjęcia tego ogłoszenia",
        });
      }

      ad.mainImage = ad.images[mainImageIndex];
      await ad.save();

      res.status(200).json(ad);
    } catch (err) {
      next(err);
    }
  },
  errorHandler
);

// DELETE /ads/:id/images/:index - Usuwanie zdjęcia z ogłoszenia
router.delete(
  "/:id/images/:index",
  auth,
  async (req, res, next) => {
    try {
      const ad = await Ad.findById(req.params.id);

      if (!ad) {
        return res.status(404).json({ message: "Ogłoszenie nie znalezione" });
      }

      // Sprawdź czy użytkownik jest właścicielem lub adminem
      if (
        ad.owner.toString() !== req.user.userId.toString() &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({
          message: "Brak uprawnień do usunięcia zdjęcia z tego ogłoszenia",
        });
      }

      const imageIndex = parseInt(req.params.index);

      // Sprawdź czy indeks jest prawidłowy
      if (imageIndex < 0 || imageIndex >= ad.images.length) {
        return res
          .status(400)
          .json({ message: "Nieprawidłowy indeks zdjęcia" });
      }

      // Nie pozwól na usunięcie ostatniego zdjęcia
      if (ad.images.length <= 1) {
        return res.status(400).json({
          message: "Nie można usunąć ostatniego zdjęcia z ogłoszenia",
        });
      }

      // Usuń zdjęcie z tablicy
      const removedImage = ad.images[imageIndex];
      ad.images.splice(imageIndex, 1);

      // Jeśli usunięte zdjęcie było głównym, ustaw nowe główne
      if (ad.mainImage === removedImage) {
        ad.mainImage = ad.images[0];
      }

      await ad.save();

      res.status(200).json({
        message: "Zdjęcie zostało usunięte",
        ad: ad,
      });
    } catch (err) {
      console.error("Błąd podczas usuwania zdjęcia:", err);
      next(err);
    }
  },
  errorHandler
);

// POST /ads/:id/renew - Odnowienie wygasłego ogłoszenia
router.post(
  "/:id/renew",
  auth,
  async (req, res, next) => {
    try {
      const ad = await Ad.findById(req.params.id);

      if (!ad) {
        return res.status(404).json({ message: "Ogłoszenie nie znalezione" });
      }

      // Sprawdź czy użytkownik jest właścicielem lub adminem
      if (
        ad.owner.toString() !== req.user.userId.toString() &&
        req.user.role !== "admin"
      ) {
        return res
          .status(403)
          .json({ message: "Brak uprawnień do odnowienia tego ogłoszenia" });
      }

      // Sprawdź czy ogłoszenie ma status archived
      if (ad.status !== "archived") {
        return res
          .status(400)
          .json({ message: "Tylko zakończone ogłoszenia mogą być odnowione" });
      }

      // Ustaw nowy termin wygaśnięcia (30 dni od teraz) - tylko dla zwykłych użytkowników
      if (ad.ownerRole !== "admin") {
        const newExpiryDate = new Date();
        newExpiryDate.setDate(newExpiryDate.getDate() + 30);
        ad.expiresAt = newExpiryDate;
      }

      // Zmień status na active
      ad.status = "active";

      // Zapisz zmiany
      await ad.save();

      // Tworzenie powiadomienia o odnowieniu ogłoszenia
      try {
        const adTitle = ad.headline || `${ad.brand} ${ad.model}`;
        await notificationManager.notifyAdStatusChange(
          ad.owner.toString(),
          adTitle,
          "odnowione"
        );
        console.log(
          `Utworzono powiadomienie o odnowieniu ogłoszenia dla użytkownika ${ad.owner}`
        );
      } catch (notificationError) {
        console.error(
          "Błąd podczas tworzenia powiadomienia:",
          notificationError
        );
        // Nie przerywamy głównego procesu w przypadku błędu powiadomienia
      }

      res.status(200).json({
        message: "Ogłoszenie zostało odnowione",
        ad,
        expiresAt: ad.expiresAt,
      });
    } catch (err) {
      console.error("Błąd podczas odnawiania ogłoszenia:", err);
      next(err);
    }
  },
  errorHandler
);

// POST /ads/:id/images - Dodawanie zdjęć do ogłoszenia
router.post(
  "/:id/images",
  auth,
  async (req, res, next) => {
    try {
      const { images } = req.body;
      const ad = await Ad.findByIdAndUpdate(
        req.params.id,
        { $push: { images: { $each: images } } },
        { new: true }
      );
      res.json(ad);
    } catch (err) {
      next(err);
    }
  },
  errorHandler
);

export default router;
