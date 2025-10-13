/**
 * Handler do aktualizacji ogłoszeń
 * Odpowiada za: edycję ogłoszeń z wszystkimi poprawkami mapowania
 */

import Ad from "../../../models/listings/ad.js";
import auth from "../../../middleware/auth.js";
import validate from "../../../middleware/validation/validate.js";
import adValidationSchema from "../../../validationSchemas/adValidation.js";
import multer from "multer";
import errorHandler from "../../../middleware/errors/errorHandler.js";
import {
  uploadAdImages,
  validateFiles,
  isStorageAvailable,
} from "../../../services/storage/supabase.js";

/**
 * Funkcja do pełnej kapitalizacji (wszystkie litery duże)
 */
const toUpperCase = (text) => {
  if (!text || typeof text !== "string") return text;
  return text.toUpperCase();
};

/**
 * Mapowanie opcji zakupu z frontendu na wartości w schemacie
 */
const purchaseOptionsMapping = {
  sprzedaz: "Sprzedaż",
  Sprzedaż: "Sprzedaż",
  faktura: "Faktura VAT",
  "Faktura VAT": "Faktura VAT",
  inne: "Inne",
  Inne: "Inne",
  najem: "Inne",
  leasing: "Inne",
  Cesja: "Cesja leasingu",
  cesja: "Cesja leasingu",
  "Cesja leasingu": "Cesja leasingu",
  Zamiana: "Zamiana",
  zamiana: "Zamiana",
};

/**
 * Mapowanie sellerType z frontendu na wartości w schemacie
 */
const sellerTypeMapping = {
  Prywatny: "Prywatny",
  prywatny: "Prywatny",
  private: "Prywatny",
  Firma: "Firma",
  firma: "Firma",
  company: "Firma",
};

// Configure multer to use memory storage for Supabase
const upload = multer({
  storage: multer.memoryStorage(), // Store files in memory as Buffer
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
    files: 15, // Maximum 15 files per request
  },
  fileFilter: (req, file, cb) => {
    // Only accept images
    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];
    if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(
        new Error("Tylko pliki obrazów są dozwolone (JPEG, PNG, WebP)"),
        false
      );
    }
  },
});

/**
 * PUT /ads/:id - UPROSZCZONA aktualizacja ogłoszenia
 */
export const updateAd = [
  auth,
  upload.array("images", 15), // Zwiększony limit do 15 zdjęć
  async (req, res, next) => {
    try {
      console.log("=== ROZPOCZĘCIE AKTUALIZACJI OGŁOSZENIA ===");
      console.log("ID ogłoszenia:", req.params.id);
      console.log("Użytkownik:", req.user.userId);
      console.log("Dane z frontendu:", req.body);
      console.log("Pliki:", req.files ? req.files.length : 0);

      const ad = await Ad.findById(req.params.id);

      if (!ad) {
        return res.status(404).json({ message: "Ogłoszenie nie znalezione" });
      }

      // Sprawdź uprawnienia
      if (
        ad.owner.toString() !== req.user.userId.toString() &&
        req.user.role !== "admin"
      ) {
        return res
          .status(403)
          .json({ message: "Brak uprawnień do edycji tego ogłoszenia" });
      }

      // ROZSZERZONE pola do edycji - wszystkie dane ogłoszenia
      const editableFields = [
        // Podstawowe
        "headline",
        "title",
        "description",
        "price",
        "discount",
        "discountedPrice",
        "status",
        "featured",
        "hidden",

        // Dane pojazdu
        "brand",
        "model",
        "generation",
        "version",
        "year",
        "mileage",
        "fuelType",
        "transmission",
        "bodyType",
        "color",
        "power",
        "engineSize",
        "drive",
        "seats",
        "condition",
        "countryOfOrigin",

        // Lokalizacja
        "city",
        "voivodeship",
      ];

      console.log("=== AKTUALIZACJA PÓL ===");
      editableFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          const oldValue = ad[field];
          let newValue = req.body[field];

          // Konwersja dla pól numerycznych
          if (
            [
              "mileage",
              "price",
              "discount",
              "discountedPrice",
              "power",
              "engineSize",
              "seats",
            ].includes(field)
          ) {
            newValue = parseInt(req.body[field]) || 0;
            console.log(
              `${field}: "${oldValue}" -> ${newValue} (konwersja na liczbę)`
            );
          }
          // Konwersja dla pól boolean
          else if (["featured", "hidden"].includes(field)) {
            newValue = req.body[field] === true || req.body[field] === "true";
            console.log(
              `${field}: "${oldValue}" -> ${newValue} (konwersja na boolean)`
            );
          } else {
            console.log(`${field}: "${oldValue}" -> "${newValue}"`);
          }

          ad[field] = newValue;
        }
      });

      // Synchronizacja title i headline
      if (req.body.title && !req.body.headline) {
        ad.headline = req.body.title;
        console.log("Zsynchronizowano headline z title");
      } else if (req.body.headline && !req.body.title) {
        ad.title = req.body.headline;
        console.log("Zsynchronizowano title z headline");
      }

      // Obsługa statusu hidden - jeśli hidden=true, ustaw status na 'hidden'
      if (req.body.hidden === true || req.body.hidden === "true") {
        ad.status = "hidden";
        console.log('Ustawiono status na "hidden" z powodu hidden=true');
      }

      // Obsługa zdjęć z frontendu (tablica URL-i)
      if (req.body.images) {
        try {
          let imageArray = req.body.images;

          // Parsuj jeśli to string JSON
          if (typeof imageArray === "string") {
            imageArray = JSON.parse(imageArray);
          }

          if (Array.isArray(imageArray) && imageArray.length > 0) {
            console.log("Aktualizacja zdjęć z frontendu:", imageArray);
            ad.images = imageArray;
          }
        } catch (error) {
          console.error("Błąd parsowania zdjęć:", error);
        }
      }

      // Obsługa kolejności zdjęć - jeśli przesłano nową kolejność
      if (req.body.imageOrder) {
        try {
          const imageOrder =
            typeof req.body.imageOrder === "string"
              ? JSON.parse(req.body.imageOrder)
              : req.body.imageOrder;

          if (Array.isArray(imageOrder) && imageOrder.length > 0) {
            console.log("Aktualizacja kolejności zdjęć:", imageOrder);
            ad.images = imageOrder;
          }
        } catch (error) {
          console.error("Błąd parsowania kolejności zdjęć:", error);
        }
      }

      // Obsługa nowych zdjęć (pliki uploadowane) - SUPABASE
      if (req.files && req.files.length > 0) {
        console.log(`Dodawanie ${req.files.length} nowych zdjęć do Supabase`);

        // Check if Supabase is available
        if (!isStorageAvailable()) {
          return res.status(503).json({
            message: "Upload zdjęć tymczasowo niedostępny",
            error: "Supabase Storage not configured",
          });
        }

        try {
          // Validate files
          const validation = validateFiles(req.files, {
            maxFiles: 15,
            maxFileSize: 5 * 1024 * 1024,
          });

          if (!validation.valid) {
            return res.status(400).json({
              message: "Walidacja plików nie powiodła się",
              errors: validation.errors,
            });
          }

          // Upload to Supabase
          const uploadedImages = await uploadAdImages(req.files, req.params.id);

          // Extract public URLs
          const newImageUrls = uploadedImages.map((img) => img.originalUrl);

          console.log("Nowe zdjęcia przesłane do Supabase:", newImageUrls);

          // Add to existing images
          ad.images = [...(ad.images || []), ...newImageUrls];
        } catch (uploadError) {
          console.error("❌ Błąd uploadu do Supabase:", uploadError);
          return res.status(500).json({
            message: "Błąd podczas uploadu zdjęć",
            error: uploadError.message,
          });
        }
      }

      // Ustaw główne zdjęcie
      if (req.body.mainImage) {
        ad.mainImage = req.body.mainImage;
        console.log("Główne zdjęcie ustawione na:", ad.mainImage);
      } else if (ad.images && ad.images.length > 0) {
        ad.mainImage = ad.images[0];
        console.log(
          "Główne zdjęcie ustawione na pierwsze z listy:",
          ad.mainImage
        );
      }

      // Walidacja zdjęć dla trybu strict (można wyłączyć dla admina)
      if (req.user.role !== "admin") {
        const totalImages = ad.images ? ad.images.length : 0;

        if (totalImages < 5) {
          return res.status(400).json({
            message: `Ogłoszenie musi zawierać minimum 5 zdjęć. Obecnie masz ${totalImages}.`,
          });
        }

        if (totalImages > 15) {
          return res.status(400).json({
            message: `Ogłoszenie może zawierać maksymalnie 15 zdjęć. Obecnie masz ${totalImages}.`,
          });
        }
      }

      // Automatyczne generowanie shortDescription
      if (req.body.description) {
        ad.shortDescription = req.body.description.substring(0, 120);
      }

      console.log("=== ZAPIS DO BAZY DANYCH ===");
      console.log("Zmodyfikowane pola:", ad.modifiedPaths());

      // KLUCZOWE: Zapis bez dodatkowej walidacji
      const savedAd = await ad.save({ validateBeforeSave: false });

      console.log("✅ SUKCES - Ogłoszenie zapisane w bazie danych");
      console.log("ID zapisanego ogłoszenia:", savedAd._id);

      res.status(200).json({
        message: "Ogłoszenie zaktualizowane pomyślnie",
        ad: savedAd,
        success: true,
      });
    } catch (err) {
      console.error("❌ BŁĄD podczas aktualizacji ogłoszenia:", err);
      console.error("Stack trace:", err.stack);

      res.status(500).json({
        message: "Błąd podczas aktualizacji ogłoszenia",
        error: err.message,
        success: false,
      });
    }
  },
  errorHandler,
];

export default { updateAd };
