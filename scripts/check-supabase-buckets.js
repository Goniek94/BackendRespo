import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl =
  process.env.SUPABASE_URL || "https://zcxakmniknrtvtnyetxd.supabase.co";
const supabaseKey =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjeGFrbW5pa25ydHZ0bnlldHhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0NzEzNzgsImV4cCI6MjA2NzA0NzM3OH0.b7YK5XZMHsS4s3RHGw3rvcmdlV_kjHbxXVF9jB8UO4w";

console.log("🔍 Sprawdzam konfigurację Supabase...");
console.log("📍 URL:", supabaseUrl);
console.log("🔑 Klucz:", supabaseKey.substring(0, 20) + "...");

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBuckets() {
  try {
    console.log("\n📦 Pobieranie listy bucketów...");

    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      console.error("❌ BŁĄD podczas pobierania bucketów:");
      console.error("  - Message:", error.message);
      console.error("  - Details:", error);
      return;
    }

    if (!buckets || buckets.length === 0) {
      console.log("⚠️  BRAK BUCKETÓW w Supabase Storage!");
      console.log("\n📋 MUSISZ RĘCZNIE UTWORZYĆ BUCKETY:");
      console.log("1. Otwórz https://app.supabase.com");
      console.log("2. Wybierz projekt");
      console.log("3. Przejdź do Storage");
      console.log("4. Utwórz buckety:");
      console.log("   - 'autosell' (dla zdjęć ogłoszeń)");
      console.log("   - 'comments' (dla zdjęć komentarzy)");
      console.log("5. ZAZNACZ 'Public bucket' dla obu");
      return;
    }

    console.log(`\n✅ Znaleziono ${buckets.length} bucket(ów):\n`);

    buckets.forEach((bucket, index) => {
      console.log(`${index + 1}. 📦 Nazwa: "${bucket.name}"`);
      console.log(`   🔓 Publiczny: ${bucket.public ? "TAK ✅" : "NIE ❌"}`);
      console.log(`   📅 Utworzony: ${bucket.created_at}`);
      console.log(`   🆔 ID: ${bucket.id}`);
      console.log("");
    });

    // Sprawdź specyficzne buckety
    const autosellBucket = buckets.find((b) => b.name === "autosell");
    const commentsBucket = buckets.find((b) => b.name === "comments");

    console.log("🔍 Sprawdzam wymagane buckety:\n");

    if (autosellBucket) {
      console.log("✅ Bucket 'autosell' istnieje");
      console.log(`   🔓 Publiczny: ${autosellBucket.public ? "TAK" : "NIE"}`);
    } else {
      console.log(
        "❌ Bucket 'autosell' NIE istnieje - potrzebny dla zdjęć ogłoszeń"
      );
    }

    if (commentsBucket) {
      console.log("✅ Bucket 'comments' istnieje");
      console.log(`   🔓 Publiczny: ${commentsBucket.public ? "TAK" : "NIE"}`);
    } else {
      console.log(
        "❌ Bucket 'comments' NIE istnieje - potrzebny dla zdjęć komentarzy"
      );
    }

    if (!autosellBucket || !commentsBucket) {
      console.log("\n⚠️  AKCJA WYMAGANA:");
      console.log("Utwórz brakujące buckety w Supabase Dashboard:");
      console.log("https://app.supabase.com → Storage → New bucket");
      if (!autosellBucket) console.log("  - Nazwa: 'autosell', Public: TAK");
      if (!commentsBucket) console.log("  - Nazwa: 'comments', Public: TAK");
    } else {
      console.log("\n🎉 Wszystkie wymagane buckety są skonfigurowane!");
    }
  } catch (error) {
    console.error("\n❌ BŁĄD:", error);
    console.error("Stack:", error.stack);
  }
}

checkBuckets()
  .then(() => {
    console.log("\n✅ Sprawdzanie zakończone");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Błąd:", error);
    process.exit(1);
  });
