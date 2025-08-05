import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Ad from '../models/listings/ad.js';

dotenv.config();

async function deleteAds() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Połączono z MongoDB');
    
    // Najpierw pokaż wszystkie ogłoszenia
    const allAds = await Ad.find().select('_id title brand model price status createdAt');
    console.log('\n📋 Wszystkie ogłoszenia w bazie:');
    allAds.forEach((ad, index) => {
      console.log(`${index + 1}. ID: ${ad._id} - ${ad.title || 'Brak tytułu'} - ${ad.brand} ${ad.model} - ${ad.price}zł - Status: ${ad.status}`);
    });
    
    console.log(`\n📊 Łącznie ogłoszeń: ${allAds.length}`);
    
    // Usuń wszystkie ogłoszenia (możesz zmienić warunki)
    console.log('\n🗑️ Usuwanie wszystkich ogłoszeń...');
    const deleteResult = await Ad.deleteMany({});
    console.log(`✅ Usunięto ${deleteResult.deletedCount} ogłoszeń`);
    
    // Sprawdź czy zostały jakieś ogłoszenia
    const remainingCount = await Ad.countDocuments();
    console.log(`📊 Pozostało ogłoszeń: ${remainingCount}`);
    
    await mongoose.disconnect();
    console.log('✅ Rozłączono z MongoDB');
  } catch (error) {
    console.error('❌ Błąd:', error.message);
    console.error('Stack:', error.stack);
  }
}

deleteAds();
