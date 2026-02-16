/**
 * Script to fix the invoiceNumber index issue
 * This script will:
 * 1. Drop the incorrect unique index on invoiceNumber
 * 2. Create a proper sparse unique index
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function fixInvoiceNumberIndex() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("transactions");

    console.log("\n📋 Current indexes on transactions collection:");
    const indexes = await collection.indexes();
    indexes.forEach((index, i) => {
      console.log(
        `${i + 1}. ${index.name}:`,
        JSON.stringify(index.key),
        index.unique ? "(unique)" : "",
        index.sparse ? "(sparse)" : "",
      );
    });

    // Find the problematic index
    const problematicIndex = indexes.find(
      (idx) => idx.key.invoiceNumber && idx.unique && !idx.sparse,
    );

    if (problematicIndex) {
      console.log("\n❌ Found problematic index:", problematicIndex.name);
      console.log("   This index is unique but NOT sparse, causing the error");

      console.log("\n🗑️  Dropping incorrect index...");
      await collection.dropIndex(problematicIndex.name);
      console.log("✅ Dropped index:", problematicIndex.name);
    } else {
      console.log("\n⚠️  No problematic non-sparse unique index found");

      // Check if there's any invoiceNumber index
      const anyInvoiceIndex = indexes.find((idx) => idx.key.invoiceNumber);
      if (anyInvoiceIndex) {
        console.log("   Found invoiceNumber index:", anyInvoiceIndex.name);
        if (anyInvoiceIndex.unique && anyInvoiceIndex.sparse) {
          console.log("   ✅ This index is already correct (unique + sparse)");
        } else {
          console.log("   ⚠️  Dropping this index to recreate it properly...");
          await collection.dropIndex(anyInvoiceIndex.name);
          console.log("   ✅ Dropped index:", anyInvoiceIndex.name);
        }
      }
    }

    // Create the correct sparse unique index
    console.log("\n🔨 Creating correct sparse unique index...");
    await collection.createIndex(
      { invoiceNumber: 1 },
      {
        unique: true,
        sparse: true,
        name: "invoiceNumber_sparse_unique",
      },
    );
    console.log("✅ Created sparse unique index on invoiceNumber");

    console.log("\n📋 Updated indexes on transactions collection:");
    const updatedIndexes = await collection.indexes();
    updatedIndexes.forEach((index, i) => {
      console.log(
        `${i + 1}. ${index.name}:`,
        JSON.stringify(index.key),
        index.unique ? "(unique)" : "",
        index.sparse ? "(sparse)" : "",
      );
    });

    // Verify the fix
    const invoiceIndex = updatedIndexes.find((idx) => idx.key.invoiceNumber);
    if (invoiceIndex && invoiceIndex.unique && invoiceIndex.sparse) {
      console.log(
        "\n✅ SUCCESS! Index is now properly configured as sparse + unique",
      );
      console.log("   This allows multiple documents with invoiceNumber: null");
      console.log("   But ensures unique values for non-null invoiceNumbers");
    } else {
      console.log("\n❌ WARNING: Index may not be configured correctly");
    }

    console.log("\n✅ Fix completed successfully!");
  } catch (error) {
    console.error("\n❌ Error fixing index:", error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Run the fix
fixInvoiceNumberIndex()
  .then(() => {
    console.log("\n🎉 All done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Fatal error:", error);
    process.exit(1);
  });
