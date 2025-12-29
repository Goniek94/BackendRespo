import mongoose from "mongoose";
import dotenv from "dotenv";

// Załaduj zmienne środowiskowe
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function fixInvoiceNumberIndex() {
  try {
    console.log("🔧 Łączenie z MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Połączono z MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("transactions");

    console.log("\n📋 Sprawdzanie istniejących indeksów...");
    const indexes = await collection.indexes();
    console.log("Istniejące indeksy:", JSON.stringify(indexes, null, 2));

    // Usuń stary indeks invoiceNumber_1
    console.log("\n🗑️  Usuwanie starego indeksu invoiceNumber_1...");
    try {
      await collection.dropIndex("invoiceNumber_1");
      console.log("✅ Stary indeks usunięty");
    } catch (error) {
      console.log(
        "⚠️  Indeks nie istnieje lub już został usunięty:",
        error.message
      );
    }

    // Utwórz nowy indeks sparse unique
    console.log("\n🔨 Tworzenie nowego indeksu sparse unique...");
    await collection.createIndex(
      { invoiceNumber: 1 },
      {
        unique: true,
        sparse: true,
        name: "invoiceNumber_sparse_unique",
      }
    );
    console.log("✅ Nowy indeks utworzony");

    console.log("\n📋 Sprawdzanie nowych indeksów...");
    const newIndexes = await collection.indexes();
    console.log("Nowe indeksy:", JSON.stringify(newIndexes, null, 2));

    console.log("\n✅ Naprawa zakończona pomyślnie!");
    console.log("Możesz teraz spróbować ponownie utworzyć transakcję.");
  } catch (error) {
    console.error("❌ Błąd podczas naprawy indeksu:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Rozłączono z MongoDB");
  }
}

fixInvoiceNumberIndex();
