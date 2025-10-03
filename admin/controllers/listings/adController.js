/**
 * Admin Ads Controller
 * Zwraca dane zgodne z nowym UI i obsługuje stare rekordy (headline/owner/cover/photos/active).
 */

import Ad from "../../../models/listings/ad.js";
import User from "../../../models/user/user.js";
import Notification from "../../../models/communication/notification.js";
import { publicActiveFilter } from "../../../filters/adVisibility.js";

/* Helpers */
const clampDiscount = (d) => Math.max(0, Math.min(99, Number(d) || 0));
const discounted = (price, discount) => {
  const p = Number(price) || 0;
  const d = clampDiscount(discount);
  return d > 0 ? Math.round(p * (1 - d / 100)) : null;
};

/* ========================= STATYSTYKI ========================= */
export const getListingsStats = async (_req, res) => {
  try {
    const total = await Ad.countDocuments();
    const pending = await Ad.countDocuments({ status: "pending" });
    // legacy 'active' traktujemy jak 'approved'
    const approved = await Ad.countDocuments({
      $or: [{ status: "approved" }, { status: "active" }],
    });
    const rejected = await Ad.countDocuments({ status: "rejected" });

    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const totalLast = await Ad.countDocuments({
      createdAt: { $lt: lastMonth },
    });
    const pendLast = await Ad.countDocuments({
      status: "pending",
      createdAt: { $lt: lastMonth },
    });
    const apprLast = await Ad.countDocuments({
      $or: [{ status: "approved" }, { status: "active" }],
      createdAt: { $lt: lastMonth },
    });
    const rejLast = await Ad.countDocuments({
      status: "rejected",
      createdAt: { $lt: lastMonth },
    });

    const ch = (cur, prev) =>
      prev === 0
        ? cur > 0
          ? 100
          : 0
        : Math.round(((cur - prev) / prev) * 100);

    res.status(200).json({
      success: true,
      data: {
        total,
        pending,
        approved,
        rejected,
        totalChange: ch(total, totalLast),
        pendingChange: ch(pending, pendLast),
        approvedChange: ch(approved, apprLast),
        rejectedChange: ch(rejected, rejLast),
      },
    });
  } catch (error) {
    console.error("Błąd statystyk ogłoszeń:", error);
    res
      .status(500)
      .json({ message: "Błąd serwera podczas pobierania statystyk ogłoszeń." });
  }
};

/* ========================= CREATE ========================= */
export const createAd = async (req, res) => {
  try {
    const b = req.body || {};
    const title = b.title || b.headline;

    if (!title || b.price == null || b.description == null) {
      return res
        .status(400)
        .json({ message: "Tytuł, opis i cena są wymagane." });
    }

    const images = Array.isArray(b.images) ? b.images : [];
    const mainImage = b.mainImage || images[0] || "";

    const newAd = new Ad({
      title,
      description: b.description,
      price: Number(b.price),
      user: req.user?.userId || req.user?._id,
      status: b.status || "approved",
      images,
      mainImage,
      discount: clampDiscount(b.discount),
      featured: !!b.featured,
      featuredAt: b.featured ? new Date() : null,

      // Vehicle details
      brand: b.brand,
      model: b.model,
      generation: b.generation,
      version: b.version,
      year: b.year,
      mileage: b.mileage,
      fuelType: b.fuelType,
      transmission: b.transmission,
      bodyType: b.bodyType,
      color: b.color,
      power: b.power,
      engineSize: b.engineSize,
      drive: b.drive,
      seats: b.seats,

      // Location
      city: b.city,
      voivodeship: b.voivodeship,
    });
    newAd.discountedPrice = discounted(newAd.price, newAd.discount);

    await newAd.save();

    res.status(201).json({
      success: true,
      message: "Ogłoszenie utworzone.",
      data: {
        id: newAd._id,
        title: newAd.title,
        price: newAd.price,
        status: newAd.status,
        mainImage: newAd.mainImage || null,
      },
    });
  } catch (error) {
    console.error("Błąd tworzenia ogłoszenia:", error);
    res.status(500).json({
      message: "Błąd serwera podczas tworzenia ogłoszenia.",
      error: error.message,
    });
  }
};

/* ========================= LISTA ========================= */
export const getAds = async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const search = String(req.query.search || "").trim();
    const status = req.query.status;
    const userId = req.query.userId;

    const query = {};

    // Obsługa statusów z przycisków-tabów
    if (status && status !== "all") {
      if (status === "active") {
        // Use shared visibility filter for consistency
        Object.assign(query, publicActiveFilter());
      } else if (status === "expired") {
        // Zakończone = expiresAt < now
        const now = new Date();
        query.expiresAt = { $lte: now };
      } else {
        // pending, rejected, itp. - standardowe
        query.status = status;
      }
    }
    // Jeśli status === "all" lub brak - nie dodajemy filtra statusu

    // user albo owner (legacy)
    if (userId) {
      const userFilter = { $or: [{ user: userId }, { owner: userId }] };
      if (query.$and) {
        query.$and.push(userFilter);
      } else {
        query.$or = userFilter.$or;
      }
    }

    if (search) {
      const searchOr = [
        { title: { $regex: search, $options: "i" } },
        { headline: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
      query.$or = Array.isArray(query.$or)
        ? [...query.$or, ...searchOr]
        : searchOr;
    }

    const total = await Ad.countDocuments(query);

    const docs = await Ad.find(query)
      .populate("user", "name lastName email")
      .populate("owner", "name lastName email") // legacy
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const listings = docs.map((d) => {
      const title =
        d.title ||
        d.headline ||
        [d.brand, d.model, d.year].filter(Boolean).join(" ") ||
        null;

      const u = d.user || d.owner || null;
      const author = u
        ? {
            id: u._id?.toString?.(),
            name:
              [u.name, u.lastName].filter(Boolean).join(" ") || u.email || null,
            email: u.email || null,
          }
        : null;

      const firstImage =
        d.mainImage ||
        d.cover ||
        (Array.isArray(d.images) && d.images[0]) ||
        (Array.isArray(d.photos) && d.photos[0]) ||
        (Array.isArray(d.photoUrls) && d.photoUrls[0]) ||
        null;

      const statusNorm =
        d.status === "active" ? "approved" : d.status || "pending";

      return {
        id: d._id.toString(),
        title,
        description: d.description,
        price: d.price,
        status: statusNorm,
        discount: d.discount || 0,
        discountedPrice: d.discountedPrice ?? null,
        created_at: d.createdAt,
        updated_at: d.updatedAt,
        mainImage: firstImage,
        images: Array.isArray(d.images)
          ? d.images
          : Array.isArray(d.photos)
          ? d.photos
          : Array.isArray(d.photoUrls)
          ? d.photoUrls
          : [],
        author,
        // Vehicle details
        brand: d.brand,
        model: d.model,
        make: d.brand, // alias for compatibility
        generation: d.generation,
        version: d.version,
        year: d.year,
        mileage: d.mileage,
        fuel: d.fuelType,
        fuelType: d.fuelType,
        transmission: d.transmission,
        gearbox: d.transmission, // alias
        bodyType: d.bodyType,
        color: d.color,
        power: d.power,
        engineSize: d.engineSize,
        engineCapacity: d.engineSize, // alias
        drive: d.drive,
        seats: d.seats,
        // Location
        city: d.city,
        voivodeship: d.voivodeship,
        location: d.city, // alias
        // Other
        featured: d.featured || false,
        featuredAt: d.featuredAt,
        sellerType: d.sellerType,
        countryOfOrigin: d.countryOfOrigin,
        imported: d.imported,
        headline: d.headline, // legacy field
      };
    });

    res.status(200).json({
      success: true,
      data: {
        listings,
        total,
        totalPages: Math.ceil(total / limit),
        pagination: {
          totalCount: total,
          currentPage: page,
          pageSize: limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("GET /admin-panel/listings FAILED:", {
      message: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({
      message: "Błąd serwera podczas pobierania listy ogłoszeń.",
      dev: process.env.NODE_ENV !== "production" ? error?.message : undefined,
    });
  }
};

/* ========================= DETAILS ========================= */
export const getAdDetails = async (req, res) => {
  try {
    const { adId } = req.params;
    const ad = await Ad.findById(adId)
      .populate("user", "email name lastName phoneNumber")
      .populate("owner", "email name lastName phoneNumber");
    if (!ad)
      return res
        .status(404)
        .json({ message: "Ogłoszenie nie zostało znalezione." });
    res.status(200).json({ success: true, data: ad });
  } catch (error) {
    console.error("Błąd szczegółów ogłoszenia:", error);
    res.status(500).json({
      message: "Błąd serwera podczas pobierania szczegółów ogłoszenia.",
    });
  }
};

/* ========================= UPDATE ========================= */
export const updateAd = async (req, res) => {
  try {
    const { adId } = req.params;
    const {
      status,
      discount,
      title,
      description,
      price,
      images,
      mainImage,
      featured,
    } = req.body || {};

    const ad = await Ad.findById(adId);
    if (!ad)
      return res
        .status(404)
        .json({ message: "Ogłoszenie nie zostało znalezione." });

    if (status !== undefined) ad.status = status;
    if (title !== undefined) ad.title = title;
    if (description !== undefined) ad.description = description;
    if (price !== undefined) ad.price = Number(price);

    if (Array.isArray(images)) ad.images = images;
    if (mainImage !== undefined) ad.mainImage = mainImage;

    if (discount !== undefined) ad.discount = clampDiscount(discount);
    ad.discountedPrice = discounted(ad.price, ad.discount);

    // Handle featured field
    if (featured !== undefined) {
      ad.featured = !!featured;
      ad.featuredAt = featured ? new Date() : null;
    }

    await ad.save();

    res
      .status(200)
      .json({ success: true, message: "Ogłoszenie zaktualizowane.", data: ad });
  } catch (error) {
    console.error("Błąd aktualizacji ogłoszenia:", error);
    res
      .status(500)
      .json({ message: "Błąd serwera podczas aktualizacji ogłoszenia." });
  }
};

/* ========================= DELETE ========================= */
export const deleteAd = async (req, res) => {
  try {
    const { adId } = req.params;
    const exists = await Ad.findById(adId);
    if (!exists)
      return res
        .status(404)
        .json({ message: "Ogłoszenie nie zostało znalezione." });

    await Ad.findByIdAndDelete(adId);
    res
      .status(200)
      .json({ success: true, message: "Ogłoszenie zostało usunięte." });
  } catch (error) {
    console.error("Błąd usuwania ogłoszenia:", error);
    res
      .status(500)
      .json({ message: "Błąd serwera podczas usuwania ogłoszenia." });
  }
};

/* ========================= BULK DISCOUNT ========================= */
export const setBulkDiscount = async (req, res) => {
  try {
    const { adIds = [], discount } = req.body || {};
    const d = clampDiscount(discount);

    if (!Array.isArray(adIds) || adIds.length === 0) {
      return res.status(400).json({ message: "Nie podano listy ogłoszeń." });
    }

    const docs = await Ad.find({ _id: { $in: adIds } });
    for (const ad of docs) {
      ad.discount = d;
      ad.discountedPrice = discounted(ad.price, d);
      await ad.save();
    }

    res.status(200).json({
      success: true,
      message: `Zniżka ${d}% została zastosowana dla ${docs.length} ogłoszeń.`,
    });
  } catch (error) {
    console.error("Błąd bulk-discount:", error);
    res
      .status(500)
      .json({ message: "Błąd serwera podczas ustawiania zniżek." });
  }
};

/* ========================= PENDING LIST ========================= */
export const getPendingAds = async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const query = { status: "pending" };
    const total = await Ad.countDocuments(query);
    const ads = await Ad.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        ads,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Błąd pobierania pending:", error);
    res.status(500).json({
      message: "Błąd serwera podczas pobierania listy oczekujących ogłoszeń.",
    });
  }
};

/* ========================= APPROVE ========================= */
export const approveAd = async (req, res) => {
  try {
    const { adId } = req.params;
    const { comment } = req.body || {};

    const ad = await Ad.findById(adId);
    if (!ad)
      return res
        .status(404)
        .json({ message: "Ogłoszenie nie zostało znalezione." });
    if (ad.status !== "pending") {
      return res.status(400).json({
        message: `Ogłoszenie nie jest w statusie "pending" (obecnie: "${ad.status}").`,
      });
    }

    ad.status = "approved";
    ad.moderation = ad.moderation || {};
    ad.moderation.approvedAt = new Date();
    ad.moderation.approvedBy = req.user?.userId || req.user?._id;
    ad.moderation.rejectReason = "";
    await ad.save();

    try {
      await Notification.create({
        user: ad.user || ad.owner,
        type: "ad_approved",
        title: "Ogłoszenie zostało zatwierdzone",
        message: `Twoje ogłoszenie "${
          ad.title || ad.headline
        }" zostało zatwierdzone.`,
        data: { adId: ad._id, comment: comment || "" },
      });
    } catch (e) {
      console.warn("Notification error (approve):", e.message);
    }

    res
      .status(200)
      .json({ success: true, message: "Ogłoszenie zatwierdzone.", data: ad });
  } catch (error) {
    console.error("Błąd approve:", error);
    res
      .status(500)
      .json({ message: "Błąd serwera podczas zatwierdzania ogłoszenia." });
  }
};

/* ========================= REJECT ========================= */
export const rejectAd = async (req, res) => {
  try {
    const { adId } = req.params;
    const { reason = "", comment = "" } = req.body || {};

    if (!reason)
      return res.status(400).json({ message: "Podaj powód odrzucenia." });

    const ad = await Ad.findById(adId);
    if (!ad)
      return res
        .status(404)
        .json({ message: "Ogłoszenie nie zostało znalezione." });
    if (ad.status !== "pending") {
      return res.status(400).json({
        message: `Ogłoszenie nie jest w statusie "pending" (obecnie: "${ad.status}").`,
      });
    }

    ad.status = "rejected";
    ad.moderation = ad.moderation || {};
    ad.moderation.rejectedAt = new Date();
    ad.moderation.rejectedBy = req.user?.userId || req.user?._id;
    ad.moderation.rejectReason =
      reason || comment || "Odrzucone przez moderatora";
    await ad.save();

    try {
      await Notification.create({
        user: ad.user || ad.owner,
        type: "ad_rejected",
        title: "Ogłoszenie zostało odrzucone",
        message: `Twoje ogłoszenie "${
          ad.title || ad.headline
        }" zostało odrzucone. Powód: ${reason}`,
        data: { adId: ad._id, reason, comment },
      });
    } catch (e) {
      console.warn("Notification error (reject):", e.message);
    }

    res
      .status(200)
      .json({ success: true, message: "Ogłoszenie odrzucone.", data: ad });
  } catch (error) {
    console.error("Błąd reject:", error);
    res
      .status(500)
      .json({ message: "Błąd serwera podczas odrzucania ogłoszenia." });
  }
};

/* ========================= MODERATE ========================= */
export const moderateAd = async (req, res) => {
  try {
    const { adId } = req.params;
    const { status, moderationComment, requiredChanges } = req.body || {};
    const valid = ["pending", "approved", "rejected", "active"];
    if (status && !valid.includes(status)) {
      return res
        .status(400)
        .json({ message: "Nieprawidłowy status ogłoszenia." });
    }

    const ad = await Ad.findById(adId);
    if (!ad)
      return res
        .status(404)
        .json({ message: "Ogłoszenie nie zostało znalezione." });

    if (status) ad.status = status;

    ad.moderation = ad.moderation || {};
    if (status === "approved" || status === "active") {
      ad.moderation.approvedAt = new Date();
      ad.moderation.approvedBy = req.user?.userId || req.user?._id;
    }
    if (status === "rejected") {
      ad.moderation.rejectedAt = new Date();
      ad.moderation.rejectedBy = req.user?.userId || req.user?._id;
    }
    if (moderationComment) ad.moderation.rejectReason = moderationComment;
    if (requiredChanges) ad.requiredChanges = requiredChanges;

    await ad.save();

    try {
      let type, title, message;
      const t = ad.title || ad.headline;
      if (status === "approved" || status === "active") {
        type = "ad_approved";
        title = "Ogłoszenie zatwierdzone";
        message = `Twoje ogłoszenie "${t}" zostało zatwierdzone.`;
      } else if (status === "rejected") {
        type = "ad_rejected";
        title = "Ogłoszenie odrzucone";
        message = `Twoje ogłoszenie "${t}" zostało odrzucone.`;
      }
      if (type) {
        await Notification.create({
          user: ad.user || ad.owner,
          type,
          title,
          message,
          data: {
            adId: ad._id,
            moderationComment: ad.moderation?.rejectReason || "",
            requiredChanges: ad.requiredChanges,
          },
        });
      }
    } catch (e) {
      console.warn("Notification error (moderate):", e.message);
    }

    res.status(200).json({
      success: true,
      message: `Ogłoszenie zaktualizowane${
        status ? ` (status: "${status}")` : ""
      }.`,
      data: ad,
    });
  } catch (error) {
    console.error("Błąd moderacji:", error);
    res
      .status(500)
      .json({ message: "Błąd serwera podczas moderacji ogłoszenia." });
  }
};
