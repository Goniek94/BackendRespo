/**
 * Skrypt do ustawienia ogłoszenia jako wygasłe (wczoraj)
 * Używany do testowania systemu powiadomień o wygasłych ogłoszeniach
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

import mongoose from "mongoose";
import Ad from "./models/listings/ad.js";
import User from "./models/user/user.js";

const MONGODB_URI = process.env.MONGODB_URI;
const OWNER_ID = "6890b063030bd26ed5082703";

async function setAdExpired() {
  console.log("\n🚀 USTAWIANIE OGŁOSZENIA JAKO WYGASŁE\n");

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Połączono z MongoDB\n");

    const ad = await Ad.findOne({ owner: OWNER_ID }).populate("owner");

    if (!ad) {
      console.log("❌ Nie znaleziono ogłoszenia");
      process.exit(1);
    }

    console.log(`📋 Ogłoszenie: ${ad.brand} ${ad.model}`);
    console.log(`   ID: ${ad._id}`);
    console.log(
      `   Obecna data wygaśnięcia: ${ad.expiresAt.toLocaleString("pl-PL")}`
    );
    console.log(`   Obecny status: ${ad.status}\n`);

    // Ustaw datę wygaśnięcia na wczoraj
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    console.log(
      `⏰ Ustawiam datę wygaśnięcia na: ${yesterday.toLocaleString("pl-PL")}`
    );
    console.log(`   (wczoraj - ogłoszenie już wygasło)\n`);

    ad.expiresAt = yesterday;
    ad.status = "hidden"; // Wygasłe ogłoszenia są ukryte
    ad.notifiedAboutExpiration = false; // Reset flagi
    await ad.save();

    console.log("✅ OGŁOSZENIE USTAWIONE JAKO WYGASŁE!\n");
    console.log("📊 Aktualne dane:");
    console.log(`   Data wygaśnięcia: ${ad.expiresAt.toLocaleString("pl-PL")}`);
    console.log(`   Status: ${ad.status}`);
    console.log(
      `   Flaga notifiedAboutExpiration: ${ad.notifiedAboutExpiration}\n`
    );

    console.log("💡 Scheduler sprawdza wygasłe ogłoszenia codziennie o 00:00");
    console.log("   Uruchom scheduler ręcznie lub poczekaj do północy\n");
  } catch (error) {
    console.error("\n❌ BŁĄD:", error);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Rozłączono z bazą danych\n");
    process.exit(0);
  }
}

setAdExpired();
