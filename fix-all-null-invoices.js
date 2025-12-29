/**
 * Skrypt do naprawy WSZYSTKICH transakcji z invoiceNumber: null
 *
 * Problem: Indeks sparse unique pozwala tylko na JEDNĄ wartość null
 * Rozwiązanie: Usuń pole invoiceNumber ze wszystkich transakcji które go nie potrzebują
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/MarketplaceDB";

async function fixAllNullInvoices() {
  try {
    console.log("🔧 Naprawa wszystkich transakcji z invoiceNumber: null...\n");

    await mongoose.connect(MONGODB_URI);
    console.log("✅ Połączono z MongoDB\n");

    const db = mongoose.connection.db;
    const collection = db.collection("transactions");

    // Znajdź wszystkie transakcje z invoiceNumber: null
    console.log("🔍 Szukam transakcji z invoiceNumber: null...");
    const transactionsWithNull = await collection
      .find({ invoiceNumber: null })
      .toArray();

    console.log(
      `📊 Znaleziono ${transactionsWithNull.length} transakcji z invoiceNumber: null\n`
    );

    if (transactionsWithNull.length === 0) {
      console.log("✅ Brak transakcji do naprawy");
      await mongoose.disconnect();
      return;
    }

    // Wyświetl szczegóły
    transactionsWithNull.forEach((t, index) => {
      console.log(`${index + 1}. ID: ${t._id}`);
      console.log(`   Status: ${t.status}`);
      console.log(`   Typ: ${t.type}`);
      console.log(`   Data: ${t.createdAt}`);
      console.log(`   invoiceRequested: ${t.invoiceRequested}`);
      console.log(`   invoiceGenerated: ${t.invoiceGenerated}`);
      console.log("");
    });

    // ROZWIĄZANIE: Usuń pole invoiceNumber ze wszystkich transakcji które go nie potrzebują
    console.log("🔨 Usuwam pole invoiceNumber z transakcji...");

    const result = await collection.updateMany(
      { invoiceNumber: null },
      { $unset: { invoiceNumber: "" } }
    );

    console.log(`✅ Zaktualizowano ${result.modifiedCount} transakcji\n`);

    // Sprawdź ponownie
    console.log("📋 Sprawdzam stan po naprawie...");
    const remainingNull = await collection.countDocuments({
      invoiceNumber: null,
    });
    console.log(`Transakcji z invoiceNumber: null: ${remainingNull}`);

    const withInvoiceNumber = await collection.countDocuments({
      invoiceNumber: { $exists: true, $ne: null },
    });
    console.log(`Transakcji z numerem faktury: ${withInvoiceNumber}`);

    const withoutField = await collection.countDocuments({
      invoiceNumber: { $exists: false },
    });
    console.log(`Transakcji bez pola invoiceNumber: ${withoutField}\n`);

    console.log("🎉 Naprawa zakończona sukcesem!");
    console.log("✅ Teraz możesz tworzyć nowe transakcje bez błędów\n");
  } catch (error) {
    console.error("❌ Błąd podczas naprawy:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Rozłączono z MongoDB");
  }
}

fixAllNullInvoices();
