import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Ad from '../models/ad.js';

dotenv.config();

const restoreRealImages = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Połączono z bazą danych MongoDB');

    // Najnowsze zdjęcia z dzisiaj dla ogłoszeń Volvo XC60
    const realCarImages = [
      // Pierwsze ogłoszenie Volvo XC60 (AutoSell.pl)
      {
        adId: '6864f39dc96ab6f5f7665e67',
        images: [
          'http://localhost:5000/uploads/1751444547837-984743620.jpg',
          'http://localhost:5000/uploads/1751444547841-206400032.jpg',
          'http://localhost:5000/uploads/1751444547845-108880022.jpg',
          'http://localhost:5000/uploads/1751444547848-986020067.jpg',
          'http://localhost:5000/uploads/1751444547850-250681359.jpg'
        ]
      },
      // Drugie ogłoszenie Volvo XC60 (Mateusz)
      {
        adId: '6865363ab43be2305936018c',
        images: [
          'http://localhost:5000/uploads/1751444670562-944804407.jpg',
          'http://localhost:5000/uploads/1751444670569-949543296.jpg',
          'http://localhost:5000/uploads/1751444670574-138101117.jpg',
          'http://localhost:5000/uploads/1751444670577-481977900.jpg',
          'http://localhost:5000/uploads/1751444670579-537375905.jpg'
        ]
      }
    ];

    console.log('Przywracanie prawdziwych zdjęć...');

    for (const adData of realCarImages) {
      const ad = await Ad.findById(adData.adId);
      if (ad) {
        ad.images = adData.images;
        await ad.save();
        console.log(`✅ Przywrócono zdjęcia dla ogłoszenia: ${ad.brand} ${ad.model} (ID: ${ad._id})`);
        console.log(`   Właściciel: ${ad.ownerName}`);
        console.log(`   Liczba zdjęć: ${adData.images.length}`);
        console.log(`   Zdjęcia:`, adData.images);
      } else {
        console.log(`❌ Nie znaleziono ogłoszenia o ID: ${adData.adId}`);
      }
    }

    console.log('\n🎉 Przywracanie prawdziwych zdjęć zakończone!');

  } catch (error) {
    console.error('Wystąpił błąd podczas przywracania zdjęć:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Rozłączono z bazą danych.');
  }
};

restoreRealImages();
