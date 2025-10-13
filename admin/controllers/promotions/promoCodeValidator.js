// controllers/promotions/promoCodeValidator.js
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

    // Szukaj aktywnej promocji z tym kodem
    const promotion = await Promotion.findOne({
      promoCode: code.trim().toUpperCase(),
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
    if (now < promotion.validFrom || now > promotion.validTo) {
      return res.status(400).json({
        success: false,
        message: "Kod promocyjny wygasł lub jeszcze nie obowiązuje",
      });
    }

    // Sprawdź limit użyć
    if (promotion.usageLimit && promotion.usedCount >= promotion.usageLimit) {
      return res.status(400).json({
        success: false,
        message: "Kod promocyjny osiągnął limit użyć",
      });
    }

    // Zwróć informacje o zniżce
    let discountInfo = {
      success: true,
      valid: true,
      code: promotion.promoCode,
      type: promotion.type,
      value: promotion.value,
      title: promotion.title,
      description: promotion.description,
    };

    // Oblicz procent zniżki
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

    return res.json(discountInfo);
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

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Nie podano kodu promocyjnego",
      });
    }

    const promotion = await Promotion.findOne({
      promoCode: code.trim().toUpperCase(),
      status: "active",
    });

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: "Nieprawidłowy kod promocyjny",
      });
    }

    // Zwiększ licznik użyć
    promotion.usedCount += 1;
    await promotion.save();

    return res.json({
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
