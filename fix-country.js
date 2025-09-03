import mongoose from 'mongoose';
import Ad from './models/listings/ad.js';
import './config/index.js';

async function fixCountry() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const result = await Ad.updateMany(
    { 
      $or: [
        { countryOfOrigin: { $exists: false } },
        { countryOfOrigin: null },
        { countryOfOrigin: '' },
        { countryOfOrigin: 'POLSKA' }
      ]
    },
    { 
      $set: { countryOfOrigin: 'Polska' }
    }
  );
  
  console.log(`Zaktualizowano ${result.modifiedCount} ogłoszeń`);
  await mongoose.disconnect();
}

fixCountry().catch(console.error);
