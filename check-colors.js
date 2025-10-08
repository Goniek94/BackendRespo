import mongoose from "mongoose";
import Ad from "./models/listings/ad.js";
import dotenv from "dotenv";

dotenv.config();

const checkColors = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Count total ads
    const totalAds = await Ad.countDocuments({ status: "active" });
    console.log(`\n📊 Total active ads: ${totalAds}`);

    // Count ads with color field filled
    const adsWithColor = await Ad.countDocuments({
      status: "active",
      color: { $exists: true, $ne: "" },
    });
    console.log(`🎨 Ads with color: ${adsWithColor}`);

    // Count ads without color
    const adsWithoutColor = await Ad.countDocuments({
      status: "active",
      $or: [{ color: { $exists: false } }, { color: "" }],
    });
    console.log(`❌ Ads without color: ${adsWithoutColor}`);

    // Show some examples of colors
    const colorSamples = await Ad.find({
      status: "active",
      color: { $exists: true, $ne: "" },
    })
      .select("brand model color")
      .limit(10);

    console.log("\n📋 Sample ads with colors:");
    colorSamples.forEach((ad) => {
      console.log(`  - ${ad.brand} ${ad.model}: ${ad.color}`);
    });

    // Count by color
    const colorCounts = await Ad.aggregate([
      {
        $match: {
          status: "active",
          color: { $exists: true, $ne: "" },
        },
      },
      {
        $group: {
          _id: "$color",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    console.log("\n🎨 Colors distribution:");
    colorCounts.forEach((item) => {
      console.log(`  ${item._id}: ${item.count} ads`);
    });

    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

checkColors();
