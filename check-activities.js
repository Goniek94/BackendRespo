// check-activities.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import AdminActivityLog from "./models/activity/AdminActivityLog.js";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/marketplace";

async function checkActivities() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Pobierz wszystkie aktywności
    const activities = await AdminActivityLog.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    console.log(`\n📊 Znaleziono ${activities.length} aktywności w bazie:\n`);

    if (activities.length === 0) {
      console.log(
        "❌ BAZA JEST PUSTA - brak aktywności w kolekcji AdminActivityLog"
      );
      console.log("\nTo dlatego nic się nie wyświetla w panelu admina!");
      console.log(
        "Uruchom: node test-add-sample-activities.js aby dodać przykładowe dane"
      );
    } else {
      activities.forEach((activity, index) => {
        console.log(`\n${index + 1}. ${activity.action}`);
        console.log(`   ID: ${activity._id}`);
        console.log(
          `   Data: ${new Date(activity.createdAt).toLocaleString("pl-PL")}`
        );
        console.log(`   Actor: ${JSON.stringify(activity.actor, null, 2)}`);
        console.log(`   Target: ${JSON.stringify(activity.target, null, 2)}`);
        console.log(`   Meta: ${JSON.stringify(activity.meta, null, 2)}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Błąd:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkActivities();
