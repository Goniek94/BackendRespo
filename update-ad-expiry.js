/**
 * Prosty skrypt do ustawienia daty wygaśnięcia ogłoszenia na 3 dni od teraz
 * Używany do testowania systemu powiadomień
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

// Konfiguracja MongoDB - pobierana z .env
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI nie jest ustawione w pliku .env!");
  process.exit(1);
}

const OWNER_ID = "6890b063030bd26ed5082703"; // ID właściciela z MongoDB Compass

const DAYS_TO_EXPIRE = 3;

async function updateAdExpiry() {
  console.log("\n🚀 ========================================");
  console.log("   ZMIANA DATY WYGAŚNIĘCIA OGŁOSZENIA");
  console.log("========================================\n");

  try {
    // Połącz z bazą
    console.log("📡 Łączenie z MongoDB...");
    console.log(`   URI: ${MONGODB_URI}\n`);
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Połączono!\n");

    // Znajdź ogłoszenie po ID właściciela
    console.log(`🔎 Szukam ogłoszenia właściciela: ${OWNER_ID}...`);

    const ad = await Ad.findOne({ owner: OWNER_ID }).populate("owner");

    if (!ad) {
      console.log(`\n❌ Nie znaleziono ogłoszenia właściciela: ${OWNER_ID}\n`);
      process.exit(1);
    }

    console.log("✅ Znaleziono ogłoszenie!\n");
    console.log(`📋 Szczegóły ogłoszenia:`);
    console.log(`   ID: ${ad._id}`);
    console.log(`   Tytuł: ${ad.headline || `${ad.brand} ${ad.model}`}`);
    console.log(`   Właściciel: ${ad.owner._id} (${ad.owner.email})`);
    console.log(
      `   Obecna data wygaśnięcia: ${
        ad.expiresAt ? ad.expiresAt.toLocaleString("pl-PL") : "BRAK"
      }`
    );
    console.log(
      `   Flaga notifiedAboutExpiration: ${ad.notifiedAboutExpiration}\n`
    );

    // Oblicz nową datę
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + DAYS_TO_EXPIRE);

    console.log(
      `� Ustawiam datę wygaśnięcia na ${DAYS_TO_EXPIRE} dni od teraz...`
    );
    console.log(`   Nowa data: ${newExpiresAt.toLocaleString("pl-PL")}\n`);

    // Zapisz starą datę do wyświetlenia
    const oldExpiresAt = ad.expiresAt;

    // Aktualizuj ogłoszenie
    ad.expiresAt = newExpiresAt;
    ad.notifiedAboutExpiration = false; // Reset flagi!
    await ad.save();

    console.log("✅ ZAKTUALIZOWANO POMYŚLNIE!\n");
    console.log("� Podsumowanie zmian:");
    console.log(`   Stara data: ${oldExpiresAt.toLocaleString("pl-PL")}`);
    console.log(`   Nowa data: ${newExpiresAt.toLocaleString("pl-PL")}`);
    console.log(`   Flaga notifiedAboutExpiration: false (zresetowana)`);

    console.log("\n⏰ CO DALEJ:");
    console.log(
      `   Scheduler sprawdza wygasające ogłoszenia codziennie o 8:00 rano`
    );
    console.log(
      `   Jutro o 8:00 otrzymasz powiadomienie o wygasającym ogłoszeniu!`
    );
    console.log(
      `   (lub uruchom scheduler ręcznie aby przetestować natychmiast)\n`
    );

    console.log("✅ ========================================");
    console.log("   OPERACJA ZAKOŃCZONA POMYŚLNIE!");
    console.log("========================================\n");
  } catch (error) {
    console.error("\n❌ BŁĄD:", error.message);
    console.error("\nPełny błąd:", error);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Rozłączono z bazą danych\n");
    process.exit(0);
  }
}

// Uruchom
updateAdExpiry();
