import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function checkAd() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Połączono z MongoDB');
    
    const Ad = mongoose.model('Ad', new mongoose.Schema({}, { strict: false }), 'ads');
    
    // Znajdź pierwsze ogłoszenie z obrazkami
    const ad = await Ad.findOne({ images: { $exists: true, $ne: [] } });
    
    if (ad) {
      console.log('=== PRZYKŁADOWE OGŁOSZENIE ===');
      console.log('ID:', ad._id);
      console.log('Brand:', ad.brand);
      console.log('Model:', ad.model);
      console.log('Status:', ad.status);
      console.log('Images:', ad.images);
      console.log('MainImage:', ad.mainImage);
      console.log('Liczba obrazków:', ad.images ? ad.images.length : 0);
      
      if (ad.images && ad.images.length > 0) {
        console.log('\n=== ANALIZA OBRAZKÓW ===');
        ad.images.forEach((img, index) => {
          console.log(`Obrazek ${index + 1}:`, img);
          if (img.startsWith('data:')) {
            console.log('  -> To jest base64 data URL');
          } else if (img.startsWith('http')) {
            console.log('  -> To jest pełny URL');
          } else {
            console.log('  -> To jest relatywna ścieżka');
          }
        });
      }
    } else {
      console.log('Nie znaleziono ogłoszeń z obrazkami');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Błąd:', error);
  }
}

checkAd();
