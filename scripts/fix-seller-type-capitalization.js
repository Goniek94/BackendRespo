import mongoose from 'mongoose';
import Ad from '../models/listings/ad.js';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/marketplace');
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Fix seller type capitalization
const fixSellerTypeCapitalization = async () => {
  try {
    console.log('🔧 Starting sellerType capitalization fix...\n');
    
    // Find all ads with lowercase sellerType
    const adsWithLowercaseSellerType = await Ad.find({
      sellerType: { $in: ['prywatny', 'firma'] }
    });
    
    console.log(`📊 Found ${adsWithLowercaseSellerType.length} ads with lowercase sellerType`);
    
    if (adsWithLowercaseSellerType.length === 0) {
      console.log('✅ No ads need updating - all sellerType values are already capitalized');
      return;
    }
    
    let updatedCount = 0;
    
    for (const ad of adsWithLowercaseSellerType) {
      const oldValue = ad.sellerType;
      let newValue;
      
      if (oldValue === 'prywatny') {
        newValue = 'Prywatny';
      } else if (oldValue === 'firma') {
        newValue = 'Firma';
      }
      
      if (newValue && newValue !== oldValue) {
        await Ad.updateOne(
          { _id: ad._id },
          { $set: { sellerType: newValue } }
        );
        
        updatedCount++;
        console.log(`✅ Updated ad ${ad._id}: "${oldValue}" → "${newValue}"`);
      }
    }
    
    console.log(`\n🎉 Successfully updated ${updatedCount} ads`);
    console.log('✅ All sellerType values are now properly capitalized');
    
    // Verify the fix
    const remainingLowercaseAds = await Ad.find({
      sellerType: { $in: ['prywatny', 'firma'] }
    });
    
    if (remainingLowercaseAds.length === 0) {
      console.log('✅ Verification passed - no lowercase sellerType values remain');
    } else {
      console.log(`⚠️  Warning: ${remainingLowercaseAds.length} ads still have lowercase sellerType`);
    }
    
    // Show current distribution
    const sellerTypeStats = await Ad.aggregate([
      {
        $group: {
          _id: '$sellerType',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    console.log('\n📊 Current sellerType distribution:');
    sellerTypeStats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} ads`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing sellerType capitalization:', error);
  }
};

// Main function
const main = async () => {
  await connectDB();
  await fixSellerTypeCapitalization();
  await mongoose.connection.close();
  console.log('\n🔌 Database connection closed');
};

// Run the fix
main().catch(console.error);
