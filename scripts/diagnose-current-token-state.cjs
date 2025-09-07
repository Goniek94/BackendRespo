const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function diagnoseCurrentTokenState() {
    console.log('🔍 Diagnosing Current Token State');
    console.log('=================================\n');

    const baseURL = 'http://localhost:5000';
    
    try {
        // Test 1: Check current auth status
        console.log('🔐 Step 1: Checking current authentication status...');
        
        const authCheckResponse = await axios.get(`${baseURL}/api/auth/check`, {
            withCredentials: true,
            validateStatus: () => true,
            timeout: 10000
        });
        
        console.log(`   Auth check status: ${authCheckResponse.status}`);
        
        if (authCheckResponse.status === 200) {
            console.log('✅ User is authenticated');
            console.log(`   User data: ${JSON.stringify(authCheckResponse.data.user, null, 2)}`);
        } else if (authCheckResponse.status === 401) {
            console.log('❌ User is not authenticated');
            console.log(`   Response: ${JSON.stringify(authCheckResponse.data)}`);
        } else if (authCheckResponse.status === 431) {
            console.log('❌ HTTP 431 - Request Header Fields Too Large');
            console.log('   This means cookies/headers are too big');
        } else {
            console.log(`⚠️  Unexpected status: ${authCheckResponse.status}`);
            console.log(`   Response: ${JSON.stringify(authCheckResponse.data)}`);
        }

        // Test 2: Try to login with a fresh session
        console.log('\n🔑 Step 2: Attempting fresh login...');
        
        const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
            email: 'mateusz.goszczycki1994@gmail.com',
            password: 'test123'
        }, {
            withCredentials: true,
            validateStatus: () => true,
            timeout: 10000
        });
        
        console.log(`   Login status: ${loginResponse.status}`);
        
        if (loginResponse.status === 200) {
            console.log('✅ Login successful');
            
            const cookies = loginResponse.headers['set-cookie'];
            console.log(`   Cookies received: ${cookies ? cookies.length : 0}`);
            
            if (cookies) {
                cookies.forEach(cookie => {
                    const cookieName = cookie.split('=')[0];
                    const cookieValue = cookie.split('=')[1].split(';')[0];
                    console.log(`   - ${cookieName}: ${cookieValue.substring(0, 30)}...`);
                    
                    // Decode token if it's a JWT
                    if (cookieName === 'token' && cookieValue) {
                        try {
                            const decoded = jwt.decode(cookieValue);
                            console.log(`     Token payload: ${JSON.stringify(decoded, null, 4)}`);
                        } catch (error) {
                            console.log(`     Failed to decode token: ${error.message}`);
                        }
                    }
                });
            }
            
            // Test messages with fresh token
            console.log('\n📨 Step 3: Testing messages with fresh token...');
            
            const messagesResponse = await axios.get(`${baseURL}/api/messages/conversations`, {
                headers: {
                    'Cookie': cookies ? cookies.join('; ') : ''
                },
                withCredentials: true,
                validateStatus: () => true,
                timeout: 10000
            });
            
            console.log(`   Messages status: ${messagesResponse.status}`);
            
            if (messagesResponse.status === 200) {
                console.log('✅ Messages work with fresh token');
                console.log(`   Conversations: ${messagesResponse.data.length || 0}`);
            } else if (messagesResponse.status === 401) {
                console.log('❌ Messages require authentication (token invalid)');
                console.log(`   Response: ${JSON.stringify(messagesResponse.data)}`);
            } else if (messagesResponse.status === 431) {
                console.log('❌ HTTP 431 - Headers too large even with fresh token');
            } else {
                console.log(`⚠️  Messages unexpected status: ${messagesResponse.status}`);
                console.log(`   Response: ${JSON.stringify(messagesResponse.data)}`);
            }
            
        } else if (loginResponse.status === 401) {
            console.log('❌ Login failed - invalid credentials');
            console.log(`   Response: ${JSON.stringify(loginResponse.data)}`);
        } else if (loginResponse.status === 431) {
            console.log('❌ HTTP 431 - Headers too large during login');
        } else {
            console.log(`⚠️  Login unexpected status: ${loginResponse.status}`);
            console.log(`   Response: ${JSON.stringify(loginResponse.data)}`);
        }

        // Test 3: Check server health
        console.log('\n🏥 Step 4: Checking server health...');
        
        const healthResponse = await axios.get(`${baseURL}/api/health`, {
            validateStatus: () => true,
            timeout: 5000
        });
        
        console.log(`   Health status: ${healthResponse.status}`);
        
        if (healthResponse.status === 200) {
            console.log('✅ Server is healthy');
        } else {
            console.log('❌ Server health issues');
        }

        console.log('\n📋 Summary:');
        console.log('   Check the results above to identify the token issue');
        console.log('   Common causes:');
        console.log('   1. Token expired or invalid');
        console.log('   2. HTTP 431 - cookies/headers too large');
        console.log('   3. Authentication middleware issues');
        console.log('   4. Database connection problems');

    } catch (error) {
        console.error('❌ Diagnosis failed:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('   Server is not running or not accessible');
        } else if (error.code === 'ETIMEDOUT') {
            console.log('   Request timed out - server may be overloaded');
        } else if (error.response) {
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
        }
    }
}

diagnoseCurrentTokenState();
