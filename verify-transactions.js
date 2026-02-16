/**
 * Script to verify transactions collection state
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function verifyTransactions() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;
    const collection = db.collection("transactions");

    // Get all documents
    console.log("📊 Analyzing all transactions...\n");
    const allDocs = await collection.find({}).toArray();

    console.log(`Total documents: ${allDocs.length}\n`);

    allDocs.forEach((doc, i) => {
      console.log(`${i + 1}. Transaction ${doc.transactionId}:`);
      console.log(`   _id: ${doc._id}`);
      console.log(
        `   invoiceNumber field exists: ${doc.hasOwnProperty("invoiceNumber")}`,
      );
      console.log(
        `   invoiceNumber value: ${JSON.stringify(doc.invoiceNumber)}`,
      );
      console.log(`   status: ${doc.status}`);
      console.log("");
    });

    // Check index
    console.log("\n📋 Indexes:");
    const indexes = await collection.indexes();
    const invoiceIndex = indexes.find((idx) => idx.key.invoiceNumber);
    if (invoiceIndex) {
      console.log("   invoiceNumber index:", JSON.stringify(invoiceIndex));
    } else {
      console.log("   ⚠️  No invoiceNumber index found!");
    }

    console.log("\n✅ Verification complete!");
  } catch (error) {
    console.error("\n❌ Error:", error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

verifyTransactions()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Fatal error:", error);
    process.exit(1);
  });
