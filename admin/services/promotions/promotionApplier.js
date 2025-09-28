// services/promotions/promotionApplier.js
import Promotion from "../../models/promotion/Promotion.js";
import Ad from "../../models/listings/ad.js";
import User from "../../models/user/user.js";

/** Znajduje ogłoszenia objęte promocją na podstawie targetType/targetCriteria */
export const findTargetAds = async (promo) => {
  const q = {};
  // zakres cen
  if (
    promo.targetCriteria?.minPrice != null ||
    promo.targetCriteria?.maxPrice != null
  ) {
    q.price = {};
    if (promo.targetCriteria.minPrice != null)
      q.price.$gte = promo.targetCriteria.minPrice;
    if (promo.targetCriteria.maxPrice != null)
      q.price.$lte = promo.targetCriteria.maxPrice;
  }
  // kategorie
  if (
    promo.targetType === "category" &&
    promo.targetCriteria?.categories?.length
  ) {
    q.category = { $in: promo.targetCriteria.categories };
  }
  // lokalizacje
  if (
    promo.targetType === "location" &&
    promo.targetCriteria?.locations?.length
  ) {
    q.location = { $in: promo.targetCriteria.locations };
  }
  // użytkownicy
  if (
    promo.targetType === "specific_users" &&
    promo.targetCriteria?.userIds?.length
  ) {
    q.user = { $in: promo.targetCriteria.userIds };
  }
  if (promo.targetType === "user_role" && promo.targetCriteria?.roles?.length) {
    const users = await User.find({
      role: { $in: promo.targetCriteria.roles },
    }).select("_id");
    q.user = { $in: users.map((u) => u._id) };
  }
  // all_users: brak dodatkowych warunków

  return Ad.find(q).select("_id price discount discountedPrice");
};

/** Nakłada zniżkę na kolekcję ogłoszeń (zapisuje w polach discount/discountedPrice) */
export const applyPromotionToAds = async (promo, ads) => {
  const ops = [];
  for (const ad of ads) {
    if (promo.type === "percentage") {
      ad.applyPercentDiscount(promo.value);
    } else if (promo.type === "fixed_amount") {
      ad.applyFlatDiscount(promo.value);
    } else if (promo.type === "free_listing") {
      ad.applyFlatDiscount(ad.price);
    } else {
      continue; // inne typy tu nie modyfikują ceny
    }
    ops.push(ad.save());
  }
  await Promise.all(ops);
};

/** Zdejmuje efekty promocji z podanych ogłoszeń */
export const revertPromotionFromAds = async (ads) => {
  await Promise.all(
    ads.map(async (ad) => {
      ad.clearDiscount();
      await ad.save();
    })
  );
};
