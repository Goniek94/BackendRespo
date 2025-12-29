/**
 * Skrypt naprawczy - usuwa stary indeks invoiceNumber i tworzy nowy sparse index
 * Uruchom: node fix-transaction-index.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function fixTransactionIndex() {
  try {
    console.log("🔧 Łączenie z MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Połączono z MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("transactions");

    console.log("\n📋 Sprawdzanie istniejących indeksów...");
    const indexes = await collection.indexes();
    console.log("Znalezione indeksy:", JSON.stringify(indexes, null, 2));

    // Usuń stary indeks invoiceNumber_1 jeśli istnieje
    const invoiceNumberIndex = indexes.find(
      (idx) => idx.name === "invoiceNumber_1"
    );

    if (invoiceNumberIndex) {
      console.log("\n🗑️  Usuwanie starego indeksu invoiceNumber_1...");
      await collection.dropIndex("invoiceNumber_1");
      console.log("✅ Stary indeks usunięty");
    } else {
      console.log("\n✅ Stary indeks nie istnieje (już usunięty)");
    }

    // Utwórz nowy sparse unique index
    console.log("\n🔨 Tworzenie nowego sparse unique indeksu...");
    await collection.createIndex(
      { invoiceNumber: 1 },
      { unique: true, sparse: true }
    );
    console.log("✅ Nowy indeks utworzony");

    // Sprawdź końcowy stan
    console.log("\n📋 Sprawdzanie końcowego stanu indeksów...");
    const finalIndexes = await collection.indexes();
    const invoiceIndex = finalIndexes.find((idx) =>
      idx.key.hasOwnProperty("invoiceNumber")
    );

    if (invoiceIndex) {
      console.log("\n✅ Indeks invoiceNumber:");
      console.log("   - Unique:", invoiceIndex.unique);
      console.log("   - Sparse:", invoiceIndex.sparse);
    }

    console.log("\n🎉 Naprawa zakończona pomyślnie!");
    console.log("💡 Możesz teraz ponownie uruchomić aplikację");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Błąd podczas naprawy:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

fixTransactionIndex();
