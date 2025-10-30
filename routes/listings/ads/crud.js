/**
 * Ad CRUD Routes
 * Operacje tworzenia, odczytu, aktualizacji i usuwania ogłoszeń
 */

import { Router } from "express";
import Ad from "../../../models/listings/ad.js";
import User from "../../../models/user/user.js";
import auth from "../../../middleware/auth.js";
import validate from "../../../middleware/validation/validate.js";
import adValidationSchema from "../../../validationSchemas/adValidation.js";
import rateLimit from "express-rate-limit";
import errorHandler from "../../../middleware/errors/errorHandler.js";
import notificationManager from "../../../services/notificationManager.js";
import { mapFormDataToBackend } from "./helpers.js";
import AdController from "../../../controllers/listings/adController.js";

const router = Router();

// Rate limiter for adding ads - 1 ad per 5 minutes per user
const createAdLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 1, // 1 ad per 5 minutes
  message: "You can only add 1 ad per 5 minutes. Please try again later.",
  // Use user ID as key if user is logged in
  keyGenerator: function (req) {
    // If user is logged in, use their ID as key
    if (req.user && req.user.userId) {
      return req.user.userId;
    }
    // Otherwise use IP address
    return req.ip;
  },
  // Don't apply limit for administrators
  skip: function (req) {
    return req.user && req.user.role === "admin";
  },
});

/**
 * GET /:id - Get ad details and update views
 */
router.get(
  "/:id",
  async (req, res, next) => {
    // Check if id is not one of our special paths
    if (
      req.params.id === "stats" ||
      req.params.id === "rotated" ||
      req.params.id === "brands" ||
      req.params.id === "models" ||
      req.params.id === "search" ||
      req.params.id === "user" ||
      req.params.id === "search-stats"
    ) {
      return next();
    }

    try {
      const ad = await Ad.findByIdAndUpdate(
        req.params.id,
        { $inc: { views: 1 } },
        { new: true, runValidators: false }
      );

      if (!ad) {
        return res.status(404).json({ message: "Ad not found" });
      }

      // Convert Mongoose document to plain JavaScript object
      const adObj = ad.toObject();

      // Check if ad has images
      if (!adObj.images || adObj.images.length === 0) {
        adObj.images = [];
      } else {
        // Filter only non-empty images
        adObj.images = adObj.images.filter((imageUrl) => imageUrl);

        // If no images after filtering, return empty array
        if (adObj.images.length === 0) {
          adObj.images = [];
        }

        // Transform image paths to full URLs
        // Supabase URLs are already complete, only transform legacy local paths
        adObj.images = adObj.images.map((imageUrl) => {
          // If already a full URL (http/https), return as is
          if (imageUrl.startsWith("http")) {
            return imageUrl;
          }
          // Legacy local paths - convert to full URLs (backwards compatibility)
          else if (imageUrl.startsWith("/uploads/")) {
            return `${
              process.env.BACKEND_URL || "http://localhost:5000"
            }${imageUrl}`;
          } else if (imageUrl.startsWith("uploads/")) {
            return `${
              process.env.BACKEND_URL || "http://localhost:5000"
            }/${imageUrl}`;
          } else {
            // Assume it's a legacy filename without path
            return `${
              process.env.BACKEND_URL || "http://localhost:5000"
            }/uploads/${imageUrl}`;
          }
        });
      }

      console.log(`Returning ad ${adObj._id} with images:`, adObj.images);
      res.status(200).json(adObj);
    } catch (err) {
      next(err);
    }
  },
  errorHandler
);

/**
 * POST /add - Add new ad with Supabase image URLs
 */
router.post(
  "/add",
  auth,
  createAdLimiter,
  validate(adValidationSchema),
  async (req, res, next) => {
    try {
      console.log("Started adding ad with Supabase");
      console.log("Original data from frontend:", req.body);

      // Map data from frontend to backend
      const mappedData = mapFormDataToBackend(req.body);

      const {
        brand,
        model,
        generation,
        version,
        year,
        price,
        mileage,
        fuelType,
        transmission,
        vin,
        registrationNumber,
        headline,
        description,
        purchaseOptions,
        listingType,
        condition,
        accidentStatus,
        damageStatus,
        tuning,
        imported,
        registeredInPL,
        firstOwner,
        disabledAdapted,
        bodyType,
        color,
        lastOfficialMileage,
        power,
        engineSize,
        drive,
        doors,
        weight,
        voivodeship,
        city,
        rentalPrice,
        status,
        sellerType,
        countryOfOrigin,
        images,
        mainImage, // Receive URL array and main image
      } = mappedData;

      console.log("Data after mapping:", {
        brand,
        model,
        year,
        price,
        mileage,
        fuelType,
        transmission,
        description,
        purchaseOptions,
        listingType,
        sellerType,
        images,
      });

      // Get user data
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Validate that `images` array exists and is not empty
      if (!images || !Array.isArray(images) || images.length === 0) {
        return res
          .status(400)
          .json({ message: "Ad must contain at least one image." });
      }
      console.log(
        `Received ${images.length} image URLs from Supabase:`,
        images
      );

      // Validate that `mainImage` is one of the URLs in `images`
      if (!mainImage || !images.includes(mainImage)) {
        // If no `mainImage` or it's not in `images`, set first image as main
        console.log(
          "No `mainImage` or invalid URL. Setting first image as main."
        );
        req.body.mainImage = images[0];
      }

      // Generate short description from headline (up to 120 characters)
      const shortDescription = headline ? headline.substring(0, 120) : "";

      // Calculate expiry date - 30 days for regular users, no expiry for admins/moderators
      let expiresAt = null;
      if (user.role !== "admin" && user.role !== "moderator") {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
      }

      // Create new ad
      const newAd = new Ad({
        // Basic data
        brand,
        model,
        generation,
        version,
        year: parseInt(year),
        price: parseFloat(price),
        mileage: parseInt(mileage),
        fuelType,
        transmission,
        vin: vin || "",
        registrationNumber: registrationNumber || "",
        headline,
        description,
        shortDescription, // <-- added field
        images,
        mainImage: req.body.mainImage, // Use validated or default mainImage
        purchaseOptions,
        negotiable: req.body.negotiable || "Nie", // <-- added negotiable field
        listingType,
        sellerType, // <-- added sellerType field
        // ✅ UJEDNOLICENIE: Ustaw featured=true jeśli listingType to "wyróżnione"
        featured: listingType === "wyróżnione",
        featuredAt: listingType === "wyróżnione" ? new Date() : null,

        // Technical data
        condition,
        accidentStatus,
        damageStatus,
        tuning,
        imported,
        registeredInPL,
        firstOwner,
        disabledAdapted,
        bodyType,
        color,
        lastOfficialMileage: lastOfficialMileage
          ? parseInt(lastOfficialMileage)
          : undefined,
        power: power ? parseInt(power) : undefined,
        engineSize: engineSize ? parseInt(engineSize) : undefined,
        drive,
        doors: doors ? parseInt(doors) : undefined,
        weight: weight ? parseInt(weight) : undefined,

        // Location
        voivodeship,
        city,

        // Country of origin
        countryOfOrigin,

        // Rental
        rentalPrice: rentalPrice ? parseFloat(rentalPrice) : undefined,

        // Owner data
        owner: req.user.userId,
        ownerName: user.name,
        ownerLastName: user.lastName,
        ownerEmail: user.email,
        ownerPhone: user.phoneNumber,
        ownerRole: user.role, // Add owner role

        // Expiry date
        expiresAt: expiresAt,

        // Status - approved immediately for all users
        status: "approved",
      });

      console.log("Created ad object, attempting to save to database");

      // Save ad to database
      const ad = await newAd.save();
      console.log("Ad saved to database:", ad._id);

      // Create notification about ad creation
      try {
        await notificationManager.createListingPublishedNotification(
          req.user.userId,
          ad
        );
        console.log(
          `Created notification about ad creation for user ${req.user.userId}`
        );
      } catch (notificationError) {
        console.error("Error creating notification:", notificationError);
        // Don't interrupt main process in case of notification error
      }

      // Response with created ad
      res.status(201).json(ad);
    } catch (err) {
      console.error("Error adding ad:", err);
      next(err);
    }
  },
  errorHandler
);

/**
 * PUT /:id/status - Change ad status
 */
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
      return res.status(400).json({ message: "Invalid ad status" });
    }

    try {
      const ad = await Ad.findById(req.params.id);

      if (!ad) {
        return res.status(404).json({ message: "Ad not found" });
      }

      // Check if user is owner or admin
      if (
        ad.owner.toString() !== req.user.userId.toString() &&
        req.user.role !== "admin"
      ) {
        return res
          .status(403)
          .json({ message: "No permission to change status of this ad" });
      }

      // Save previous status for comparison
      const previousStatus = ad.status;

      // Update status
      ad.status = status;
      await ad.save();

      // Create notification about ad status change
      if (previousStatus !== status) {
        try {
          if (status === "active") {
            await notificationManager.createListingPublishedNotification(
              ad.owner.toString(),
              ad
            );
          } else if (status === "archived") {
            await notificationManager.createListingExpiredNotification(
              ad.owner.toString(),
              ad
            );
          } else {
            // For other status changes, create a generic system notification
            await notificationManager.createSystemNotification(
              ad.owner.toString(),
              "Status ogłoszenia zmieniony",
              `Status Twojego ogłoszenia "${
                ad.headline || ad.brand + " " + ad.model
              }" został zmieniony na: ${status}`
            );
          }
          console.log(
            `Created notification about ad status change for user ${ad.owner}`
          );
        } catch (notificationError) {
          console.error("Error creating notification:", notificationError);
          // Don't interrupt main process in case of notification error
        }
      }

      res.status(200).json({ message: "Ad status updated", ad });
    } catch (err) {
      next(err);
    }
  },
  errorHandler
);

/**
 * PATCH /:id/images - Update images in ad
 */
router.patch(
  "/:id/images",
  auth,
  async (req, res, next) => {
    try {
      const ad = await Ad.findById(req.params.id);

      if (!ad) {
        return res.status(404).json({ message: "Ad not found" });
      }

      // Check if user is owner or admin
      if (
        ad.owner.toString() !== req.user.userId.toString() &&
        req.user.role !== "admin"
      ) {
        return res
          .status(403)
          .json({ message: "No permission to update images of this ad" });
      }

      const { images, mainImage } = req.body;

      if (images && Array.isArray(images)) {
        ad.images = images;
      }

      if (mainImage) {
        ad.mainImage = mainImage;
      }

      await ad.save();

      res.status(200).json({ message: "Ad images updated", ad });
    } catch (err) {
      next(err);
    }
  },
  errorHandler
);

/**
 * PUT /:id/reorder-images - Change order of images
 */
router.put(
  "/:id/reorder-images",
  auth,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { images } = req.body;

      if (!images || !Array.isArray(images)) {
        return res.status(400).json({ message: "Images array is required" });
      }

      const ad = await Ad.findById(id);

      if (!ad) {
        return res.status(404).json({ message: "Ad not found" });
      }

      // Check if user is owner or admin
      if (
        ad.owner.toString() !== req.user.userId.toString() &&
        req.user.role !== "admin"
      ) {
        return res
          .status(403)
          .json({ message: "No permission to edit this ad" });
      }

      // Validate: ensure new order is a permutation of current images
      const originalImages = ad.images || [];
      const isValidReorder =
        images.every((img) => originalImages.includes(img)) &&
        images.length === originalImages.length;
      if (!isValidReorder) {
        return res.status(400).json({
          message:
            "Invalid image order: all images must come from the original array",
        });
      }

      // Apply new order
      ad.images = images;

      // Ensure mainImage is valid under new order
      if (ad.mainImage && images.length > 0) {
        if (!images.includes(ad.mainImage)) {
          ad.mainImage = images[0];
        }
      } else if (images.length > 0) {
        ad.mainImage = images[0];
      }

      await ad.save();

      res.status(200).json({
        message: "Image order has been updated",
        images: ad.images,
        mainImage: ad.mainImage,
      });
    } catch (err) {
      next(err);
    }
  },
  errorHandler
);

/**
 * PUT /:id/main-image - Set main image of ad
 */
router.put(
  "/:id/main-image",
  auth,
  async (req, res, next) => {
    const { mainImageIndex } = req.body;

    try {
      const ad = await Ad.findById(req.params.id);

      if (!ad) {
        return res.status(404).json({ message: "Ad not found" });
      }

      // Check if user is owner or admin
      if (
        ad.owner.toString() !== req.user.userId.toString() &&
        req.user.role !== "admin"
      ) {
        return res
          .status(403)
          .json({ message: "No permission to change main image of this ad" });
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

// Import nowego handlera aktualizacji
import { updateAd } from "../handlers/updateAdHandler.js";

/**
 * PUT /:id - Update ad (używa nowego handlera)
 */
router.put("/:id", updateAd);

/**
 * DELETE /:id/images/:index - Remove image from ad
 */
router.delete(
  "/:id/images/:index",
  auth,
  async (req, res, next) => {
    try {
      const ad = await Ad.findById(req.params.id);

      if (!ad) {
        return res.status(404).json({ message: "Ad not found" });
      }

      // Check if user is owner or admin
      if (
        ad.owner.toString() !== req.user.userId.toString() &&
        req.user.role !== "admin"
      ) {
        return res
          .status(403)
          .json({ message: "No permission to remove image from this ad" });
      }

      const imageIndex = parseInt(req.params.index);

      // Check if index is valid
      if (imageIndex < 0 || imageIndex >= ad.images.length) {
        return res.status(400).json({ message: "Invalid image index" });
      }

      // Don't allow removing the last image
      if (ad.images.length <= 1) {
        return res
          .status(400)
          .json({ message: "Cannot remove the last image from ad" });
      }

      // Remove image from array
      const removedImage = ad.images[imageIndex];
      ad.images.splice(imageIndex, 1);

      // If removed image was main, set new main
      if (ad.mainImage === removedImage) {
        ad.mainImage = ad.images[0];
      }

      await ad.save();

      res.status(200).json({
        message: "Image has been removed",
        ad: ad,
      });
    } catch (err) {
      console.error("Error removing image:", err);
      next(err);
    }
  },
  errorHandler
);

/**
 * POST /:id/renew - Renew expired ad
 */
router.post(
  "/:id/renew",
  auth,
  async (req, res, next) => {
    try {
      const ad = await Ad.findById(req.params.id);

      if (!ad) {
        return res.status(404).json({ message: "Ad not found" });
      }

      // Check if user is owner or admin
      if (
        ad.owner.toString() !== req.user.userId.toString() &&
        req.user.role !== "admin"
      ) {
        return res
          .status(403)
          .json({ message: "No permission to renew this ad" });
      }

      // Check if ad has archived status
      if (ad.status !== "archived") {
        return res
          .status(400)
          .json({ message: "Only finished ads can be renewed" });
      }

      // Set new expiry date (30 days from now) - only for regular users
      if (ad.ownerRole !== "admin") {
        const newExpiryDate = new Date();
        newExpiryDate.setDate(newExpiryDate.getDate() + 30);
        ad.expiresAt = newExpiryDate;
      }

      // Change status to active
      ad.status = "active";

      // Save changes
      await ad.save();

      // Create notification about ad renewal
      try {
        await notificationManager.createListingPublishedNotification(
          ad.owner.toString(),
          ad
        );
        console.log(
          `Created notification about ad renewal for user ${ad.owner}`
        );
      } catch (notificationError) {
        console.error("Error creating notification:", notificationError);
        // Don't interrupt main process in case of notification error
      }

      res.status(200).json({
        message: "Ad has been renewed",
        ad,
        expiresAt: ad.expiresAt,
      });
    } catch (err) {
      console.error("Error renewing ad:", err);
      next(err);
    }
  },
  errorHandler
);

/**
 * POST /:id/images - Add images to ad
 */
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

/**
 * GET /:id/similar - Get similar ads
 */
router.get("/:id/similar", AdController.getSimilarAds, errorHandler);

/**
 * DELETE /:id - Delete ad
 */
router.delete(
  "/:id",
  auth,
  async (req, res, next) => {
    try {
      const ad = await Ad.findById(req.params.id);

      if (!ad) {
        return res.status(404).json({ message: "Ad not found" });
      }

      // Check if user is owner or admin
      if (
        ad.owner.toString() !== req.user.userId.toString() &&
        req.user.role !== "admin"
      ) {
        return res
          .status(403)
          .json({ message: "No permission to delete this ad" });
      }

      // Remove ad from database
      await Ad.findByIdAndDelete(req.params.id);

      // Create notification about ad deletion
      try {
        const adTitle = ad.headline || `${ad.brand} ${ad.model}`;
        await notificationManager.notifyAdStatusChange(
          ad.owner.toString(),
          adTitle,
          "usunięte"
        );
        console.log(
          `Created notification about ad deletion for user ${ad.owner}`
        );
      } catch (notificationError) {
        console.error("Error creating notification:", notificationError);
        // Don't interrupt main process in case of notification error
      }

      res.status(200).json({ message: "Ad has been deleted" });
    } catch (err) {
      console.error("Error deleting ad:", err);
      next(err);
    }
  },
  errorHandler
);

export default router;
