#!/usr/bin/env node

/**
 * Debug Admin Frontend Connection
 * Sprawdza dokładnie co się dzieje z połączeniem admin frontend
 */

import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET;

// Test admin user data
const testAdminUser = {
  userId: '688b4aba9c0f2fecd035b20a',
  email: 'admin@example.com',
  role: 'admin'
};

console.log('🔍 Debug Admin Frontend Connection');
console.log('Backend URL:', BACKEND_URL);

async function debugAdminConnection() {
  console.log('\n📡 Test 1: Sprawdzenie czy admin ma rolę admin w bazie');
  
  try {
    // Generate admin token
    const adminToken = jwt.sign(testAdminUser, JWT_SECRET, { expiresIn: '1h' });
    
    const headers = {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
      'Cookie': `token=${adminToken}`
    };

    // Test auth check
    const authResponse = await fetch(`${BACKEND_URL}/api/admin-panel/auth/check`, {
      method: 'GET',
      headers: headers
    });
    
    console.log('Auth check status:', authResponse.status);
    
    if (authResponse.ok) {
      const authData = await authResponse.json();
      console.log('✅ Auth check OK');
      console.log('User data:', JSON.stringify(authData, null, 2));
    } else {
      const errorData = await authResponse.json().catch(() => ({}));
      console.log('❌ Auth check failed');
      console.log('Error:', errorData);
    }

  } catch (error) {
    console.log('❌ Auth test error:', error.message);
  }

  console.log('\n📡 Test 2: Sprawdzenie dashboard bez uwierzytelniania');
  
  try {
    const dashboardResponse = await fetch(`${BACKEND_URL}/api/admin-panel/dashboard`, {
      method: 'GET'
    });
    
    console.log('Dashboard bez auth status:', dashboardResponse.status);
    console.log('Expected: 401 (Unauthorized)');
    console.log('Result:', dashboardResponse.status === 401 ? '✅ POPRAWNE' : '❌ NIEPOPRAWNE');
    
  } catch (error) {
    console.log('❌ Dashboard test error:', error.message);
  }

  console.log('\n📡 Test 3: Symulacja frontend request');
  
  try {
    // Symuluj dokładnie to co robi frontend
    const frontendHeaders = {
      'Content-Type': 'application/json',
      'credentials': 'include'
    };

    console.log('Frontend headers:', frontendHeaders);
    
    const frontendResponse = await fetch(`${BACKEND_URL}/api/admin-panel/dashboard`, {
      method: 'GET',
      headers: frontendHeaders,
      credentials: 'include'
    });
    
    console.log('Frontend simulation status:', frontendResponse.status);
    
    if (frontendResponse.status === 431) {
      console.log('🚨 HTTP 431 - Request Header Fields Too Large!');
      console.log('Problem z rozmiarami nagłówków/cookies');
    }
    
  } catch (error) {
    console.log('❌ Frontend simulation error:', error.message);
  }

  console.log('\n📡 Test 4: Sprawdzenie cookies w przeglądarce');
  
  console.log('Instrukcje dla przeglądarki:');
  console.log('1. Otwórz DevTools (F12)');
  console.log('2. Idź do Application/Storage -> Cookies');
  console.log('3. Sprawdź czy są cookies: token, refreshToken');
  console.log('4. Sprawdź rozmiar cookies (powinny być < 4KB)');
  console.log('5. Jeśli cookies są za duże - wyczyść je');

  console.log('\n📡 Test 5: Sprawdzenie czy użytkownik ma rolę admin');
  
  try {
    // Test regular user check
    const userResponse = await fetch(`${BACKEND_URL}/api/v1/users/check`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwt.sign(testAdminUser, JWT_SECRET, { expiresIn: '1h' })}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (userResponse.ok) {
      const userData = await userResponse.json();
      console.log('✅ User check OK');
      console.log('User role:', userData.user?.role);
      console.log('Is admin?', ['admin', 'moderator'].includes(userData.user?.role));
    } else {
      console.log('❌ User check failed:', userResponse.status);
    }
    
  } catch (error) {
    console.log('❌ User check error:', error.message);
  }
}

// Uruchom debug
debugAdminConnection().then(() => {
  console.log('\n🏁 Debug Admin Frontend zakończony');
  console.log('\n💡 Rozwiązania:');
  console.log('1. Jeśli HTTP 431 - wyczyść cookies w przeglądarce');
  console.log('2. Jeśli brak roli admin - nadaj rolę admin użytkownikowi');
  console.log('3. Jeśli auth failed - sprawdź czy backend działa');
}).catch(error => {
  console.error('❌ Debug failed:', error);
});
