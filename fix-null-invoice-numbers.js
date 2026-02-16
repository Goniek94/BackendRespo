/**
 * Script to fix null invoiceNumber values in transactions
 * The problem: sparse index only works when field is MISSING, not when it's null
 * Solution: Remove the invoiceNumber field from documents where it's null
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function fixNullInvoiceNumbers() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("transactions");

    // Count documents with invoiceNumber: null
    console.log("\n📊 Checking for documents with invoiceNumber: null...");
    const nullCount = await collection.countDocuments({
      invoiceNumber: null,
    });
    console.log(`   Found ${nullCount} documents with invoiceNumber: null`);

    // Count documents with invoiceNumber field (including null)
    const withFieldCount = await collection.countDocuments({
      invoiceNumber: { $exists: true },
    });
    console.log(
      `   Found ${withFieldCount} documents with invoiceNumber field (including null)`,
    );

    // Count documents without invoiceNumber field
    const withoutFieldCount = await collection.countDocuments({
      invoiceNumber: { $exists: false },
    });
    console.log(
      `   Found ${withoutFieldCount} documents without invoiceNumber field`,
    );

    if (nullCount > 0) {
      console.log(
        "\n🔧 Removing invoiceNumber field from documents where it's null...",
      );
      console.log(
        "   (This allows sparse index to work correctly - it only indexes when field exists AND is not null)",
      );

      const result = await collection.updateMany(
        { invoiceNumber: null },
        { $unset: { invoiceNumber: "" } },
      );

      console.log(`✅ Updated ${result.modifiedCount} documents`);
      console.log(
        `   Removed invoiceNumber field from ${result.modifiedCount} documents`,
      );
    } else {
      console.log("\n✅ No documents with invoiceNumber: null found");
    }

    // Verify the fix
    console.log("\n📊 Verification after fix:");
    const nullCountAfter = await collection.countDocuments({
      invoiceNumber: null,
    });
    const withFieldCountAfter = await collection.countDocuments({
      invoiceNumber: { $exists: true },
    });
    const withoutFieldCountAfter = await collection.countDocuments({
      invoiceNumber: { $exists: false },
    });

    console.log(`   Documents with invoiceNumber: null: ${nullCountAfter}`);
    console.log(
      `   Documents with invoiceNumber field: ${withFieldCountAfter}`,
    );
    console.log(
      `   Documents without invoiceNumber field: ${withoutFieldCountAfter}`,
    );

    if (nullCountAfter === 0) {
      console.log("\n✅ SUCCESS! All null invoiceNumbers have been removed");
      console.log(
        "   The sparse unique index will now work correctly for new documents",
      );
    } else {
      console.log(
        "\n⚠️  WARNING: Some documents still have invoiceNumber: null",
      );
    }

    // Show sample documents
    console.log("\n📋 Sample documents:");
    const samples = await collection
      .find({})
      .limit(3)
      .project({ _id: 1, transactionId: 1, invoiceNumber: 1 })
      .toArray();

    samples.forEach((doc, i) => {
      console.log(`   ${i + 1}. Transaction ${doc.transactionId}:`);
      console.log(
        `      invoiceNumber: ${doc.invoiceNumber !== undefined ? doc.invoiceNumber : "FIELD NOT PRESENT"}`,
      );
    });

    console.log("\n✅ Fix completed successfully!");
  } catch (error) {
    console.error("\n❌ Error fixing null invoice numbers:", error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Run the fix
fixNullInvoiceNumbers()
  .then(() => {
    console.log("\n🎉 All done!");
    console.log(
      "\n💡 TIP: Make sure your code doesn't set invoiceNumber: null",
    );
    console.log("   Instead, don't include the field at all in new documents");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Fatal error:", error);
    process.exit(1);
  });
