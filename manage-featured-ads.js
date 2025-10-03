// Zarządzanie wyróżnionymi ogłoszeniami
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import Ad from "./models/listings/ad.js";

async function manageFeaturedAds() {
  try {
    console.log("🔥 Zarządzanie wyróżnionymi ogłoszeniami...\n");

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Połączono z MongoDB\n");

    // 1. Najpierw USUŃ featured ze wszystkich
    console.log("🔄 Resetuję featured na wszystkich ogłoszeniach...\n");
    await Ad.updateMany({}, { $set: { featured: false } });

    // 2. Pokaż wszystkie aktywne ogłoszenia z numerami
    const activeAds = await Ad.find({ status: "active" }).lean();
    console.log(`📊 Aktywne ogłoszenia:\n`);

    activeAds.forEach((ad, i) => {
      console.log(`${i + 1}. [${ad._id}]`);
      console.log(`   ${ad.title || ad.headline}`);
      console.log("");
    });

    // 3. RĘCZNIE wybierz ID ogłoszeń do wyróżnienia
    // Zmień te ID na te, które chcesz wyróżnić:
    const featuredIds = [
      // "68c944a91d92929e5fb5cd4f", // Kia Rio
      // "68c946051d92929e5fb5d0f7", // Volvo XC60
      "68c9477b1d92929e5fb5d64e", // BMW 118i - WYRÓŻNIONE
      "68c9493b1d92929e5fb5db91", // VW Golf - WYRÓŻNIONE
    ];

    if (featuredIds.length === 0) {
      console.log("⚠️  Nie wybrano żadnych ogłoszeń do wyróżnienia");
      console.log(
        "   Edytuj plik manage-featured-ads.js i dodaj ID do tablicy featuredIds"
      );
      return;
    }

    console.log(
      `\n⚙️  Oznaczam ${featuredIds.length} ogłoszeń jako wyróżnione...\n`
    );

    const result = await Ad.updateMany(
      { _id: { $in: featuredIds } },
      {
        $set: {
          featured: true,
          featuredAt: new Date(),
        },
      }
    );

    console.log(`✅ Zaktualizowano: ${result.modifiedCount} ogłoszeń\n`);

    // 4. Sprawdzenie
    const nowFeatured = await Ad.find({
      featured: true,
      status: "active",
    }).lean();

    console.log(`🔥 Wyróżnione ogłoszenia (${nowFeatured.length}):`);
    nowFeatured.forEach((ad, i) => {
      console.log(`   ${i + 1}. ${ad.title || ad.headline}`);
    });

    console.log("\n✅ Gotowe!");
    console.log("\n💡 Aby zmienić wyróżnione:");
    console.log("   1. Edytuj plik manage-featured-ads.js");
    console.log("   2. Zmień ID w tablicy featuredIds");
    console.log("   3. Uruchom ponownie: node manage-featured-ads.js");
  } catch (error) {
    console.error("❌ Błąd:", error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
  }
}

manageFeaturedAds();
