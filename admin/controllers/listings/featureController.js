/**
 * Feature Controller - obsługa wyróżniania ogłoszeń
 * Zmienia listingType między "standardowe" a "wyróżnione"
 */

import Ad from "../../../models/listings/ad.js";

/**
 * POST /admin-panel/listings/:adId/feature
 * Wyróżnia ogłoszenie - zmienia listingType na "wyróżnione"
 * Dodatkowo przedłuża datę wygaśnięcia jeśli jest wygasła lub bliska wygaśnięcia
 */
export const featureAd = async (req, res) => {
  try {
    const { adId } = req.params;

    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({
        success: false,
        message: "Ogłoszenie nie zostało znalezione.",
      });
    }

    // Zmień listingType na "wyróżnione"
    ad.listingType = "wyróżnione";

    // Ustaw również pole featured dla kompatybilności
    ad.featured = true;
    ad.featuredAt = new Date();

    // Przedłuż datę wygaśnięcia jeśli jest wygasła lub wygasa w ciągu 7 dni
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (ad.expiresAt && ad.expiresAt < sevenDaysFromNow) {
      // Przedłuż o 30 dni od teraz
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 30);
      ad.expiresAt = newExpiresAt;
      console.log(
        `📅 Przedłużono datę wygaśnięcia ogłoszenia ${adId} do ${newExpiresAt.toISOString()}`
      );
    }

    // Upewnij się, że status jest aktywny
    if (ad.status !== "active" && ad.status !== "approved") {
      ad.status = "approved";
      console.log(`✅ Zmieniono status ogłoszenia ${adId} na "approved"`);
    }

    await ad.save();

    console.log(
      `✅ Ogłoszenie ${adId} wyróżnione. listingType: "${ad.listingType}", featured: ${ad.featured}, expiresAt: ${ad.expiresAt}`
    );

    res.status(200).json({
      success: true,
      message: "Ogłoszenie zostało wyróżnione",
      data: ad,
    });
  } catch (error) {
    console.error("Błąd wyróżniania ogłoszenia:", error);
    res.status(500).json({
      success: false,
      message: "Błąd serwera podczas wyróżniania ogłoszenia.",
      error: error.message,
    });
  }
};

/**
 * POST /admin-panel/listings/:adId/unfeature
 * Usuwa wyróżnienie - zmienia listingType na "standardowe"
 */
export const unfeatureAd = async (req, res) => {
  try {
    const { adId } = req.params;

    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({
        success: false,
        message: "Ogłoszenie nie zostało znalezione.",
      });
    }

    // Zmień listingType na "standardowe"
    ad.listingType = "standardowe";

    // Usuń również pole featured dla kompatybilności
    ad.featured = false;
    ad.featuredAt = null;

    await ad.save();

    console.log(
      `✅ Usunięto wyróżnienie ogłoszenia ${adId}. listingType: "${ad.listingType}"`
    );

    res.status(200).json({
      success: true,
      message: "Usunięto wyróżnienie ogłoszenia",
      data: ad,
    });
  } catch (error) {
    console.error("Błąd usuwania wyróżnienia:", error);
    res.status(500).json({
      success: false,
      message: "Błąd serwera podczas usuwania wyróżnienia.",
      error: error.message,
    });
  }
};
