import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables for testing
dotenv.config({ path: '.env.test' });

let mongoServer;

/**
 * Setup test database before running tests
 */
export const setupTestDB = async () => {
  try {
    // Start in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Connect to the in-memory database
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Test database connected');
  } catch (error) {
    console.error('❌ Test database setup failed:', error);
    throw error;
  }
};

/**
 * Clean up test database after tests
 */
export const teardownTestDB = async () => {
  try {
    // Close mongoose connection
    await mongoose.connection.close();
    
    // Stop the in-memory MongoDB instance
    if (mongoServer) {
      await mongoServer.stop();
    }
    
    console.log('✅ Test database cleaned up');
  } catch (error) {
    console.error('❌ Test database cleanup failed:', error);
    throw error;
  }
};

/**
 * Clear all collections between tests
 */
export const clearTestDB = async () => {
  try {
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
    
    console.log('✅ Test database cleared');
  } catch (error) {
    console.error('❌ Test database clear failed:', error);
    throw error;
  }
};

/**
 * Create test user data
 */
export const createTestUser = (overrides = {}) => {
  return {
    name: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    password: 'TestPassword123!',
    phoneNumber: '+48123456789',
    dob: new Date('1990-01-01'),
    role: 'user',
    isVerified: true,
    isEmailVerified: true,
    isPhoneVerified: true,
    status: 'active',
    ...overrides
  };
};

/**
 * Create test ad data
 */
export const createTestAd = (overrides = {}) => {
  return {
    headline: 'Test Car Advertisement',
    brand: 'Toyota',
    model: 'Corolla',
    year: 2020,
    price: 50000,
    mileage: 50000,
    fuelType: 'Benzyna',
    transmission: 'Manualna',
    bodyType: 'Sedan',
    engineCapacity: 1.6,
    horsePower: 132,
    description: 'Test car description',
    status: 'active',
    listingType: 'standard',
    location: {
      city: 'Warszawa',
      voivodeship: 'mazowieckie'
    },
    ...overrides
  };
};

/**
 * Generate JWT token for testing
 */
export const generateTestToken = (payload) => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
};

export default {
  setupTestDB,
  teardownTestDB,
  clearTestDB,
  createTestUser,
  createTestAd,
  generateTestToken
};
