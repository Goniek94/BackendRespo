import mongoose from "mongoose";
import Ad from "./models/listings/ad.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

const checkAdStatuses = async () => {
  try {
    console.log("=".repeat(60));
    console.log("📊 SPRAWDZANIE STATUSÓW OGŁOSZEŃ W BAZIE DANYCH");
    console.log("=".repeat(60));
    console.log();

    // 1. Pokaż wszystkie unikalne statusy i ich liczby
    console.log("1️⃣  WSZYSTKIE STATUSY W BAZIE:");
    console.log("-".repeat(60));
    const statusCounts = await Ad.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    if (statusCounts.length === 0) {
      console.log("⚠️  Brak ogłoszeń w bazie!");
    } else {
      statusCounts.forEach((item) => {
        const status = item._id || "(null)";
        const count = item.count;
        const percentage = (
          (count / statusCounts.reduce((sum, s) => sum + s.count, 0)) *
          100
        ).toFixed(1);
        console.log(
          `   ${status.padEnd(20)} : ${count} ogłoszeń (${percentage}%)`
        );
      });
    }
    console.log();

    // 2. Pokaż ostatnio dodane ogłoszenia
    console.log("2️⃣  OSTATNIO DODANE OGŁOSZENIA (10 najnowszych):");
    console.log("-".repeat(60));
    const recentAds = await Ad.find({})
      .select("status headline brand model createdAt")
      .sort({ createdAt: -1 })
      .limit(10);

    if (recentAds.length === 0) {
      console.log("⚠️  Brak ogłoszeń!");
    } else {
      recentAds.forEach((ad, index) => {
        const title = ad.headline || `${ad.brand} ${ad.model}`;
        const date = ad.createdAt.toISOString().split("T")[0];
        const time = ad.createdAt.toISOString().split("T")[1].split(".")[0];
        console.log(
          `   ${(index + 1).toString().padStart(2)}. [${ad.status.padEnd(
            15
          )}] ${title.substring(0, 40).padEnd(42)} | ${date} ${time}`
        );
      });
    }
    console.log();

    // 3. Sprawdź jaki filtr używa lista główna
    console.log("3️⃣  FILTRY LISTY GŁÓWNEJ:");
    console.log("-".repeat(60));
    const acceptedStatuses = ["active", "opublikowane", "pending"];
    console.log(
      `   Lista główna akceptuje: [${acceptedStatuses
        .map((s) => `'${s}'`)
        .join(", ")}]`
    );
    console.log();

    const matchingAds = await Ad.countDocuments({
      status: { $in: acceptedStatuses },
    });
    const totalAds = await Ad.countDocuments({});

    console.log(`   ✅ Ogłoszenia widoczne na liście głównej: ${matchingAds}`);
    console.log(`   📊 Wszystkie ogłoszenia w bazie: ${totalAds}`);
    console.log(
      `   ❌ Ogłoszenia NIEWIDOCZNE (błąd): ${totalAds - matchingAds}`
    );
    console.log();

    // 4. Pokaż ogłoszenia które NIE są widoczne
    if (totalAds - matchingAds > 0) {
      console.log("4️⃣  OGŁOSZENIA NIEWIDOCZNE NA LIŚCIE (błędne statusy):");
      console.log("-".repeat(60));
      const invisibleAds = await Ad.find({
        status: { $nin: acceptedStatuses },
      })
        .select("status headline brand model createdAt")
        .sort({ createdAt: -1 })
        .limit(10);

      invisibleAds.forEach((ad, index) => {
        const title = ad.headline || `${ad.brand} ${ad.model}`;
        const date = ad.createdAt.toISOString().split("T")[0];
        console.log(
          `   ${(index + 1).toString().padStart(2)}. [${ad.status.padEnd(
            15
          )}] ${title.substring(0, 40)} | ${date}`
        );
      });
      console.log();
    }

    // 5. Rekomendacje
    console.log("5️⃣  REKOMENDACJE:");
    console.log("-".repeat(60));

    const hasApproved = statusCounts.some((s) => s._id === "approved");
    const hasActive = statusCounts.some((s) => s._id === "active");
    const hasOpublikowane = statusCounts.some((s) => s._id === "opublikowane");

    if (hasApproved) {
      const approvedCount =
        statusCounts.find((s) => s._id === "approved")?.count || 0;
      console.log(
        `   ⚠️  PROBLEM: ${approvedCount} ogłoszeń ma status 'approved'`
      );
      console.log(
        `      ale lista główna akceptuje tylko: ['active', 'opublikowane', 'pending']`
      );
      console.log();
      console.log("   🔧 ROZWIĄZANIE:");
      console.log(
        '      Opcja 1: Dodaj "approved" do filtru w commonFilters.js'
      );
      console.log(
        '      Opcja 2: Zmień status w crud.js z "approved" na "active"'
      );
    }

    if (hasActive && hasOpublikowane && hasApproved) {
      console.log();
      console.log(
        "   ⚠️  UWAGA: Używasz 3 różnych statusów dla tego samego stanu:"
      );
      console.log(`      - 'active'`);
      console.log(`      - 'opublikowane'`);
      console.log(`      - 'approved'`);
      console.log("      Rekomendacja: Ujednolicić do jednego statusu");
    }

    console.log();
    console.log("=".repeat(60));
    console.log("✅ Analiza zakończona");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Błąd podczas sprawdzania statusów:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Rozłączono z MongoDB");
  }
};

// Run the script
const run = async () => {
  await connectDB();
  await checkAdStatuses();
};

run();
