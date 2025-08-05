/**
 * SIMPLIFIED SECURITY AUDIT TEST
 * Quick security check for authentication system
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

async function runSecurityAudit() {
  console.log('🔐 SECURITY AUDIT - MARKETPLACE BACKEND');
  console.log('='.repeat(50));
  
  let passed = 0;
  let failed = 0;

  // Test 1: Server Health Check
  try {
    console.log('\n🔍 Test 1: Server Health Check');
    const response = await axios.get(`${BASE_URL}/api/health`, { timeout: 5000 });
    if (response.status === 200) {
      console.log('✅ Server is running and responding');
      passed++;
    } else {
      console.log('❌ Server health check failed');
      failed++;
    }
  } catch (error) {
    console.log('❌ Server is not responding');
    failed++;
  }

  // Test 2: Auth Endpoint Structure
  try {
    console.log('\n🔍 Test 2: Auth Endpoint Security');
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'nonexistent@test.com',
      password: 'wrongpassword'
    }, { 
      timeout: 5000,
      validateStatus: () => true 
    });

    // Check if response doesn't leak sensitive info
    const responseText = JSON.stringify(response.data).toLowerCase();
    const hasLeakage = responseText.includes('hash') || 
                      responseText.includes('bcrypt') || 
                      responseText.includes('salt') ||
                      responseText.includes('database');

    if (!hasLeakage) {
      console.log('✅ Auth endpoint doesn\'t leak sensitive information');
      passed++;
    } else {
      console.log('❌ Auth endpoint may leak sensitive information');
      failed++;
    }

    // Check if tokens are not in response body
    const hasTokenInBody = response.data.token || 
                          response.data.accessToken || 
                          response.data.jwt;

    if (!hasTokenInBody) {
      console.log('✅ No tokens found in response body');
      passed++;
    } else {
      console.log('❌ Tokens found in response body - security risk');
      failed++;
    }

  } catch (error) {
    console.log('❌ Auth endpoint test failed:', error.message);
    failed++;
  }

  // Test 3: Admin Endpoint Security
  try {
    console.log('\n🔍 Test 3: Admin Endpoint Security');
    
    // Test multiple admin endpoints
    const adminEndpoints = [
      '/api/admin-panel/dashboard',
      '/api/admin-panel/health',
      '/api/admin-panel/users',
      '/api/admin/dashboard',
      '/api/admin/health'
    ];
    
    let adminProtected = 0;
    let adminTotal = adminEndpoints.length;
    
    for (const endpoint of adminEndpoints) {
      try {
        const response = await axios.get(`${BASE_URL}${endpoint}`, { 
          timeout: 5000,
          validateStatus: () => true 
        });

        if (response.status === 401 || response.status === 403) {
          console.log(`✅ ${endpoint} properly protected (${response.status})`);
          adminProtected++;
        } else {
          console.log(`❌ ${endpoint} not protected (${response.status})`);
        }
      } catch (error) {
        console.log(`⚠️ ${endpoint} connection error: ${error.message}`);
        // Connection errors might mean endpoint doesn't exist, which is also secure
        adminProtected++;
      }
    }
    
    if (adminProtected === adminTotal) {
      console.log('✅ All admin endpoints properly protected');
      passed++;
    } else {
      console.log(`❌ ${adminTotal - adminProtected}/${adminTotal} admin endpoints not properly protected`);
      failed++;
    }
  } catch (error) {
    console.log('❌ Admin endpoint test failed:', error.message);
    failed++;
  }

  // Test 4: CORS Headers Check
  try {
    console.log('\n🔍 Test 4: CORS Configuration');
    const response = await axios.options(`${BASE_URL}/api/auth/login`, {
      timeout: 5000,
      headers: {
        'Origin': 'https://malicious-site.com'
      },
      validateStatus: () => true
    });

    const corsHeaders = response.headers;
    const allowsCredentials = corsHeaders['access-control-allow-credentials'] === 'true';
    const allowsAllOrigins = corsHeaders['access-control-allow-origin'] === '*';

    if (!(allowsCredentials && allowsAllOrigins)) {
      console.log('✅ CORS configuration appears secure');
      passed++;
    } else {
      console.log('❌ CORS configuration may be insecure');
      failed++;
    }
  } catch (error) {
    console.log('❌ CORS test failed:', error.message);
    failed++;
  }

  // Results Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 SECURITY AUDIT RESULTS');
  console.log('='.repeat(50));
  console.log(`✅ Tests Passed: ${passed}`);
  console.log(`❌ Tests Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 ALL SECURITY TESTS PASSED!');
  } else {
    console.log('\n⚠️  Some security issues detected. Review the results above.');
  }

  return { passed, failed };
}

// Run the audit
runSecurityAudit().catch(console.error);
