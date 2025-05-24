// Skrypt do porównania ogłoszenia wyświetlanego z tymi, które się nie wyświetlają
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Ad from './models/ad.js';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI;

async function compareAds() {
  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // Pobierz wszystkie ogłoszenia
  const allAds = await Ad.find({});
  // Znajdź ogłoszenie, które jest wyświetlane (listingType: 'standardowe')
  const displayed = allAds.find(ad => ad.listingType === 'standardowe');
  // Znajdź ogłoszenia, które się nie wyświetlają (listingType: 'wyróżnione')
  const notDisplayed = allAds.filter(ad => ad.listingType === 'wyróżnione');

  console.log('OGŁOSZENIE WYŚWIETLANE:');
  if (displayed) {
    console.log({
      id: displayed._id,
      brand: displayed.brand,
      model: displayed.model,
      status: displayed.status,
      listingType: displayed.listingType,
      headline: displayed.headline,
      images: displayed.images,
      createdAt: displayed.createdAt
    });
  } else {
    console.log('Brak ogłoszenia o listingType: "standardowe"');
  }

  console.log('\nOGŁOSZENIA NIE WYŚWIETLANE (listingType: "wyróżnione"):');
  notDisplayed.forEach(ad => {
    console.log({
      id: ad._id,
      brand: ad.brand,
      model: ad.model,
      status: ad.status,
      listingType: ad.listingType,
      headline: ad.headline,
      images: ad.images,
      createdAt: ad.createdAt
    });
  });

  await mongoose.disconnect();
}

compareAds().catch(err => {
  console.error('Błąd podczas porównywania ogłoszeń:', err);
  process.exit(1);
});
