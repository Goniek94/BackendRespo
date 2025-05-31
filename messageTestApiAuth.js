/**
 * Enhanced test script for messages API with MongoDB integration
 * 
 * This script:
 * 1. Connects directly to MongoDB
 * 2. Creates a test user if needed
 * 3. Tests authentication and messaging endpoints
 * 
 * Usage: node messageTestApiAuth.js
 */
import fetch from 'node-fetch';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Configuration
const API_URL = 'http://localhost:5000';
const MONGO_URI = 'mongodb://localhost:27017/marketplace';
const TEST_USER = {
  email: 'apitest@example.com',
  password: 'TestApi123!'
};

// Global state
let authToken = null;
let userId = null;
let userModel;

/**
 * Connect to MongoDB
 */
async function connectToMongoDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Define User schema for test purposes
    const userSchema = new mongoose.Schema({
      name: String,
      lastName: String,
      email: { type: String, required: true },
      password: { type: String, required: true },
      phoneNumber: String,
      role: { type: String, default: 'user' },
      isEmailVerified: { type: Boolean, default: true },
      isPhoneVerified: { type: Boolean, default: true }
    });
    
    // Add password hashing hook if not exists
    if (!userSchema.pre) {
      userSchema.pre('save', async function(next) {
        if (!this.isModified('password')) return next();
        
        try {
          const salt = await bcrypt.genSalt(12);
          this.password = await bcrypt.hash(this.password, salt);
          next();
        } catch (error) {
          next(error);
        }
      });
    }
    
    // Create or get the model
    userModel = mongoose.models.User || mongoose.model('User', userSchema);
    
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    return false;
  }
}

/**
 * Create a test user if it doesn't exist
 */
async function ensureTestUser() {
  try {
    // Check if user already exists
    let user = await userModel.findOne({ email: TEST_USER.email });
    
    if (user) {
      console.log(`✅ Test user already exists: ${user._id}`);
      return user;
    }
    
    // Create new test user
    user = new userModel({
      name: 'API',
      lastName: 'Test',
      email: TEST_USER.email,
      password: TEST_USER.password,
      phoneNumber: '+48987654321',
      isEmailVerified: true,
      isPhoneVerified: true,
      role: 'user'
    });
    
    await user.save();
    console.log(`✅ Created test user: ${user._id}`);
    return user;
  } catch (error) {
    console.error('❌ Error ensuring test user:', error);
    return null;
  }
}

/**
 * Login to get authentication token
 */
async function login() {
  try {
    console.log(`Attempting login with ${TEST_USER.email}`);
    
    const response = await fetch(`${API_URL}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password
      })
    });
    
    if (!response.ok) {
      console.error(`❌ Login failed with status: ${response.status}`);
      const errorData = await response.json();
      console.error('Error details:', errorData);
      return false;
    }
    
    const data = await response.json();
    
    authToken = data.token;
    userId = data.user.id;
    
    console.log('✅ Login successful');
    console.log(`User ID: ${userId}`);
    console.log(`Token: ${authToken.substring(0, 15)}...`);
    return true;
  } catch (error) {
    console.error('❌ Login request failed:', error);
    return false;
  }
}

/**
 * Test direct API calls to messages/conversations endpoint
 */
async function testConversations() {
  // Test with direct API URL (no /api prefix)
  await testEndpoint(`${API_URL}/messages/conversations`, 'Direct endpoint (no /api prefix)');
  
  // Test with /api prefix for comparison
  await testEndpoint(`${API_URL}/api/messages/conversations`, 'API endpoint (with /api prefix)');
}

/**
 * Test a specific endpoint
 */
async function testEndpoint(url, description) {
  console.log(`\n--- Testing ${description} ---`);
  console.log(`URL: ${url}`);
  
  try {
    // Test with Authorization header
    console.log('\n> Testing with Authorization header');
    const authHeaderResponse = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    await logResponse(authHeaderResponse);
  } catch (error) {
    console.error(`❌ Request failed:`, error);
  }
}

/**
 * Log response details
 */
async function logResponse(response) {
  console.log(`Status: ${response.status} ${response.statusText}`);
  
  // Log headers
  console.log('Headers:');
  response.headers.forEach((value, name) => {
    console.log(`  ${name}: ${value}`);
  });
  
  // Log body
  try {
    const data = await response.json();
    console.log('Response data:');
    console.log(JSON.stringify(data, null, 2).substring(0, 500) + (JSON.stringify(data, null, 2).length > 500 ? '...' : ''));
  } catch (error) {
    console.log('Could not parse response as JSON');
    const text = await response.text();
    console.log('Response text:');
    console.log(text.substring(0, 500) + (text.length > 500 ? '...' : ''));
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Connect to MongoDB and ensure test user exists
    const dbConnected = await connectToMongoDB();
    if (!dbConnected) {
      console.error('❌ Cannot proceed without database connection');
      return;
    }
    
    const testUser = await ensureTestUser();
    if (!testUser) {
      console.error('❌ Cannot proceed without test user');
      return;
    }
    
    // Login with test user
    const loginSuccess = await login();
    if (!loginSuccess) {
      console.error('❌ Cannot proceed without successful login');
      return;
    }
    
    // Test API endpoints
    await testConversations();
    
    console.log('\n--- Test completed ---');
  } catch (error) {
    console.error('❌ Unhandled error:', error);
  } finally {
    // Close MongoDB connection
    await mongoose.disconnect();
    console.log('Database connection closed');
  }
}

// Run the script
main().catch(error => {
  console.error('❌ Fatal error:', error);
  mongoose.disconnect();
});