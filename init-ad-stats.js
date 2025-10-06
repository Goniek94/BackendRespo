/**
 * Skrypt inicjalizujący statystyki dla istniejących ogłoszeń
 * Dodaje pola views, favorites i favoritedBy do wszystkich ogłoszeń które ich nie mają
 */

import mongoose from "mongoose";
import Ad from "./models/listings/ad.js";
import dotenv from "dotenv";

dotenv.config();

const initAdStats = async () => {
  try {
    // Połącz z bazą danych
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Połączono z bazą danych");

    // Znajdź wszystkie ogłoszenia które nie mają pola views lub favorites
    const adsToUpdate = await Ad.find({
      $or: [
        { views: { $exists: false } },
        { favorites: { $exists: false } },
        { favoritedBy: { $exists: false } },
      ],
    });

    console.log(
      `📊 Znaleziono ${adsToUpdate.length} ogłoszeń do zaktualizowania`
    );

    if (adsToUpdate.length === 0) {
      console.log(
        "✅ Wszystkie ogłoszenia już mają zainicjalizowane statystyki"
      );
      process.exit(0);
    }

    // Aktualizuj każde ogłoszenie
    let updated = 0;
    for (const ad of adsToUpdate) {
      // Ustaw domyślne wartości tylko dla brakujących pól
      if (ad.views === undefined) ad.views = 0;
      if (ad.favorites === undefined) ad.favorites = 0;
      if (ad.favoritedBy === undefined) ad.favoritedBy = [];

      await ad.save();
      updated++;

      if (updated % 10 === 0) {
        console.log(
          `⏳ Zaktualizowano ${updated}/${adsToUpdate.length} ogłoszeń...`
        );
      }
    }

    console.log(`✅ Zaktualizowano ${updated} ogłoszeń!`);
    console.log(
      "✅ Wszystkie ogłoszenia mają teraz pola: views, favorites, favoritedBy"
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Błąd podczas inicjalizacji statystyk:", error);
    process.exit(1);
  }
};

// Uruchom skrypt
initAdStats();
