import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Ad from "./models/listings/ad.js";
import User from "./models/user/user.js";
import { uploadToSupabase } from "./utils/supabaseUpload.js";
import fetch from "node-fetch";

const MONGODB_URI = process.env.MONGODB_URI;

// Sample car images URLs (placeholder images)
const SAMPLE_IMAGE_URLS = [
  "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800&q=80", // BMW
  "https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=800&q=80", // BMW interior
  "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&q=80", // BMW side
  "https://images.unsplash.com/photo-1617531653520-bd788a3a6c8e?w=800&q=80", // BMW back
];

async function downloadImage(url) {
  try {
    console.log(`📥 Pobieranie obrazu: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const buffer = await response.buffer();
    console.log(`✅ Pobrano obraz (${buffer.length} bytes)`);
    return buffer;
  } catch (error) {
    console.error(`❌ Błąd pobierania obrazu ${url}:`, error.message);
    return null;
  }
}

async function uploadImagesToSupabase(imageUrls) {
  const uploadedUrls = [];

  for (let i = 0; i < imageUrls.length; i++) {
    const imageUrl = imageUrls[i];
    const buffer = await downloadImage(imageUrl);

    if (buffer) {
      try {
        const fileName = `sample-car-${Date.now()}-${i}.jpg`;
        const supabaseUrl = await uploadToSupabase(
          buffer,
          fileName,
          "autosell", // bucket name
          "image/jpeg",
          "ads" // folder
        );

        console.log(`✅ Uploadowano do Supabase: ${supabaseUrl}`);
        uploadedUrls.push(supabaseUrl);
      } catch (error) {
        console.error(`❌ Błąd uploadu do Supabase:`, error.message);
      }
    }
  }

  return uploadedUrls;
}

async function createSampleAd() {
  try {
    console.log("🔄 Łączenie z MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Połączono z MongoDB");

    // Find first user or create a test user
    let user = await User.findOne();

    if (!user) {
      console.log(
        "⚠️  Brak użytkowników w bazie. Tworzę testowego użytkownika..."
      );
      user = await User.create({
        email: "test@example.com",
        password: "hashedpassword123", // In real scenario, this should be hashed
        firstName: "Jan",
        lastName: "Kowalski",
        phone: "+48123456789",
        role: "user",
        isVerified: true,
      });
      console.log("✅ Utworzono testowego użytkownika");
    }

    console.log(`👤 Używam użytkownika: ${user.email} (${user._id})`);

    // Upload images to Supabase
    console.log("\n📸 Uploadowanie zdjęć do Supabase...");
    const imageUrls = await uploadImagesToSupabase(SAMPLE_IMAGE_URLS);

    if (imageUrls.length === 0) {
      console.log(
        "⚠️  Nie udało się uploadować żadnego zdjęcia. Tworzę ogłoszenie bez zdjęć."
      );
    } else {
      console.log(`✅ Uploadowano ${imageUrls.length} zdjęć`);
    }

    // Create sample ad
    console.log("\n🚗 Tworzenie przykładowego ogłoszenia...");

    const sampleAd = new Ad({
      title: "BMW Seria 3 320d xDrive M Sport - Stan Idealny",
      description: `Witam,

Sprzedam piękne BMW Seria 3 w wersji 320d xDrive z pakietem M Sport. Samochód w idealnym stanie technicznym i wizualnym.

🔧 DANE TECHNICZNE:
- Silnik: 2.0 diesel, 190 KM
- Napęd: xDrive (4x4)
- Skrzynia: Automatyczna 8-biegowa
- Rok produkcji: 2020
- Przebieg: 85 000 km

✨ WYPOSAŻENIE:
- Pakiet M Sport
- Skórzana tapicerka
- Nawigacja Professional
- Kamera cofania
- Czujniki parkowania
- Tempomat adaptacyjny
- LED
- Podgrzewane fotele
- Klimatyzacja automatyczna 2-strefowa

📋 HISTORIA:
- Pierwszy właściciel w Polsce
- Serwisowany w ASO
- Bezwypadkowy
- Książka serwisowa
- Komplet kluczy i dokumentów

💰 CENA: 145 000 PLN (do negocjacji)

Zapraszam do kontaktu i obejrzenia!`,

      user: user._id,
      ownerName: user.firstName,
      ownerLastName: user.lastName,
      ownerEmail: user.email,
      ownerPhone: user.phone || "+48123456789",

      // Vehicle data
      brand: "BMW",
      model: "Seria 3",
      generation: "G20",
      version: "320d xDrive M Sport",
      year: 2020,
      productionYear: 2020,
      mileage: 85000,
      fuelType: "Diesel",
      transmission: "Automatyczna",

      // Technical data
      power: 190,
      engineSize: 1995,
      drive: "AWD/4x4",

      // Body and interior
      bodyType: "Sedan",
      color: "Czarny",
      doors: 4,
      seats: 5,
      paintFinish: "Metalik",

      // Vehicle condition
      condition: "Używany",
      accidentStatus: "Bezwypadkowy",
      damageStatus: "Nieuszkodzony",
      tuning: "Nie",
      countryOfOrigin: "Niemcy",
      imported: "Tak",
      registeredInPL: "Tak",
      firstOwner: "Tak",

      // Seller information
      sellerType: "Prywatny",

      // Location
      voivodeship: "Mazowieckie",
      city: "Warszawa",

      // Purchase options
      purchaseOptions: "Sprzedaż",
      listingType: "standardowe",
      negotiable: "Tak",

      // Price
      price: 145000,
      discount: 0,

      // Images
      images: imageUrls,
      mainImage: imageUrls[0] || "",

      // Status
      status: "active", // Set as active for testing
      featured: false,

      // Set expiration to 30 days from now
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    await sampleAd.save();

    console.log("\n✅ Przykładowe ogłoszenie zostało utworzone!");
    console.log("📋 Szczegóły:");
    console.log(`   ID: ${sampleAd._id}`);
    console.log(`   Tytuł: ${sampleAd.title}`);
    console.log(`   Marka: ${sampleAd.brand} ${sampleAd.model}`);
    console.log(`   Cena: ${sampleAd.price.toLocaleString("pl-PL")} PLN`);
    console.log(`   Zdjęcia: ${sampleAd.images.length}`);
    console.log(`   Status: ${sampleAd.status}`);
    console.log(`   Właściciel: ${user.email}`);

    if (sampleAd.images.length > 0) {
      console.log("\n📸 Zdjęcia:");
      sampleAd.images.forEach((url, index) => {
        console.log(`   ${index + 1}. ${url}`);
      });
    }
  } catch (error) {
    console.error("❌ Błąd:", error);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log("\n👋 Rozłączono z MongoDB");
  }
}

// Run the script
createSampleAd();
