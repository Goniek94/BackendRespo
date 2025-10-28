import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl =
  process.env.SUPABASE_URL || "https://zcxakmniknrtvtnyetxd.supabase.co";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjeGFrbW5pa25ydHZ0bnlldHhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0NzEzNzgsImV4cCI6MjA2NzA0NzM3OH0.b7YK5XZMHsS4s3RHGw3rvcmdlV_kjHbxXVF9jB8UO4w";

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupBucket() {
  const bucketName = "comments";

  console.log("🔍 Sprawdzanie czy bucket istnieje...");

  // Check if bucket exists
  const { data: buckets, error: listError } =
    await supabase.storage.listBuckets();

  if (listError) {
    console.error("❌ Błąd podczas sprawdzania buckets:", listError);
    return;
  }

  const bucketExists = buckets.some((b) => b.name === bucketName);

  if (bucketExists) {
    console.log("✅ Bucket 'comments' już istnieje!");

    // Check if it's public
    const bucket = buckets.find((b) => b.name === bucketName);
    if (bucket.public) {
      console.log("✅ Bucket jest publiczny");
    } else {
      console.log(
        "⚠️  Bucket NIE jest publiczny - musisz to zmienić w Dashboard"
      );
    }
    return;
  }

  console.log("⚠️  Bucket nie istnieje. Próba utworzenia...");

  // Try to create bucket
  const { data: newBucket, error: createError } =
    await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    });

  if (createError) {
    console.error("\n❌ Błąd podczas tworzenia bucketa:", createError.message);
    console.log("\n📋 MUSISZ RĘCZNIE UTWORZYĆ BUCKET W SUPABASE DASHBOARD:");
    console.log("1. Otwórz https://app.supabase.com");
    console.log("2. Wybierz swój projekt");
    console.log("3. Przejdź do Storage");
    console.log("4. Kliknij 'New bucket'");
    console.log("5. Nazwa: comments");
    console.log("6. ✅ ZAZNACZ 'Public bucket'");
    console.log("7. File size limit: 5MB");
    console.log("8. Allowed MIME types: image/*");
    console.log("\n📖 Pełna instrukcja w: SUPABASE_COMMENTS_SETUP.md\n");
    return;
  }

  console.log("✅ Bucket 'comments' utworzony pomyślnie!");
  console.log("\n📋 NASTĘPNE KROKI:");
  console.log("1. Sprawdź czy bucket jest publiczny w Dashboard");
  console.log(
    "2. Skonfiguruj polityki RLS (szczegóły w SUPABASE_COMMENTS_SETUP.md)"
  );
  console.log("3. Zrestartuj backend");
}

// Run the setup
setupBucket()
  .then(() => {
    console.log("\n✅ Setup zakończony");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Błąd:", error);
    process.exit(1);
  });
