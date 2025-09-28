// controllers/admin/discountController.js
/**
 * Admin: zniżki / promocje
 */

import Ad from "../../../models/listings/ad.js";
import User from "../../../models/user/user.js";
import Promotion from "../../models/admin/Promotion.js";

/* ===================== Pomocnicze ===================== */

const toNum = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const buildAdsQueryFromPromotion = async (promo) => {
  const q = {};

  // price range
  const {
    minPrice,
    maxPrice,
    categories = [],
    locations = [],
    userIds = [],
    roles = [],
  } = promo?.targetCriteria || {};

  if (minPrice != null || maxPrice != null) {
    q.price = {};
    if (minPrice != null) q.price.$gte = minPrice;
    if (maxPrice != null) q.price.$lte = maxPrice;
  }
  if (
    promo.targetType === "category" &&
    Array.isArray(categories) &&
    categories.length
  ) {
    q.category = { $in: categories };
  }
  if (
    promo.targetType === "location" &&
    Array.isArray(locations) &&
    locations.length
  ) {
    q.location = { $in: locations };
  }
  if (
    promo.targetType === "specific_users" &&
    Array.isArray(userIds) &&
    userIds.length
  ) {
    q.user = { $in: userIds };
  }
  if (
    promo.targetType === "user_role" &&
    Array.isArray(roles) &&
    roles.length
  ) {
    const users = await User.find({ role: { $in: roles } }).select("_id");
    q.user = { $in: users.map((u) => u._id) };
  }

  // all_users => brak dodatkowych warunków
  return q;
};

const applyPromotionOnAd = (ad, promo) => {
  if (promo.type === "percentage") {
    const pct = Math.max(0, Math.min(99, toNum(promo.value, 0)));
    ad.discount = pct;
    ad.discountedPrice =
      pct > 0 ? Math.round(ad.price * (1 - pct / 100)) : null;
  } else if (promo.type === "fixed_amount") {
    const amount = Math.max(0, toNum(promo.value, 0));
    const newPrice = Math.max(0, ad.price - amount);
    ad.discount =
      ad.price > 0 ? Math.round((1 - newPrice / ad.price) * 100) : 0;
    ad.discountedPrice = newPrice;
  } else if (promo.type === "free_listing") {
    ad.discount = ad.price > 0 ? 100 : 0;
    ad.discountedPrice = 0;
  }
};

const clearPromotionFromAd = (ad) => {
  ad.discount = 0;
  ad.discountedPrice = null;
};

/* ===================== CRUD PROMOCJI ===================== */

/**
 * GET /api/admin-panel/promotions
 */
export const listPromotions = async (req, res) => {
  try {
    const page = toNum(req.query.page, 1);
    const limit = Math.min(100, Math.max(1, toNum(req.query.limit, 20)));
    const search = (req.query.search || "").trim();
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = (req.query.sortOrder || "desc") === "asc" ? 1 : -1;

    const q = {};
    if (search) {
      q.$or = [
        { title: { $regex: search, $options: "i" } },
        { promoCode: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Promotion.countDocuments(q);
    const promotions = await Promotion.find(q)
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      data: { promotions },
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (e) {
    console.error("listPromotions error", e);
    return res
      .status(500)
      .json({ success: false, message: "Błąd pobierania promocji" });
  }
};

/**
 * POST /api/admin-panel/promotions
 */
export const createPromotion = async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      value,
      promoCode,
      validFrom,
      validTo,
      usageLimit,
      maxUsagePerUser,
      status, // 'active' | 'draft' ...
      targetType,
      targetCriteria, // { categories, locations, userIds, roles, minPrice, maxPrice }
      conditions, // opcjonalnie
      priority = 0,
    } = req.body;

    const doc = await Promotion.create({
      title,
      description: description || "",
      type,
      value,
      promoCode: promoCode || undefined,
      validFrom,
      validTo,
      usageLimit: usageLimit ?? null,
      maxUsagePerUser: maxUsagePerUser ?? 1,
      status: status || "draft",
      targetType: targetType || "all_users",
      targetCriteria: targetCriteria || {},
      conditions: conditions || {},
      priority,
      createdBy: req.user?._id || req.user?.userId,
    });

    return res.status(201).json({ success: true, data: doc });
  } catch (e) {
    console.error("createPromotion error", e);
    return res.status(400).json({
      success: false,
      message: e.message || "Błąd tworzenia promocji",
    });
  }
};

/**
 * PUT /api/admin-panel/promotions/:id
 */
export const updatePromotion = async (req, res) => {
  try {
    const id = req.params.id;
    const payload = {
      ...req.body,
      lastModifiedBy: req.user?._id || req.user?.userId,
    };
    const doc = await Promotion.findByIdAndUpdate(id, payload, { new: true });
    if (!doc)
      return res
        .status(404)
        .json({ success: false, message: "Promocja nie znaleziona" });
    return res.json({ success: true, data: doc });
  } catch (e) {
    console.error("updatePromotion error", e);
    return res.status(400).json({
      success: false,
      message: e.message || "Błąd aktualizacji promocji",
    });
  }
};

/**
 * DELETE /api/admin-panel/promotions/:id
 */
export const deletePromotion = async (req, res) => {
  try {
    const id = req.params.id;
    const doc = await Promotion.findByIdAndDelete(id);
    if (!doc)
      return res
        .status(404)
        .json({ success: false, message: "Promocja nie znaleziona" });
    return res.json({ success: true });
  } catch (e) {
    console.error("deletePromotion error", e);
    return res
      .status(400)
      .json({ success: false, message: e.message || "Błąd usuwania promocji" });
  }
};

/* ===================== AKCJE: AKTYWUJ / DEZAKTYWUJ ===================== */

/**
 * POST /api/admin-panel/promotions/:id/activate
 * – nakłada zniżkę na ogłoszenia zgodnie z targetem i zapisuje listę appliedAdIds
 */
export const activatePromotion = async (req, res) => {
  try {
    const promo = await Promotion.findById(req.params.id);
    if (!promo)
      return res
        .status(404)
        .json({ success: false, message: "Promocja nie znaleziona" });

    // walidacje czasu i limitu
    const now = new Date();
    if (new Date(promo.validFrom) > now || new Date(promo.validTo) < now) {
      return res
        .status(400)
        .json({ success: false, message: "Promocja jest poza zakresem dat" });
    }

    const adsQuery = await buildAdsQueryFromPromotion(promo);
    const ads = await Ad.find(adsQuery);

    // nałóż zniżkę
    await Promise.all(
      ads.map(async (ad) => {
        applyPromotionOnAd(ad, promo);
        await ad.save();
      })
    );

    // zapamiętaj gdzie nałożyliśmy (żeby móc cofnąć)
    promo.appliedAdIds = ads.map((a) => a._id);
    promo.status = "active";
    await promo.save();

    return res.json({
      success: true,
      message: `Aktywowano promocję. Zastosowano do ${ads.length} ogłoszeń.`,
      affected: ads.length,
    });
  } catch (e) {
    console.error("activatePromotion error", e);
    return res.status(400).json({
      success: false,
      message: e.message || "Błąd aktywacji promocji",
    });
  }
};

/**
 * POST /api/admin-panel/promotions/:id/deactivate
 * – cofa zniżkę z ogłoszeń zapisanych w appliedAdIds
 */
export const deactivatePromotion = async (req, res) => {
  try {
    const promo = await Promotion.findById(req.params.id);
    if (!promo)
      return res
        .status(404)
        .json({ success: false, message: "Promocja nie znaleziona" });

    const ids = Array.isArray(promo.appliedAdIds) ? promo.appliedAdIds : [];
    const ads = await Ad.find({ _id: { $in: ids } });

    await Promise.all(
      ads.map(async (ad) => {
        clearPromotionFromAd(ad);
        await ad.save();
      })
    );

    promo.appliedAdIds = [];
    promo.status = "paused";
    await promo.save();

    return res.json({
      success: true,
      message: `Dezaktywowano promocję. Przywrócono ceny ${ads.length} ogłoszeń.`,
      affected: ads.length,
    });
  } catch (e) {
    console.error("deactivatePromotion error", e);
    return res.status(400).json({
      success: false,
      message: e.message || "Błąd dezaktywacji promocji",
    });
  }
};

/* ===================== DOTYCHCZASOWE „DISCOUNTS” (Twoje) ===================== */

/**
 * GET /api/admin-panel/promotions/discounts
 * Lista ogłoszeń z discount > 0 (filtrowanie i paginacja)
 */
export const getDiscounts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      minDiscount,
      maxDiscount,
      category,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = { discount: { $gt: 0 } };
    if (category) query.category = category;
    if (minDiscount !== undefined)
      query.discount = { ...query.discount, $gte: Number(minDiscount) };
    if (maxDiscount !== undefined)
      query.discount = { ...query.discount, $lte: Number(maxDiscount) };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };
    const total = await Ad.countDocuments(query);
    const ads = await Ad.find(query)
      .populate("user", "email name lastName")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    return res.status(200).json({
      success: true,
      ads,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("getDiscounts error:", error);
    return res.status(500).json({
      success: false,
      message: "Błąd serwera podczas pobierania listy zniżek.",
    });
  }
};

/**
 * POST /api/admin-panel/promotions/ads/:adId/discount
 */
export const setDiscount = async (req, res) => {
  try {
    const { adId } = req.params;
    const { discount } = req.body;

    if (discount === undefined || discount < 0 || discount > 99) {
      return res
        .status(400)
        .json({ success: false, message: "Podaj discount w zakresie 0–99" });
    }

    const ad = await Ad.findById(adId);
    if (!ad)
      return res
        .status(404)
        .json({ success: false, message: "Ogłoszenie nie znalezione" });

    ad.discount = discount;
    ad.discountedPrice =
      discount > 0 ? Math.round(ad.price * (1 - discount / 100)) : null;
    await ad.save();

    return res.json({ success: true, ad });
  } catch (error) {
    console.error("setDiscount error:", error);
    return res.status(500).json({ success: false, message: "Błąd serwera" });
  }
};

/**
 * POST /api/admin-panel/promotions/bulk-discount
 */
export const setBulkDiscount = async (req, res) => {
  try {
    const { adIds, discount } = req.body;
    if (!Array.isArray(adIds) || adIds.length === 0) {
      return res.status(400).json({ success: false, message: "Brak adIds" });
    }
    if (discount === undefined || discount < 0 || discount > 99) {
      return res
        .status(400)
        .json({ success: false, message: "Podaj discount 0–99" });
    }

    const ads = await Ad.find({ _id: { $in: adIds } });
    await Promise.all(
      ads.map(async (ad) => {
        ad.discount = discount;
        ad.discountedPrice =
          discount > 0 ? Math.round(ad.price * (1 - discount / 100)) : null;
        await ad.save();
      })
    );

    return res.json({
      success: true,
      message: `Zastosowano do ${ads.length} ogłoszeń`,
    });
  } catch (error) {
    console.error("setBulkDiscount error:", error);
    return res.status(500).json({ success: false, message: "Błąd serwera" });
  }
};

/**
 * POST /api/admin-panel/promotions/users/:userId/discount
 */
export const setUserDiscount = async (req, res) => {
  try {
    const { userId } = req.params;
    const { discount } = req.body;

    if (discount === undefined || discount < 0 || discount > 99) {
      return res
        .status(400)
        .json({ success: false, message: "Podaj discount 0–99" });
    }

    const ads = await Ad.find({ user: userId });
    if (ads.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Użytkownik nie ma ogłoszeń" });
    }

    await Promise.all(
      ads.map(async (ad) => {
        ad.discount = discount;
        ad.discountedPrice =
          discount > 0 ? Math.round(ad.price * (1 - discount / 100)) : null;
        await ad.save();
      })
    );

    return res.json({
      success: true,
      message: `Zastosowano do ${ads.length} ogłoszeń`,
    });
  } catch (error) {
    console.error("setUserDiscount error:", error);
    return res.status(500).json({ success: false, message: "Błąd serwera" });
  }
};

/**
 * POST /api/admin-panel/promotions/categories/:category/discount
 */
export const setCategoryDiscount = async (req, res) => {
  try {
    const { category } = req.params;
    const { discount } = req.body;

    if (discount === undefined || discount < 0 || discount > 99) {
      return res
        .status(400)
        .json({ success: false, message: "Podaj discount 0–99" });
    }

    const ads = await Ad.find({ category });
    if (ads.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Brak ogłoszeń w kategorii" });
    }

    await Promise.all(
      ads.map(async (ad) => {
        ad.discount = discount;
        ad.discountedPrice =
          discount > 0 ? Math.round(ad.price * (1 - discount / 100)) : null;
        await ad.save();
      })
    );

    return res.json({
      success: true,
      message: `Zastosowano do ${ads.length} ogłoszeń`,
    });
  } catch (error) {
    console.error("setCategoryDiscount error:", error);
    return res.status(500).json({ success: false, message: "Błąd serwera" });
  }
};

/**
 * BONUSY
 */
export const addUserBonus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { bonusType, bonusValue, expirationDate, description } = req.body;

    if (!bonusType || !bonusValue) {
      return res
        .status(400)
        .json({ success: false, message: "Typ i wartość bonusu są wymagane" });
    }

    const user = await User.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Użytkownik nie znaleziony" });

    if (!user.bonuses) user.bonuses = [];
    user.bonuses.push({
      type: bonusType,
      value: bonusValue,
      expiresAt: expirationDate ? new Date(expirationDate) : null,
      description: description || "",
      isUsed: false,
      createdAt: new Date(),
    });
    await user.save();

    return res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        lastName: user.lastName,
        bonuses: user.bonuses,
      },
    });
  } catch (error) {
    console.error("addUserBonus error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Błąd dodawania bonusu" });
  }
};

export const getUserBonuses = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Użytkownik nie znaleziony" });
    return res.json({ success: true, bonuses: user.bonuses || [] });
  } catch (error) {
    console.error("getUserBonuses error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Błąd pobierania bonusów" });
  }
};

export const removeUserBonus = async (req, res) => {
  try {
    const { userId, bonusId } = req.params;
    const user = await User.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Użytkownik nie znaleziony" });
    if (!Array.isArray(user.bonuses) || user.bonuses.length === 0) {
      return res.status(404).json({ success: false, message: "Brak bonusów" });
    }
    const idx = user.bonuses.findIndex(
      (b) => String(b._id) === String(bonusId)
    );
    if (idx === -1)
      return res
        .status(404)
        .json({ success: false, message: "Bonus nie znaleziony" });
    user.bonuses.splice(idx, 1);
    await user.save();
    return res.json({ success: true, bonuses: user.bonuses });
  } catch (error) {
    console.error("removeUserBonus error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Błąd usuwania bonusu" });
  }
};
