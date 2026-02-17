import mongoose from "mongoose";
import Transaction from "../models/payments/Transaction.js";
import Ad from "../models/listings/ad.js";
import notificationManager from "../services/notificationManager.js";
import dotenv from "dotenv";

dotenv.config();

async function fixPaidAds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Połączono z MongoDB");

    // Znajdź wszystkie opłacone transakcje z pending ogłoszeniami
    const completedTransactions = await Transaction.find({
      status: "completed",
      paidAt: { $exists: true },
    }).populate("adId");

    console.log(
      `📋 Znaleziono ${completedTransactions.length} opłaconych transakcji`,
    );

    let fixed = 0;
    let alreadyActive = 0;

    for (const transaction of completedTransactions) {
      const ad = transaction.adId;

      if (!ad) {
        console.log(`⚠️ Brak ogłoszenia dla transakcji ${transaction._id}`);
        continue;
      }

      // Jeśli ogłoszenie jest pending_payment lub inactive
      if (
        ad.status === "pending_payment" ||
        ad.status === "inactive" ||
        !ad.isActive
      ) {
        console.log(
          `🔧 Naprawiam ogłoszenie ${ad._id} (${ad.brand} ${ad.model})`,
        );

        // Aktywuj ogłoszenie
        if (
          transaction.type === "featured_listing" ||
          transaction.type === "wyróżnione"
        ) {
          ad.isFeatured = true;
          ad.featuredUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        }

        ad.status = "active";
        ad.isActive = true;
        ad.expirationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await ad.save();

        // Wyślij powiadomienie
        await notificationManager
          .createNotification(
            transaction.userId,
            "Ogłoszenie aktywowane",
            `Twoje ogłoszenie "${ad.brand} ${ad.model}" zostało aktywowane.`,
            "payment_success",
            { transactionId: transaction.transactionId, adId: ad._id },
          )
          .catch((e) => console.error("Błąd powiadomienia:", e));

        fixed++;
        console.log(`✅ Naprawiono: ${ad.brand} ${ad.model}`);
      } else {
        alreadyActive++;
      }
    }

    console.log("\n📊 PODSUMOWANIE:");
    console.log(`✅ Naprawiono: ${fixed} ogłoszeń`);
    console.log(`ℹ️ Już aktywnych: ${alreadyActive} ogłoszeń`);
    console.log(`📋 Sprawdzono: ${completedTransactions.length} transakcji`);

    await mongoose.disconnect();
    console.log("✅ Rozłączono z MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("❌ Błąd:", error);
    process.exit(1);
  }
}

fixPaidAds();
