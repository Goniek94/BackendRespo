#!/usr/bin/env node

/**
 * SKRYPT NAPRAWY SYSTEMU POWIADOMIEŃ
 * 
 * Diagnozuje i naprawia problemy z systemem powiadomień:
 * 1. Sprawdza połączenie z bazą danych
 * 2. Weryfikuje model powiadomień
 * 3. Testuje API endpoints
 * 4. Sprawdza Socket.IO
 * 5. Tworzy testowe powiadomienia
 * 6. Naprawia zidentyfikowane problemy
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { io } from 'socket.io-client';

// Import modeli i serwisów
import Notification from '../models/communication/notification.js';
import User from '../models/user/user.js';
import notificationManager from '../services/notificationManager.js';
import socketService from '../services/socketService.js';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

class NotificationSystemFixer {
  constructor() {
    this.issues = [];
    this.fixes = [];
    this.testUser = null;
    this.testToken = null;
    this.socketClient = null;
  }

  /**
   * Główna funkcja naprawy
   */
  async fix() {
    console.log('🔧 ROZPOCZYNAM NAPRAWĘ SYSTEMU POWIADOMIEŃ\n');

    try {
      // 1. Połączenie z bazą danych
      await this.connectToDatabase();

      // 2. Sprawdzenie modeli
      await this.checkModels();

      // 3. Utworzenie użytkownika testowego
      await this.createTestUser();

      // 4. Testowanie API endpoints
      await this.testAPIEndpoints();

      // 5. Testowanie Socket.IO
      await this.testSocketIO();

      // 6. Testowanie NotificationManager
      await this.testNotificationManager();

      // 7. Podsumowanie i naprawy
      await this.summarizeAndFix();

    } catch (error) {
      console.error('❌ Błąd podczas naprawy:', error.message);
      console.error(error.stack);
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Połączenie z bazą danych
   */
  async connectToDatabase() {
    console.log('📊 Sprawdzam połączenie z bazą danych...');
    
    try {
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/marketplace-dev');
      }
      
      console.log('✅ Połączenie z bazą danych: OK');
    } catch (error) {
      this.issues.push({
        type: 'database',
        message: 'Brak połączenia z bazą danych',
        error: error.message
      });
      console.log('❌ Połączenie z bazą danych: BŁĄD');
      throw error;
    }
  }

  /**
   * Sprawdzenie modeli
   */
  async checkModels() {
    console.log('\n📋 Sprawdzam modele danych...');

    try {
      // Sprawdź model Notification
      const notificationCount = await Notification.countDocuments();
      console.log(`✅ Model Notification: OK (${notificationCount} dokumentów)`);

      // Sprawdź model User
      const userCount = await User.countDocuments();
      console.log(`✅ Model User: OK (${userCount} dokumentów)`);

      // Sprawdź indeksy
      const notificationIndexes = await Notification.collection.getIndexes();
      console.log(`✅ Indeksy Notification: ${Object.keys(notificationIndexes).length}`);

    } catch (error) {
      this.issues.push({
        type: 'models',
        message: 'Problem z modelami danych',
        error: error.message
      });
      console.log('❌ Modele danych: BŁĄD');
    }
  }

  /**
   * Utworzenie użytkownika testowego
   */
  async createTestUser() {
    console.log('\n👤 Tworzę użytkownika testowego...');

    try {
      // Sprawdź czy użytkownik testowy już istnieje
      let testUser = await User.findOne({ email: 'test-notifications@example.com' });
      
      if (!testUser) {
        testUser = new User({
          email: 'test-notifications@example.com',
          password: 'hashedPassword123',
          firstName: 'Test',
          lastName: 'Notifications',
          isVerified: true,
          role: 'user'
        });
        await testUser.save();
        console.log('✅ Utworzono użytkownika testowego');
      } else {
        console.log('✅ Użytkownik testowy już istnieje');
      }

      this.testUser = testUser;

      // Utwórz token JWT
      this.testToken = jwt.sign(
        { 
          userId: testUser._id.toString(),
          email: testUser.email,
          role: testUser.role 
        },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '1h' }
      );

      console.log('✅ Token JWT utworzony');

    } catch (error) {
      this.issues.push({
        type: 'test-user',
        message: 'Nie można utworzyć użytkownika testowego',
        error: error.message
      });
      console.log('❌ Użytkownik testowy: BŁĄD');
    }
  }

  /**
   * Testowanie API endpoints
   */
  async testAPIEndpoints() {
    console.log('\n🌐 Testuję API endpoints...');

    if (!this.testToken) {
      console.log('❌ Brak tokenu - pomijam testy API');
      return;
    }

    const headers = {
      'Authorization': `Bearer ${this.testToken}`,
      'Content-Type': 'application/json',
      'Cookie': `token=${this.testToken}`
    };

    const tests = [
      {
        name: 'GET /api/notifications',
        method: 'get',
        url: `${API_BASE_URL}/api/notifications`
      },
      {
        name: 'GET /api/notifications/unread-count',
        method: 'get',
        url: `${API_BASE_URL}/api/notifications/unread-count`
      },
      {
        name: 'POST /api/notifications/test-create',
        method: 'post',
        url: `${API_BASE_URL}/api/notifications/test-create`,
        data: {
          type: 'SYSTEM_NOTIFICATION',
          title: 'Test powiadomienia',
          message: 'To jest testowe powiadomienie utworzone przez skrypt naprawy'
        }
      }
    ];

    for (const test of tests) {
      try {
        console.log(`  Testuję: ${test.name}`);
        
        const config = {
          method: test.method,
          url: test.url,
          headers: headers,
          timeout: 10000,
          withCredentials: true
        };

        if (test.data) {
          config.data = test.data;
        }

        const response = await axios(config);
        console.log(`  ✅ ${test.name}: OK (${response.status})`);
        
        if (test.name.includes('test-create') && response.data.success) {
          console.log(`    📝 Utworzono powiadomienie: ${response.data.notification.id}`);
        }

      } catch (error) {
        const status = error.response?.status || 'NO_RESPONSE';
        const message = error.response?.data?.message || error.message;
        
        this.issues.push({
          type: 'api',
          endpoint: test.name,
          message: `API endpoint nie działa: ${message}`,
          status: status,
          error: error.message
        });
        
        console.log(`  ❌ ${test.name}: BŁĄD (${status}) - ${message}`);
      }
    }
  }

  /**
   * Testowanie Socket.IO
   */
  async testSocketIO() {
    console.log('\n🔌 Testuję Socket.IO...');

    if (!this.testToken) {
      console.log('❌ Brak tokenu - pomijam testy Socket.IO');
      return;
    }

    return new Promise((resolve) => {
      try {
        this.socketClient = io(API_BASE_URL, {
          auth: {
            token: this.testToken
          },
          extraHeaders: {
            'Cookie': `token=${this.testToken}`
          },
          withCredentials: true,
          timeout: 10000
        });

        let connected = false;
        let connectionSuccess = false;

        // Timeout dla połączenia
        const connectionTimeout = setTimeout(() => {
          if (!connected) {
            this.issues.push({
              type: 'socket',
              message: 'Socket.IO - timeout połączenia',
              error: 'Nie udało się połączyć w ciągu 10 sekund'
            });
            console.log('  ❌ Socket.IO: TIMEOUT');
            resolve();
          }
        }, 10000);

        this.socketClient.on('connect', () => {
          connected = true;
          clearTimeout(connectionTimeout);
          console.log('  ✅ Socket.IO: Połączono');
        });

        this.socketClient.on('connection_success', (data) => {
          connectionSuccess = true;
          console.log('  ✅ Socket.IO: Uwierzytelnienie OK');
          console.log(`    👤 Użytkownik: ${data.userId}`);
          
          // Test wysyłania powiadomienia
          setTimeout(() => {
            resolve();
          }, 2000);
        });

        this.socketClient.on('new_notification', (notification) => {
          console.log('  ✅ Socket.IO: Otrzymano powiadomienie');
          console.log(`    📨 Typ: ${notification.type}`);
          console.log(`    💬 Wiadomość: ${notification.message}`);
        });

        this.socketClient.on('connect_error', (error) => {
          connected = true;
          clearTimeout(connectionTimeout);
          
          this.issues.push({
            type: 'socket',
            message: 'Socket.IO - błąd połączenia',
            error: error.message
          });
          
          console.log('  ❌ Socket.IO: BŁĄD POŁĄCZENIA');
          console.log(`    Błąd: ${error.message}`);
          resolve();
        });

        this.socketClient.on('disconnect', (reason) => {
          console.log(`  🔌 Socket.IO: Rozłączono (${reason})`);
        });

      } catch (error) {
        this.issues.push({
          type: 'socket',
          message: 'Socket.IO - błąd inicjalizacji',
          error: error.message
        });
        console.log('  ❌ Socket.IO: BŁĄD INICJALIZACJI');
        resolve();
      }
    });
  }

  /**
   * Testowanie NotificationManager
   */
  async testNotificationManager() {
    console.log('\n🔔 Testuję NotificationManager...');

    if (!this.testUser) {
      console.log('❌ Brak użytkownika testowego - pomijam testy NotificationManager');
      return;
    }

    try {
      // Inicjalizuj NotificationManager jeśli nie jest zainicjalizowany
      if (!notificationManager.initialized) {
        notificationManager.initialize();
        console.log('  ✅ NotificationManager zainicjalizowany');
      }

      // Test tworzenia powiadomienia
      const notification = await notificationManager.createNotification(
        this.testUser._id.toString(),
        'Test NotificationManager',
        'To jest testowe powiadomienie utworzone przez NotificationManager',
        'SYSTEM_NOTIFICATION',
        { source: 'fix-script' }
      );

      if (notification) {
        console.log('  ✅ NotificationManager: Utworzono powiadomienie');
        console.log(`    📝 ID: ${notification._id}`);
      } else {
        this.issues.push({
          type: 'notification-manager',
          message: 'NotificationManager nie utworzył powiadomienia',
          error: 'Metoda createNotification zwróciła null'
        });
        console.log('  ❌ NotificationManager: Nie utworzono powiadomienia');
      }

      // Test pobierania nieprzeczytanych powiadomień
      const unreadNotifications = await notificationManager.getUnreadNotifications(
        this.testUser._id.toString(),
        5
      );

      console.log(`  ✅ NotificationManager: Pobrano ${unreadNotifications.length} nieprzeczytanych powiadomień`);

    } catch (error) {
      this.issues.push({
        type: 'notification-manager',
        message: 'Błąd w NotificationManager',
        error: error.message
      });
      console.log('  ❌ NotificationManager: BŁĄD');
      console.log(`    Błąd: ${error.message}`);
    }
  }

  /**
   * Podsumowanie i naprawy
   */
  async summarizeAndFix() {
    console.log('\n📊 PODSUMOWANIE DIAGNOZY');
    console.log('=' .repeat(50));

    if (this.issues.length === 0) {
      console.log('✅ Nie znaleziono problemów! System powiadomień działa prawidłowo.');
      return;
    }

    console.log(`❌ Znaleziono ${this.issues.length} problemów:`);
    
    this.issues.forEach((issue, index) => {
      console.log(`\n${index + 1}. [${issue.type.toUpperCase()}] ${issue.message}`);
      if (issue.error) {
        console.log(`   Błąd: ${issue.error}`);
      }
      if (issue.status) {
        console.log(`   Status: ${issue.status}`);
      }
    });

    console.log('\n🔧 PROPONOWANE NAPRAWY:');
    
    // Analiza problemów i proponowanie napraw
    const problemTypes = [...new Set(this.issues.map(issue => issue.type))];
    
    for (const type of problemTypes) {
      await this.proposeFixForType(type);
    }
  }

  /**
   * Proponuje naprawy dla konkretnego typu problemu
   */
  async proposeFixForType(type) {
    switch (type) {
      case 'database':
        console.log('\n📊 BAZA DANYCH:');
        console.log('  - Sprawdź czy MongoDB jest uruchomiony');
        console.log('  - Zweryfikuj connection string w .env');
        console.log('  - Sprawdź uprawnienia dostępu do bazy');
        break;

      case 'api':
        console.log('\n🌐 API ENDPOINTS:');
        console.log('  - Sprawdź czy serwer backend jest uruchomiony');
        console.log('  - Zweryfikuj routing w routes/notifications/');
        console.log('  - Sprawdź middleware autoryzacji');
        console.log('  - Zweryfikuj CORS settings');
        
        // Automatyczna naprawa - sprawdź czy routes są zarejestrowane
        await this.fixAPIRoutes();
        break;

      case 'socket':
        console.log('\n🔌 SOCKET.IO:');
        console.log('  - Sprawdź czy socketService jest zainicjalizowany w index.js');
        console.log('  - Zweryfikuj CORS dla Socket.IO');
        console.log('  - Sprawdź uwierzytelnianie Socket.IO');
        
        // Automatyczna naprawa
        await this.fixSocketIO();
        break;

      case 'notification-manager':
        console.log('\n🔔 NOTIFICATION MANAGER:');
        console.log('  - Sprawdź czy notificationManager jest zainicjalizowany');
        console.log('  - Zweryfikuj integrację z socketService');
        console.log('  - Sprawdź model Notification');
        
        // Automatyczna naprawa
        await this.fixNotificationManager();
        break;

      case 'models':
        console.log('\n📋 MODELE DANYCH:');
        console.log('  - Sprawdź czy wszystkie modele są poprawnie zaimportowane');
        console.log('  - Zweryfikuj schemat Notification');
        console.log('  - Sprawdź indeksy bazy danych');
        break;
    }
  }

  /**
   * Naprawa API routes
   */
  async fixAPIRoutes() {
    console.log('\n🔧 Naprawiam API routes...');
    
    try {
      // Sprawdź czy routes/index.js zawiera notification routes
      const fs = await import('fs');
      const path = await import('path');
      
      const routesIndexPath = path.resolve('./routes/index.js');
      
      if (fs.existsSync(routesIndexPath)) {
        const content = fs.readFileSync(routesIndexPath, 'utf8');
        
        if (!content.includes('notificationRoutes')) {
          console.log('  ❌ Notification routes nie są zarejestrowane w routes/index.js');
          this.fixes.push('Dodaj notification routes do routes/index.js');
        } else {
          console.log('  ✅ Notification routes są zarejestrowane');
        }
      }
      
    } catch (error) {
      console.log(`  ❌ Błąd podczas sprawdzania routes: ${error.message}`);
    }
  }

  /**
   * Naprawa Socket.IO
   */
  async fixSocketIO() {
    console.log('\n🔧 Naprawiam Socket.IO...');
    
    // Sprawdź czy socketService jest dostępny
    if (socketService && socketService.io) {
      console.log('  ✅ SocketService jest zainicjalizowany');
      
      const stats = socketService.getConnectionStats();
      console.log(`  📊 Aktywne połączenia: ${stats.currentConnections}`);
      console.log(`  📊 Online użytkownicy: ${stats.onlineUsers}`);
      
    } else {
      console.log('  ❌ SocketService nie jest zainicjalizowany');
      this.fixes.push('Zainicjalizuj socketService w index.js');
    }
  }

  /**
   * Naprawa NotificationManager
   */
  async fixNotificationManager() {
    console.log('\n🔧 Naprawiam NotificationManager...');
    
    try {
      if (!notificationManager.initialized) {
        notificationManager.initialize();
        console.log('  ✅ NotificationManager zainicjalizowany');
        this.fixes.push('Zainicjalizowano NotificationManager');
      } else {
        console.log('  ✅ NotificationManager już zainicjalizowany');
      }
      
      // Sprawdź statystyki
      const stats = await notificationManager.getNotificationStats();
      console.log(`  📊 Całkowite powiadomienia: ${stats.totalNotifications}`);
      console.log(`  📊 Nieprzeczytane: ${stats.unreadNotifications}`);
      console.log(`  📊 Aktywni użytkownicy: ${stats.activeUsers}`);
      
    } catch (error) {
      console.log(`  ❌ Błąd podczas naprawy NotificationManager: ${error.message}`);
    }
  }

  /**
   * Czyszczenie zasobów
   */
  async cleanup() {
    console.log('\n🧹 Czyszczenie zasobów...');
    
    // Rozłącz Socket.IO client
    if (this.socketClient) {
      this.socketClient.disconnect();
      console.log('  ✅ Socket.IO client rozłączony');
    }
    
    // Usuń użytkownika testowego (opcjonalnie)
    if (this.testUser) {
      try {
        // Usuń testowe powiadomienia
        await Notification.deleteMany({ 
          user: this.testUser._id,
          'metadata.source': 'fix-script'
        });
        
        console.log('  ✅ Usunięto testowe powiadomienia');
      } catch (error) {
        console.log(`  ⚠️  Nie udało się usunąć testowych powiadomień: ${error.message}`);
      }
    }
    
    // Zamknij połączenie z bazą danych
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('  ✅ Połączenie z bazą danych zamknięte');
    }
    
    console.log('\n✅ NAPRAWA ZAKOŃCZONA');
    
    if (this.fixes.length > 0) {
      console.log('\n🔧 WYKONANE NAPRAWY:');
      this.fixes.forEach((fix, index) => {
        console.log(`  ${index + 1}. ${fix}`);
      });
    }
    
    console.log('\n💡 ZALECENIA:');
    console.log('  1. Uruchom ponownie serwer backend');
    console.log('  2. Sprawdź logi serwera pod kątem błędów');
    console.log('  3. Przetestuj powiadomienia w aplikacji frontend');
    console.log('  4. Sprawdź czy Socket.IO działa w przeglądarce (Developer Tools > Network > WS)');
  }
}

// Uruchomienie skryptu
const fixer = new NotificationSystemFixer();
fixer.fix().catch(console.error);
