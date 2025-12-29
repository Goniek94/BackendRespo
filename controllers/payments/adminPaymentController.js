import Transaction from "../../models/payments/Transaction.js";
import Ad from "../../models/listings/ad.js";
import notificationManager from "../../services/notificationManager.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Admin Payment Controller
 * Handles admin-initiated free activations of ads
 */
class AdminPaymentController {
  /**
   * Admin activates ad without payment
   * Creates a completed transaction for history tracking
   */
  async activateAdAsAdmin(req, res) {
    try {
      const { adData, type = "standard_listing" } = req.body;
      const adminId = req.user.userId;
      const adminRole = req.user.role;

      console.log(
        "👑 [ADMIN_PAYMENT] ========================================"
      );
      console.log("👑 [ADMIN_PAYMENT] ADMIN AKTYWACJA OGŁOSZENIA");
      console.log(
        "👑 [ADMIN_PAYMENT] ========================================"
      );
      console.log("📝 [ADMIN_PAYMENT] Admin ID:", adminId);
      console.log("📝 [ADMIN_PAYMENT] Admin Role:", adminRole);
      console.log("📝 [ADMIN_PAYMENT] Typ ogłoszenia:", type);

      // Verify admin role
      if (adminRole !== "admin" && adminRole !== "superadmin") {
        console.log("❌ [ADMIN_PAYMENT] Brak uprawnień administratora");
        return res.status(403).json({
          success: false,
          message: "Brak uprawnień do wykonania tej operacji",
        });
      }

      // Validate input
      if (!adData) {
        console.log("❌ [ADMIN_PAYMENT] Brak danych ogłoszenia");
        return res.status(400).json({
          success: false,
          message: "Brak wymaganych danych: adData",
        });
      }

      // Get the user who is creating the ad (from adData or current user)
      const adOwnerId = adData.userId || adminId;

      console.log("👤 [ADMIN_PAYMENT] Właściciel ogłoszenia:", adOwnerId);

      // --- KROK 1: Utwórz ogłoszenie ze statusem "active" ---
      console.log("🚗 [ADMIN_PAYMENT] Tworzenie ogłoszenia w bazie danych...");

      const newAd = new Ad({
        ...adData,
        user: adOwnerId,
        owner: adOwnerId, // Legacy support
        status: "active", // ⚠️ KLUCZOWE - od razu aktywne (admin bypass)
        expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dni
      });

      // Handle featured listing
      if (type === "featured_listing" || type === "wyróżnione") {
        newAd.isFeatured = true;
        newAd.featuredUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        console.log("⭐ [ADMIN_PAYMENT] Ogłoszenie oznaczone jako WYRÓŻNIONE");
      }

      const savedAd = await newAd.save();
      console.log("✅ [ADMIN_PAYMENT] Ogłoszenie utworzone z ID:", savedAd._id);
      console.log("✅ [ADMIN_PAYMENT] Status ogłoszenia:", savedAd.status);

      // --- KROK 2: Utwórz transakcję "completed" dla historii ---
      const transactionIdInternal = `ADMIN_${Date.now()}_${uuidv4().slice(
        0,
        8
      )}`;

      console.log(
        "💾 [ADMIN_PAYMENT] Tworzenie transakcji w bazie danych (dla historii)..."
      );
      console.log("💾 [ADMIN_PAYMENT] ID transakcji:", transactionIdInternal);

      const transaction = new Transaction({
        userId: adOwnerId, // Transaction belongs to ad owner
        adId: savedAd._id,
        amount: 0, // Free for admin
        currency: "PLN",
        type,
        status: "completed", // ⚠️ Od razu completed (admin bypass)
        paymentMethod: "admin", // Special payment method for admin
        transactionId: transactionIdInternal,
        invoiceRequested: false,
        invoiceDetails: {},
        metadata: {
          adTitle:
            savedAd.headline ||
            savedAd.title ||
            `${savedAd.brand} ${savedAd.model}`,
          adType: type,
          activatedBy: "admin",
          adminId: adminId,
          adminNote: "Aktywowane przez administratora bez płatności",
          createdAt: new Date().toISOString(),
        },
        paidAt: new Date(), // Set as paid immediately
      });

      const savedTransaction = await transaction.save();
      console.log(
        "✅ [ADMIN_PAYMENT] Transakcja zapisana w bazie z statusem: completed"
      );
      console.log("✅ [ADMIN_PAYMENT] MongoDB ID:", savedTransaction._id);

      // --- KROK 3: Powiadomienie użytkownika (jeśli admin aktywuje dla kogoś innego) ---
      if (adOwnerId !== adminId) {
        try {
          console.log(
            "📧 [ADMIN_PAYMENT] Wysyłanie powiadomienia do właściciela ogłoszenia..."
          );

          await notificationManager.createNotification(
            adOwnerId,
            "Ogłoszenie aktywowane",
            `Twoje ogłoszenie zostało aktywowane przez administratora.`,
            "admin_activation",
            {
              adId: savedAd._id,
              transactionId: savedTransaction._id,
            }
          );

          console.log("✅ [ADMIN_PAYMENT] Powiadomienie wysłane");
        } catch (e) {
          console.error("❌ [ADMIN_PAYMENT] Błąd wysyłania powiadomienia:", e);
        }
      }

      console.log(
        "🎉 [ADMIN_PAYMENT] ========================================"
      );
      console.log("🎉 [ADMIN_PAYMENT] OGŁOSZENIE AKTYWOWANE POMYŚLNIE");
      console.log(
        "🎉 [ADMIN_PAYMENT] ========================================"
      );

      res.status(201).json({
        success: true,
        message: "Ogłoszenie aktywowane przez administratora",
        adId: savedAd._id,
        transactionId: savedTransaction._id,
        ad: {
          id: savedAd._id,
          brand: savedAd.brand,
          model: savedAd.model,
          status: savedAd.status,
          isFeatured: savedAd.isFeatured || false,
          expirationDate: savedAd.expirationDate,
        },
      });
    } catch (error) {
      console.error(
        "❌ [ADMIN_PAYMENT] KRYTYCZNY BŁĄD podczas aktywacji:",
        error
      );
      console.error("❌ [ADMIN_PAYMENT] Stack trace:", error.stack);
      res.status(500).json({
        success: false,
        message: "Błąd podczas aktywacji ogłoszenia",
        error: error.message,
      });
    }
  }
}

const adminPaymentController = new AdminPaymentController();
export default adminPaymentController;
