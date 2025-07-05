// Skrypt do aktualizacji statusu ogłoszeń z 'active' na 'opublikowane'
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Ad from './models/ad.js';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI;

async function updateAdStatus() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Połączono z bazą danych MongoDB');
    
    // Znajdź wszystkie ogłoszenia ze statusem 'active'
    const activeAds = await Ad.find({ status: 'active' });
    console.log(`Znaleziono ${activeAds.length} ogłoszeń ze statusem 'active'`);
    
    // Aktualizuj status na 'opublikowane'
    const updateResult = await Ad.updateMany(
      { status: 'active' },
      { $set: { status: 'opublikowane' } }
    );
    
    console.log(`Zaktualizowano ${updateResult.modifiedCount} ogłoszeń ze statusu 'active' na 'opublikowane'`);
    
    await mongoose.disconnect();
    console.log('Rozłączono z bazą danych MongoDB');
  } catch (err) {
    console.error('Błąd podczas aktualizacji statusu ogłoszeń:', err);
    process.exit(1);
  }
}

updateAdStatus();
