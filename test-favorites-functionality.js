/**
 * Test script for favorites functionality
 * Skrypt testowy dla funkcjonalności ulubionych
 */

import express from 'express';
import mongoose from 'mongoose';
import User from './models/user.js';
import Ad from './models/ad.js';
import { 
  addToFavorites, 
  removeFromFavorites, 
  toggleFavorite, 
  getUserFavorites, 
  checkIsFavorite,
  getFavoritesCount 
} from './controllers/user/favoritesController.js';

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

// Mock request and response objects for testing
const createMockReq = (userId, adId = null, params = {}, query = {}) => ({
  user: { id: userId },
  params: { adId, ...params },
  query
});

const createMockRes = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.data = data;
    return res;
  };
  return res;
};

// Test functions
const testAddToFavorites = async (userId, adId) => {
  console.log('\n🔍 Testing addToFavorites...');
  
  const req = createMockReq(userId, adId);
  const res = createMockRes();
  
  await addToFavorites(req, res);
  
  console.log(`Status: ${res.statusCode}`);
  console.log('Response:', res.data);
  
  return res.data?.success;
};

const testRemoveFromFavorites = async (userId, adId) => {
  console.log('\n🔍 Testing removeFromFavorites...');
  
  const req = createMockReq(userId, adId);
  const res = createMockRes();
  
  await removeFromFavorites(req, res);
  
  console.log(`Status: ${res.statusCode}`);
  console.log('Response:', res.data);
  
  return res.data?.success;
};

const testToggleFavorite = async (userId, adId) => {
  console.log('\n🔍 Testing toggleFavorite...');
  
  const req = createMockReq(userId, adId);
  const res = createMockRes();
  
  await toggleFavorite(req, res);
  
  console.log(`Status: ${res.statusCode}`);
  console.log('Response:', res.data);
  
  return res.data?.success;
};

const testGetUserFavorites = async (userId) => {
  console.log('\n🔍 Testing getUserFavorites...');
  
  const req = createMockReq(userId, null, {}, { page: 1, limit: 10 });
  const res = createMockRes();
  
  await getUserFavorites(req, res);
  
  console.log(`Status: ${res.statusCode}`);
  console.log('Response:', JSON.stringify(res.data, null, 2));
  
  return res.data?.success;
};

const testCheckIsFavorite = async (userId, adId) => {
  console.log('\n🔍 Testing checkIsFavorite...');
  
  const req = createMockReq(userId, adId);
  const res = createMockRes();
  
  await checkIsFavorite(req, res);
  
  console.log(`Status: ${res.statusCode}`);
  console.log('Response:', res.data);
  
  return res.data?.success;
};

const testGetFavoritesCount = async (userId) => {
  console.log('\n🔍 Testing getFavoritesCount...');
  
  const req = createMockReq(userId);
  const res = createMockRes();
  
  await getFavoritesCount(req, res);
  
  console.log(`Status: ${res.statusCode}`);
  console.log('Response:', res.data);
  
  return res.data?.success;
};

// Database setup functions
const findTestUser = async () => {
  const user = await User.findOne({ role: 'user' }).limit(1);
  if (!user) {
    console.log('❌ No test user found in database');
    return null;
  }
  console.log(`✅ Found test user: ${user.name} ${user.lastName} (${user.email})`);
  return user;
};

const findTestAd = async (excludeOwner = null) => {
  const query = { status: 'opublikowane' };
  if (excludeOwner) {
    query.owner = { $ne: excludeOwner };
  }
  
  const ad = await Ad.findOne(query).limit(1);
  if (!ad) {
    console.log('❌ No test ad found in database');
    return null;
  }
  console.log(`✅ Found test ad: ${ad.brand} ${ad.model} - ${ad.price} PLN`);
  return ad;
};

const getDatabaseStats = async () => {
  console.log('\n📊 Database statistics...');
  
  try {
    const totalUsers = await User.countDocuments();
    const totalAds = await Ad.countDocuments();
    const publishedAds = await Ad.countDocuments({ status: 'opublikowane' });
    
    console.log(`👥 Total users: ${totalUsers}`);
    console.log(`📄 Total ads: ${totalAds}`);
    console.log(`✅ Published ads: ${publishedAds}`);
    
    // Check users with favorites
    const usersWithFavorites = await User.aggregate([
      { $match: { favorites: { $exists: true, $not: { $size: 0 } } } },
      { $project: { name: 1, lastName: 1, email: 1, favoritesCount: { $size: '$favorites' } } },
      { $sort: { favoritesCount: -1 } },
      { $limit: 5 }
    ]);
    
    console.log('\n👤 Users with favorites:');
    usersWithFavorites.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} ${user.lastName} - ${user.favoritesCount} favorites`);
    });
    
  } catch (error) {
    console.error('❌ Error getting database stats:', error);
  }
};

// Main test function
const runFavoritesTests = async () => {
  console.log('🚀 Starting favorites functionality tests...');
  
  await connectDB();
  await getDatabaseStats();
  
  // Find test data
  const testUser = await findTestUser();
  if (!testUser) {
    console.log('❌ Cannot run tests without a test user');
    process.exit(1);
  }
  
  const testAd = await findTestAd(testUser._id);
  if (!testAd) {
    console.log('❌ Cannot run tests without a test ad');
    process.exit(1);
  }
  
  console.log(`\n🧪 Running tests with user: ${testUser._id} and ad: ${testAd._id}`);
  
  // Test sequence
  let testResults = [];
  
  // 1. Check initial favorite status
  console.log('\n=== TEST 1: Check initial favorite status ===');
  const initialCheck = await testCheckIsFavorite(testUser._id.toString(), testAd._id.toString());
  testResults.push({ test: 'Initial check', success: initialCheck });
  
  // 2. Get initial favorites count
  console.log('\n=== TEST 2: Get initial favorites count ===');
  const initialCount = await testGetFavoritesCount(testUser._id.toString());
  testResults.push({ test: 'Initial count', success: initialCount });
  
  // 3. Add to favorites
  console.log('\n=== TEST 3: Add to favorites ===');
  const addResult = await testAddToFavorites(testUser._id.toString(), testAd._id.toString());
  testResults.push({ test: 'Add to favorites', success: addResult });
  
  // 4. Check if now favorite
  console.log('\n=== TEST 4: Check if now favorite ===');
  const afterAddCheck = await testCheckIsFavorite(testUser._id.toString(), testAd._id.toString());
  testResults.push({ test: 'Check after add', success: afterAddCheck });
  
  // 5. Get favorites list
  console.log('\n=== TEST 5: Get user favorites ===');
  const favoritesList = await testGetUserFavorites(testUser._id.toString());
  testResults.push({ test: 'Get favorites list', success: favoritesList });
  
  // 6. Get updated count
  console.log('\n=== TEST 6: Get updated favorites count ===');
  const updatedCount = await testGetFavoritesCount(testUser._id.toString());
  testResults.push({ test: 'Updated count', success: updatedCount });
  
  // 7. Toggle favorite (should remove)
  console.log('\n=== TEST 7: Toggle favorite (remove) ===');
  const toggleResult = await testToggleFavorite(testUser._id.toString(), testAd._id.toString());
  testResults.push({ test: 'Toggle favorite', success: toggleResult });
  
  // 8. Final check
  console.log('\n=== TEST 8: Final favorite status check ===');
  const finalCheck = await testCheckIsFavorite(testUser._id.toString(), testAd._id.toString());
  testResults.push({ test: 'Final check', success: finalCheck });
  
  // 9. Final count
  console.log('\n=== TEST 9: Final favorites count ===');
  const finalCount = await testGetFavoritesCount(testUser._id.toString());
  testResults.push({ test: 'Final count', success: finalCount });
  
  // Test results summary
  console.log('\n📋 TEST RESULTS SUMMARY:');
  console.log('========================');
  
  const passedTests = testResults.filter(result => result.success).length;
  const totalTests = testResults.length;
  
  testResults.forEach((result, index) => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${index + 1}. ${result.test}: ${status}`);
  });
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Favorites functionality is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the implementation.');
  }
  
  console.log('\n✅ Tests completed!');
  process.exit(0);
};

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
  process.exit(1);
});

// Run tests
runFavoritesTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});
