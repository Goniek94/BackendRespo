/**
 * Script to check Supabase messages folder contents
 * Run with: node check-supabase-messages.js
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config(); // Uses default .env file

const supabaseUrl = process.env.SUPABASE_URL;
// Use SERVICE_ROLE_KEY for full access (can list files)
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const bucketName = "autosell";

console.log(
  "Using key type:",
  process.env.SUPABASE_SERVICE_ROLE_KEY ? "SERVICE_ROLE" : "ANON"
);

console.log("=== SUPABASE MESSAGES FOLDER CHECK ===\n");

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ SUPABASE_URL or SUPABASE_ANON_KEY not configured!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllContents(path = "", depth = 0) {
  const indent = "  ".repeat(depth);

  const { data, error } = await supabase.storage
    .from(bucketName)
    .list(path, { limit: 100 });

  if (error) {
    console.error(
      `${indent}❌ Error listing ${path || "root"}:`,
      error.message
    );
    return;
  }

  if (!data || data.length === 0) {
    console.log(`${indent}(empty)`);
    return;
  }

  for (const item of data) {
    const fullPath = path ? `${path}/${item.name}` : item.name;

    // Check if it's a folder (no id means it's a folder in Supabase)
    if (item.id === null) {
      console.log(`${indent}📁 ${item.name}/`);
      // Recursively list folder contents
      await listAllContents(fullPath, depth + 1);
    } else {
      // It's a file
      const sizeKB = item.metadata?.size
        ? Math.round(item.metadata.size / 1024)
        : "?";
      console.log(
        `${indent}📄 ${item.name} (${sizeKB} KB) - ${
          item.metadata?.mimetype || "unknown"
        }`
      );
    }
  }
}

async function main() {
  console.log("📂 Checking 'messages' folder in bucket:", bucketName);
  console.log("─".repeat(50));

  // First check root level
  console.log("\n📂 ROOT LEVEL:");
  const { data: rootData, error: rootError } = await supabase.storage
    .from(bucketName)
    .list("", { limit: 100 });

  if (rootError) {
    console.error("❌ Error:", rootError.message);
    return;
  }

  // Show root folders
  const folders = rootData.filter((item) => item.id === null);
  const files = rootData.filter((item) => item.id !== null);

  console.log(
    `Found ${folders.length} folders and ${files.length} files at root level`
  );

  folders.forEach((f) => console.log(`  📁 ${f.name}/`));
  files.slice(0, 5).forEach((f) => console.log(`  📄 ${f.name}`));
  if (files.length > 5) console.log(`  ... and ${files.length - 5} more files`);

  // Check messages folder specifically
  console.log("\n📂 MESSAGES FOLDER CONTENTS:");
  console.log("─".repeat(50));

  await listAllContents("messages", 0);

  console.log("\n=== CHECK COMPLETE ===");
}

main().catch(console.error);
