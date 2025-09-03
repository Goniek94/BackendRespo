const mongoose = require('mongoose');
require('dotenv').config();

async function checkListing() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Ad = require('./models/listings/ad');
    
    // Znajdź ogłoszenie z zamianą lub cesją
    const listing = await Ad.findOne({
      $or: [
        { purchaseOptions: 'Zamiana' },
        { purchaseOptions: 'Cesja leasingu' },
        { description: { $regex: 'cesja', $options: 'i' } }
      ]
    }).lean();
    
    if (listing) {
      console.log('=== ZNALEZIONE OGŁOSZENIE ===');
      console.log('ID:', listing._id);
      console.log('purchaseOptions:', listing.purchaseOptions);
      console.log('negotiable:', listing.negotiable);
      
      // Sprawdź pola cesji
      console.log('\n=== POLA CESJI ===');
      console.log('leasingCompany:', listing.leasingCompany);
      console.log('remainingInstallments:', listing.remainingInstallments);
      console.log('installmentAmount:', listing.installmentAmount);
      console.log('cessionFee:', listing.cessionFee);
      
      // Sprawdź pola zamiany
      console.log('\n=== POLA ZAMIANY ===');
      console.log('exchangeOffer:', listing.exchangeOffer);
      console.log('exchangeValue:', listing.exchangeValue);
      console.log('exchangePayment:', listing.exchangePayment);
      console.log('exchangeConditions:', listing.exchangeConditions);
      
    } else {
      console.log('Nie znaleziono ogłoszenia z cesją lub zamianą');
      
      // Sprawdź wszystkie ogłoszenia z różnymi purchaseOptions
      const allListings = await Ad.find({}, 'purchaseOptions negotiable').lean();
      console.log('\n=== WSZYSTKIE OPCJE ZAKUPU W BAZIE ===');
      const options = [...new Set(allListings.map(l => l.purchaseOptions))];
      options.forEach(option => {
        const count = allListings.filter(l => l.purchaseOptions === option).length;
        console.log(`${option}: ${count} ogłoszeń`);
      });
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Błąd:', error);
  }
}

checkListing();
