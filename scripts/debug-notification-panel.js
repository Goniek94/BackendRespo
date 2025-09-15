#!/usr/bin/env node

/**
 * DEBUGOWANIE PANELU POWIADOMIEŃ
 * 
 * Ten skrypt sprawdza:
 * 1. Czy powiadomienia są w bazie danych
 * 2. Czy API endpoint zwraca dane
 * 3. Czy frontend może je odebrać
 * 4. Gdzie jest problem w komunikacji
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Notification from '../models/communication/notification.js';
import User from '../models/user/user.js';
import fetch from 'node-fetch';

console.log('🔍 DEBUGOWANIE PANELU POWIADOMIEŃ');
console.log('=================================');

async function debugNotificationPanel() {
  try {
    // 1. POŁĄCZENIE Z BAZĄ DANYCH
    console.log('\n1️⃣ Łączenie z bazą danych...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Połączono z MongoDB');

    // 2. SPRAWDZENIE UŻYTKOWNIKÓW
    console.log('\n2️⃣ Sprawdzanie użytkowników...');
    const users = await User.find().select('_id name email role').limit(3);
    console.log(`📊 Znaleziono ${users.length} użytkowników:`);
    users.forEach(user => {
      console.log(`   👤 ${user.name || user.email} (${user._id}) - ${user.role}`);
    });

    if (users.length === 0) {
      console.log('❌ Brak użytkowników w bazie');
      return;
    }

    const testUser = users[0];
    console.log(`🎯 Testowy użytkownik: ${testUser.name || testUser.email}`);

    // 3. SPRAWDZENIE POWIADOMIEŃ W BAZIE
    console.log('\n3️⃣ Sprawdzanie powiadomień w bazie danych...');
    const allNotifications = await Notification.find({ user: testUser._id })
      .sort({ createdAt: -1 })
      .limit(10);
    
    console.log(`📊 Znaleziono ${allNotifications.length} powiadomień dla użytkownika:`);
    allNotifications.forEach((notif, index) => {
      console.log(`   ${index + 1}. "${notif.title}" - ${notif.type} - ${notif.isRead ? '✅ przeczytane' : '🔔 nieprzeczytane'}`);
      console.log(`      📅 ${notif.createdAt.toLocaleString('pl-PL')}`);
      console.log(`      💬 ${notif.message}`);
    });

    // 4. SPRAWDZENIE LICZNIKA NIEPRZECZYTANYCH
    console.log('\n4️⃣ Sprawdzanie licznika nieprzeczytanych...');
    const unreadCount = await Notification.countDocuments({ 
      user: testUser._id, 
      isRead: false 
    });
    console.log(`🔢 Nieprzeczytane powiadomienia: ${unreadCount}`);

    // 5. TEST API ENDPOINT BEZ AUTORYZACJI
    console.log('\n5️⃣ Test API endpoint (bez autoryzacji)...');
    try {
      const response = await fetch('http://localhost:5000/api/notifications');
      console.log(`📊 Status odpowiedzi: ${response.status}`);
      
      if (response.status === 401) {
        console.log('🔐 Endpoint wymaga autoryzacji (to jest poprawne)');
      } else if (response.ok) {
        const data = await response.json();
        console.log('📦 Dane z API:', data);
      } else {
        console.log(`❌ Błąd API: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Błąd połączenia z API: ${error.message}`);
    }

    // 6. TEST ENDPOINT UNREAD-COUNT
    console.log('\n6️⃣ Test endpoint unread-count...');
    try {
      const response = await fetch('http://localhost:5000/api/notifications/unread-count');
      console.log(`📊 Status odpowiedzi: ${response.status}`);
      
      if (response.status === 401) {
        console.log('🔐 Endpoint wymaga autoryzacji (to jest poprawne)');
      } else if (response.ok) {
        const data = await response.json();
        console.log('📦 Dane z unread-count:', data);
      }
    } catch (error) {
      console.log(`❌ Błąd unread-count: ${error.message}`);
    }

    // 7. SPRAWDZENIE STRUKTURY POWIADOMIENIA
    console.log('\n7️⃣ Sprawdzanie struktury powiadomień...');
    if (allNotifications.length > 0) {
      const sampleNotification = allNotifications[0];
      console.log('📋 Struktura przykładowego powiadomienia:');
      console.log('   🆔 _id:', sampleNotification._id);
      console.log('   👤 user:', sampleNotification.user);
      console.log('   👤 userId:', sampleNotification.userId);
      console.log('   📝 title:', sampleNotification.title);
      console.log('   💬 message:', sampleNotification.message);
      console.log('   🏷️ type:', sampleNotification.type);
      console.log('   ✅ isRead:', sampleNotification.isRead);
      console.log('   🔗 link:', sampleNotification.link);
      console.log('   📅 createdAt:', sampleNotification.createdAt);
      
      // Test metody toApiResponse
      if (typeof sampleNotification.toApiResponse === 'function') {
        console.log('✅ Metoda toApiResponse() istnieje');
        const apiFormat = sampleNotification.toApiResponse();
        console.log('📦 Format API:', apiFormat);
      } else {
        console.log('❌ Brak metody toApiResponse()');
      }
    }

    // 8. PODSUMOWANIE PROBLEMÓW
    console.log('\n8️⃣ DIAGNOZA PROBLEMÓW:');
    console.log('========================');
    
    if (allNotifications.length === 0) {
      console.log('❌ PROBLEM: Brak powiadomień w bazie danych');
      console.log('💡 ROZWIĄZANIE: Utwórz testowe powiadomienia');
    } else {
      console.log('✅ Powiadomienia są w bazie danych');
    }
    
    console.log('\n🔧 MOŻLIWE PRZYCZYNY PROBLEMU:');
    console.log('1. Frontend nie jest zalogowany (brak tokenu autoryzacji)');
    console.log('2. Frontend wywołuje niewłaściwy endpoint');
    console.log('3. Problem z CORS między frontend a backend');
    console.log('4. Frontend używa niewłaściwego userId');
    console.log('5. Problem z formatem danych zwracanych przez API');
    
    console.log('\n🎯 NASTĘPNE KROKI:');
    console.log('1. Sprawdź logi przeglądarki (F12 -> Console)');
    console.log('2. Sprawdź Network tab czy API calls są wysyłane');
    console.log('3. Sprawdź czy użytkownik jest zalogowany w frontend');
    console.log('4. Sprawdź czy frontend używa poprawnego URL backendu');

  } catch (error) {
    console.error('\n❌ BŁĄD PODCZAS DEBUGOWANIA:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Zamknięto połączenie z bazą danych');
  }
}

debugNotificationPanel();
