/**
 * Test script that creates a test user, logs in, and tests message functionality
 * Usage: node messageTestAuth.js
 */

import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './models/user.js';

dotenv.config();

// Configure axios instance
const api = axios.create({
  baseURL: 'http://localhost:5000',
  withCredentials: true
});

// Keep track of the auth token
let authToken = null;

/**
 * Connect to the MongoDB database
 */
async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    return false;
  }
}

/**
 * Create a test user if it doesn't exist
 */
async function createTestUser() {
  try {
    const testEmail = 'test@example.com';
    const testPassword = 'test123';

    // Check if user already exists
    let user = await User.findOne({ email: testEmail });
    
    if (user) {
      console.log(`User ${testEmail} already exists (ID: ${user._id})`);
    } else {
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(testPassword, salt);
      
      // Create new user
      user = new User({
        email: testEmail,
        password: hashedPassword,
        name: 'Test User',
        role: 'user',
        emailVerified: true
      });
      
      await user.save();
      console.log(`Created test user ${testEmail} (ID: ${user._id})`);
    }
    
    return { user, password: testPassword };
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    return null;
  }
}

/**
 * Login with the test user credentials
 */
async function loginTestUser(email, password) {
  try {
    console.log(`Attempting login with ${email}`);
    const response = await api.post('/users/login', { email, password });
    
    if (response.data && response.data.token) {
      authToken = response.data.token;
      // Set the token for future requests
      api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      console.log('✅ Login successful, token received');
      return true;
    } else {
      console.error('❌ Login failed - no token in response');
      console.log('Response:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ Login error:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test getting conversations list
 */
async function testGetConversations() {
  try {
    console.log('Testing GET /messages/conversations');
    const response = await api.get('/messages/conversations');
    console.log('✅ Successfully retrieved conversations');
    console.log(`Found ${response.data.length} conversations`);
    return response.data;
  } catch (error) {
    console.error('❌ Error getting conversations:', error.response?.data || error.message);
    // Show detailed error information
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Headers:', error.response.headers);
      console.log('Data:', error.response.data);
    }
    return null;
  }
}

/**
 * Test creating a message
 */
async function testCreateMessage(recipientId) {
  try {
    console.log(`Testing POST /messages/send-to-user/${recipientId}`);
    const messageData = {
      subject: 'Test message',
      content: 'This is a test message created at ' + new Date().toISOString()
    };
    
    const response = await api.post(`/messages/send-to-user/${recipientId}`, messageData);
    console.log('✅ Message created successfully');
    return response.data;
  } catch (error) {
    console.error('❌ Error creating message:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Create a self-message (for testing when only one user exists)
 */
async function testCreateSelfMessage(userId) {
  try {
    console.log(`Testing POST /messages/send-to-user/${userId} (self message)`);
    const messageData = {
      subject: 'Test self message',
      content: 'This is a test message to myself created at ' + new Date().toISOString()
    };
    
    const response = await api.post(`/messages/send-to-user/${userId}`, messageData);
    console.log('✅ Self message created successfully');
    return response.data;
  } catch (error) {
    console.error('❌ Error creating self message:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    // Connect to database
    const dbConnected = await connectToDatabase();
    if (!dbConnected) {
      console.error('Cannot run tests without database connection');
      process.exit(1);
    }
    
    // Create test user
    const { user, password } = await createTestUser();
    if (!user) {
      console.error('Cannot run tests without test user');
      process.exit(1);
    }
    
    // Login with test user
    const loginSuccess = await loginTestUser(user.email, password);
    if (!loginSuccess) {
      console.error('Cannot run tests without successful login');
      process.exit(1);
    }
    
    // Test getting conversations
    const conversations = await testGetConversations();
    
    // Create a message to self for testing
    await testCreateSelfMessage(user._id);
    
    // Test getting conversations again to see if new message appears
    console.log('Getting conversations after creating self-message:');
    const updatedConversations = await testGetConversations();
    
    console.log('\n======= TEST RESULTS =======');
    console.log(`Initial conversations count: ${conversations?.length || 0}`);
    console.log(`Updated conversations count: ${updatedConversations?.length || 0}`);
    console.log('============================\n');
    
    console.log('Tests completed successfully!');
  } catch (error) {
    console.error('❌ Uncaught error during tests:', error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run all tests
runTests();