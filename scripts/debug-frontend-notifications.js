/**
 * Skrypt do debugowania problemu z powiadomieniami na frontendzie
 */

import fetch from 'node-fetch';
import mongoose from 'mongoose';
import config from '../config/index.js';
import User from '../models/user/user.js';
import jwt from 'jsonwebtoken';

const API_URL = 'http://localhost:5000';
const FRONTEND_URL = 'http://localhost:3000';
const TEST_EMAIL = 'mateusz.goszczycki1994@gmail.com';

const debugFrontendNotifications = async () => {
  try {
    console.log('🔍 DEBUGOWANIE PROBLEMU Z POWIADOMIENIAMI NA FRONTENDZIE');
    console.log('='.repeat(60));

    // 1. Połącz z bazą danych
    await mongoose.connect(config.database.uri);
    const user = await User.findOne({ email: TEST_EMAIL });
    if (!user) {
      console.log('❌ Użytkownik nie znaleziony');
      return;
    }

    // 2. Utwórz token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('\n🔍 PROBLEM 1: Sprawdzenie URL API');
    console.log('Backend API URL:', API_URL);
    console.log('Frontend URL:', FRONTEND_URL);
    
    // Test różnych endpointów
    const endpoints = [
      '/api/notifications',
      '/api/v1/notifications', 
      '/notifications'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${API_URL}${endpoint}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`${endpoint}: ${response.status} ${response.statusText}`);
      } catch (error) {
        console.log(`${endpoint}: ERROR - ${error.message}`);
      }
    }

    console.log('\n🔍 PROBLEM 2: Sprawdzenie CORS');
    try {
      const corsResponse = await fetch(`${API_URL}/api/notifications`, {
        method: 'OPTIONS',
        headers: {
          'Origin': FRONTEND_URL,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Authorization,Content-Type'
        }
      });
      console.log('CORS preflight status:', corsResponse.status);
      console.log('CORS headers:');
      corsResponse.headers.forEach((value, key) => {
        if (key.startsWith('access-control')) {
          console.log(`  ${key}: ${value}`);
        }
      });
    } catch (error) {
      console.log('CORS test failed:', error.message);
    }

    console.log('\n🔍 PROBLEM 3: Sprawdzenie formatu odpowiedzi API');
    const apiResponse = await fetch(`${API_URL}/api/notifications`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (apiResponse.ok) {
      const data = await apiResponse.json();
      console.log('✅ API Response structure:');
      console.log(`  - notifications: ${Array.isArray(data.notifications)} (length: ${data.notifications?.length || 0})`);
      console.log(`  - currentPage: ${data.currentPage}`);
      console.log(`  - totalPages: ${data.totalPages}`);
      console.log(`  - totalNotifications: ${data.totalNotifications}`);
      console.log(`  - unreadCount: ${data.unreadCount}`);
      
      if (data.notifications && data.notifications.length > 0) {
        console.log('\n📋 Przykładowe powiadomienie:');
        const sample = data.notifications[0];
        console.log(`  - id: ${sample.id} (type: ${typeof sample.id})`);
        console.log(`  - title: ${sample.title}`);
        console.log(`  - message: ${sample.message}`);
        console.log(`  - type: ${sample.type}`);
        console.log(`  - isRead: ${sample.isRead}`);
        console.log(`  - createdAt: ${sample.createdAt}`);
      }
    }

    console.log('\n🔍 PROBLEM 4: Sprawdzenie liczników');
    const countResponse = await fetch(`${API_URL}/api/notifications/unread-count`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (countResponse.ok) {
      const countData = await countResponse.json();
      console.log('✅ Unread count response:');
      console.log(`  - notifications: ${countData.notifications}`);
      console.log(`  - messages: ${countData.messages}`);
      console.log(`  - total/unreadCount: ${countData.total || countData.unreadCount}`);
    }

    console.log('\n🔍 PROBLEM 5: Sprawdzenie middleware auth');
    // Test bez tokenu
    const noAuthResponse = await fetch(`${API_URL}/api/notifications`);
    console.log('Request bez tokenu:', noAuthResponse.status, await noAuthResponse.text());

    // Test z błędnym tokenem
    const badAuthResponse = await fetch(`${API_URL}/api/notifications`, {
      headers: { 'Authorization': 'Bearer invalid-token' }
    });
    console.log('Request z błędnym tokenem:', badAuthResponse.status);

    console.log('\n🔍 PROBLEM 6: Sprawdzenie czy serwer działa na porcie 5000');
    try {
      const healthResponse = await fetch(`${API_URL}/api/health`);
      console.log('Health check:', healthResponse.status, await healthResponse.json());
    } catch (error) {
      console.log('❌ Serwer nie odpowiada na porcie 5000:', error.message);
    }

    console.log('\n🎯 MOŻLIWE PRZYCZYNY PROBLEMU:');
    console.log('1. Frontend używa błędnego URL API (sprawdź REACT_APP_API_URL)');
    console.log('2. Problem z autoryzacją - frontend nie wysyła tokenu');
    console.log('3. Problem z CORS - backend blokuje żądania z frontendu');
    console.log('4. Frontend nie obsługuje poprawnie odpowiedzi API');
    console.log('5. NotificationContext nie jest poprawnie zainicjalizowany');
    console.log('6. Błąd w komponencie Notifications.js');

    console.log('\n📋 NASTĘPNE KROKI:');
    console.log('1. Sprawdź konsolę przeglądarki na błędy');
    console.log('2. Sprawdź Network tab w DevTools');
    console.log('3. Sprawdź czy REACT_APP_API_URL=http://localhost:5000');
    console.log('4. Sprawdź czy użytkownik jest zalogowany');

  } catch (error) {
    console.error('❌ Błąd podczas debugowania:', error);
  } finally {
    await mongoose.disconnect();
  }
};

debugFrontendNotifications();
