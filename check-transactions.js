import mongoose from "mongoose";
import Transaction from "./models/payments/Transaction.js";
import Ad from "./models/listings/ad.js";
import dotenv from "dotenv";

dotenv.config();

async function checkTransactions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Połączono z MongoDB");

    const transactions = await Transaction.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("adId", "headline brand model status")
      .lean();

    console.log("\n📊 Ostatnie 10 transakcji:\n");

    transactions.forEach((tr, index) => {
      console.log(`${index + 1}. ID: ${tr._id}`);
      console.log(`   Status: ${tr.status}`);
      console.log(`   Kwota: ${tr.amount} PLN`);
      console.log(`   Utworzono: ${tr.createdAt}`);
      console.log(`   Opłacono: ${tr.paidAt || "NIE"}`);
      console.log(`   Provider ID: ${tr.providerId || "BRAK"}`);
      if (tr.adId) {
        console.log(
          `   Ogłoszenie: ${tr.adId.brand} ${tr.adId.model} (status: ${tr.adId.status})`,
        );
      }
      console.log("");
    });

    const stats = await Transaction.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    console.log("📈 Statystyki transakcji:");
    stats.forEach((s) => {
      console.log(`   ${s._id}: ${s.count}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Błąd:", error);
    process.exit(1);
  }
}

checkTransactions();
