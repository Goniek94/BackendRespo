const { MongoClient } = require('mongodb');
require('dotenv').config();

async function cleanupBase64Images() {
  console.log('🧹 Czyszczenie obrazów base64 z bazy danych...\n');

  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('ads');

    // Znajdź ogłoszenia z base64
    const adsWithBase64 = await collection.find({
      $or: [
        { 'images.0': { $regex: '^data:image' } },
        { 'mainImage': { $regex: '^data:image' } }
      ]
    }).toArray();

    console.log(`Znaleziono ${adsWithBase64.length} ogłoszeń z obrazami base64:\n`);

    for (const ad of adsWithBase64) {
      console.log(`=== ${ad.brand} ${ad.model} (${ad._id}) ===`);
      
      let hasBase64Images = false;
      let hasBase64MainImage = false;
      
      // Sprawdź images array
      if (ad.images && ad.images.length > 0) {
        const base64Count = ad.images.filter(img => img.startsWith('data:image')).length;
        const urlCount = ad.images.filter(img => img.startsWith('http')).length;
        
        console.log(`Images: ${base64Count} base64, ${urlCount} URL`);
        hasBase64Images = base64Count > 0;
      }
      
      // Sprawdź mainImage
      if (ad.mainImage && ad.mainImage.startsWith('data:image')) {
        console.log('MainImage: base64');
        hasBase64MainImage = true;
      } else if (ad.mainImage && ad.mainImage.startsWith('http')) {
        console.log('MainImage: URL');
      }

      // Przygotuj aktualizację
      const updateData = {};
      
      if (hasBase64Images) {
        // Usuń wszystkie base64, zostaw tylko URL-e
        const validImages = ad.images.filter(img => 
          img && (img.startsWith('http') || img.startsWith('https'))
        );
        
        if (validImages.length > 0) {
          updateData.images = validImages;
          console.log(`✅ Zostanie ${validImages.length} obrazów URL`);
        } else {
          updateData.images = [];
          console.log('❌ Brak obrazów URL - zostanie puste');
        }
      }
      
      if (hasBase64MainImage) {
        // Usuń base64 mainImage
        const validImages = ad.images ? ad.images.filter(img => 
          img && (img.startsWith('http') || img.startsWith('https'))
        ) : [];
        
        if (validImages.length > 0) {
          updateData.mainImage = validImages[0];
          console.log('✅ MainImage ustawiony na pierwszy URL');
        } else {
          updateData.mainImage = '';
          console.log('❌ MainImage usunięty - brak URL');
        }
      }

      // Wykonaj aktualizację
      if (Object.keys(updateData).length > 0) {
        await collection.updateOne(
          { _id: ad._id },
          { $set: updateData }
        );
        console.log('✅ Zaktualizowano\n');
      } else {
        console.log('⚠️ Brak zmian\n');
      }
    }

    // Podsumowanie po czyszczeniu
    const remainingBase64 = await collection.countDocuments({
      $or: [
        { 'images.0': { $regex: '^data:image' } },
        { 'mainImage': { $regex: '^data:image' } }
      ]
    });

    const totalWithImages = await collection.countDocuments({
      images: { $exists: true, $ne: [] }
    });

    const urlOnlyAds = await collection.countDocuments({
      'images.0': { $regex: '^https?://' }
    });

    console.log('📊 PODSUMOWANIE PO CZYSZCZENIU:');
    console.log(`Pozostałe base64: ${remainingBase64}`);
    console.log(`Ogłoszenia z obrazami: ${totalWithImages}`);
    console.log(`Ogłoszenia tylko z URL: ${urlOnlyAds}`);

  } catch (error) {
    console.error('❌ Błąd:', error);
  } finally {
    await client.close();
  }
}

cleanupBase64Images();
