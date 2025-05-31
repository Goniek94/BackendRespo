/**
 * Test script for messages API - create test messages and verify conversations retrieval
 * Run: node messageTestApi.js
 */
const mongoose = require('mongoose');
const axios = require('axios');
const Message = require('./models/message');
const User = require('./models/user');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/marketplace';
const API_URL = process.env.API_URL || 'http://localhost:5000';

// Test user IDs - modify these as needed
const TEST_RECIPIENT_ID = '67cd803e430b755038f60025'; // Target user who should receive messages
const AUTH_TOKEN = 'your-auth-token-here'; // Add a valid JWT token for authentication

async function createTestMessages() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  try {
    // Find recipient user
    const recipient = await User.findById(TEST_RECIPIENT_ID);
    if (!recipient) {
      console.error(`Recipient user with ID ${TEST_RECIPIENT_ID} not found!`);
      process.exit(1);
    }
    console.log(`Found recipient: ${recipient.name || recipient.email}`);

    // Find a different user to be the sender
    const sender = await User.findOne({ _id: { $ne: TEST_RECIPIENT_ID } });
    if (!sender) {
      console.error('No other users found to use as sender!');
      process.exit(1);
    }
    console.log(`Found sender: ${sender.name || sender.email} (ID: ${sender._id})`);

    // Create test messages
    console.log('Creating test messages...');
    
    // Create messages in both directions to test conversations
    const testMessages = [
      {
        sender: sender._id,
        recipient: recipient._id,
        subject: 'Test Message 1',
        content: 'This is a test message from the script - outgoing',
        read: false,
        draft: false,
        createdAt: new Date()
      },
      {
        sender: recipient._id,
        recipient: sender._id,
        subject: 'Test Reply 1',
        content: 'This is a test reply from the script - incoming',
        read: true,
        draft: false,
        createdAt: new Date(Date.now() + 1000) // 1 second later
      },
      {
        sender: sender._id,
        recipient: recipient._id,
        subject: 'Test Message 2',
        content: 'This is another test message from the script - outgoing',
        read: false, 
        draft: false,
        createdAt: new Date(Date.now() + 2000) // 2 seconds later
      }
    ];

    // Save all messages
    for (const msgData of testMessages) {
      const message = new Message(msgData);
      await message.save();
      console.log(`Created message: ${message._id}`);
    }

    console.log('Successfully created test messages!');
  } catch (error) {
    console.error('Error creating test messages:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

async function testGetConversations() {
  try {
    console.log('Testing /messages/conversations API endpoint...');
    
    const response = await axios.get(`${API_URL}/api/messages/conversations`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });
    
    console.log('API Response Status:', response.status);
    console.log('API Response Data:', JSON.stringify(response.data, null, 2));
    
    if (Array.isArray(response.data)) {
      console.log(`Retrieved ${response.data.length} conversations`);
      
      if (response.data.length > 0) {
        console.log('First conversation details:');
        const conversation = response.data[0];
        console.log(`- User: ${conversation.user?.name || conversation.user?.email || 'Unknown'}`);
        console.log(`- Last message: ${conversation.lastMessage?.content?.substring(0, 50) || 'No content'}`);
        console.log(`- Unread count: ${conversation.unreadCount || 0}`);
      } else {
        console.log('No conversations found');
      }
    } else {
      console.log('Unexpected response format - not an array');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error testing conversations API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

async function main() {
  const command = process.argv[2];
  
  if (command === 'create') {
    await createTestMessages();
  } else if (command === 'test') {
    await testGetConversations();
  } else {
    console.log(`
Usage:
  node messageTestApi.js create  - Create test messages
  node messageTestApi.js test    - Test retrieving conversations
    `);
  }
}

main().catch(error => {
  console.error('Script error:', error);
  process.exit(1);
});