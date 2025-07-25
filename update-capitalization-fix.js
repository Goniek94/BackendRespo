import mongoose from 'mongoose';
import Ad from './models/listings/ad.js';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/marketplace', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Function to capitalize values
const capitalizeValue = (value, type) => {
  if (!value) return value;
  
  const lowerValue = value.toLowerCase();
  
  switch (type) {
    case 'fuelType':
      if (lowerValue === 'benzyna') return 'Benzyna';
      if (lowerValue === 'diesel') return 'Diesel';
      if (lowerValue === 'elektryczny') return 'Elektryczny';
      if (lowerValue === 'hybryda' || lowerValue === 'hybrydowy') return 'Hybryda';
      if (lowerValue === 'benzyna+lpg') return 'Benzyna+LPG';
      if (lowerValue === 'benzyna+cng') return 'Benzyna+CNG';
      if (lowerValue === 'etanol') return 'Etanol';
      if (lowerValue === 'hybryda plug-in') return 'Hybryda plug-in';
      if (lowerValue === 'wodór') return 'Wodór';
      if (lowerValue === 'benzyna+etanol') return 'Benzyna+Etanol';
      if (lowerValue === 'inne') return 'Inne';
      break;
      
    case 'transmission':
      if (lowerValue === 'manualna') return 'Manualna';
      if (lowerValue === 'automatyczna') return 'Automatyczna';
      if (lowerValue === 'półautomatyczna') return 'Półautomatyczna';
      if (lowerValue === 'bezstopniowa cvt') return 'Bezstopniowa CVT';
      if (lowerValue === 'automatyczna dwusprzęgłowa') return 'Automatyczna dwusprzęgłowa';
      if (lowerValue === 'sekwencyjna') return 'Sekwencyjna';
      if (lowerValue === 'inne') return 'Inne';
      break;
      
    case 'sellerType':
      if (lowerValue === 'prywatny') return 'Prywatny';
      if (lowerValue === 'firma') return 'Firma';
      break;
      
    case 'boolean':
      if (lowerValue === 'tak') return 'Tak';
      if (lowerValue === 'nie') return 'Nie';
      break;
      
    case 'condition':
      if (lowerValue === 'nowy') return 'Nowy';
      if (lowerValue === 'używany' || lowerValue === 'uzywany') return 'Używany';
      break;
      
    case 'accidentStatus':
      if (lowerValue === 'bezwypadkowy') return 'Bezwypadkowy';
      if (lowerValue === 'powypadkowy') return 'Powypadkowy';
      if (lowerValue === 'tak') return 'Tak';
      if (lowerValue === 'nie') return 'Nie';
      break;
      
    case 'damageStatus':
      if (lowerValue === 'nieuszkodzony') return 'Nieuszkodzony';
      if (lowerValue === 'uszkodzony') return 'Uszkodzony';
      if (lowerValue === 'tak') return 'Tak';
      if (lowerValue === 'nie') return 'Nie';
      break;
      
    case 'purchaseOptions':
      if (lowerValue === 'sprzedaż' || lowerValue === 'sprzedaz') return 'Sprzedaż';
      if (lowerValue === 'faktura vat') return 'Faktura VAT';
      if (lowerValue === 'inne') return 'Inne';
      break;
  }
  
  return value;
};

// Update existing ads
const updateAdsCapitalization = async () => {
  try {
    console.log('Starting capitalization update...');
    
    const ads = await Ad.find({});
    console.log(`Found ${ads.length} ads to update`);
    
    let updatedCount = 0;
    
    for (const ad of ads) {
      let hasChanges = false;
      const updates = {};
      
      // Check and update fuelType
      if (ad.fuelType) {
        const capitalizedFuelType = capitalizeValue(ad.fuelType, 'fuelType');
        if (capitalizedFuelType !== ad.fuelType) {
          updates.fuelType = capitalizedFuelType;
          hasChanges = true;
        }
      }
      
      // Check and update transmission
      if (ad.transmission) {
        const capitalizedTransmission = capitalizeValue(ad.transmission, 'transmission');
        if (capitalizedTransmission !== ad.transmission) {
          updates.transmission = capitalizedTransmission;
          hasChanges = true;
        }
      }
      
      // Check and update sellerType
      if (ad.sellerType) {
        const capitalizedSellerType = capitalizeValue(ad.sellerType, 'sellerType');
        if (capitalizedSellerType !== ad.sellerType) {
          updates.sellerType = capitalizedSellerType;
          hasChanges = true;
        }
      }
      
      // Check and update boolean fields
      const booleanFields = ['negotiable', 'tuning', 'imported', 'registeredInPL', 'firstOwner', 'disabledAdapted'];
      for (const field of booleanFields) {
        if (ad[field]) {
          const capitalizedValue = capitalizeValue(ad[field], 'boolean');
          if (capitalizedValue !== ad[field]) {
            updates[field] = capitalizedValue;
            hasChanges = true;
          }
        }
      }
      
      // Check and update condition
      if (ad.condition) {
        const capitalizedCondition = capitalizeValue(ad.condition, 'condition');
        if (capitalizedCondition !== ad.condition) {
          updates.condition = capitalizedCondition;
          hasChanges = true;
        }
      }
      
      // Check and update accidentStatus
      if (ad.accidentStatus) {
        const capitalizedAccidentStatus = capitalizeValue(ad.accidentStatus, 'accidentStatus');
        if (capitalizedAccidentStatus !== ad.accidentStatus) {
          updates.accidentStatus = capitalizedAccidentStatus;
          hasChanges = true;
        }
      }
      
      // Check and update damageStatus
      if (ad.damageStatus) {
        const capitalizedDamageStatus = capitalizeValue(ad.damageStatus, 'damageStatus');
        if (capitalizedDamageStatus !== ad.damageStatus) {
          updates.damageStatus = capitalizedDamageStatus;
          hasChanges = true;
        }
      }
      
      // Check and update purchaseOptions
      if (ad.purchaseOptions) {
        const capitalizedPurchaseOptions = capitalizeValue(ad.purchaseOptions, 'purchaseOptions');
        if (capitalizedPurchaseOptions !== ad.purchaseOptions) {
          updates.purchaseOptions = capitalizedPurchaseOptions;
          hasChanges = true;
        }
      }
      
      // Update the ad if there are changes
      if (hasChanges) {
        await Ad.findByIdAndUpdate(ad._id, updates);
        updatedCount++;
        console.log(`Updated ad ${ad._id}: ${JSON.stringify(updates)}`);
      }
    }
    
    console.log(`\nCapitalization update completed!`);
    console.log(`Total ads processed: ${ads.length}`);
    console.log(`Ads updated: ${updatedCount}`);
    
  } catch (error) {
    console.error('Error updating ads capitalization:', error);
  }
};

// Main function
const main = async () => {
  await connectDB();
  await updateAdsCapitalization();
  await mongoose.connection.close();
  console.log('Database connection closed');
};

// Run the script
main().catch(console.error);
