import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Notification from '../models/communication/notification.js';
import User from '../models/user/user.js';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/marketplace';

async function diagnoseNotificationConnection() {
  try {
    console.log('🔄 Łączenie z bazą danych...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Połączono z bazą danych');

    console.log('\n📊 DIAGNOZA SYSTEMU POWIADOMIEŃ');
    console.log('=====================================');

    // 1. Sprawdź powiadomienia w bazie danych
    console.log('\n1️⃣ SPRAWDZANIE POWIADOMIEŃ W BAZIE DANYCH');
    const totalNotifications = await Notification.countDocuments();
    const unreadNotifications = await Notification.countDocuments({ isRead: false });
    console.log(`📊 Łączna liczba powiadomień: ${totalNotifications}`);
    console.log(`📊 Nieprzeczytane powiadomienia: ${unreadNotifications}`);

    // Pokaż przykładowe powiadomienia
    const sampleNotifications = await Notification.find().sort({ createdAt: -1 }).limit(5);
    console.log('\n📋 Przykładowe powiadomienia:');
    sampleNotifications.forEach((notif, index) => {
      console.log(`  ${index + 1}. [${notif.type}] ${notif.title} - User: ${notif.user} - ${notif.isRead ? 'Przeczytane' : 'Nieprzeczytane'}`);
    });

    // 2. Sprawdź użytkowników
    console.log('\n2️⃣ SPRAWDZANIE UŻYTKOWNIKÓW');
    const totalUsers = await User.countDocuments();
    console.log(`👥 Łączna liczba użytkowników: ${totalUsers}`);

    // Pokaż użytkowników z powiadomieniami
    const usersWithNotifications = await Notification.aggregate([
      { $group: { _id: '$user', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    console.log('\n👥 Użytkownicy z powiadomieniami:');
    for (const userStat of usersWithNotifications) {
      try {
        const user = await User.findById(userStat._id);
        const userName = user ? user.email || user.username || 'Nieznany' : 'Użytkownik nie znaleziony';
        console.log(`  - ${userName} (${userStat._id}): ${userStat.count} powiadomień`);
      } catch (error) {
        console.log(`  - ID: ${userStat._id}: ${userStat.count} powiadomień (błąd pobierania danych użytkownika)`);
      }
    }

    // 3. Sprawdź API endpoints
    console.log('\n3️⃣ TESTOWANIE API ENDPOINTS');
    console.log('🔗 Dostępne endpointy powiadomień:');
    console.log('  - GET /api/notifications - pobieranie wszystkich powiadomień');
    console.log('  - GET /api/notifications/unread - pobieranie nieprzeczytanych');
    console.log('  - GET /api/notifications/unread-count - liczba nieprzeczytanych');
    console.log('  - PATCH /api/notifications/:id/read - oznaczanie jako przeczytane');
    console.log('  - DELETE /api/notifications/:id - usuwanie powiadomienia');

    // 4. Sprawdź konfigurację WebSocket
    console.log('\n4️⃣ SPRAWDZANIE KONFIGURACJI WEBSOCKET');
    console.log('⚠️  POTENCJALNE PROBLEMY:');
    console.log('  1. Socket.IO authentication failed - missing token');
    console.log('  2. Frontend może nie wysyłać tokenu JWT w WebSocket connection');
    console.log('  3. Backend może niepoprawnie weryfikować token WebSocket');
    console.log('  4. CORS może blokować połączenia WebSocket');

    // 5. Rekomendacje naprawy
    console.log('\n5️⃣ REKOMENDACJE NAPRAWY');
    console.log('🔧 Kroki do wykonania:');
    console.log('  1. Sprawdź socketService.js - autentykacja WebSocket');
    console.log('  2. Sprawdź frontend SocketContext - wysyłanie tokenu');
    console.log('  3. Sprawdź UnifiedNotificationService - pobieranie z API');
    console.log('  4. Sprawdź CORS w app.js');
    console.log('  5. Sprawdź czy notificationManager jest zainicjalizowany');

    console.log('\n✅ Diagnoza zakończona');

  } catch (error) {
    console.error('❌ Błąd podczas diagnozy:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Rozłączono z bazą danych');
  }
}

// Uruchom diagnozę
diagnoseNotificationConnection();
