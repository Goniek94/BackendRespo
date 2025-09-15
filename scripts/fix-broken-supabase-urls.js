import { createClient } from '@supabase/supabase-js';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixBrokenSupabaseUrls() {
  console.log('🔧 Naprawianie uszkodzonych URL-i Supabase...\n');

  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('ads');

    // Pobierz ogłoszenia z URL-ami Supabase
    const adsWithUrls = await collection.find({
      'images.0': { $regex: '^https://.*supabase.*' }
    }).toArray();

    console.log(`Znaleziono ${adsWithUrls.length} ogłoszeń z URL-ami Supabase:\n`);

    for (const ad of adsWithUrls) {
      console.log(`=== ${ad.brand} ${ad.model} (${ad._id}) ===`);
      
      const brokenImages = [];
      const workingImages = [];
      
      // Sprawdź każdy obraz
      for (let i = 0; i < ad.images.length; i++) {
        const imageUrl = ad.images[i];
        console.log(`Sprawdzanie: ${imageUrl}`);
        
        try {
          const response = await fetch(imageUrl, { method: 'HEAD' });
          
          if (response.ok) {
            console.log(`✅ OK (${response.status})`);
            workingImages.push(imageUrl);
          } else {
            console.log(`❌ Błąd (${response.status})`);
            brokenImages.push(imageUrl);
          }
        } catch (error) {
          console.log(`❌ Błąd połączenia: ${error.message}`);
          brokenImages.push(imageUrl);
        }
      }
      
      console.log(`Działające: ${workingImages.length}, Uszkodzone: ${brokenImages.length}`);
      
      // Jeśli są uszkodzone obrazy, usuń je
      if (brokenImages.length > 0) {
        const updateData = {};
        
        if (workingImages.length > 0) {
          updateData.images = workingImages;
          updateData.mainImage = workingImages[0];
          console.log(`✅ Zostanie ${workingImages.length} działających obrazów`);
        } else {
          updateData.images = [];
          updateData.mainImage = '';
          console.log('❌ Brak działających obrazów - zostanie puste');
        }
        
        await collection.updateOne(
          { _id: ad._id },
          { $set: updateData }
        );
        console.log('✅ Zaktualizowano');
      } else {
        console.log('✅ Wszystkie obrazy działają');
      }
      
      console.log('');
    }

    // Sprawdź pliki w bucket Supabase
    console.log('📁 Sprawdzanie plików w bucket Supabase...');
    
    const { data: files, error: listError } = await supabase.storage
      .from('autosell')
      .list('', { limit: 20 });

    if (listError) {
      console.error('❌ Błąd listowania plików:', listError.message);
    } else {
      console.log(`✅ Znaleziono ${files.length} plików w bucket:`);
      files.forEach(file => {
        console.log(`  - ${file.name} (${file.metadata?.size || 'unknown'} bytes)`);
      });
    }

  } catch (error) {
    console.error('❌ Błąd:', error);
  } finally {
    await client.close();
  }
}

fixBrokenSupabaseUrls();
