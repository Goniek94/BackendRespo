import User from "../../models/user/user.js";
import Ad from "../../models/listings/ad.js";

/**
 * Pobiera dane dashboardu użytkownika
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
export const getUserDashboard = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // Pobierz dane użytkownika
    const user = await User.findById(userId).select("-password -__v");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Użytkownik nie został znaleziony",
      });
    }

    // Pobierz statystyki ogłoszeń użytkownika
    const [
      activeListingsCount,
      completedTransactionsCount,
      totalListingsCount,
      userAds,
    ] = await Promise.all([
      // Aktywne ogłoszenia (opublikowane)
      Ad.countDocuments({
        owner: userId,
        status: "opublikowane",
      }),

      // Zakończone transakcje (sprzedane)
      Ad.countDocuments({
        owner: userId,
        status: "sprzedane",
      }),

      // Wszystkie ogłoszenia użytkownika
      Ad.countDocuments({
        owner: userId,
      }),

      // Pobierz ogłoszenia użytkownika (ostatnie 10)
      Ad.find({ owner: userId })
        .sort({ updatedAt: -1 })
        .limit(10)
        .select(
          "_id title brand model price status images mainImageIndex createdAt updatedAt"
        )
        .lean(),
    ]);

    // Oblicz status pełnej weryfikacji
    const isFullyVerified =
      user.isEmailVerified && user.isPhoneVerified && user.isVerified;
    const verificationProgress = {
      email: user.isEmailVerified || false,
      phone: user.isPhoneVerified || false,
      overall: user.isVerified || false,
      registrationStep: user.registrationStep || "email_verification",
    };

    // Przygotuj odpowiedź z rozszerzonymi danymi
    const dashboardData = {
      success: true,
      user: {
        id: user._id,
        name: user.name,
        firstName: user.name, // Używamy name jako firstName dla kompatybilności
        lastName: user.lastName,
        email: user.email,
        phone: user.phoneNumber, // Prawidłowa nazwa pola w modelu
        emailVerified: user.isEmailVerified || false,
        phoneVerified: user.isPhoneVerified || false,
        isVerified: isFullyVerified,
        verificationProgress: verificationProgress,
        registrationType: user.registrationType || "standard",
        createdAt: user.createdAt,
        lastLoginAt: user.lastLogin || user.lastActivity || new Date(), // Prawidłowe nazwy pól
        role: user.role || "user",
      },
      activeListingsCount,
      completedTransactionsCount,
      totalListingsCount,
      // Dodaj szczegółowe dane ogłoszeń
      userListings: userAds.map((ad) => ({
        id: ad._id,
        title: ad.title,
        brand: ad.brand,
        model: ad.model,
        price: ad.price,
        status: ad.status,
        images: ad.images,
        mainImageIndex: ad.mainImageIndex,
        mainImage:
          ad.images && ad.images.length > 0
            ? ad.images[ad.mainImageIndex || 0]
            : null,
        createdAt: ad.createdAt,
        updatedAt: ad.updatedAt,
      })),
      // Zachowaj kompatybilność z poprzednim API
      recentViewedAds: userAds.slice(0, 5).map((ad) => ({
        id: ad._id,
        title: ad.title,
        brand: ad.brand,
        model: ad.model,
        price: ad.price,
        status: ad.status,
        images: ad.images,
        mainImageIndex: ad.mainImageIndex,
        mainImage:
          ad.images && ad.images.length > 0
            ? ad.images[ad.mainImageIndex || 0]
            : null,
      })),
    };

    return res.status(200).json(dashboardData);
  } catch (error) {
    console.error("Błąd podczas pobierania danych dashboardu:", error);
    return next(error);
  }
};

export default {
  getUserDashboard,
};
