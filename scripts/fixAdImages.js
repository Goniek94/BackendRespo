import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Ad from '../models/ad.js';

dotenv.config();

const placeholderImages = [
  'https://via.placeholder.com/800x600?text=No+Image',
  'https://via.placeholder.com/800x600?text=No+Image'
];

const fixAdImages = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Połączono z bazą danych MongoDB');

    const adsToUpdate = await Ad.find({ $or: [{ images: { $exists: false } }, { images: { $size: 0 } }] });

    if (adsToUpdate.length === 0) {
      console.log('Wszystkie ogłoszenia mają już zdjęcia. Nie ma nic do zrobienia.');
      return;
    }

    console.log(`Znaleziono ${adsToUpdate.length} ogłoszeń bez zdjęć. Aktualizowanie...`);

    for (const ad of adsToUpdate) {
      ad.images = placeholderImages;
      await ad.save();
      console.log(`Zaktualizowano ogłoszenie o ID: ${ad._id}`);
    }

    console.log('Aktualizacja zakończona pomyślnie.');

  } catch (error) {
    console.error('Wystąpił błąd podczas aktualizacji ogłoszeń:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Rozłączono z bazą danych.');
  }
};

fixAdImages();
