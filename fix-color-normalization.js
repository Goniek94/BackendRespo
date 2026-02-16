/**
 * Skrypt do normalizacji kolorów w bazie danych
 * Konwertuje wszystkie kolory do formatu z pierwszą wielką literą (jak w formularzu)
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Ad from "./models/listings/ad.js";

dotenv.config();

// Standardowe kolory z formularza (dokładnie jak w vehicleOptions.js)
const STANDARD_COLORS = [
  "Biały",
  "Czarny",
  "Srebrny",
  "Szary",
  "Niebieski",
  "Czerwony",
  "Zielony",
  "Żółty",
  "Brązowy",
  "Złoty",
  "Fioletowy",
  "Pomarańczowy",
  "Inne",
];

// Funkcja do normalizacji koloru (case-insensitive matching)
const normalizeColor = (color) => {
  if (!color || typeof color !== "string") return null;

  const trimmed = color.trim();
  if (!trimmed) return null;

  // Znajdź pasujący standardowy kolor (case-insensitive)
  const standardColor = STANDARD_COLORS.find(
    (std) => std.toLowerCase() === trimmed.toLowerCase()
  );

  return standardColor || trimmed; // Jeśli nie znaleziono, zwróć oryginalny (trimmed)
};

const fixColorNormalization = async () => {
  try {
    console.log("🔧 Rozpoczynam normalizację kolorów w bazie danych...\n");

    // Połącz z bazą danych
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Połączono z bazą danych\n");

    // Pobierz wszystkie ogłoszenia z kolorami
    const ads = await Ad.find({ color: { $exists: true, $ne: "" } });
    console.log(`📊 Znaleziono ${ads.length} ogłoszeń z kolorami\n`);

    // Grupuj kolory przed normalizacją
    const colorsBefore = {};
    ads.forEach((ad) => {
      const color = ad.color;
      colorsBefore[color] = (colorsBefore[color] || 0) + 1;
    });

    console.log("📋 Kolory PRZED normalizacją:");
    Object.entries(colorsBefore)
      .sort((a, b) => b[1] - a[1])
      .forEach(([color, count]) => {
        console.log(`  '${color}' => ${count} ogłoszeń`);
      });
    console.log("");

    // Normalizuj kolory
    let updatedCount = 0;
    const updates = [];

    for (const ad of ads) {
      const originalColor = ad.color;
      const normalizedColor = normalizeColor(originalColor);

      if (normalizedColor && normalizedColor !== originalColor) {
        updates.push({
          _id: ad._id,
          original: originalColor,
          normalized: normalizedColor,
        });

        ad.color = normalizedColor;
        await ad.save();
        updatedCount++;
      }
    }

    console.log(`✅ Zaktualizowano ${updatedCount} ogłoszeń\n`);

    if (updates.length > 0) {
      console.log("📝 Przykłady zmian:");
      updates.slice(0, 10).forEach((update) => {
        console.log(`  '${update.original}' → '${update.normalized}'`);
      });
      if (updates.length > 10) {
        console.log(`  ... i ${updates.length - 10} więcej`);
      }
      console.log("");
    }

    // Pobierz kolory po normalizacji
    const adsAfter = await Ad.find({ color: { $exists: true, $ne: "" } });
    const colorsAfter = {};
    adsAfter.forEach((ad) => {
      const color = ad.color;
      colorsAfter[color] = (colorsAfter[color] || 0) + 1;
    });

    console.log("📋 Kolory PO normalizacji:");
    Object.entries(colorsAfter)
      .sort((a, b) => b[1] - a[1])
      .forEach(([color, count]) => {
        console.log(`  '${color}' => ${count} ogłoszeń`);
      });
    console.log("");

    console.log("✅ Normalizacja zakończona pomyślnie!");

    await mongoose.connection.close();
    console.log("✅ Połączenie z bazą danych zamknięte");
  } catch (error) {
    console.error("❌ Błąd podczas normalizacji:", error);
    process.exit(1);
  }
};

// Uruchom skrypt
fixColorNormalization();
