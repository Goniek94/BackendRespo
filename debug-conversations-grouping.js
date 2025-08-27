/**
 * SKRYPT DEBUGOWANIA PROBLEMU Z GRUPOWANIEM KONWERSACJI
 * 
 * Problem: Na localhost wiadomości z różnych ogłoszeń tworzą osobne konwersacje,
 * ale na hostingu wszystkie trafiają do jednej konwersacji.
 * 
 * Ten skrypt pomoże zidentyfikować przyczynę problemu.
 */

import mongoose from 'mongoose';
import Message from './models/communication/message.js';
import User from './models/user/user.js';
import Ad from './models/listings/ad.js';
import dotenv from 'dotenv';

dotenv.config();

const DEBUG_USER_ID = process.env.DEBUG_USER_ID || null; // Ustaw ID użytkownika do debugowania

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Połączono z bazą danych');
  } catch (error) {
    console.error('❌ Błąd połączenia z bazą danych:', error);
    process.exit(1);
  }
}

async function debugConversationsGrouping() {
  console.log('\n🔍 DEBUGOWANIE GRUPOWANIA KONWERSACJI');
  console.log('=====================================\n');

  // 1. Sprawdź środowisko
  console.log('1. INFORMACJE O ŚRODOWISKU:');
  console.log(`   - NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   - MongoDB URI: ${process.env.MONGODB_URI ? 'Ustawione' : 'Brak'}`);
  console.log(`   - Debug User ID: ${DEBUG_USER_ID || 'Nie ustawione'}\n`);

  // 2. Znajdź użytkownika do debugowania
  let debugUser = null;
  if (DEBUG_USER_ID) {
    debugUser = await User.findById(DEBUG_USER_ID);
    if (!debugUser) {
      console.log('❌ Nie znaleziono użytkownika o podanym ID');
      return;
    }
  } else {
    // Znajdź pierwszego użytkownika z wiadomościami
    const userWithMessages = await Message.findOne().populate('sender');
    if (userWithMessages && userWithMessages.sender) {
      debugUser = userWithMessages.sender;
    }
  }

  if (!debugUser) {
    console.log('❌ Nie znaleziono użytkownika do debugowania');
    return;
  }

  console.log(`2. DEBUGOWANIE DLA UŻYTKOWNIKA: ${debugUser.name || debugUser.email} (${debugUser._id})\n`);

  // 3. Pobierz wszystkie wiadomości użytkownika
  const userObjectId = new mongoose.Types.ObjectId(debugUser._id);
  
  const allMessages = await Message.find({
    $or: [
      { sender: userObjectId },
      { recipient: userObjectId }
    ]
  })
  .populate('sender', 'name email')
  .populate('recipient', 'name email')
  .populate('relatedAd', 'headline brand model')
  .sort({ createdAt: -1 });

  console.log(`3. ZNALEZIONE WIADOMOŚCI: ${allMessages.length}\n`);

  if (allMessages.length === 0) {
    console.log('❌ Brak wiadomości dla tego użytkownika');
    return;
  }

  // 4. Analizuj każdą wiadomość
  console.log('4. ANALIZA WIADOMOŚCI:');
  console.log('   ID | Nadawca -> Odbiorca | Ogłoszenie | Data');
  console.log('   ' + '-'.repeat(80));

  const conversationKeys = new Set();
  const adMessages = new Map(); // Mapa: adId -> liczba wiadomości

  allMessages.forEach((msg, index) => {
    const senderId = msg.sender?._id?.toString() || 'brak';
    const recipientId = msg.recipient?._id?.toString() || 'brak';
    const senderName = msg.sender?.name || msg.sender?.email || 'Nieznany';
    const recipientName = msg.recipient?.name || msg.recipient?.email || 'Nieznany';
    
    // Określ rozmówcę (kto to nie jest debugUser)
    const isUserSender = senderId === debugUser._id.toString();
    const otherUserId = isUserSender ? recipientId : senderId;
    const otherUserName = isUserSender ? recipientName : senderName;
    
    // Informacje o ogłoszeniu
    const adId = msg.relatedAd ? 
      (typeof msg.relatedAd === 'object' ? msg.relatedAd._id.toString() : msg.relatedAd.toString()) : 
      'no-ad';
    
    const adTitle = msg.relatedAd ? 
      (msg.relatedAd.headline || `${msg.relatedAd.brand} ${msg.relatedAd.model}`) : 
      'Brak ogłoszenia';

    // Klucz konwersacji (tak jak w getConversationsList)
    const conversationKey = `${otherUserId}:${adId}`;
    conversationKeys.add(conversationKey);

    // Zlicz wiadomości per ogłoszenie
    if (adId !== 'no-ad') {
      adMessages.set(adId, (adMessages.get(adId) || 0) + 1);
    }

    console.log(`   ${(index + 1).toString().padStart(2)} | ${senderName} -> ${recipientName} | ${adTitle.substring(0, 20)}... | ${msg.createdAt.toISOString().substring(0, 19)}`);
    console.log(`      Klucz konwersacji: ${conversationKey}`);
    console.log(`      relatedAd: ${msg.relatedAd ? (typeof msg.relatedAd === 'object' ? msg.relatedAd._id : msg.relatedAd) : 'null'}`);
    console.log('');
  });

  // 5. Podsumowanie grupowania
  console.log('5. PODSUMOWANIE GRUPOWANIA:');
  console.log(`   - Łączna liczba wiadomości: ${allMessages.length}`);
  console.log(`   - Liczba unikalnych konwersacji: ${conversationKeys.size}`);
  console.log(`   - Liczba ogłoszeń z wiadomościami: ${adMessages.size}\n`);

  console.log('6. UNIKALNE KLUCZE KONWERSACJI:');
  Array.from(conversationKeys).forEach((key, index) => {
    const [userId, adId] = key.split(':');
    console.log(`   ${index + 1}. ${key} (użytkownik: ${userId}, ogłoszenie: ${adId})`);
  });

  // 6. Sprawdź czy są wiadomości z tym samym użytkownikiem ale różnymi ogłoszeniami
  console.log('\n7. ANALIZA POTENCJALNYCH PROBLEMÓW:');
  
  const userGroups = new Map(); // userId -> [adIds]
  conversationKeys.forEach(key => {
    const [userId, adId] = key.split(':');
    if (!userGroups.has(userId)) {
      userGroups.set(userId, []);
    }
    userGroups.get(userId).push(adId);
  });

  let foundIssues = false;
  userGroups.forEach((adIds, userId) => {
    if (adIds.length > 1) {
      foundIssues = true;
      console.log(`   ⚠️  Użytkownik ${userId} ma konwersacje z ${adIds.length} różnymi ogłoszeniami:`);
      adIds.forEach(adId => {
        console.log(`      - Ogłoszenie: ${adId}`);
      });
    }
  });

  if (!foundIssues) {
    console.log('   ✅ Nie znaleziono problemów z grupowaniem - każdy użytkownik ma osobne konwersacje per ogłoszenie');
  }

  // 7. Test funkcji getConversationsList
  console.log('\n8. TEST FUNKCJI getConversationsList:');
  
  try {
    // Symuluj zapytanie jak w getConversationsList
    const query = {
      $or: [
        { sender: userObjectId, deletedBy: { $ne: userObjectId } },
        { recipient: userObjectId, deletedBy: { $ne: userObjectId } }
      ]
    };

    const messages = await Message.find(query)
      .populate('sender', 'name email')
      .populate('recipient', 'name email')
      .populate('relatedAd', 'headline brand model')
      .sort({ createdAt: -1 });

    console.log(`   - Zapytanie zwróciło ${messages.length} wiadomości`);

    // Grupuj wiadomości według kombinacji użytkownik + ogłoszenie (jak w kodzie)
    const conversationsByUserAndAd = {};
    const userIdStr = userObjectId.toString();

    messages.forEach((msg) => {
      // Pozyskaj ID nadawcy i odbiorcy (jako stringi)
      let senderId = null;
      let recipientId = null;
      
      if (msg.sender) {
        senderId = typeof msg.sender === 'object' && msg.sender._id ? 
          msg.sender._id.toString() : msg.sender.toString();
      }
      
      if (msg.recipient) {
        recipientId = typeof msg.recipient === 'object' && msg.recipient._id ? 
          msg.recipient._id.toString() : msg.recipient.toString();
      }
      
      if (!senderId || !recipientId) return;
      
      // Określ kim jest rozmówca
      let otherUserId, otherUser;
      
      if (senderId === userIdStr) {
        otherUserId = recipientId;
        otherUser = msg.recipient;
      } else {
        otherUserId = senderId;
        otherUser = msg.sender;
      }
      
      if (otherUserId === userIdStr) return; // Wiadomość do samego siebie
      if (!otherUser) return;
      
      // Określ ID ogłoszenia
      const adId = msg.relatedAd ? 
        (typeof msg.relatedAd === 'object' ? msg.relatedAd._id.toString() : msg.relatedAd.toString()) : 
        'no-ad';
      
      // Utwórz unikalny klucz konwersacji
      const conversationKey = `${otherUserId}:${adId}`;
      
      if (!conversationsByUserAndAd[conversationKey]) {
        conversationsByUserAndAd[conversationKey] = {
          user: {
            _id: otherUserId,
            name: typeof otherUser === 'object' ? 
              (otherUser.name || otherUser.email || 'Nieznany użytkownik') : 
              'Nieznany użytkownik',
            email: typeof otherUser === 'object' ? (otherUser.email || '') : ''
          },
          lastMessage: msg,
          unreadCount: 0,
          adInfo: msg.relatedAd || null,
          conversationId: conversationKey
        };
      } else if (msg.createdAt > conversationsByUserAndAd[conversationKey].lastMessage.createdAt) {
        conversationsByUserAndAd[conversationKey].lastMessage = msg;
        if (msg.relatedAd) {
          conversationsByUserAndAd[conversationKey].adInfo = msg.relatedAd;
        }
      }
      
      // Zlicz nieprzeczytane
      if (recipientId === userIdStr && senderId === otherUserId && !msg.read) {
        conversationsByUserAndAd[conversationKey].unreadCount += 1;
      }
    });

    const conversations = Object.values(conversationsByUserAndAd)
      .sort((a, b) => b.lastMessage.createdAt - a.lastMessage.createdAt);

    console.log(`   - Funkcja zwróciła ${conversations.length} konwersacji:`);
    
    conversations.forEach((conv, index) => {
      const adInfo = conv.adInfo ? 
        (conv.adInfo.headline || `${conv.adInfo.brand} ${conv.adInfo.model}`) : 
        'Brak ogłoszenia';
      
      console.log(`     ${index + 1}. ${conv.user.name} - ${adInfo} (${conv.unreadCount} nieprzeczytanych)`);
      console.log(`        Klucz: ${conv.conversationId}`);
    });

  } catch (error) {
    console.error('   ❌ Błąd podczas testowania getConversationsList:', error);
  }

  console.log('\n9. REKOMENDACJE:');
  
  if (conversationKeys.size < allMessages.length / 2) {
    console.log('   ⚠️  Podejrzanie mała liczba konwersacji w stosunku do wiadomości');
    console.log('   💡 Sprawdź czy relatedAd jest poprawnie ustawiane w wiadomościach');
  }
  
  if (adMessages.size === 0) {
    console.log('   ⚠️  Brak wiadomości powiązanych z ogłoszeniami');
    console.log('   💡 Sprawdź czy sendMessageToAd poprawnie ustawia relatedAd');
  }
  
  console.log('   💡 Porównaj wyniki tego skryptu między localhost a hostingiem');
  console.log('   💡 Sprawdź czy na hostingu relatedAd jest null lub niepoprawne');
  
  console.log('\n✅ Debugowanie zakończone');
}

async function main() {
  try {
    await connectDB();
    await debugConversationsGrouping();
  } catch (error) {
    console.error('❌ Błąd podczas debugowania:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Rozłączono z bazą danych');
  }
}

// Uruchom skrypt
main();
