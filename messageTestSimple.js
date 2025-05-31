/**
 * Simplified test script for messages API
 * 
 * This script makes direct API calls to test if the backend 
 * properly responds to message endpoints without requiring MongoDB
 * 
 * Usage: node messageTestSimple.js
 */
import fetch from 'node-fetch';

// Configuration
const API_URL = 'http://localhost:5000';

// Manual test token (if available) - for testing purposes only
// In a real application, you would obtain this through proper authentication
// Leave blank if no token is available
const TEST_TOKEN = '';

/**
 * Test conversation endpoints
 */
async function testConversations() {
  console.log('\n=== Testing Messages API ===\n');
  
  // Test endpoint variants
  await testEndpoint('/messages/conversations', 'Standard endpoint');
  await testEndpoint('/api/messages/conversations', 'With /api prefix');
}

/**
 * Test a specific endpoint
 */
async function testEndpoint(path, description) {
  const url = `${API_URL}${path}`;
  console.log(`Testing ${description}:`);
  console.log(`URL: ${url}\n`);
  
  // 1. Test without authentication (should fail)
  console.log('1. Without authentication:');
  try {
    const noAuthResponse = await fetch(url);
    await logResponse(noAuthResponse);
  } catch (error) {
    console.error(`Request failed: ${error.message}`);
  }
  console.log('\n' + '-'.repeat(50) + '\n');
  
  // 2. Test with mock token (if available)
  if (TEST_TOKEN) {
    console.log('2. With authentication token:');
    try {
      const authResponse = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`
        }
      });
      await logResponse(authResponse);
    } catch (error) {
      console.error(`Request failed: ${error.message}`);
    }
    console.log('\n' + '-'.repeat(50) + '\n');
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
  let responseText = '';
  try {
    responseText = await response.text();
    
    // Try to parse as JSON for pretty printing
    try {
      const jsonData = JSON.parse(responseText);
      console.log('\nResponse data (JSON):');
      console.log(JSON.stringify(jsonData, null, 2));
    } catch {
      // Not valid JSON, show as text
      console.log('\nResponse text:');
      console.log(responseText);
    }
  } catch (error) {
    console.log('Could not read response body');
  }
  
  // Analyze response
  if (response.ok) {
    console.log('\n✅ Request succeeded');
    
    if (responseText.includes('conversations') || responseText.includes('messages')) {
      console.log('✅ Response contains conversation or message data');
    } else {
      console.log('⚠️ Response does not contain expected conversation data');
    }
  } else {
    console.log('\n❌ Request failed');
    
    if (response.status === 401) {
      console.log('❌ Authentication required - This is expected without a valid token');
    } else if (response.status === 404) {
      console.log('❌ Endpoint not found - Check if routes are properly configured');
    } else {
      console.log(`❌ Other error (${response.status})`);
    }
  }
}

// Run the tests
testConversations().catch(error => {
  console.error('Fatal error:', error);
});