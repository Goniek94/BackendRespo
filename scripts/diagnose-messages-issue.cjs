const axios = require('axios');
require('dotenv').config();

async function diagnoseMessagesIssue() {
    console.log('🔍 Diagnosing Messages System Issues');
    console.log('====================================\n');

    const baseURL = 'http://localhost:5000';
    
    try {
        // Test 1: Check if messages routes are accessible
        console.log('📨 Step 1: Testing messages endpoints...');
        
        const endpoints = [
            '/api/messages/conversations',
            '/api/messages/test',
            '/api/communication/conversations',
            '/api/communication/test'
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await axios.get(`${baseURL}${endpoint}`, {
                    validateStatus: () => true,
                    timeout: 5000
                });
                
                console.log(`   ${endpoint}: ${response.status} - ${response.statusText}`);
                if (response.status === 401) {
                    console.log('     → Requires authentication');
                } else if (response.status === 404) {
                    console.log('     → Endpoint not found');
                } else if (response.status === 200) {
                    console.log('     → ✅ Working');
                }
            } catch (error) {
                console.log(`   ${endpoint}: ❌ Error - ${error.message}`);
            }
        }

        // Test 2: Check routes configuration
        console.log('\n🛣️  Step 2: Checking routes configuration...');
        
        try {
            const healthResponse = await axios.get(`${baseURL}/api/health`, {
                validateStatus: () => true
            });
            console.log(`   API Health: ${healthResponse.status}`);
            
            if (healthResponse.data && healthResponse.data.routes) {
                console.log('   Available routes:', healthResponse.data.routes);
            }
        } catch (error) {
            console.log('   Health check failed:', error.message);
        }

        // Test 3: Check if server is running and responding
        console.log('\n🖥️  Step 3: Testing server connectivity...');
        
        try {
            const serverResponse = await axios.get(`${baseURL}/`, {
                validateStatus: () => true,
                timeout: 3000
            });
            console.log(`   Server root: ${serverResponse.status}`);
            console.log(`   Response: ${JSON.stringify(serverResponse.data).substring(0, 100)}...`);
        } catch (error) {
            console.log('   Server connectivity failed:', error.message);
        }

        // Test 4: Check frontend API configuration
        console.log('\n🌐 Step 4: Checking potential API configuration issues...');
        
        // Check if the issue might be related to our recent changes
        console.log('   Recent changes that might affect messages:');
        console.log('   - Admin panel now uses localhost:5000 explicitly');
        console.log('   - Main app might still use relative URLs');
        console.log('   - Possible CORS issues between different API configurations');
        
        // Test CORS
        try {
            const corsResponse = await axios.options(`${baseURL}/api/messages/conversations`, {
                headers: {
                    'Origin': 'http://localhost:3000',
                    'Access-Control-Request-Method': 'GET'
                },
                validateStatus: () => true
            });
            console.log(`   CORS preflight: ${corsResponse.status}`);
            console.log(`   CORS headers: ${JSON.stringify(corsResponse.headers['access-control-allow-origin'])}`);
        } catch (error) {
            console.log('   CORS test failed:', error.message);
        }

        // Test 5: Check authentication with messages
        console.log('\n🔐 Step 5: Testing authentication with messages...');
        
        // Try to get a token first (simulate login)
        try {
            const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
                email: 'test@example.com',
                password: 'test123'
            }, {
                withCredentials: true,
                validateStatus: () => true
            });
            
            console.log(`   Login attempt: ${loginResponse.status}`);
            
            if (loginResponse.status === 200) {
                const cookies = loginResponse.headers['set-cookie'];
                
                // Try messages with authentication
                const messagesResponse = await axios.get(`${baseURL}/api/messages/conversations`, {
                    headers: {
                        'Cookie': cookies ? cookies.join('; ') : ''
                    },
                    withCredentials: true,
                    validateStatus: () => true
                });
                
                console.log(`   Messages with auth: ${messagesResponse.status}`);
            }
        } catch (error) {
            console.log('   Authentication test failed:', error.message);
        }

        console.log('\n📋 Summary:');
        console.log('   Check the results above to identify the issue.');
        console.log('   Common causes:');
        console.log('   1. Routes not properly registered');
        console.log('   2. Authentication middleware blocking requests');
        console.log('   3. CORS configuration issues');
        console.log('   4. Frontend pointing to wrong API endpoint');
        console.log('   5. Server not running or crashed');

    } catch (error) {
        console.error('❌ Diagnosis failed:', error.message);
    }
}

diagnoseMessagesIssue();
