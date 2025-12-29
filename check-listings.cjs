require("dotenv").config();
const mongoose = require("mongoose");

async function checkListings() {
  try {
    console.log("🔌 Łączenie z bazą danych...");
    console.log(
      "📍 URI:",
      process.env.MONGODB_URI.replace(/:[^:@]+@/, ":****@")
    );

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Połączono z bazą danych\n");

    // Pobierz wszystkie kolekcje
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    console.log("📦 Dostępne kolekcje w bazie:");
    collections.forEach((col) => console.log(`   - ${col.name}`));
    console.log("");

    // Sprawdź kolekcję ads/listings
    const possibleCollections = ["ads", "listings", "advertisements"];

    for (const collectionName of possibleCollections) {
      const exists = collections.find((c) => c.name === collectionName);
      if (exists) {
        const collection = mongoose.connection.db.collection(collectionName);
        const count = await collection.countDocuments();
        console.log(`\n📊 Kolekcja "${collectionName}":`);
        console.log(`   Liczba dokumentów: ${count}`);

        if (count > 0) {
          // Pokaż przykładowe ogłoszenie
          const sample = await collection.findOne();
          console.log("\n📄 Przykładowy dokument:");
          console.log(JSON.stringify(sample, null, 2));

          // Sprawdź statusy
          const statuses = await collection
            .aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }])
            .toArray();

          console.log("\n📈 Rozkład statusów:");
          statuses.forEach((s) =>
            console.log(`   ${s._id || "brak"}: ${s.count}`)
          );
        }
      }
    }

    // Sprawdź wszystkie kolekcje z liczbą dokumentów
    console.log("\n\n📊 Wszystkie kolekcje z liczbą dokumentów:");
    for (const col of collections) {
      const collection = mongoose.connection.db.collection(col.name);
      const count = await collection.countDocuments();
      console.log(`   ${col.name}: ${count} dokumentów`);
    }
  } catch (error) {
    console.error("❌ Błąd:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Rozłączono z bazą danych");
  }
}

checkListings();
