// Test script to check authentication and favorites functionality
import axios from 'axios';

const API_URL = 'http://localhost:5000';

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'password123'
};

async function testAuthAndFavorites() {
  try {
    console.log('🔐 Testing authentication and favorites...\n');

    // 1. Test login
    console.log('1. Testing login...');
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, testUser);
    
    if (loginResponse.data.success) {
      console.log('✅ Login successful');
      console.log('Token:', loginResponse.data.token ? 'Present' : 'Missing');
      console.log('User:', loginResponse.data.user?.email || 'No user data');
      
      const token = loginResponse.data.token;
      
      // 2. Test favorites endpoint with token
      console.log('\n2. Testing favorites endpoint...');
      
      const favoritesResponse = await axios.get(`${API_URL}/api/users/favorites`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Favorites endpoint working');
      console.log('Favorites count:', favoritesResponse.data?.length || 0);
      
      // 3. Test adding to favorites (need a real ad ID)
      console.log('\n3. Testing add to favorites...');
      
      // First get some ads to test with
      const adsResponse = await axios.get(`${API_URL}/api/ads?limit=1`);
      
      if (adsResponse.data.ads && adsResponse.data.ads.length > 0) {
        const testAdId = adsResponse.data.ads[0]._id;
        console.log('Using ad ID:', testAdId);
        
        const addFavoriteResponse = await axios.post(
          `${API_URL}/api/users/favorites/${testAdId}`,
          {},
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log('✅ Add to favorites working');
        console.log('Response:', addFavoriteResponse.data);
      } else {
        console.log('⚠️ No ads found to test favorites with');
      }
      
    } else {
      console.log('❌ Login failed:', loginResponse.data.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n🔍 401 Unauthorized - possible causes:');
      console.log('- User not logged in');
      console.log('- Token expired or invalid');
      console.log('- Token not being sent properly');
      console.log('- Backend auth middleware issue');
    }
  }
}

// Run the test
testAuthAndFavorites();
