// admin/controllers/listings/activeListingsController.js
import Ad from "../../../models/listings/ad.js";
import {
  publicActiveFilter,
  publicFeaturedFilter,
} from "../../../filters/adVisibility.js";

/** GET /listings/active – paginowana lista aktywnych */
export const getActiveListings = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "20", 10), 1),
      100
    );
    const skip = (page - 1) * limit;

    const filter = publicActiveFilter();

    const [items, total] = await Promise.all([
      Ad.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Ad.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: {
        listings: items,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    console.error("getActiveListings error:", err);
    return res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
};

/** GET /listings/active/count – tylko liczba aktywnych */
export const getActiveListingsCount = async (_req, res) => {
  try {
    const total = await Ad.countDocuments(publicActiveFilter());
    return res.json({ success: true, data: { count: total } });
  } catch (err) {
    console.error("getActiveListingsCount error:", err);
    return res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
};

/** GET /listings/featured/active – paginowana lista wyróżnionych aktywnych */
export const getFeaturedActiveListings = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "20", 10), 1),
      100
    );
    const skip = (page - 1) * limit;

    const filter = publicFeaturedFilter();

    const [items, total] = await Promise.all([
      Ad.find(filter)
        .sort({ featuredAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Ad.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: {
        listings: items,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    console.error("getFeaturedActiveListings error:", err);
    return res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
};

/** GET /listings/featured/count – liczba wyróżnionych aktywnych */
export const getFeaturedActiveCount = async (_req, res) => {
  try {
    const total = await Ad.countDocuments(publicFeaturedFilter());
    return res.json({ success: true, data: { count: total } });
  } catch (err) {
    console.error("getFeaturedActiveCount error:", err);
    return res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
};

/** GET /listings/featured/debug – diagnostyka wyróżnionych */
export const debugFeaturedListings = async (_req, res) => {
  try {
    const filter = publicFeaturedFilter();
    const featured = await Ad.find(filter).lean();

    // Sprawdź też wszystkie ogłoszenia z featured=true
    const allFeatured = await Ad.find({ featured: true }).lean();

    return res.json({
      success: true,
      data: {
        filter,
        matchingCount: featured.length,
        matching: featured.map((ad) => ({
          id: ad._id,
          title: ad.title,
          status: ad.status,
          featured: ad.featured,
          expiresAt: ad.expiresAt,
        })),
        allFeaturedCount: allFeatured.length,
        allFeatured: allFeatured.map((ad) => ({
          id: ad._id,
          title: ad.title,
          status: ad.status,
          featured: ad.featured,
          expiresAt: ad.expiresAt,
          meetsFilter:
            ad.status === "active" &&
            (!ad.expiresAt || new Date(ad.expiresAt) > new Date()),
        })),
      },
    });
  } catch (err) {
    console.error("debugFeaturedListings error:", err);
    return res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
};
