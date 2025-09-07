import Ad from '../models/listings/ad.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function checkSellerTypeData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/marketplace');
    console.log('Połączono z bazą danych');
    
    // Sprawdź przykładowe ogłoszenia
    const ads = await Ad.find({}, 'sellerType brand model').limit(10);
    console.log('\nPrzykładowe ogłoszenia z sellerType:');
    ads.forEach(ad => {
      console.log(`ID: ${ad._id}, Brand: ${ad.brand}, Model: ${ad.model}, SellerType: '${ad.sellerType}'`);
    });
    
    // Sprawdź unikalne wartości sellerType
    const types = await Ad.distinct('sellerType');
    console.log('\nUnikalne wartości sellerType w bazie:', types);
    
    // Policz ile jest każdego typu
    const [
      firmaCount,
      firmaLowerCount,
      prywatnyCount,
      prywatnyLowerCount,
      noFieldCount,
      nullCount,
      totalCount
    ] = await Promise.all([
      Ad.countDocuments({ sellerType: 'Firma' }),
      Ad.countDocuments({ sellerType: 'firma' }),
      Ad.countDocuments({ sellerType: 'Prywatny' }),
      Ad.countDocuments({ sellerType: 'prywatny' }),
      Ad.countDocuments({ sellerType: { $exists: false } }),
      Ad.countDocuments({ sellerType: null }),
      Ad.countDocuments({})
    ]);
    
    console.log('\nLiczniki sellerType:');
    console.log(`Firma: ${firmaCount}`);
    console.log(`firma: ${firmaLowerCount}`);
    console.log(`Prywatny: ${prywatnyCount}`);
    console.log(`prywatny: ${prywatnyLowerCount}`);
    console.log(`Brak pola: ${noFieldCount}`);
    console.log(`Null: ${nullCount}`);
    console.log(`Łącznie ogłoszeń: ${totalCount}`);
    
    // Sprawdź czy są ogłoszenia z aktywnym statusem i typem Firma
    const activeCompanyAds = await Ad.countDocuments({ 
      sellerType: 'Firma',
      status: { $in: ['active', 'opublikowane', 'pending'] }
    });
    console.log(`\nAktywne ogłoszenia firm: ${activeCompanyAds}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Błąd:', error);
    process.exit(1);
  }
}

checkSellerTypeData();
