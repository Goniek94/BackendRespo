import mongoose from 'mongoose';
import Ad from './models/ad.js';

mongoose.connect('mongodb://localhost:27017/marketplace', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function checkCountryOfOrigin() {
  try {
    const ads = await Ad.find({ countryOfOrigin: { $exists: true, $ne: null, $ne: '' } }).limit(5);
    console.log('Ogłoszenia z polem countryOfOrigin:');
    ads.forEach(ad => {
      console.log(`ID: ${ad._id}, Brand: ${ad.brand}, Model: ${ad.model}, Country: ${ad.countryOfOrigin}`);
    });
    
    const totalWithCountry = await Ad.countDocuments({ countryOfOrigin: { $exists: true, $ne: null, $ne: '' } });
    const totalAds = await Ad.countDocuments();
    console.log(`\nOgłoszeń z krajem pochodzenia: ${totalWithCountry} / ${totalAds}`);
    
    // Sprawdź też jedno konkretne ogłoszenie
    const sampleAd = await Ad.findOne().limit(1);
    if (sampleAd) {
      console.log('\nPrzykładowe ogłoszenie:');
      console.log(`ID: ${sampleAd._id}`);
      console.log(`Brand: ${sampleAd.brand}`);
      console.log(`Model: ${sampleAd.model}`);
      console.log(`Country of Origin: ${sampleAd.countryOfOrigin}`);
      console.log(`Paint Finish: ${sampleAd.paintFinish}`);
      console.log(`Seats: ${sampleAd.seats}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Błąd:', error);
    process.exit(1);
  }
}

checkCountryOfOrigin();
