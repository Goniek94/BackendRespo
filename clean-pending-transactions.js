/**
 * Skrypt do czyszczenia starych transakcji pending z invoiceNumber: null
 *
 * Problem: Wiele transakcji testowych z invoiceNumber: null blokuje tworzenie nowych
 * Rozwiązanie: Usunięcie starych transakcji pending (starszych niż 1 dzień)
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

// Załaduj zmienne środowiskowe
dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/MarketplaceDB";

async function cleanPendingTransactions() {
  try {
    console.log("🧹 Czyszczenie starych transakcji pending...\n");

    // Połącz z bazą danych
    console.log("📡 Łączenie z MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Połączono z MongoDB\n");

    const db = mongoose.connection.db;
    const transactionsCollection = db.collection("transactions");
    const adsCollection = db.collection("ads");

    // Znajdź wszystkie transakcje pending starsze niż 1 dzień
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    console.log("🔍 Szukam starych transakcji pending...");
    const oldPendingTransactions = await transactionsCollection
      .find({
        status: "pending",
        createdAt: { $lt: oneDayAgo },
      })
      .toArray();

    console.log(
      `📊 Znaleziono ${oldPendingTransactions.length} starych transakcji pending\n`
    );

    if (oldPendingTransactions.length === 0) {
      console.log("✅ Brak starych transakcji do usunięcia");
      await mongoose.disconnect();
      return;
    }

    // Dla każdej transakcji, usuń powiązane ogłoszenie ze statusem pending_payment
    let deletedAds = 0;
    for (const transaction of oldPendingTransactions) {
      if (transaction.adId) {
        const ad = await adsCollection.findOne({ _id: transaction.adId });
        if (ad && ad.status === "pending_payment") {
          await adsCollection.deleteOne({ _id: transaction.adId });
          deletedAds++;
          console.log(
            `  🗑️  Usunięto ogłoszenie: ${ad.brand} ${ad.model} (${transaction.adId})`
          );
        }
      }
    }

    console.log(
      `\n✅ Usunięto ${deletedAds} ogłoszeń ze statusem pending_payment\n`
    );

    // Usuń stare transakcje pending
    const result = await transactionsCollection.deleteMany({
      status: "pending",
      createdAt: { $lt: oneDayAgo },
    });

    console.log(
      `✅ Usunięto ${result.deletedCount} starych transakcji pending\n`
    );

    // Pokaż statystyki
    console.log("📊 Statystyki po czyszczeniu:");
    const stats = await transactionsCollection
      .aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    stats.forEach((stat) => {
      console.log(`  - ${stat._id}: ${stat.count}`);
    });

    console.log("\n🎉 Czyszczenie zakończone sukcesem!");
    console.log("✅ Teraz możesz tworzyć nowe transakcje\n");
  } catch (error) {
    console.error("❌ Błąd podczas czyszczenia:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Rozłączono z MongoDB");
  }
}

// Uruchom skrypt
cleanPendingTransactions();
