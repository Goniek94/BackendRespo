import fetch from 'node-fetch';

/**
 * Test Admin Authentication System
 * Tests cookie-based authentication for admin panel
 * 
 * @author Senior Developer
 * @version 1.0.0
 */

const BASE_URL = 'http://localhost:3000';
const ADMIN_API_URL = `${BASE_URL}/api/admin-panel`;

// Test admin credentials (make sure this user exists and has admin role)
const ADMIN_CREDENTIALS = {
  email: 'admin@example.com',
  password: 'admin123'
};

/**
 * Helper function to make requests with cookies
 */
async function makeRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  return {
    status: response.status,
    data: await response.json(),
    cookies: response.headers.get('set-cookie')
  };
}

/**
 * Test admin login
 */
async function testAdminLogin() {
  console.log('\n🔐 Testing Admin Login...');
  
  try {
    const response = await makeRequest(`${ADMIN_API_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify(ADMIN_CREDENTIALS)
    });
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.cookies) {
      console.log('Cookies set:', response.cookies);
      return response.cookies;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Admin login failed:', error.message);
    return null;
  }
}

/**
 * Test admin auth check with cookies
 */
async function testAdminAuthCheck(cookies) {
  console.log('\n✅ Testing Admin Auth Check...');
  
  try {
    const response = await makeRequest(`${ADMIN_API_URL}/auth/check`, {
      method: 'GET',
      headers: {
        'Cookie': cookies
      }
    });
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    return response.status === 200;
  } catch (error) {
    console.error('❌ Admin auth check failed:', error.message);
    return false;
  }
}

/**
 * Test admin dashboard access
 */
async function testAdminDashboard(cookies) {
  console.log('\n📊 Testing Admin Dashboard Access...');
  
  try {
    const response = await makeRequest(`${ADMIN_API_URL}/dashboard`, {
      method: 'GET',
      headers: {
        'Cookie': cookies
      }
    });
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    return response.status === 200;
  } catch (error) {
    console.error('❌ Admin dashboard access failed:', error.message);
    return false;
  }
}

/**
 * Test admin logout
 */
async function testAdminLogout(cookies) {
  console.log('\n🚪 Testing Admin Logout...');
  
  try {
    const response = await makeRequest(`${ADMIN_API_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Cookie': cookies
      }
    });
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    return response.status === 200;
  } catch (error) {
    console.error('❌ Admin logout failed:', error.message);
    return false;
  }
}

/**
 * Test access without authentication
 */
async function testUnauthenticatedAccess() {
  console.log('\n🚫 Testing Unauthenticated Access...');
  
  try {
    const response = await makeRequest(`${ADMIN_API_URL}/auth/check`, {
      method: 'GET'
    });
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    return response.status === 401;
  } catch (error) {
    console.error('❌ Unauthenticated access test failed:', error.message);
    return false;
  }
}

/**
 * Test invalid credentials
 */
async function testInvalidCredentials() {
  console.log('\n❌ Testing Invalid Credentials...');
  
  try {
    const response = await makeRequest(`${ADMIN_API_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({
        email: 'invalid@example.com',
        password: 'wrongpassword'
      })
    });
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    return response.status === 401;
  } catch (error) {
    console.error('❌ Invalid credentials test failed:', error.message);
    return false;
  }
}

/**
 * Test API health check
 */
async function testApiHealth() {
  console.log('\n🏥 Testing API Health...');
  
  try {
    const response = await makeRequest(`${ADMIN_API_URL}/health`, {
      method: 'GET'
    });
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    return response.status === 200;
  } catch (error) {
    console.error('❌ API health check failed:', error.message);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting Admin Authentication System Tests');
  console.log('='.repeat(50));
  
  const results = {
    apiHealth: false,
    invalidCredentials: false,
    unauthenticatedAccess: false,
    adminLogin: false,
    adminAuthCheck: false,
    adminDashboard: false,
    adminLogout: false
  };
  
  // Test API health
  results.apiHealth = await testApiHealth();
  
  // Test invalid credentials
  results.invalidCredentials = await testInvalidCredentials();
  
  // Test unauthenticated access
  results.unauthenticatedAccess = await testUnauthenticatedAccess();
  
  // Test admin login
  const cookies = await testAdminLogin();
  if (cookies) {
    results.adminLogin = true;
    
    // Test authenticated requests
    results.adminAuthCheck = await testAdminAuthCheck(cookies);
    results.adminDashboard = await testAdminDashboard(cookies);
    results.adminLogout = await testAdminLogout(cookies);
  }
  
  // Print results
  console.log('\n📋 Test Results:');
  console.log('='.repeat(50));
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${test}`);
  });
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log('\n📊 Summary:');
  console.log(`${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Admin authentication system is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the implementation.');
  }
}

// Run tests
runTests().catch(console.error);
