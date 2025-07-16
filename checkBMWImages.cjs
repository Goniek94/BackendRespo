const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://mateusz:Mateusz123@cluster0.mongodb.net/marketplace?retryWrites=true&w=majority';

async function checkBMWImages() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Połączono z MongoDB');
    
    const db = client.db('marketplace');
    const collection = db.collection('ads');
    
    const bmwAd = await collection.findOne({ brand: 'BMW' });
    
    if (bmwAd) {
      console.log('=== BMW OGŁOSZENIE ===');
      console.log('ID:', bmwAd._id);
      console.log('Brand:', bmwAd.brand);
      console.log('Model:', bmwAd.model);
      console.log('Images:');
      bmwAd.images.forEach((img, index) => {
        console.log(`  [${index + 1}] ${img}`);
        if (img.includes('localhost')) {
          console.log('    ❌ LOCALHOST DETECTED!');
        } else if (img.includes('supabase.co')) {
          console.log('    ✅ Supabase URL');
        } else {
          console.log('    ⚠️ Other URL type');
        }
      });
      console.log('MainImage:', bmwAd.mainImage);
      if (bmwAd.mainImage && bmwAd.mainImage.includes('localhost')) {
        console.log('❌ MAIN IMAGE IS LOCALHOST!');
      } else if (bmwAd.mainImage && bmwAd.mainImage.includes('supabase.co')) {
        console.log('✅ Main image is Supabase URL');
      }
    } else {
      console.log('Nie znaleziono ogłoszenia BMW');
    }
  } finally {
    await client.close();
  }
}

checkBMWImages().catch(console.error);
