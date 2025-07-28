const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testUserListings() {
    console.log('🧪 Testowanie pobierania ogłoszeń użytkownika...\n');
    
    try {
        // 1. Logowanie
        console.log('1️⃣ Logowanie użytkownika...');
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: 'mateusz.goszczycki1994@gmail.com',
            password: 'Nelusia321.'
        });
        
        console.log('✅ Logowanie udane');
        console.log('📋 Odpowiedź logowania:', {
            success: loginResponse.data.success,
            hasToken: !!loginResponse.data.token,
            hasRefreshToken: !!loginResponse.data.refreshToken,
            user: loginResponse.data.user?.email
        });
        
        const token = loginResponse.data.token;
        
        if (!token) {
            console.log('❌ Brak tokenu w odpowiedzi logowania!');
            return;
        }
        
        // 2. Test pobierania ogłoszeń użytkownika
        console.log('\n2️⃣ Pobieranie ogłoszeń użytkownika...');
        
        const userListingsResponse = await axios.get(`${API_BASE_URL}/ads/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Pobieranie ogłoszeń udane');
        console.log('📋 Ogłoszenia użytkownika:', {
            count: userListingsResponse.data.ads?.length || 0,
            ads: userListingsResponse.data.ads?.map(ad => ({
                id: ad._id,
                status: ad.status,
                listingType: ad.listingType
            }))
        });
        
        // 3. Test pobierania konwersacji
        console.log('\n3️⃣ Pobieranie konwersacji...');
        
        const conversationsResponse = await axios.get(`${API_BASE_URL}/messages/conversations?folder=inbox`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Pobieranie konwersacji udane');
        console.log('📋 Konwersacje:', {
            count: conversationsResponse.data.conversations?.length || 0
        });
        
    } catch (error) {
        console.log('❌ Błąd:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            console.log('🔐 Problem z uwierzytelnianiem - token może być nieprawidłowy');
        }
        
        if (error.response?.data) {
            console.log('📋 Szczegóły błędu:', error.response.data);
        }
    }
}

testUserListings();
