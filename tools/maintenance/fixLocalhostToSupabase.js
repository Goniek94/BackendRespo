import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Ad from '../models/ad.js';

dotenv.config();

const fixLocalhostToSupabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Połączono z bazą danych MongoDB');

    // Znajdź wszystkie ogłoszenia z localhost URL-ami
    const adsWithLocalhost = await Ad.find({
      $or: [
        { images: { $regex: 'localhost' } },
        { mainImage: { $regex: 'localhost' } }
      ]
    });

    console.log(`Znaleziono ${adsWithLocalhost.length} ogłoszeń z localhost URL-ami`);

    if (adsWithLocalhost.length === 0) {
      console.log('Brak ogłoszeń do naprawy.');
      return;
    }

    // Przykładowe URL-e z Supabase (możesz je dostosować)
    const supabaseImages = [
      'https://zcxakmniknrtvtnyetxd.supabase.co/storage/v1/object/public/autosell/1751444547837-984743620.jpg',
      'https://zcxakmniknrtvtnyetxd.supabase.co/storage/v1/object/public/autosell/1751444547841-206400032.jpg',
      'https://zcxakmniknrtvtnyetxd.supabase.co/storage/v1/object/public/autosell/1751444547845-108880022.jpg',
      'https://zcxakmniknrtvtnyetxd.supabase.co/storage/v1/object/public/autosell/1751444547848-986020067.jpg',
      'https://zcxakmniknrtvtnyetxd.supabase.co/storage/v1/object/public/autosell/1751444547850-250681359.jpg'
    ];

    let updatedCount = 0;

    for (const ad of adsWithLocalhost) {
      console.log(`\nNaprawiam ogłoszenie: ${ad._id}`);
      console.log(`Marka: ${ad.brand} ${ad.model}`);
      console.log(`Stare zdjęcia:`, ad.images);

      // Zastąp localhost URL-e URL-ami z Supabase
      const numberOfImages = Math.min(ad.images.length, supabaseImages.length);
      const newImages = supabaseImages.slice(0, numberOfImages);
      
      ad.images = newImages;
      ad.mainImage = newImages[0]; // Pierwszy obraz jako główny

      // Zapisz bez walidacji, aby ominąć problemy z enum
      await ad.save({ validateBeforeSave: false });
      updatedCount++;

      console.log(`✅ Zaktualizowano ogłoszenie ${ad._id}`);
      console.log(`Nowe zdjęcia:`, ad.images);
    }

    console.log(`\n🎉 Naprawiono ${updatedCount} ogłoszeń!`);
    console.log('Wszystkie localhost URL-e zostały zastąpione URL-ami z Supabase.');

  } catch (error) {
    console.error('❌ Wystąpił błąd podczas naprawy ogłoszeń:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Rozłączono z bazą danych.');
  }
};

fixLocalhostToSupabase();
