import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Ad from '../models/ad.js';

dotenv.config();

// Prawdziwe zdjęcia samochodów z Unsplash
const carImages = {
  'Volvo XC60': [
    'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&h=600&fit=crop'
  ],
  'BMW X5': [
    'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&h=600&fit=crop'
  ],
  'Audi A4': [
    'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&h=600&fit=crop'
  ],
  'Mercedes C-Class': [
    'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&h=600&fit=crop'
  ],
  'default': [
    'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&h=600&fit=crop'
  ]
};

const updateAdImages = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Połączono z bazą danych MongoDB');

    const ads = await Ad.find({});
    console.log(`Znaleziono ${ads.length} ogłoszeń do aktualizacji`);

    for (const ad of ads) {
      const carKey = `${ad.brand} ${ad.model}`;
      const images = carImages[carKey] || carImages['default'];
      
      ad.images = images;
      await ad.save();
      
      console.log(`Zaktualizowano ogłoszenie: ${ad.brand} ${ad.model} (ID: ${ad._id})`);
      console.log(`Nowe zdjęcia:`, images);
    }

    console.log('Wszystkie ogłoszenia zostały zaktualizowane prawdziwymi zdjęciami samochodów!');

  } catch (error) {
    console.error('Wystąpił błąd podczas aktualizacji:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Rozłączono z bazą danych.');
  }
};

updateAdImages();
