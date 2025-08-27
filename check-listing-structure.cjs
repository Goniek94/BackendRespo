const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/marketplace')
  .then(async () => {
    console.log('Połączono z bazą danych');
    
    const Ad = require('./models/listings/ad');
    
    // Pobierz jedno ogłoszenie żeby zobaczyć strukturę danych
    const sampleAd = await Ad.findOne().lean();
    
    if (sampleAd) {
      console.log('\n=== STRUKTURA OGŁOSZENIA ===');
      console.log('ID:', sampleAd._id);
      console.log('Brand:', sampleAd.brand);
      console.log('Model:', sampleAd.model);
      console.log('Power:', sampleAd.power);
      console.log('Capacity:', sampleAd.capacity);
      console.log('Engine Size:', sampleAd.engineSize);
      console.log('Country Origin:', sampleAd.countryOrigin);
      console.log('Country of Origin:', sampleAd.countryOfOrigin);
      console.log('Imported:', sampleAd.imported);
      console.log('Origin:', sampleAd.origin);
      
      console.log('\n=== WSZYSTKIE POLA ZWIĄZANE Z POJEMNOŚCIĄ I POCHODZENIEM ===');
      Object.keys(sampleAd).forEach(key => {
        if (key.toLowerCase().includes('capacity') || 
            key.toLowerCase().includes('engine') || 
            key.toLowerCase().includes('power') ||
            key.toLowerCase().includes('origin') ||
            key.toLowerCase().includes('country')) {
          console.log(`${key}: ${sampleAd[key]}`);
        }
      });
    } else {
      console.log('Brak ogłoszeń w bazie danych');
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Błąd:', err);
    process.exit(1);
  });
