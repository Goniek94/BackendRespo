// Skrypt do oznaczania wybranych ogłoszeń jako wyróżnione
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import Ad from "./models/listings/ad.js";

async function setFeaturedAds() {
  try {
    console.log("🔥 Ustawianie wyróżnionych ogłoszeń...\n");

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Połączono z MongoDB\n");

    // 1. Pokaż wszystkie aktywne ogłoszenia
    const activeAds = await Ad.find({ status: "active" }).lean();
    console.log(`📊 Aktywne ogłoszenia (do wyboru): ${activeAds.length}\n`);

    if (activeAds.length === 0) {
      console.log("❌ Brak aktywnych ogłoszeń do wyróżnienia");
      return;
    }

    activeAds.forEach((ad, i) => {
      console.log(
        `${i + 1}. ${ad._id} - ${ad.title || ad.headline} (featured: ${
          ad.featured || false
        })`
      );
    });
    console.log("");

    // 2. Oznacz WSZYSTKIE aktywne jako wyróżnione (możesz zmienić na wybrane ID)
    console.log(
      "⚙️  Oznaczam wszystkie aktywne ogłoszenia jako wyróżnione...\n"
    );

    const result = await Ad.updateMany(
      { status: "active" },
      {
        $set: {
          featured: true,
          featuredAt: new Date(),
        },
      }
    );

    console.log(`✅ Zaktualizowano: ${result.modifiedCount} ogłoszeń`);
    console.log("");

    // 3. Sprawdzenie
    const nowFeatured = await Ad.countDocuments({
      featured: true,
      status: "active",
    });
    console.log(`🔥 Teraz mamy ${nowFeatured} wyróżnionych aktywnych ogłoszeń`);

    console.log("\n✅ Gotowe!");
  } catch (error) {
    console.error("❌ Błąd:", error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
  }
}

setFeaturedAds();
