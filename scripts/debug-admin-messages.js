import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Import modeli
import User from '../models/user/user.js';
import Message from '../models/communication/message.js';
import Notification from '../models/communication/notification.js';
import Ad from '../models/listings/ad.js';

dotenv.config();

async function debugAdminMessages() {
  try {
    console.log('🔍 Łączenie z bazą danych...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Połączono z bazą danych');

    // Znajdź użytkownika admin
    const adminUser = await User.findOne({ email: 'kontakt@autosell.pl' });
    if (!adminUser) {
      console.log('❌ Nie znaleziono użytkownika kontakt@autosell.pl');
      return;
    }

    console.log(`\n👤 Znaleziono użytkownika: ${adminUser.name || adminUser.email} (ID: ${adminUser._id})`);

    // 1. Sprawdź wszystkie wiadomości gdzie użytkownik jest nadawcą
    console.log('\n📤 WIADOMOŚCI WYSŁANE:');
    const sentMessages = await Message.find({ 
      sender: adminUser._id,
      deletedBy: { $ne: adminUser._id }
    })
    .populate('recipient', 'name email')
    .populate('relatedAd', 'headline brand model')
    .sort({ createdAt: -1 });

    console.log(`Znaleziono ${sentMessages.length} wysłanych wiadomości:`);
    sentMessages.forEach((msg, index) => {
      console.log(`  ${index + 1}. Do: ${msg.recipient?.name || msg.recipient?.email || 'Nieznany'}`);
      console.log(`     Temat: ${msg.subject}`);
      console.log(`     Data: ${msg.createdAt}`);
      console.log(`     Przeczytana: ${msg.read ? 'TAK' : 'NIE'}`);
      console.log(`     Draft: ${msg.draft ? 'TAK' : 'NIE'}`);
      console.log(`     Archiwum: ${msg.archived ? 'TAK' : 'NIE'}`);
      console.log(`     Ogłoszenie: ${msg.relatedAd ? (msg.relatedAd.headline || `${msg.relatedAd.brand} ${msg.relatedAd.model}`) : 'Brak'}`);
      console.log('');
    });

    // 2. Sprawdź wszystkie wiadomości gdzie użytkownik jest odbiorcą
    console.log('\n📥 WIADOMOŚCI ODEBRANE:');
    const receivedMessages = await Message.find({ 
      recipient: adminUser._id,
      deletedBy: { $ne: adminUser._id }
    })
    .populate('sender', 'name email')
    .populate('relatedAd', 'headline brand model')
    .sort({ createdAt: -1 });

    console.log(`Znaleziono ${receivedMessages.length} odebranych wiadomości:`);
    receivedMessages.forEach((msg, index) => {
      console.log(`  ${index + 1}. Od: ${msg.sender?.name || msg.sender?.email || 'Nieznany'}`);
      console.log(`     Temat: ${msg.subject}`);
      console.log(`     Data: ${msg.createdAt}`);
      console.log(`     Przeczytana: ${msg.read ? 'TAK' : 'NIE'}`);
      console.log(`     Draft: ${msg.draft ? 'TAK' : 'NIE'}`);
      console.log(`     Archiwum: ${msg.archived ? 'TAK' : 'NIE'}`);
      console.log(`     Ogłoszenie: ${msg.relatedAd ? (msg.relatedAd.headline || `${msg.relatedAd.brand} ${msg.relatedAd.model}`) : 'Brak'}`);
      console.log('');
    });

    // 3. Sprawdź nieprzeczytane wiadomości w skrzynce odbiorczej
    console.log('\n📬 NIEPRZECZYTANE WIADOMOŚCI W SKRZYNCE ODBIORCZEJ:');
    const unreadInbox = await Message.find({
      recipient: adminUser._id,
      read: false,
      deletedBy: { $ne: adminUser._id },
      archived: { $ne: true },
      draft: { $ne: true },
      unsent: { $ne: true }
    })
    .populate('sender', 'name email')
    .populate('relatedAd', 'headline brand model')
    .sort({ createdAt: -1 });

    console.log(`Znaleziono ${unreadInbox.length} nieprzeczytanych wiadomości w skrzynce odbiorczej:`);
    unreadInbox.forEach((msg, index) => {
      console.log(`  ${index + 1}. Od: ${msg.sender?.name || msg.sender?.email || 'Nieznany'}`);
      console.log(`     Temat: ${msg.subject}`);
      console.log(`     Data: ${msg.createdAt}`);
      console.log(`     Ogłoszenie: ${msg.relatedAd ? (msg.relatedAd.headline || `${msg.relatedAd.brand} ${msg.relatedAd.model}`) : 'Brak'}`);
      console.log('');
    });

    // 4. Sprawdź powiadomienia o wiadomościach
    console.log('\n🔔 POWIADOMIENIA O WIADOMOŚCIACH:');
    const messageNotifications = await Notification.find({
      user: adminUser._id,
      type: 'new_message'
    }).sort({ createdAt: -1 });

    console.log(`Znaleziono ${messageNotifications.length} powiadomień o wiadomościach:`);
    messageNotifications.forEach((notif, index) => {
      console.log(`  ${index + 1}. Tytuł: ${notif.title}`);
      console.log(`     Treść: ${notif.message}`);
      console.log(`     Data: ${notif.createdAt}`);
      console.log(`     Przeczytane: ${notif.isRead ? 'TAK' : 'NIE'}`);
      console.log(`     Metadata: ${JSON.stringify(notif.metadata || {})}`);
      console.log('');
    });

    // 5. Sprawdź wszystkie powiadomienia
    console.log('\n🔔 WSZYSTKIE POWIADOMIENIA:');
    const allNotifications = await Notification.find({
      user: adminUser._id
    }).sort({ createdAt: -1 });

    console.log(`Znaleziono ${allNotifications.length} wszystkich powiadomień:`);
    allNotifications.forEach((notif, index) => {
      console.log(`  ${index + 1}. Typ: ${notif.type}`);
      console.log(`     Tytuł: ${notif.title}`);
      console.log(`     Treść: ${notif.message}`);
      console.log(`     Data: ${notif.createdAt}`);
      console.log(`     Przeczytane: ${notif.isRead ? 'TAK' : 'NIE'}`);
      console.log('');
    });

    // 6. Sprawdź konwersacje (grupowanie wiadomości)
    console.log('\n💬 ANALIZA KONWERSACJI:');
    const allMessages = await Message.find({
      $or: [
        { sender: adminUser._id, deletedBy: { $ne: adminUser._id } },
        { recipient: adminUser._id, deletedBy: { $ne: adminUser._id } }
      ]
    })
    .populate('sender', 'name email')
    .populate('recipient', 'name email')
    .populate('relatedAd', 'headline brand model')
    .sort({ createdAt: -1 });

    // Grupuj według użytkownika i ogłoszenia
    const conversations = {};
    const userIdStr = adminUser._id.toString();

    allMessages.forEach(msg => {
      const senderId = msg.sender?._id?.toString();
      const recipientId = msg.recipient?._id?.toString();
      
      if (!senderId || !recipientId) return;
      
      let otherUserId, otherUser;
      if (senderId === userIdStr) {
        otherUserId = recipientId;
        otherUser = msg.recipient;
      } else {
        otherUserId = senderId;
        otherUser = msg.sender;
      }
      
      if (otherUserId === userIdStr) return; // Wiadomość do samego siebie
      
      const adId = msg.relatedAd?._id?.toString() || 'no-ad';
      const conversationKey = `${otherUserId}:${adId}`;
      
      if (!conversations[conversationKey]) {
        conversations[conversationKey] = {
          user: otherUser,
          adInfo: msg.relatedAd,
          messages: [],
          unreadCount: 0
        };
      }
      
      conversations[conversationKey].messages.push(msg);
      
      // Zlicz nieprzeczytane (tylko te gdzie admin jest odbiorcą)
      if (recipientId === userIdStr && !msg.read) {
        conversations[conversationKey].unreadCount++;
      }
    });

    const conversationList = Object.values(conversations);
    console.log(`Znaleziono ${conversationList.length} konwersacji:`);
    
    conversationList.forEach((conv, index) => {
      console.log(`  ${index + 1}. Z: ${conv.user?.name || conv.user?.email || 'Nieznany'}`);
      console.log(`     Ogłoszenie: ${conv.adInfo ? (conv.adInfo.headline || `${conv.adInfo.brand} ${conv.adInfo.model}`) : 'Brak'}`);
      console.log(`     Liczba wiadomości: ${conv.messages.length}`);
      console.log(`     Nieprzeczytane: ${conv.unreadCount}`);
      console.log(`     Ostatnia wiadomość: ${conv.messages[0]?.createdAt}`);
      console.log('');
    });

    // 7. Podsumowanie liczników
    console.log('\n📊 PODSUMOWANIE LICZNIKÓW:');
    console.log(`Wszystkie wiadomości wysłane: ${sentMessages.length}`);
    console.log(`Wszystkie wiadomości odebrane: ${receivedMessages.length}`);
    console.log(`Nieprzeczytane w skrzynce odbiorczej: ${unreadInbox.length}`);
    console.log(`Powiadomienia o wiadomościach: ${messageNotifications.length}`);
    console.log(`Nieprzeczytane powiadomienia o wiadomościach: ${messageNotifications.filter(n => !n.isRead).length}`);
    console.log(`Wszystkie powiadomienia: ${allNotifications.length}`);
    console.log(`Nieprzeczytane powiadomienia: ${allNotifications.filter(n => !n.isRead).length}`);
    console.log(`Konwersacje: ${conversationList.length}`);
    console.log(`Konwersacje z nieprzeczytanymi: ${conversationList.filter(c => c.unreadCount > 0).length}`);

  } catch (error) {
    console.error('❌ Błąd podczas analizy wiadomości:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Rozłączono z bazą danych');
  }
}

// Uruchom funkcję
debugAdminMessages().catch(console.error);
