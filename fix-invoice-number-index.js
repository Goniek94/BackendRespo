/**
 * Skrypt do naprawy indeksu invoiceNumber w kolekcji transactions
 *
 * Problem: Stary indeks unique na invoiceNumber nie pozwala na wiele wartości null
 * Rozwiązanie: Usunięcie starego indeksu i utworzenie nowego z flagą sparse
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

// Załaduj zmienne środowiskowe
dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/MarketplaceDB";

async function fixInvoiceNumberIndex() {
  try {
    console.log("🔧 Naprawa indeksu invoiceNumber...\n");

    // Połącz z bazą danych
    console.log("📡 Łączenie z MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Połączono z MongoDB\n");

    const db = mongoose.connection.db;
    const collection = db.collection("transactions");

    // Sprawdź istniejące indeksy
    console.log("📋 Sprawdzam istniejące indeksy...");
    const indexes = await collection.indexes();
    console.log("Znalezione indeksy:");
    indexes.forEach((index) => {
      console.log(
        `  - ${index.name}:`,
        JSON.stringify(index.key),
        index.sparse ? "(sparse)" : ""
      );
    });
    console.log("");

    // Znajdź indeks invoiceNumber
    const invoiceNumberIndex = indexes.find(
      (idx) => idx.key.invoiceNumber !== undefined
    );

    if (invoiceNumberIndex) {
      console.log(`🔍 Znaleziono indeks: ${invoiceNumberIndex.name}`);
      console.log(`   Sparse: ${invoiceNumberIndex.sparse || false}`);
      console.log(`   Unique: ${invoiceNumberIndex.unique || false}\n`);

      // Jeśli indeks nie jest sparse, usuń go
      if (!invoiceNumberIndex.sparse) {
        console.log(`❌ Indeks nie jest sparse - usuwam stary indeks...`);
        await collection.dropIndex(invoiceNumberIndex.name);
        console.log(`✅ Usunięto indeks: ${invoiceNumberIndex.name}\n`);
      } else {
        console.log(`✅ Indeks jest już poprawny (sparse)\n`);
        await mongoose.disconnect();
        return;
      }
    } else {
      console.log("ℹ️  Nie znaleziono indeksu invoiceNumber\n");
    }

    // Utwórz nowy indeks sparse unique
    console.log("🔨 Tworzenie nowego indeksu sparse unique...");
    await collection.createIndex(
      { invoiceNumber: 1 },
      {
        unique: true,
        sparse: true,
        name: "invoiceNumber_sparse_unique",
      }
    );
    console.log("✅ Utworzono nowy indeks: invoiceNumber_sparse_unique\n");

    // Sprawdź ponownie indeksy
    console.log("📋 Sprawdzam indeksy po naprawie...");
    const newIndexes = await collection.indexes();
    const newInvoiceIndex = newIndexes.find(
      (idx) => idx.key.invoiceNumber !== undefined
    );

    if (newInvoiceIndex) {
      console.log(`✅ Nowy indeks: ${newInvoiceIndex.name}`);
      console.log(`   Sparse: ${newInvoiceIndex.sparse}`);
      console.log(`   Unique: ${newInvoiceIndex.unique}\n`);
    }

    console.log("🎉 Naprawa zakończona sukcesem!");
    console.log(
      "✅ Teraz możesz tworzyć wiele transakcji z invoiceNumber: null\n"
    );
  } catch (error) {
    console.error("❌ Błąd podczas naprawy indeksu:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Rozłączono z MongoDB");
  }
}

// Uruchom skrypt
fixInvoiceNumberIndex();
