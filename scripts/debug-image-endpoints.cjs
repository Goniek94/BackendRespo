const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function debugImageEndpoints() {
  console.log('🔍 Debugowanie endpointów zdjęć...\n');

  try {
    // 1. Test featured listings
    console.log('1. Test featured listings...');
    const featuredResponse = await axios.get(`${BASE_URL}/api/ads/rotated`);
    const featuredAds = featuredResponse.data.ads || [];
    
    if (featuredAds.length > 0) {
      const firstFeatured = featuredAds[0];
      console.log(`✅ Featured ads: ${featuredAds.length} ogłoszeń`);
      console.log(`📸 Pierwsze ogłoszenie - images:`, firstFeatured.images ? firstFeatured.images.slice(0, 2) : 'BRAK');
      console.log(`📸 Pierwsze ogłoszenie - mainImage:`, firstFeatured.mainImage || 'BRAK');
    } else {
      console.log('❌ Brak featured ads');
    }

    // 2. Test search/list
    console.log('\n2. Test search/list...');
    const searchResponse = await axios.get(`${BASE_URL}/api/ads/search?limit=5`);
    const searchAds = searchResponse.data.ads || [];
    
    if (searchAds.length > 0) {
      const firstSearch = searchAds[0];
      console.log(`✅ Search ads: ${searchAds.length} ogłoszeń`);
      console.log(`📸 Pierwsze ogłoszenie - images:`, firstSearch.images ? firstSearch.images.slice(0, 2) : 'BRAK');
      console.log(`📸 Pierwsze ogłoszenie - mainImage:`, firstSearch.mainImage || 'BRAK');
    } else {
      console.log('❌ Brak search ads');
    }

    // 3. Test szczegółów ogłoszenia
    if (searchAds.length > 0) {
      const adId = searchAds[0]._id;
      console.log(`\n3. Test szczegółów ogłoszenia (ID: ${adId})...`);
      
      const detailResponse = await axios.get(`${BASE_URL}/api/ads/${adId}`);
      const adDetail = detailResponse.data.ad || detailResponse.data;
      
      console.log(`📸 Szczegóły - images:`, adDetail.images ? adDetail.images.slice(0, 2) : 'BRAK');
      console.log(`📸 Szczegóły - mainImage:`, adDetail.mainImage || 'BRAK');
    }

    // 4. Sprawdź różnice w strukturze
    console.log('\n4. Analiza różnic...');
    
    if (featuredAds.length > 0 && searchAds.length > 0) {
      const featured = featuredAds[0];
      const search = searchAds[0];
      
      console.log('\n=== PORÓWNANIE STRUKTURY ===');
      console.log('Featured images type:', typeof featured.images, Array.isArray(featured.images));
      console.log('Search images type:', typeof search.images, Array.isArray(search.images));
      
      if (featured.images && featured.images.length > 0) {
        console.log('Featured first image:', featured.images[0]);
      }
      if (search.images && search.images.length > 0) {
        console.log('Search first image:', search.images[0]);
      }
    }

  } catch (error) {
    console.error('❌ Błąd:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

debugImageEndpoints();
