const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testNotificationBadges() {
  try {
    console.log('🔍 Testowanie liczników powiadomień...\n');

    // Test 1: Sprawdź endpoint liczników
    console.log('1. Testowanie endpointu /notifications/unread/count');
    try {
      const response = await axios.get(`${API_URL}/notifications/unread/count`, {
        withCredentials: true,
        headers: {
          'Cookie': 'connect.sid=s%3AyourSessionId' // Zastąp prawdziwym session ID
        }
      });
      console.log('✅ Odpowiedź:', response.data);
    } catch (error) {
      console.log('❌ Błąd:', error.response?.data || error.message);
    }

    console.log('\n2. Testowanie endpointu /notifications');
    try {
      const response = await axios.get(`${API_URL}/notifications`, {
        withCredentials: true,
        headers: {
          'Cookie': 'connect.sid=s%3AyourSessionId' // Zastąp prawdziwym session ID
        }
      });
      console.log('✅ Liczba powiadomień:', response.data.notifications?.length || 0);
      
      if (response.data.notifications && response.data.notifications.length > 0) {
        const unreadNotifications = response.data.notifications.filter(n => !n.isRead);
        const messageNotifications = response.data.notifications.filter(n => n.type === 'new_message' && !n.isRead);
        const otherNotifications = response.data.notifications.filter(n => n.type !== 'new_message' && !n.isRead);
        
        console.log('📊 Statystyki:');
        console.log(`   - Wszystkie nieprzeczytane: ${unreadNotifications.length}`);
        console.log(`   - Wiadomości: ${messageNotifications.length}`);
        console.log(`   - Inne powiadomienia: ${otherNotifications.length}`);
      }
    } catch (error) {
      console.log('❌ Błąd:', error.response?.data || error.message);
    }

    console.log('\n3. Sprawdzanie struktury bazy danych');
    // Sprawdź, czy są jakieś powiadomienia w bazie
    const mongoose = require('mongoose');
    
    try {
      await mongoose.connect('mongodb://localhost:27017/marketplace', {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      
      const Notification = mongoose.model('Notification', new mongoose.Schema({}, { strict: false }));
      const notifications = await Notification.find({}).limit(5);
      
      console.log(`📋 Znaleziono ${notifications.length} powiadomień w bazie`);
      if (notifications.length > 0) {
        console.log('Przykładowe powiadomienie:', {
          type: notifications[0].type,
          isRead: notifications[0].isRead,
          userId: notifications[0].userId,
          createdAt: notifications[0].createdAt
        });
      }
      
      await mongoose.disconnect();
    } catch (error) {
      console.log('❌ Błąd połączenia z bazą:', error.message);
    }

  } catch (error) {
    console.error('❌ Ogólny błąd:', error.message);
  }
}

// Uruchom test
testNotificationBadges();
