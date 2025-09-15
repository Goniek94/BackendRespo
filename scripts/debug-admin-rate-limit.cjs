const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function debugAdminRateLimit() {
    console.log('🔍 Debugowanie rate limiting dla adminów...\n');

    try {
        // 1. Logowanie
        console.log('1. Logowanie jako admin...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'mateusz.goszczycki1994@gmail.com',
            password: 'Admin123!'
        });

        if (loginResponse.status !== 200) {
            console.log('❌ Błąd logowania');
            return;
        }

        console.log('✅ Logowanie pomyślne');
        const cookies = loginResponse.headers['set-cookie'];

        // 2. Test endpointu z informacjami o użytkowniku
        console.log('\n2. Sprawdzanie informacji o użytkowniku...');
        
        try {
            const userInfoResponse = await axios.get(`${BASE_URL}/api/users/profile`, {
                headers: {
                    'Cookie': cookies.join('; ')
                }
            });
            
            console.log('✅ Profil użytkownika:', {
                email: userInfoResponse.data.email,
                role: userInfoResponse.data.role,
                status: userInfoResponse.data.status
            });
        } catch (error) {
            console.log('⚠️ Nie można pobrać profilu użytkownika');
        }

        // 3. Test dodawania ogłoszenia z minimalną ilością danych
        console.log('\n3. Test dodawania ogłoszenia (minimal data)...');
        
        const minimalAdData = {
            brand: 'AUDI',
            model: 'A4',
            year: '2019',
            price: '85000',
            mileage: '120000',
            description: 'Test ogłoszenia admin',
            fuelType: 'diesel',
            transmission: 'automatyczna',
            bodyType: 'sedan',
            color: 'CZARNY',
            condition: 'używany',
            voivodeship: 'mazowieckie',
            city: 'Warszawa',
            sellerType: 'prywatny',
            listingType: 'standardowe',
            purchaseOptions: 'sprzedaż',
            headline: 'Test Admin - Rate Limit',
            images: [
                'https://zcxakmniknrtvtnyetxd.supabase.co/storage/v1/object/public/autosell/test-image.jpg',
                'https://zcxakmniknrtvtnyetxd.supabase.co/storage/v1/object/public/autosell/test-image2.jpg',
                'https://zcxakmniknrtvtnyetxd.supabase.co/storage/v1/object/public/autosell/test-image3.jpg',
                'https://zcxakmniknrtvtnyetxd.supabase.co/storage/v1/object/public/autosell/test-image4.jpg',
                'https://zcxakmniknrtvtnyetxd.supabase.co/storage/v1/object/public/autosell/test-image5.jpg'
            ]
        };

        try {
            const addResponse = await axios.post(`${BASE_URL}/api/ads/add`, minimalAdData, {
                headers: {
                    'Cookie': cookies.join('; '),
                    'Content-Type': 'application/json'
                }
            });

            console.log('✅ SUKCES! Ogłoszenie dodane:', {
                status: addResponse.status,
                id: addResponse.data.ad?._id,
                title: addResponse.data.ad?.headline
            });

        } catch (error) {
            console.log('❌ BŁĄD podczas dodawania ogłoszenia:');
            console.log('Status:', error.response?.status);
            console.log('Message:', error.response?.data?.message || error.message);
            
            if (error.response?.status === 429) {
                console.log('🚨 RATE LIMITING AKTYWNY - admin nie jest pomijany!');
                console.log('Sprawdzę middleware auth...');
            }
        }

        // 4. Test kolejnego ogłoszenia (powinien przejść dla admina)
        console.log('\n4. Test drugiego ogłoszenia (admin powinien móc)...');
        
        const secondAdData = {
            ...minimalAdData,
            headline: 'Test Admin - Drugie ogłoszenie',
            description: 'Drugie ogłoszenie testowe admin'
        };

        try {
            const secondResponse = await axios.post(`${BASE_URL}/api/ads/add`, secondAdData, {
                headers: {
                    'Cookie': cookies.join('; '),
                    'Content-Type': 'application/json'
                }
            });

            console.log('✅ SUKCES! Drugie ogłoszenie dodane - rate limiting pomija admina!');

        } catch (error) {
            if (error.response?.status === 429) {
                console.log('❌ PROBLEM: Rate limiting NIE pomija admina!');
                console.log('Sprawdzę kod middleware...');
            } else {
                console.log('❌ Inny błąd:', error.response?.data?.message || error.message);
            }
        }

    } catch (error) {
        console.error('❌ Ogólny błąd:', error.message);
    }
}

debugAdminRateLimit();
