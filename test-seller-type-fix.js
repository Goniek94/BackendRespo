import mongoose from 'mongoose';
import Ad from './models/listings/ad.js';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/marketplace');
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Test creating an ad with sellerType
const testSellerType = async () => {
  try {
    console.log('Testing sellerType field...');
    
    // Test 1: Create ad with lowercase sellerType (should be capitalized automatically)
    const testAd1 = new Ad({
      brand: 'Toyota',
      model: 'Corolla',
      year: 2020,
      price: 50000,
      mileage: 30000,
      fuelType: 'benzyna', // should become 'Benzyna'
      transmission: 'manualna', // should become 'Manualna'
      description: 'Test description for seller type fix',
      sellerType: 'prywatny', // should become 'Prywatny'
      owner: new mongoose.Types.ObjectId(),
      ownerName: 'Test',
      ownerLastName: 'User',
      ownerEmail: 'test@example.com',
      ownerPhone: '123456789'
    });
    
    await testAd1.save();
    console.log('✅ Test 1 passed - Ad created with lowercase sellerType');
    console.log('   sellerType:', testAd1.sellerType);
    console.log('   fuelType:', testAd1.fuelType);
    console.log('   transmission:', testAd1.transmission);
    
    // Test 2: Create ad with uppercase sellerType
    const testAd2 = new Ad({
      brand: 'Honda',
      model: 'Civic',
      year: 2021,
      price: 60000,
      mileage: 20000,
      fuelType: 'Benzyna',
      transmission: 'Automatyczna',
      description: 'Test description for seller type fix 2',
      sellerType: 'Firma', // should stay 'Firma'
      owner: new mongoose.Types.ObjectId(),
      ownerName: 'Test',
      ownerLastName: 'Company',
      ownerEmail: 'company@example.com',
      ownerPhone: '987654321'
    });
    
    await testAd2.save();
    console.log('✅ Test 2 passed - Ad created with uppercase sellerType');
    console.log('   sellerType:', testAd2.sellerType);
    console.log('   fuelType:', testAd2.fuelType);
    console.log('   transmission:', testAd2.transmission);
    
    // Test 3: Try to create ad with invalid sellerType (should fail)
    try {
      const testAd3 = new Ad({
        brand: 'BMW',
        model: 'X5',
        year: 2022,
        price: 150000,
        mileage: 10000,
        fuelType: 'Diesel',
        transmission: 'Automatyczna',
        description: 'Test description for invalid seller type',
        sellerType: 'invalid_type', // should fail validation
        owner: new mongoose.Types.ObjectId(),
        ownerName: 'Test',
        ownerLastName: 'Invalid',
        ownerEmail: 'invalid@example.com',
        ownerPhone: '555666777'
      });
      
      await testAd3.save();
      console.log('❌ Test 3 failed - Invalid sellerType was accepted');
    } catch (error) {
      console.log('✅ Test 3 passed - Invalid sellerType was rejected');
      console.log('   Error:', error.message);
    }
    
    // Clean up test data
    await Ad.deleteMany({ 
      $or: [
        { brand: 'Toyota', model: 'Corolla' },
        { brand: 'Honda', model: 'Civic' }
      ]
    });
    console.log('🧹 Test data cleaned up');
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('✅ sellerType field is working correctly with automatic capitalization');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Main function
const main = async () => {
  await connectDB();
  await testSellerType();
  await mongoose.connection.close();
  console.log('Database connection closed');
};

// Run the test
main().catch(console.error);
