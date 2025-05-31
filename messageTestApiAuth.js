/**
 * Test script for messages API with proper authentication
 * 
 * This script:
 * 1. Logs in with test credentials
 * 2. Tests direct API calls to conversations endpoint
 * 3. Verifies token handling and response formats
 * 
 * Usage: node messageTestApiAuth.js
 */
import fetch from 'node-fetch';

// Configuration
const API_URL = 'http://localhost:5000';
const TEST_USER = {
  email: 'test@example.com',
  password: 'Test1234!'
};

// Global state
let authToken = null;
let userId = null;

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
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Login error:', data);
      return false;
    }
    
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
    
    // Test with token in query parameter
    console.log('\n> Testing with token query parameter');
    const queryParamResponse = await fetch(`${url}?token=${authToken}`, {
      method: 'GET'
    });
    
    await logResponse(queryParamResponse);
    
    // Test with credentials (cookies)
    console.log('\n> Testing with credentials (cookies)');
    const credentialsResponse = await fetch(url, {
      method: 'GET',
      credentials: 'include'
    });
    
    await logResponse(credentialsResponse);
    
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
    console.log(JSON.stringify(data, null, 2).substring(0, 500) + '...');
  } catch (error) {
    console.log('Could not parse response as JSON');
    const text = await response.text();
    console.log('Response text:');
    console.log(text.substring(0, 500) + '...');
  }
}

/**
 * Main function
 */
async function main() {
  const loginSuccess = await login();
  
  if (!loginSuccess) {
    console.error('❌ Cannot proceed without successful login');
    return;
  }
  
  await testConversations();
  
  console.log('\n--- Test completed ---');
}

main().catch(error => {
  console.error('❌ Unhandled error:', error);
});