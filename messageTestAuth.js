/**
 * Test script for authentication and messages API
 * 
 * This script:
 * 1. Authenticates with the test user
 * 2. Tests retrieval of conversations
 * 3. Tests sending a new message
 * 
 * Usage: node messageTestAuth.js
 */
import fetch from 'node-fetch';
import mongoose from 'mongoose';
import User from './models/user.js';
import Message from './models/message.js';

// Config
const API_BASE_URL = 'http://localhost:5000';
const MONGODB_URI = 'mongodb://localhost:27017/marketplace';

// Test user credentials - make sure they match the user created in createTestUser.js
const TEST_USER = {
  email: 'test@example.com',
  password: 'Test1234!' // Must match the password in createTestUser.js
};

// Store auth token and user ID
let authToken = null;
let userId = null;

async function connectToDB() {
  try {
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function login() {
  try {
    console.log(`Attempting login with ${TEST_USER.email}`);
    
    const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password
      })
    });
    
    const loginData = await loginResponse.json();
    
    if (!loginResponse.ok) {
      console.error('❌ Login error:', loginData);
      return false;
    }
    
    authToken = loginData.token;
    userId = loginData.user.id;
    
    console.log('✅ Login successful. Token received.');
    console.log(`User ID: ${userId}`);
    return true;
  } catch (error) {
    console.error('❌ Login request failed:', error);
    return false;
  }
}

async function getConversations() {
  try {
    console.log('Fetching conversations...');
    
    const response = await fetch(`${API_BASE_URL}/messages/conversations`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Error fetching conversations:', data);
      return;
    }
    
    console.log('✅ Conversations retrieved successfully:');
    console.log(JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('❌ Fetch conversations request failed:', error);
  }
}

async function createTestConversation() {
  try {
    // Find another user to send a message to
    const recipient = await User.findOne({ email: { $ne: TEST_USER.email } });
    
    if (!recipient) {
      console.log('❌ No recipient found to create test message. Creating a test recipient...');
      
      // Create a test recipient if none exists
      const newRecipient = new User({
        name: 'Recipient',
        lastName: 'Test',
        email: 'recipient@example.com',
        phoneNumber: '+48123456789',
        password: 'Recipient123!',
        dob: new Date('1990-01-01'),
        isEmailVerified: true,
        isPhoneVerified: true,
        isVerified: true
      });
      
      await newRecipient.save();
      console.log(`✅ Created test recipient: ${newRecipient._id}`);
      
      // Create a test message
      const newMessage = new Message({
        sender: userId,
        recipient: newRecipient._id,
        content: 'Test message for debugging',
        status: 'delivered',
        adId: null
      });
      
      await newMessage.save();
      console.log(`✅ Created test message: ${newMessage._id}`);
      
      return {
        recipientId: newRecipient._id,
        messageId: newMessage._id
      };
    } else {
      console.log(`Found recipient: ${recipient._id}`);
      
      // Create a test message
      const newMessage = new Message({
        sender: userId,
        recipient: recipient._id,
        content: 'Test message for debugging',
        status: 'delivered',
        adId: null
      });
      
      await newMessage.save();
      console.log(`✅ Created test message: ${newMessage._id}`);
      
      return {
        recipientId: recipient._id,
        messageId: newMessage._id
      };
    }
  } catch (error) {
    console.error('❌ Error creating test conversation:', error);
  }
}

async function sendMessage(recipientId, content) {
  try {
    console.log(`Sending test message to ${recipientId}...`);
    
    const response = await fetch(`${API_BASE_URL}/messages/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        recipient: recipientId,
        content: content || 'This is a test message from messageTestAuth.js',
        adId: null
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Error sending message:', data);
      return;
    }
    
    console.log('✅ Message sent successfully:');
    console.log(JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('❌ Send message request failed:', error);
  }
}

async function main() {
  try {
    await connectToDB();
    
    // Find user by email to get the user ID
    const user = await User.findOne({ email: TEST_USER.email });
    if (user) {
      console.log(`User ${TEST_USER.email} already exists (ID: ${user._id})`);
      
      // Try to login
      const loginSuccess = await login();
      if (!loginSuccess) {
        console.error('Cannot run tests without successful login');
        await mongoose.disconnect();
        return;
      }
      
      // Test getting conversations
      await getConversations();
      
      // Create a test conversation if needed
      const testConversation = await createTestConversation();
      
      if (testConversation) {
        // Send a message in the test conversation
        await sendMessage(testConversation.recipientId);
        
        // Get conversations again to verify the new message appears
        await getConversations();
      }
    } else {
      console.error(`User ${TEST_USER.email} not found. Please run createTestUser.js first.`);
    }
    
    await mongoose.disconnect();
    console.log('Test completed');
  } catch (error) {
    console.error('❌ Error in test script:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

main();