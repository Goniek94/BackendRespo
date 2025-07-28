/**
 * Test Similar Ads Functionality
 * Testuje endpoint podobnych ogłoszeń
 */

import mongoose from 'mongoose';
import Ad from './models/ad.js';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/marketplace', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Test similar ads logic
const testSimilarAds = async () => {
  try {
    console.log('🔍 Testing Similar Ads Functionality...\n');

    // Get a sample ad to test with
    const sampleAd = await Ad.findOne({ status: { $in: ['active', 'opublikowane'] } });
    
    if (!sampleAd) {
      console.log('❌ No active ads found in database');
      return;
    }

    console.log('📋 Testing with ad:');
    console.log(`   ID: ${sampleAd._id}`);
    console.log(`   Brand: ${sampleAd.brand}`);
    console.log(`   Model: ${sampleAd.model}`);
    console.log(`   Body Type: ${sampleAd.bodyType}`);
    console.log(`   Status: ${sampleAd.status}\n`);

    // Test the similar ads logic manually
    const activeFilter = { 
      status: { $in: ['active', 'opublikowane'] },
      _id: { $ne: sampleAd._id } // Exclude current ad
    };

    const limit = 6;

    // Priority search criteria
    const searchCriteria = [
      // 1. Same brand + model + body type
      {
        ...activeFilter,
        brand: sampleAd.brand,
        model: sampleAd.model,
        bodyType: sampleAd.bodyType
      },
      // 2. Same brand + model (if not enough results)
      {
        ...activeFilter,
        brand: sampleAd.brand,
        model: sampleAd.model
      },
      // 3. Same brand + body type (if still not enough)
      {
        ...activeFilter,
        brand: sampleAd.brand,
        bodyType: sampleAd.bodyType
      },
      // 4. Same brand only (fallback)
      {
        ...activeFilter,
        brand: sampleAd.brand
      }
    ];

    let similarAds = [];
    
    console.log('🔍 Searching for similar ads...\n');

    // Try each search criteria until we have enough ads
    for (let i = 0; i < searchCriteria.length; i++) {
      if (similarAds.length >= limit) break;
      
      const criteria = searchCriteria[i];
      const remainingLimit = limit - similarAds.length;
      
      console.log(`   Step ${i + 1}: Searching with criteria:`, {
        brand: criteria.brand,
        model: criteria.model || 'any',
        bodyType: criteria.bodyType || 'any'
      });
      
      const foundAds = await Ad.find(criteria)
        .limit(remainingLimit)
        .sort({ createdAt: -1 })
        .select('_id headline brand model year price mileage fuelType mainImage images listingType createdAt bodyType');
      
      console.log(`   Found ${foundAds.length} ads`);
      
      // Add ads that aren't already in the results
      const existingIds = new Set(similarAds.map(ad => ad._id.toString()));
      const newAds = foundAds.filter(ad => !existingIds.has(ad._id.toString()));
      
      console.log(`   Added ${newAds.length} new ads`);
      
      similarAds.push(...newAds);
      console.log(`   Total similar ads so far: ${similarAds.length}\n`);
    }

    // Limit final results
    similarAds = similarAds.slice(0, limit);

    console.log('✅ Similar Ads Results:');
    console.log(`   Total found: ${similarAds.length}`);
    console.log(`   Requested limit: ${limit}\n`);

    if (similarAds.length > 0) {
      console.log('📋 Similar ads details:');
      similarAds.forEach((ad, index) => {
        console.log(`   ${index + 1}. ${ad.brand} ${ad.model} (${ad.year || 'N/A'}) - ${ad.price || 'N/A'} zł`);
        console.log(`      ID: ${ad._id}`);
        console.log(`      Body Type: ${ad.bodyType || 'N/A'}`);
        console.log(`      Listing Type: ${ad.listingType || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('❌ No similar ads found');
    }

    // Test API endpoint simulation
    console.log('🌐 Testing API endpoint response format...\n');
    
    const apiResponse = {
      success: true,
      data: similarAds,
      count: similarAds.length
    };

    console.log('✅ API Response format:');
    console.log(JSON.stringify(apiResponse, null, 2));

  } catch (error) {
    console.error('❌ Error testing similar ads:', error);
  }
};

// Run the test
const runTest = async () => {
  await connectDB();
  await testSimilarAds();
  await mongoose.connection.close();
  console.log('\n🔚 Test completed');
};

runTest();
