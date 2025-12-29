import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Załaduj .env z głównego katalogu
dotenv.config({ path: join(__dirname, ".env") });

const MONGODB_URI = process.env.MONGODB_URI;

console.log("🔍 MONGODB_URI:", MONGODB_URI ? "Załadowano" : "BRAK!");
if (!MONGODB_URI) {
  console.error("❌ Brak MONGODB_URI w pliku .env!");
  process.exit(1);
}

async function checkTransactions() {
  try {
    console.log("🔧 Łączenie z MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Połączono z MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("transactions");

    // Sprawdź ile transakcji ma invoiceNumber: null
    const nullCount = await collection.countDocuments({ invoiceNumber: null });
    console.log(`\n📊 Liczba transakcji z invoiceNumber: null: ${nullCount}`);

    // Pokaż przykładowe transakcje
    const samples = await collection
      .find({ invoiceNumber: null })
      .limit(5)
      .toArray();
    console.log("\n📋 Przykładowe transakcje z invoiceNumber: null:");
    samples.forEach((t, i) => {
      console.log(
        `${i + 1}. ID: ${t._id}, Status: ${t.status}, Created: ${t.createdAt}`
      );
    });

    // Sprawdź indeksy
    console.log("\n🔍 Sprawdzanie indeksów...");
    const indexes = await collection.indexes();
    const invoiceIndex = indexes.find(
      (idx) => idx.name === "invoiceNumber_sparse_unique"
    );
    console.log(
      "Indeks invoiceNumber_sparse_unique:",
      JSON.stringify(invoiceIndex, null, 2)
    );

    // ROZWIĄZANIE: Usuń pole invoiceNumber z dokumentów gdzie jest null
    console.log(
      "\n🔨 Usuwanie pola invoiceNumber z dokumentów gdzie jest null..."
    );
    const result = await collection.updateMany(
      { invoiceNumber: null },
      { $unset: { invoiceNumber: "" } }
    );
    console.log(`✅ Zaktualizowano ${result.modifiedCount} dokumentów`);

    console.log("\n✅ Naprawa zakończona!");
    console.log("Teraz możesz spróbować utworzyć transakcję.");
  } catch (error) {
    console.error("❌ Błąd:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Rozłączono z MongoDB");
  }
}

checkTransactions();
