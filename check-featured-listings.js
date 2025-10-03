// check-featured-listings.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Ad from "./models/listings/ad.js";
import { publicFeaturedFilter } from "./filters/adVisibility.js";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/marketplace";

async function checkFeaturedListings() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // 1. Wszystkie ogłoszenia z featured=true
    const allFeatured = await Ad.find({ featured: true }).lean();
    console.log(`\n📊 Ogłoszenia z featured=true: ${allFeatured.length}`);

    if (allFeatured.length > 0) {
      allFeatured.forEach((ad, i) => {
        const isActive = ad.status === "active";
        const notExpired = !ad.expiresAt || new Date(ad.expiresAt) > new Date();
        console.log(`\n${i + 1}. ${ad.title || ad._id}`);
        console.log(`   Status: ${ad.status} ${isActive ? "✅" : "❌"}`);
        console.log(
          `   ExpiresAt: ${ad.expiresAt || "brak"} ${notExpired ? "✅" : "❌"}`
        );
        console.log(`   Featured: ${ad.featured ? "✅" : "❌"}`);
      });
    }

    // 2. Ogłoszenia spełniające wszystkie warunki (publicFeaturedFilter)
    const filter = publicFeaturedFilter();
    const validFeatured = await Ad.countDocuments(filter);
    console.log(
      `\n🔥 Prawidłowe wyróżnione (active + nie wygasłe): ${validFeatured}`
    );

    // 3. Wszystkie active ogłoszenia (moglibyśmy wybrać z nich featured)
    const allActive = await Ad.find({ status: "active" })
      .limit(5)
      .sort({ createdAt: -1 })
      .lean();
    console.log(`\n📋 Przykładowe aktywne ogłoszenia (pierwsze 5):`);
    allActive.forEach((ad, i) => {
      console.log(`${i + 1}. ${ad.title || ad._id} (ID: ${ad._id})`);
      console.log(`   Featured: ${ad.featured ? "TAK" : "NIE"}`);
    });

    // 4. Propozycja naprawy
    if (validFeatured === 0 && allActive.length > 0) {
      console.log(`\n💡 Sugestia: Ustaw kilka ogłoszeń jako featured:`);
      console.log(`   Uruchom: node set-featured-ads.js`);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Błąd:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkFeaturedListings();
