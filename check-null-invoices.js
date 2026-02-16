/**
 * Script to check for transactions with null invoiceNumber
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function checkNullInvoices() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("transactions");

    // Count all transactions
    const totalCount = await collection.countDocuments();
    console.log(`\n📊 Total transactions: ${totalCount}`);

    // Count transactions with null invoiceNumber
    const nullInvoiceCount = await collection.countDocuments({
      invoiceNumber: null,
    });
    console.log(`📊 Transactions with invoiceNumber: null: ${nullInvoiceCount}`);

    // Count transactions with non-null invoiceNumber
    const nonNullInvoiceCount = await collection.countDocuments({
      invoiceNumber: { $ne: null },
    });
    console.log(
      `📊 Transactions with non-null invoiceNumber: ${nonNullInvoiceCount}`,
    );

    // Show some examples of transactions with null invoiceNumber
    if (nullInvoiceCount > 0) {
      console.log("\n📋 Sample transactions with null invoiceNumber:");
      const samples = await collection
        .find({ invoiceNumber: null })
        .limit(5)
        .toArray();
      samples.forEach((tx, i) => {
        console.log(
          `  ${i + 1}. ID: ${tx._id}, transactionId: ${tx.transactionId}, status: ${tx.status}`,
        );
      });
    }

    // Show transactions with non-null invoiceNumber
    if (nonNullInvoiceCount > 0) {
      console.log("\n📋 Transactions with non-null invoiceNumber:");
      const nonNullSamples = await collection
        .find({ invoiceNumber: { $ne: null } })
        .toArray();
      nonNullSamples.forEach((tx, i) => {
        console.log(
          `  ${i + 1}. ID: ${tx._id}, invoiceNumber: ${tx.invoiceNumber}, status: ${tx.status}`,
        );
      });
    }

    console.log("\n✅ Check completed!");
  } catch (error) {
    console.error("\n❌ Error:", error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Run the check
checkNullInvoices()
  .then(() => {
    console.log("\n🎉 All done!");
    process.exit(0);
  })
  .catch((error) => {
