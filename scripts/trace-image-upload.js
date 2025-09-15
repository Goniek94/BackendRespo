import mongoose from 'mongoose';
import { createClient } from '@supabase/supabase-js';
import Ad from '../models/listings/ad.js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('🔍 ŚLEDZENIE ZDJĘĆ Z FORMULARZA DODAWANIA OGŁOSZEŃ');
console.log('================================================');

// Połączenie z MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Połączono z MongoDB');
  } catch (error) {
    console.error('❌ Błąd połączenia z MongoDB:', error.message);
    process.exit(1);
  }
};

// Połączenie z Supabase
let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Połączono z Supabase');
} else {
  console.log('❌ Brak konfiguracji Supabase');
}

async function traceImageUploads() {
  await connectDB();

  console.log('\n📊 ANALIZA OGŁOSZEŃ W MONGODB');
  console.log('==============================');

  try {
    // Pobierz wszystkie ogłoszenia z ostatnich 7 dni
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentAds = await Ad.find({
      createdAt: { $gte: sevenDaysAgo }
    }).sort({ createdAt: -1 }).limit(10);

    console.log(`Znaleziono ${recentAds.length} ogłoszeń z ostatnich 7 dni:`);

    for (const ad of recentAds) {
      console.log(`\n📝 Ogłoszenie: ${ad.brand} ${ad.model} (ID: ${ad._id})`);
      console.log(`   Utworzone: ${ad.createdAt}`);
      console.log(`   Właściciel: ${ad.ownerName} (${ad.ownerEmail})`);
      
      // Analiza zdjęć
      if (ad.images && ad.images.length > 0) {
        console.log(`   📸 Zdjęcia (${ad.images.length}):`);
        
        ad.images.forEach((imageUrl, index) => {
          console.log(`      ${index + 1}. ${imageUrl}`);
          
          // Sprawdź czy to URL z Supabase
          if (imageUrl.includes('supabase.co')) {
            console.log(`         ✅ SUPABASE URL`);
          } else if (imageUrl.startsWith('http')) {
            console.log(`         ⚠️  ZEWNĘTRZNY URL`);
          } else if (imageUrl.startsWith('/uploads')) {
            console.log(`         📁 LOKALNY PLIK`);
          } else {
            console.log(`         ❓ NIEZNANY FORMAT`);
          }
        });

        // Główne zdjęcie
        if (ad.mainImage) {
          console.log(`   🖼️  Główne zdjęcie: ${ad.mainImage}`);
          if (ad.mainImage.includes('supabase.co')) {
            console.log(`         ✅ SUPABASE URL`);
          }
        }
      } else {
        console.log(`   📸 Brak zdjęć`);
      }
    }

    // Sprawdź czy są ogłoszenia bez zdjęć
    const adsWithoutImages = await Ad.countDocuments({
      $or: [
        { images: { $exists: false } },
        { images: { $size: 0 } }
      ]
    });

    console.log(`\n📊 STATYSTYKI:`);
    console.log(`   Ogłoszenia bez zdjęć: ${adsWithoutImages}`);

    // Sprawdź różne typy URL-i zdjęć
    const allAds = await Ad.find({}).select('images mainImage').limit(100);
    
    let supabaseCount = 0;
    let localCount = 0;
    let externalCount = 0;
    let unknownCount = 0;

    allAds.forEach(ad => {
      if (ad.images) {
        ad.images.forEach(imageUrl => {
          if (imageUrl.includes('supabase.co')) {
            supabaseCount++;
          } else if (imageUrl.startsWith('/uploads')) {
            localCount++;
          } else if (imageUrl.startsWith('http')) {
            externalCount++;
          } else {
            unknownCount++;
          }
        });
      }
    });

    console.log(`   Zdjęcia Supabase: ${supabaseCount}`);
    console.log(`   Zdjęcia lokalne: ${localCount}`);
    console.log(`   Zdjęcia zewnętrzne: ${externalCount}`);
    console.log(`   Zdjęcia nieznane: ${unknownCount}`);

  } catch (error) {
    console.error('❌ Błąd podczas analizy:', error.message);
  }

  // Sprawdź Supabase Storage
  if (supabase) {
    console.log('\n📁 ANALIZA SUPABASE STORAGE');
    console.log('============================');

    try {
      // Sprawdź buckety
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.error('❌ Błąd pobierania bucketów:', bucketsError.message);
      } else {
        console.log('Dostępne buckety:', buckets.map(b => b.name));
        
        // Sprawdź bucket autosell
        const autosellBucket = buckets.find(b => b.name === 'autosell');
        if (autosellBucket) {
          console.log('✅ Bucket "autosell" istnieje');
          
          // Pobierz listę plików
          const { data: files, error: filesError } = await supabase.storage
            .from('autosell')
            .list('', { limit: 20, sortBy: { column: 'created_at', order: 'desc' } });
          
          if (filesError) {
            console.error('❌ Błąd pobierania plików:', filesError.message);
          } else {
            console.log(`📁 Najnowsze pliki w bucket (${files.length}):`);
            
            files.forEach((file, index) => {
              if (file.name && !file.name.endsWith('/')) {
                console.log(`   ${index + 1}. ${file.name}`);
                console.log(`      Rozmiar: ${file.metadata?.size || 'nieznany'} bytes`);
                console.log(`      Utworzony: ${file.created_at || 'nieznana data'}`);
                
                // Sprawdź czy plik jest używany w ogłoszeniach
                const publicUrl = supabase.storage.from('autosell').getPublicUrl(file.name).data.publicUrl;
                console.log(`      URL: ${publicUrl}`);
              }
            });
          }
        } else {
          console.log('❌ Bucket "autosell" nie istnieje');
        }
      }
    } catch (error) {
      console.error('❌ Błąd Supabase Storage:', error.message);
    }
  }

  // Sprawdź folder uploads lokalnie
  console.log('\n📂 ANALIZA LOKALNEGO FOLDERU UPLOADS');
  console.log('====================================');
  
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    const uploadsPath = './uploads';
    
    if (fs.existsSync(uploadsPath)) {
      const files = fs.readdirSync(uploadsPath, { recursive: true });
      console.log(`Znaleziono ${files.length} plików w folderze uploads:`);
      
      files.slice(0, 10).forEach((file, index) => {
        const filePath = path.join(uploadsPath, file);
        const stats = fs.statSync(filePath);
        console.log(`   ${index + 1}. ${file} (${stats.size} bytes, ${stats.mtime})`);
      });
      
      if (files.length > 10) {
        console.log(`   ... i ${files.length - 10} więcej plików`);
      }
    } else {
      console.log('❌ Folder uploads nie istnieje');
    }
  } catch (error) {
    console.log('⚠️  Nie można sprawdzić folderu uploads:', error.message);
  }

  console.log('\n🔍 PODSUMOWANIE ŚLEDZENIA');
  console.log('=========================');
  console.log('1. Sprawdź powyższe wyniki, aby zobaczyć gdzie trafiają zdjęcia');
  console.log('2. Jeśli zdjęcia trafiają do Supabase - system działa poprawnie');
  console.log('3. Jeśli zdjęcia trafiają do /uploads - używany jest stary system');
  console.log('4. Sprawdź routing i kontrolery, aby zidentyfikować problem');

  await mongoose.disconnect();
  console.log('\n✅ Analiza zakończona');
}

traceImageUploads().catch(console.error);
