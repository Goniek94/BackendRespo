/**
 * Test script for search and filtering functionality
 * Skrypt testowy dla funkcjonalności wyszukiwania i filtrowania
 */

import Ad from './models/ad.js';
import { createAdFilter } from './routes/listings/ads/helpers.js';
import mongoose from 'mongoose';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/marketplace', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Test functions
const testSortingFunctionality = async () => {
  console.log('\n🔍 Testing sorting functionality...');
  
  try {
    // Test 1: Sort by price ascending
    console.log('\n📊 Test 1: Sort by price (ascending)');
    const adsByPriceAsc = await Ad.find({ status: 'opublikowane' })
      .sort({ price: 1 })
      .limit(5)
      .select('brand model price listingType')
      .lean();
    
    console.log('First 5 ads sorted by price (ascending):');
    adsByPriceAsc.forEach((ad, index) => {
      console.log(`${index + 1}. ${ad.brand} ${ad.model} - ${ad.price} PLN (${ad.listingType})`);
    });

    // Test 2: Sort by price descending
    console.log('\n📊 Test 2: Sort by price (descending)');
    const adsByPriceDesc = await Ad.find({ status: 'opublikowane' })
      .sort({ price: -1 })
      .limit(5)
      .select('brand model price listingType')
      .lean();
    
    console.log('First 5 ads sorted by price (descending):');
    adsByPriceDesc.forEach((ad, index) => {
      console.log(`${index + 1}. ${ad.brand} ${ad.model} - ${ad.price} PLN (${ad.listingType})`);
    });

    // Test 3: Featured ads priority
    console.log('\n⭐ Test 3: Featured ads priority');
    const adsWithFeaturedPriority = await Ad.aggregate([
      { $match: { status: 'opublikowane' } },
      { 
        $addFields: { 
          featuredPriority: { 
            $cond: { 
              if: { $eq: ["$listingType", "wyróżnione"] }, 
              then: 0, 
              else: 1 
            } 
          } 
        }
      },
      { $sort: { featuredPriority: 1, createdAt: -1 } },
      { $limit: 10 },
      { $project: { brand: 1, model: 1, listingType: 1, featuredPriority: 1 } }
    ]);
    
    console.log('First 10 ads with featured priority:');
    adsWithFeaturedPriority.forEach((ad, index) => {
      const type = ad.listingType === 'wyróżnione' ? '⭐ FEATURED' : '📄 Regular';
      console.log(`${index + 1}. ${ad.brand} ${ad.model} - ${type}`);
    });

  } catch (error) {
    console.error('❌ Error testing sorting:', error);
  }
};

const testFilteringFunctionality = async () => {
  console.log('\n🔍 Testing filtering functionality...');
  
  try {
    // Test 1: Filter by listing type (featured only)
    console.log('\n⭐ Test 1: Filter featured ads only');
    const featuredFilter = createAdFilter({ listingType: 'wyróżnione' });
    console.log('Filter for featured ads:', featuredFilter);
    
    const featuredAds = await Ad.find(featuredFilter)
      .limit(5)
      .select('brand model listingType')
      .lean();
    
    console.log(`Found ${featuredAds.length} featured ads:`);
    featuredAds.forEach((ad, index) => {
      console.log(`${index + 1}. ${ad.brand} ${ad.model} - ${ad.listingType}`);
    });

    // Test 2: Filter by "tylko wyróżnione" checkbox
    console.log('\n✅ Test 2: Filter with "tylko wyróżnione" checkbox');
    const onlyFeaturedFilter = createAdFilter({ featured: 'true' });
    console.log('Filter for "tylko wyróżnione":', onlyFeaturedFilter);
    
    const onlyFeaturedAds = await Ad.find(onlyFeaturedFilter)
      .limit(5)
      .select('brand model listingType')
      .lean();
    
    console.log(`Found ${onlyFeaturedAds.length} ads with "tylko wyróżnione":`);
    onlyFeaturedAds.forEach((ad, index) => {
      console.log(`${index + 1}. ${ad.brand} ${ad.model} - ${ad.listingType}`);
    });

    // Test 3: Filter by "wszystkie" type
    console.log('\n📋 Test 3: Filter with "wszystkie" type');
    const allTypesFilter = createAdFilter({ listingType: 'wszystkie' });
    console.log('Filter for "wszystkie":', allTypesFilter);
    
    const allTypeAds = await Ad.find(allTypesFilter)
      .limit(10)
      .select('brand model listingType')
      .lean();
    
    console.log(`Found ${allTypeAds.length} ads with "wszystkie" filter:`);
    const featuredCount = allTypeAds.filter(ad => ad.listingType === 'wyróżnione').length;
    const regularCount = allTypeAds.length - featuredCount;
    console.log(`- Featured: ${featuredCount}, Regular: ${regularCount}`);

    // Test 4: Price range filtering
    console.log('\n💰 Test 4: Price range filtering');
    const priceFilter = createAdFilter({ minPrice: '50000', maxPrice: '100000' });
    console.log('Filter for price range 50k-100k:', priceFilter);
    
    const priceRangeAds = await Ad.find(priceFilter)
      .limit(5)
      .select('brand model price')
      .lean();
    
    console.log(`Found ${priceRangeAds.length} ads in price range 50k-100k:`);
    priceRangeAds.forEach((ad, index) => {
      console.log(`${index + 1}. ${ad.brand} ${ad.model} - ${ad.price} PLN`);
    });

  } catch (error) {
    console.error('❌ Error testing filtering:', error);
  }
};

const testDatabaseStats = async () => {
  console.log('\n📊 Database statistics...');
  
  try {
    const totalAds = await Ad.countDocuments();
    const publishedAds = await Ad.countDocuments({ status: 'opublikowane' });
    const featuredAds = await Ad.countDocuments({ 
      status: 'opublikowane', 
      listingType: 'wyróżnione' 
    });
    const regularAds = publishedAds - featuredAds;

    console.log(`📈 Total ads: ${totalAds}`);
    console.log(`✅ Published ads: ${publishedAds}`);
    console.log(`⭐ Featured ads: ${featuredAds}`);
    console.log(`📄 Regular ads: ${regularAds}`);

    // Check listing types distribution
    const listingTypes = await Ad.aggregate([
      { $match: { status: 'opublikowane' } },
      { $group: { _id: '$listingType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('\n📊 Listing types distribution:');
    listingTypes.forEach(type => {
      console.log(`- ${type._id || 'undefined'}: ${type.count}`);
    });

  } catch (error) {
    console.error('❌ Error getting database stats:', error);
  }
};

// Main test function
const runTests = async () => {
  console.log('🚀 Starting search and filtering functionality tests...');
  
  await connectDB();
  
  await testDatabaseStats();
  await testSortingFunctionality();
  await testFilteringFunctionality();
  
  console.log('\n✅ All tests completed!');
  process.exit(0);
};

// Run tests
runTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});
