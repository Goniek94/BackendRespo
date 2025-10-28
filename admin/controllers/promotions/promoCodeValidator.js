// admin/controllers/promotions/promoCodeValidator.js
import Promotion from "../../models/admin/Promotion.js";

/**
 * POST /api/promo-codes/validate
 * Waliduje kod promocyjny i zwraca informacje o zniżce
 */
export const validatePromoCode = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== "string") {
      return res.status(400).json({
        success: false,
        message: "Nie podano kodu promocyjnego",
      });
    }

    const normalized = code.trim().toUpperCase();

    // Szukaj aktywnej promocji z tym kodem
    const promotion = await Promotion.findOne({
      promoCode: normalized,
      status: "active",
    });

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: "Nieprawidłowy kod promocyjny",
      });
    }

    // Sprawdź czy promocja jest aktywna w danym okresie
    const now = new Date();
    if (
      (promotion.validFrom && now < promotion.validFrom) ||
      (promotion.validTo && now > promotion.validTo)
    ) {
      return res.status(400).json({
        success: false,
        message: "Kod promocyjny wygasł lub jeszcze nie obowiązuje",
      });
    }

    // Sprawdź limit użyć globalny
    const usedCount = Number(promotion.usedCount ?? 0);
    if (promotion.usageLimit && usedCount >= promotion.usageLimit) {
      return res.status(400).json({
        success: false,
        message: "Kod promocyjny osiągnął limit użyć",
      });
    }

    // Sprawdź limit użyć per użytkownik
    // userId może pochodzić z req.user (jeśli zalogowany) lub z req.body
    const userId = req.user?.id || req.user?._id || req.body.userId;

    if (userId && promotion.maxUsagePerUser) {
      // Sprawdź ile razy ten użytkownik użył tego kodu
      const userUsageCount = promotion.usedByUsers.filter(
        (id) => id.toString() === userId.toString()
      ).length;

      if (userUsageCount >= promotion.maxUsagePerUser) {
        return res.status(400).json({
          success: false,
          message: `Osiągnięto limit użyć tego kodu (${promotion.maxUsagePerUser} na użytkownika)`,
        });
      }
    }

    // Payload z informacją o zniżce
    const discountInfo = {
      success: true,
      valid: true,
      code: promotion.promoCode,
      type: promotion.type, // 'percentage' | 'fixed_amount' | 'free_listing'
      value: promotion.value, // liczba
      title: promotion.title,
      description: promotion.description,
    };

    if (promotion.type === "percentage") {
      discountInfo.discountPercent = promotion.value;
      discountInfo.message = `Zniżka ${promotion.value}% została zastosowana!`;
    } else if (promotion.type === "fixed_amount") {
      discountInfo.discountAmount = promotion.value;
      discountInfo.message = `Zniżka ${promotion.value} zł została zastosowana!`;
    } else if (promotion.type === "free_listing") {
      discountInfo.discountPercent = 100;
      discountInfo.message = "Darmowe ogłoszenie!";
    }

    return res.status(200).json(discountInfo);
  } catch (error) {
    console.error("Błąd walidacji kodu promocyjnego:", error);
    return res.status(500).json({
      success: false,
      message: "Błąd serwera podczas walidacji kodu",
    });
  }
};

/**
 * POST /api/promo-codes/use
 * Oznacza kod jako użyty (zwiększa licznik)
 */
export const usePromoCode = async (req, res) => {
  try {
    const { code, userId } = req.body;

    if (!code || typeof code !== "string") {
      return res.status(400).json({
        success: false,
        message: "Nie podano kodu promocyjnego",
      });
    }

    const normalized = code.trim().toUpperCase();

    const promotion = await Promotion.findOne({
      promoCode: normalized,
      status: "active",
    });

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: "Nieprawidłowy kod promocyjny",
      });
    }

    // Zwiększ licznik i zapisz userId jeśli został podany
    promotion.usedCount = Number(promotion.usedCount ?? 0) + 1;

    // Dodaj userId do tablicy usedByUsers jeśli został podany
    const effectiveUserId = userId || req.user?.id || req.user?._id;
    if (effectiveUserId && !promotion.usedByUsers.includes(effectiveUserId)) {
      promotion.usedByUsers.push(effectiveUserId);
    }

    await promotion.save();

    return res.status(200).json({
      success: true,
      message: "Kod promocyjny został wykorzystany",
      usedCount: promotion.usedCount,
    });
  } catch (error) {
    console.error("Błąd użycia kodu promocyjnego:", error);
    return res.status(500).json({
      success: false,
      message: "Błąd serwera",
    });
  }
};
