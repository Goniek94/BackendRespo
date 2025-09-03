import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Ad from './models/listings/ad.js';

dotenv.config();

async function checkListing() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Połączono z bazą danych');
    
    // Znajdź najnowsze ogłoszenie
    const latestListing = await Ad.findOne().sort({ createdAt: -1 }).lean();
    
    if (latestListing) {
      console.log('\n=== NAJNOWSZE OGŁOSZENIE ===');
      console.log('ID:', latestListing._id);
      console.log('Brand:', latestListing.brand);
      console.log('Model:', latestListing.model);
      console.log('purchaseOptions:', latestListing.purchaseOptions);
      console.log('negotiable:', latestListing.negotiable);
      
      // Sprawdź pola cesji
      console.log('\n=== POLA CESJI ===');
      console.log('leasingCompany:', latestListing.leasingCompany);
      console.log('remainingInstallments:', latestListing.remainingInstallments);
      console.log('installmentAmount:', latestListing.installmentAmount);
      console.log('cessionFee:', latestListing.cessionFee);
      
      // Sprawdź pola zamiany
      console.log('\n=== POLA ZAMIANY ===');
      console.log('exchangeOffer:', latestListing.exchangeOffer);
      console.log('exchangeValue:', latestListing.exchangeValue);
      console.log('exchangePayment:', latestListing.exchangePayment);
      console.log('exchangeConditions:', latestListing.exchangeConditions);
      
      // Sprawdź inne ważne pola
      console.log('\n=== INNE POLA ===');
      console.log('countryOfOrigin:', latestListing.countryOfOrigin);
      console.log('firstRegistrationDate:', latestListing.firstRegistrationDate);
      console.log('lastOfficialMileage:', latestListing.lastOfficialMileage);
      console.log('paintFinish:', latestListing.paintFinish);
      console.log('seats:', latestListing.seats);
      console.log('sellerType:', latestListing.sellerType);
      
    } else {
      console.log('Nie znaleziono żadnych ogłoszeń');
    }
    
    // Sprawdź wszystkie opcje zakupu w bazie
    const allListings = await Ad.find({}, 'purchaseOptions negotiable').lean();
    console.log('\n=== WSZYSTKIE OPCJE ZAKUPU W BAZIE ===');
    const options = [...new Set(allListings.map(l => l.purchaseOptions))];
    options.forEach(option => {
      const count = allListings.filter(l => l.purchaseOptions === option).length;
      console.log(`${option}: ${count} ogłoszeń`);
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Błąd:', error);
  }
}

checkListing();
