import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Załaduj zmienne środowiskowe
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Brak konfiguracji Supabase w zmiennych środowiskowych');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Skrypt do utworzenia tabeli car_images w Supabase
 * Uruchom: node scripts/createCarImagesTable.js
 */
async function createCarImagesTable() {
  console.log('🚀 Rozpoczynam tworzenie tabeli car_images...');

  try {
    // SQL do utworzenia tabeli car_images
    const createTableSQL = `
      -- Tworzenie tabeli car_images
      CREATE TABLE IF NOT EXISTS car_images (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        car_id VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        thumbnail_url TEXT,
        is_main BOOLEAN DEFAULT FALSE,
        file_size INTEGER,
        width INTEGER,
        height INTEGER,
        original_name VARCHAR(255),
        file_type VARCHAR(100),
        storage_path TEXT,
        bucket_name VARCHAR(100) DEFAULT 'autosell',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Indeksy dla lepszej wydajności
      CREATE INDEX IF NOT EXISTS idx_car_images_car_id ON car_images(car_id);
      CREATE INDEX IF NOT EXISTS idx_car_images_is_main ON car_images(is_main);
      CREATE INDEX IF NOT EXISTS idx_car_images_created_at ON car_images(created_at);

      -- Trigger do automatycznej aktualizacji updated_at
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      DROP TRIGGER IF EXISTS update_car_images_updated_at ON car_images;
      CREATE TRIGGER update_car_images_updated_at
        BEFORE UPDATE ON car_images
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

      -- RLS (Row Level Security) policies
      ALTER TABLE car_images ENABLE ROW LEVEL SECURITY;

      -- Policy: Wszyscy mogą czytać zdjęcia
      DROP POLICY IF EXISTS "Anyone can view car images" ON car_images;
      CREATE POLICY "Anyone can view car images" ON car_images
        FOR SELECT USING (true);

      -- Policy: Tylko uwierzytelnieni użytkownicy mogą dodawać zdjęcia
      DROP POLICY IF EXISTS "Authenticated users can insert car images" ON car_images;
      CREATE POLICY "Authenticated users can insert car images" ON car_images
        FOR INSERT WITH CHECK (auth.role() = 'authenticated');

      -- Policy: Tylko uwierzytelnieni użytkownicy mogą aktualizować zdjęcia
      DROP POLICY IF EXISTS "Authenticated users can update car images" ON car_images;
      CREATE POLICY "Authenticated users can update car images" ON car_images
        FOR UPDATE USING (auth.role() = 'authenticated');

      -- Policy: Tylko uwierzytelnieni użytkownicy mogą usuwać zdjęcia
      DROP POLICY IF EXISTS "Authenticated users can delete car images" ON car_images;
      CREATE POLICY "Authenticated users can delete car images" ON car_images
        FOR DELETE USING (auth.role() = 'authenticated');
    `;

    // Wykonaj SQL przez RPC (Remote Procedure Call)
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: createTableSQL
    });

    if (error) {
      // Jeśli RPC nie działa, spróbuj bezpośrednio przez SQL
      console.log('⚠️  RPC nie dostępne, próbuję alternatywną metodę...');
      
      // Alternatywnie, możemy użyć bezpośredniego SQL
      const { error: directError } = await supabase
        .from('car_images')
        .select('id')
        .limit(1);

      if (directError && directError.code === '42P01') {
        console.error('❌ Tabela nie istnieje i nie można jej utworzyć automatycznie.');
        console.log('📋 Skopiuj i wklej poniższy SQL do Supabase SQL Editor:');
        console.log('\n' + '='.repeat(80));
        console.log(createTableSQL);
        console.log('='.repeat(80) + '\n');
        return;
      }
    }

    console.log('✅ Tabela car_images została utworzona pomyślnie!');

    // Sprawdź czy tabela istnieje
    const { data: tableCheck, error: checkError } = await supabase
      .from('car_images')
      .select('id')
      .limit(1);

    if (checkError) {
      console.error('❌ Błąd sprawdzania tabeli:', checkError.message);
    } else {
      console.log('✅ Tabela car_images jest dostępna i gotowa do użycia!');
    }

    // Sprawdź czy bucket 'autosell' istnieje
    console.log('🗂️  Sprawdzam bucket autosell...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Błąd sprawdzania buckets:', bucketsError.message);
    } else {
      const autosellBucket = buckets.find(bucket => bucket.name === 'autosell');
      if (autosellBucket) {
        console.log('✅ Bucket autosell już istnieje!');
      } else {
        console.log('⚠️  Bucket autosell nie istnieje. Tworzę...');
        
        const { data: newBucket, error: createBucketError } = await supabase.storage
          .createBucket('autosell', {
            public: true,
            allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
            fileSizeLimit: 10485760 // 10MB
          });

        if (createBucketError) {
          console.error('❌ Błąd tworzenia bucket:', createBucketError.message);
          console.log('📋 Utwórz bucket "autosell" ręcznie w Supabase Storage');
        } else {
          console.log('✅ Bucket autosell został utworzony!');
        }
      }
    }

    console.log('\n🎉 Konfiguracja Supabase zakończona pomyślnie!');
    console.log('📝 Struktura tabeli car_images:');
    console.log('   - id (UUID, Primary Key)');
    console.log('   - car_id (VARCHAR, ID samochodu)');
    console.log('   - url (TEXT, URL głównego zdjęcia)');
    console.log('   - thumbnail_url (TEXT, URL miniaturki)');
    console.log('   - is_main (BOOLEAN, czy główne zdjęcie)');
    console.log('   - file_size (INTEGER, rozmiar pliku)');
    console.log('   - width, height (INTEGER, wymiary)');
    console.log('   - original_name (VARCHAR, oryginalna nazwa)');
    console.log('   - file_type (VARCHAR, typ MIME)');
    console.log('   - storage_path (TEXT, ścieżka w storage)');
    console.log('   - bucket_name (VARCHAR, nazwa bucket)');
    console.log('   - created_at, updated_at (TIMESTAMP)');

  } catch (error) {
    console.error('❌ Błąd podczas tworzenia tabeli:', error.message);
    console.log('\n📋 Jeśli automatyczne tworzenie nie działa, skopiuj poniższy SQL do Supabase:');
    console.log('\n' + '='.repeat(80));
    console.log(createTableSQL);
    console.log('='.repeat(80));
  }
}

// Uruchom skrypt
createCarImagesTable()
  .then(() => {
    console.log('\n✨ Skrypt zakończony!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Krytyczny błąd:', error);
    process.exit(1);
  });
