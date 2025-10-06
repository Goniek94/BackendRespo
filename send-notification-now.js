import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

import mongoose from "mongoose";
import Ad from "./models/listings/ad.js";
import User from "./models/user/user.js";
import notificationManager from "./services/notificationManager.js";

const MONGODB_URI = process.env.MONGODB_URI;
const OWNER_ID = "6890b063030bd26ed5082703";

async function sendNotificationNow() {
  console.log("\n🚀 WYSYŁANIE POWIADOMIENIA O WYGASAJĄCYM OGŁOSZENIU\n");

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Połączono z MongoDB\n");

    // Znajdź ogłoszenie
    const ad = await Ad.findOne({ owner: OWNER_ID }).populate("owner");

    if (!ad) {
      console.log("❌ Nie znaleziono ogłoszenia");
      process.exit(1);
    }

    console.log(`📋 Ogłoszenie: ${ad.brand} ${ad.model}`);
    console.log(`   ID: ${ad._id}`);
    console.log(
      `   Data wygaśnięcia: ${ad.expiresAt.toLocaleString("pl-PL")}\n`
    );

    // Oblicz dni do wygaśnięcia
    const now = new Date();
    const daysLeft = Math.ceil((ad.expiresAt - now) / (1000 * 60 * 60 * 24));
    const adTitle = ad.headline || `${ad.brand} ${ad.model}`;

    console.log(`⏰ Dni do wygaśnięcia: ${daysLeft}\n`);
    console.log(`📤 Wysyłam powiadomienie...`);

    // Wyślij powiadomienie
    await notificationManager.notifyAdExpiringSoon(
      ad.owner._id.toString(),
      adTitle,
      daysLeft,
      ad._id.toString()
    );

    // Oznacz jako powiadomione
    ad.notifiedAboutExpiration = true;
    await ad.save();

    console.log(`\n✅ POWIADOMIENIE WYSŁANE POMYŚLNIE!`);
    console.log(
      `\n💡 Odśwież stronę z powiadomieniami aby zobaczyć powiadomienie.\n`
    );
  } catch (error) {
    console.error("\n❌ BŁĄD:", error);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Rozłączono z bazą danych\n");
    process.exit(0);
  }
}

sendNotificationNow();
