const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkDatabaseImages() {
  console.log('🔍 Sprawdzanie zdjęć w bazie danych...\n');

  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('ads');

    // Pobierz kilka ogłoszeń z zdjęciami
    const ads = await collection.find({
      images: { $exists: true, $ne: [] }
    }).limit(3).toArray();

    console.log(`Znaleziono ${ads.length} ogłoszeń z zdjęciami:\n`);

    ads.forEach((ad, index) => {
      console.log(`=== OGŁOSZENIE ${index + 1} ===`);
      console.log(`ID: ${ad._id}`);
      console.log(`Brand: ${ad.brand} ${ad.model}`);
      console.log(`Status: ${ad.status}`);
      console.log(`Liczba zdjęć: ${ad.images ? ad.images.length : 0}`);
      
      if (ad.images && ad.images.length > 0) {
        console.log('Pierwsze zdjęcie:');
        const firstImage = ad.images[0];
        
        if (firstImage.startsWith('data:image')) {
          console.log('❌ BASE64 - długość:', firstImage.length);
          console.log('Początek:', firstImage.substring(0, 100) + '...');
        } else if (firstImage.startsWith('http')) {
          console.log('✅ URL:', firstImage);
        } else {
          console.log('❓ Nieznany format:', firstImage.substring(0, 100));
        }
        
        console.log(`MainImage: ${ad.mainImage ? (ad.mainImage.startsWith('data:') ? 'BASE64' : ad.mainImage) : 'BRAK'}`);
      }
      console.log('');
    });

    // Sprawdź statystyki typów zdjęć
    const totalAds = await collection.countDocuments({ images: { $exists: true, $ne: [] } });
    console.log(`\n📊 STATYSTYKI (${totalAds} ogłoszeń z zdjęciami):`);
    
    // Sprawdź ile ma base64
    const base64Count = await collection.countDocuments({
      'images.0': { $regex: '^data:image' }
    });
    
    // Sprawdź ile ma URL-e
    const urlCount = await collection.countDocuments({
      'images.0': { $regex: '^https?://' }
    });
    
    console.log(`Base64: ${base64Count} ogłoszeń`);
    console.log(`URL: ${urlCount} ogłoszeń`);
    console.log(`Inne: ${totalAds - base64Count - urlCount} ogłoszeń`);

  } catch (error) {
    console.error('❌ Błąd:', error);
  } finally {
    await client.close();
  }
}

checkDatabaseImages();
