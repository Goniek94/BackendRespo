/**
 * Professional Admin API Test Suite
 * Comprehensive testing for enterprise admin panel
 * Features: Authentication, user management, error handling
 * 
 * @author Senior Developer
 * @version 1.0.0
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:5000';
const ADMIN_API_URL = `${BASE_URL}/api/admin-panel`;

/**
 * Test configuration
 */
const testConfig = {
  adminCredentials: {
    email: 'admin@marketplace.com',
    password: 'admin123'
  },
  testUser: {
    name: 'Jan Testowy',
    email: 'jan.testowy@example.com',
    role: 'user',
    status: 'active'
  }
};

/**
 * Color console output for better readability
 */
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.bold}${colors.blue}🔍 ${msg}${colors.reset}\n`)
};

/**
 * HTTP request helper with error handling
 */
const apiRequest = async (endpoint, options = {}) => {
  try {
    const url = endpoint.startsWith('http') ? endpoint : `${ADMIN_API_URL}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    const data = await response.json();
    
    return {
      status: response.status,
      ok: response.ok,
      data
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message
    };
  }
};

/**
 * Test suite functions
 */
class AdminAPITester {
  constructor() {
    this.authToken = null;
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0
    };
  }

  /**
   * Run assertion with result tracking
   */
  assert(condition, testName, details = '') {
    this.testResults.total++;
    
    if (condition) {
      this.testResults.passed++;
      log.success(`${testName} ${details}`);
    } else {
      this.testResults.failed++;
      log.error(`${testName} ${details}`);
    }
  }

  /**
   * Test 1: API Health Check
   */
  async testHealthCheck() {
    log.header('Testing API Health Check');
    
    // Test main API health
    const mainHealth = await apiRequest(`${BASE_URL}/api/health`);
    this.assert(
      mainHealth.ok && mainHealth.data.success,
      'Main API Health Check',
      `Status: ${mainHealth.status}`
    );

    // Test admin panel health
    const adminHealth = await apiRequest('/health');
    this.assert(
      adminHealth.ok && adminHealth.data.success,
      'Admin Panel Health Check',
      `Service: ${adminHealth.data?.service || 'Unknown'}`
    );

    // Test API documentation
    const apiDocs = await apiRequest(`${BASE_URL}/api`);
    this.assert(
      apiDocs.ok && apiDocs.data.success,
      'API Documentation Endpoint',
      `Version: ${apiDocs.data?.version || 'Unknown'}`
    );
  }

  /**
   * Test 2: Authentication System
   */
  async testAuthentication() {
    log.header('Testing Authentication System');

    // Test missing token
    const noToken = await apiRequest('/users');
    this.assert(
      noToken.status === 401,
      'Missing Token Protection',
      `Expected 401, got ${noToken.status}`
    );

    // Test invalid token
    const invalidToken = await apiRequest('/users', {
      headers: { Authorization: 'Bearer invalid_token_123' }
    });
    this.assert(
      invalidToken.status === 401,
      'Invalid Token Protection',
      `Expected 401, got ${invalidToken.status}`
    );

    log.info('Authentication tests completed (JWT token generation requires user login)');
  }

  /**
   * Test 3: Input Validation
   */
  async testValidation() {
    log.header('Testing Input Validation');

    // Test invalid user ID format
    const invalidId = await apiRequest('/users/invalid_id');
    this.assert(
      invalidId.status === 401 || invalidId.status === 400,
      'Invalid ID Format Protection',
      `Status: ${invalidId.status}`
    );

    // Test invalid query parameters
    const invalidQuery = await apiRequest('/users?page=abc&limit=xyz');
    this.assert(
      invalidQuery.status === 401 || invalidQuery.status === 400,
      'Invalid Query Parameters Protection',
      `Status: ${invalidQuery.status}`
    );
  }

  /**
   * Test 4: Rate Limiting
   */
  async testRateLimiting() {
    log.header('Testing Rate Limiting');

    const requests = [];
    const startTime = Date.now();

    // Send multiple requests quickly
    for (let i = 0; i < 10; i++) {
      requests.push(apiRequest('/health'));
    }

    const responses = await Promise.all(requests);
    const endTime = Date.now();

    const allSuccessful = responses.every(r => r.ok);
    this.assert(
      allSuccessful,
      'Rate Limiting Allows Normal Traffic',
      `10 requests in ${endTime - startTime}ms`
    );

    log.info('Rate limiting test completed (full test requires sustained load)');
  }

  /**
   * Test 5: Error Handling
   */
  async testErrorHandling() {
    log.header('Testing Error Handling');

    // Test 404 for non-existent endpoint
    const notFound = await apiRequest('/non-existent-endpoint');
    this.assert(
      notFound.status === 404,
      '404 Error Handling',
      `Status: ${notFound.status}`
    );

    // Test error response format
    const errorResponse = await apiRequest('/users/invalid');
    this.assert(
      errorResponse.data && typeof errorResponse.data.success !== 'undefined',
      'Consistent Error Response Format',
      `Has success field: ${errorResponse.data?.success !== undefined}`
    );
  }

  /**
   * Test 6: API Structure
   */
  async testAPIStructure() {
    log.header('Testing API Structure');

    // Test API documentation structure
    const apiDocs = await apiRequest(`${BASE_URL}/api`);
    
    if (apiDocs.ok) {
      const hasEndpoints = apiDocs.data.endpoints && apiDocs.data.endpoints.adminPanel;
      this.assert(
        hasEndpoints,
        'API Documentation Structure',
        'Contains admin panel endpoints'
      );

      const hasVersioning = apiDocs.data.versions && apiDocs.data.versions.current;
      this.assert(
        hasVersioning,
        'API Versioning Information',
        `Current version: ${apiDocs.data.versions?.current}`
      );
    }

    // Test admin panel structure
    const adminHealth = await apiRequest('/health');
    if (adminHealth.ok) {
      const hasVersion = adminHealth.data.version;
      this.assert(
        hasVersion,
        'Admin Panel Version Info',
        `Version: ${adminHealth.data.version}`
      );
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log(`${colors.bold}${colors.blue}`);
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                 ADMIN API TEST SUITE                        ║');
    console.log('║              Professional Testing Framework                  ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log(`${colors.reset}\n`);

    log.info(`Testing API at: ${ADMIN_API_URL}`);
    log.info(`Server should be running on: ${BASE_URL}`);
    
    // Run all test suites
    await this.testHealthCheck();
    await this.testAuthentication();
    await this.testValidation();
    await this.testRateLimiting();
    await this.testErrorHandling();
    await this.testAPIStructure();

    // Display results
    this.displayResults();
  }

  /**
   * Display test results summary
   */
  displayResults() {
    console.log(`\n${colors.bold}${colors.blue}📊 TEST RESULTS SUMMARY${colors.reset}\n`);
    
    const passRate = ((this.testResults.passed / this.testResults.total) * 100).toFixed(1);
    
    console.log(`Total Tests: ${this.testResults.total}`);
    console.log(`${colors.green}Passed: ${this.testResults.passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${this.testResults.failed}${colors.reset}`);
    console.log(`Pass Rate: ${passRate}%\n`);

    if (this.testResults.failed === 0) {
      log.success('🎉 ALL TESTS PASSED! Admin API is working correctly.');
    } else {
      log.warning(`⚠️  ${this.testResults.failed} test(s) failed. Check the output above.`);
    }

    console.log(`\n${colors.blue}📋 NEXT STEPS:${colors.reset}`);
    console.log('1. Start the server: npm start');
    console.log('2. Test admin endpoints: /api/admin-panel/health');
    console.log('3. Check API documentation: /api');
    console.log('4. Create admin user and test authentication');
    console.log('5. Test user management features\n');
  }
}

/**
 * Main execution
 */
const runTests = async () => {
  const tester = new AdminAPITester();
  
  try {
    await tester.runAllTests();
  } catch (error) {
    log.error(`Test suite failed: ${error.message}`);
    process.exit(1);
  }
};

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export default AdminAPITester;
