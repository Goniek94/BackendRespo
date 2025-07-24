import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Ad from './models/ad.js';

dotenv.config();

async function checkAds() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Połączono z MongoDB');
    
    const adsCount = await Ad.countDocuments();
    console.log('📊 Liczba ogłoszeń w bazie:', adsCount);
    
    if (adsCount > 0) {
      const sampleAds = await Ad.find().limit(3).select('title brand model price status createdAt');
      console.log('📋 Przykładowe ogłoszenia:');
      sampleAds.forEach((ad, index) => {
        console.log(`${index + 1}. ${ad.title || 'Brak tytułu'} - ${ad.brand} ${ad.model} - ${ad.price}zł - Status: ${ad.status}`);
      });
    }
    
    // Sprawdź kolekcje w bazie
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📁 Dostępne kolekcje:', collections.map(c => c.name));
    
    // Sprawdź indeksy kolekcji ads
    const indexes = await Ad.collection.getIndexes();
    console.log('🔍 Indeksy kolekcji ads:', Object.keys(indexes));
    
    await mongoose.disconnect();
    console.log('✅ Rozłączono z MongoDB');
  } catch (error) {
    console.error('❌ Błąd:', error.message);
    console.error('Stack:', error.stack);
  }
}

checkAds();
