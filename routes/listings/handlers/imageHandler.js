/**
 * Handler do zarządzania zdjęciami w ogłoszeniach
 * Odpowiada za: upload, usuwanie, zmianę kolejności zdjęć
 * UPDATED: Teraz używa wyłącznie Supabase Storage
 */

import Ad from "../../../models/listings/ad.js";
import auth from "../../../middleware/auth.js";
import multer from "multer";
import errorHandler from "../../../middleware/errors/errorHandler.js";
import {
  uploadAdImages,
  deleteAdImages,
  validateFiles,
  isStorageAvailable,
} from "../../../services/storage/supabase.js";

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
 * PUT /ads/:id/reorder-images - Zmiana kolejności zdjęć
 */
export const reorderImages = [
  auth,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { images } = req.body;

      if (!images || !Array.isArray(images)) {
        return res.status(400).json({ message: "Tablica zdjęć jest wymagana" });
      }

      const ad = await Ad.findById(id);

      if (!ad) {
        return res.status(404).json({ message: "Ogłoszenie nie znalezione" });
      }

      // Check if user is owner or admin
      if (
        ad.owner.toString() !== req.user.userId.toString() &&
        req.user.role !== "admin"
      ) {
        return res
          .status(403)
          .json({ message: "Brak uprawnień do edycji tego ogłoszenia" });
      }

      // Validate - check if all images from new order exist in original array
      const originalImages = ad.images || [];
      const isValidReorder =
        images.every((img) => originalImages.includes(img)) &&
        images.length === originalImages.length;

      if (!isValidReorder) {
        return res.status(400).json({
          message:
            "Nieprawidłowa kolejność zdjęć - wszystkie zdjęcia muszą pochodzić z oryginalnej tablicy",
        });
      }

      // Update image order
      ad.images = images;

      // If main image is not at first position anymore, update it
      if (ad.mainImage && images.length > 0) {
        // Check if main image still exists in new array
        if (!images.includes(ad.mainImage)) {
          ad.mainImage = images[0]; // Set first image as main
        }
      } else if (images.length > 0) {
        ad.mainImage = images[0];
      }

      await ad.save();

      console.log(`✅ Zmieniono kolejność zdjęć w ogłoszeniu ${id}`);
      res.status(200).json({
        message: "Kolejność zdjęć została zmieniona",
        images: ad.images,
        mainImage: ad.mainImage,
      });
    } catch (err) {
      console.error("❌ Błąd podczas zmiany kolejności zdjęć:", err);
      next(err);
    }
  },
  errorHandler,
];

/**
 * POST /ads/:id/images/urls - Dodawanie zdjęć przez URL-e (z Supabase lub zewnętrzne)
 */
export const uploadImageUrls = [
  auth,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { imageUrls } = req.body;

      if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
        return res
          .status(400)
          .json({ message: "Tablica URL-i zdjęć jest wymagana" });
      }

      const ad = await Ad.findById(id);

      if (!ad) {
        return res.status(404).json({ message: "Ogłoszenie nie znalezione" });
      }

      // Check if user is owner or admin
      if (
        ad.owner.toString() !== req.user.userId.toString() &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({
          message: "Brak uprawnień do dodawania zdjęć do tego ogłoszenia",
        });
      }

      // Check image limit
      const currentImagesCount = ad.images ? ad.images.length : 0;
      const newImagesCount = currentImagesCount + imageUrls.length;

      if (newImagesCount > 20) {
        return res.status(400).json({
          message: `Możesz mieć maksymalnie 20 zdjęć. Obecnie masz ${currentImagesCount}, próbujesz dodać ${imageUrls.length}.`,
        });
      }

      console.log("=== DODAWANIE ZDJĘĆ Z URL-I ===");
      console.log("ID ogłoszenia:", id);
      console.log("Liczba nowych URL-i:", imageUrls.length);
      console.log("Aktualna liczba zdjęć:", currentImagesCount);

      // Add new URLs to existing array
      ad.images = [...(ad.images || []), ...imageUrls];

      // If this is first image, set it as main
      if (!ad.mainImage && ad.images.length > 0) {
        ad.mainImage = ad.images[0];
        console.log("Ustawiono pierwsze zdjęcie jako główne:", ad.mainImage);
      }

      await ad.save();

      console.log("✅ Zdjęcia zostały dodane pomyślnie");
      console.log("Nowa liczba zdjęć:", ad.images.length);

      res.status(200).json({
        message: "Zdjęcia zostały dodane pomyślnie",
        images: ad.images,
        mainImage: ad.mainImage,
        addedImages: imageUrls,
      });
    } catch (err) {
      console.error("❌ Błąd podczas dodawania zdjęć z URL-i:", err);
      next(err);
    }
  },
  errorHandler,
];

/**
 * POST /ads/:id/images - Upload nowych zdjęć do ogłoszenia (SUPABASE)
 */
export const uploadImages = [
  auth,
  upload.array("images", 15),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      // Check if Supabase is configured
      if (!isStorageAvailable()) {
        return res.status(503).json({
          message: "Upload zdjęć tymczasowo niedostępny",
          error: "Supabase Storage not configured",
        });
      }

      const ad = await Ad.findById(id);

      if (!ad) {
        return res.status(404).json({ message: "Ogłoszenie nie znalezione" });
      }

      // Check if user is owner or admin
      if (
        ad.owner.toString() !== req.user.userId.toString() &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({
          message: "Brak uprawnień do dodawania zdjęć do tego ogłoszenia",
        });
      }

      // Check if files were uploaded
      if (!req.files || req.files.length === 0) {
        return res
          .status(400)
          .json({ message: "Nie przesłano żadnych plików" });
      }

      // Check image limit
      const currentImagesCount = ad.images ? ad.images.length : 0;
      const newImagesCount = currentImagesCount + req.files.length;

      if (newImagesCount > 20) {
        return res.status(400).json({
          message: `Możesz mieć maksymalnie 20 zdjęć. Obecnie masz ${currentImagesCount}, próbujesz dodać ${req.files.length}.`,
        });
      }

      console.log("=== UPLOAD ZDJĘĆ DO SUPABASE ===");
      console.log("ID ogłoszenia:", id);
      console.log("Liczba nowych zdjęć:", req.files.length);
      console.log("Aktualna liczba zdjęć:", currentImagesCount);

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
      const uploadedImages = await uploadAdImages(req.files, id);

      // Extract public URLs from uploaded images
      const newImageUrls = uploadedImages.map((img) => img.originalUrl);

      console.log("Przesłane zdjęcia - URL-e:", newImageUrls);

      // Add new images to existing array
      ad.images = [...(ad.images || []), ...newImageUrls];

      // If this is first image, set it as main
      if (!ad.mainImage && ad.images.length > 0) {
        ad.mainImage = ad.images[0];
        console.log("Ustawiono pierwsze zdjęcie jako główne:", ad.mainImage);
      }

      await ad.save();

      console.log("✅ Zdjęcia zostały przesłane pomyślnie");
      console.log("Nowa liczba zdjęć:", ad.images.length);

      res.status(200).json({
        message: "Zdjęcia zostały dodane pomyślnie",
        images: ad.images,
        mainImage: ad.mainImage,
        addedImages: newImageUrls,
        uploadedDetails: uploadedImages,
      });
    } catch (err) {
      console.error("❌ Błąd podczas uploadu zdjęć:", err);
      res.status(500).json({
        message: "Błąd podczas uploadu zdjęć",
        error: err.message,
      });
    }
  },
  errorHandler,
];

/**
 * DELETE /ads/:id/images/:index - Usuwanie zdjęcia z ogłoszenia
 */
export const deleteImage = [
  auth,
  async (req, res, next) => {
    try {
      const { id, index } = req.params;
      const imageIndex = parseInt(index);

      const ad = await Ad.findById(id);

      if (!ad) {
        return res.status(404).json({ message: "Ogłoszenie nie znalezione" });
      }

      // Check if user is owner or admin
      if (
        ad.owner.toString() !== req.user.userId.toString() &&
        req.user.role !== "admin"
      ) {
        return res
          .status(403)
          .json({ message: "Brak uprawnień do edycji tego ogłoszenia" });
      }

      // Check if index is valid
      if (imageIndex < 0 || imageIndex >= ad.images.length) {
        return res
          .status(400)
          .json({ message: "Nieprawidłowy indeks zdjęcia" });
      }

      // Check if this is not the last image
      if (ad.images.length <= 1) {
        return res.status(400).json({
          message: "Ogłoszenie musi zawierać co najmniej jedno zdjęcie",
        });
      }

      // Get image URL to delete
      const removedImageUrl = ad.images[imageIndex];

      // Try to extract storage path from Supabase URL
      // Format: https://{supabaseUrl}/storage/v1/object/public/autosell/ads/{adId}/original/{filename}
      if (
        removedImageUrl.includes("supabase") &&
        removedImageUrl.includes("/autosell/")
      ) {
        try {
          const pathMatch = removedImageUrl.match(/\/autosell\/(.+)$/);
          if (pathMatch) {
            const storagePath = pathMatch[1];
            console.log("Usuwanie zdjęcia z Supabase:", storagePath);
            await deleteAdImages(storagePath);
            console.log("✅ Zdjęcie usunięte z Supabase Storage");
          }
        } catch (deleteError) {
          console.warn(
            "⚠️ Nie udało się usunąć zdjęcia z Supabase:",
            deleteError.message
          );
          // Continue anyway - remove from database
        }
      }

      // Remove image from array
      ad.images.splice(imageIndex, 1);

      // If removed image was main, set new main image
      if (ad.mainImage === removedImageUrl) {
        ad.mainImage = ad.images[0]; // Set first available image as main
      }

      // Save changes
      await ad.save();

      console.log(
        `✅ Usunięto zdjęcie o indeksie ${imageIndex} z ogłoszenia ${id}`
      );
      res.status(200).json({
        message: "Zdjęcie zostało usunięte",
        images: ad.images,
        mainImage: ad.mainImage,
      });
    } catch (err) {
      console.error("❌ Błąd podczas usuwania zdjęcia:", err);
      next(err);
    }
  },
  errorHandler,
];

export default { reorderImages, uploadImages, uploadImageUrls, deleteImage };
