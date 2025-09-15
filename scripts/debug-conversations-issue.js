import mongoose from 'mongoose';
import Message from '../models/communication/message.js';
import User from '../models/user/user.js';
import Ad from '../models/listings/ad.js';
import config from '../config/index.js';

console.log('🔍 DIAGNOZA PROBLEMU Z POBIERANIEM KONWERSACJI');
console.log('================================================');

async function debugConversationsIssue() {
  try {
    // Połącz z bazą danych
    await mongoose.connect(config.database.uri);
    console.log('✅ Połączono z bazą danych');

    // 1. Sprawdź liczbę użytkowników
    const usersCount = await User.countDocuments();
    console.log(`📊 Liczba użytkowników w bazie: ${usersCount}`);

    // 2. Sprawdź liczbę wiadomości
    const messagesCount = await Message.countDocuments();
    console.log(`📊 Liczba wiadomości w bazie: ${messagesCount}`);

    // 3. Sprawdź liczbę ogłoszeń
    const adsCount = await Ad.countDocuments();
    console.log(`📊 Liczba ogłoszeń w bazie: ${adsCount}`);

    if (messagesCount === 0) {
      console.log('⚠️ BRAK WIADOMOŚCI W BAZIE DANYCH');
      console.log('Nie można przetestować pobierania konwersacji bez danych');
      return;
    }

    // 4. Pobierz przykładowego użytkownika
    const sampleUser = await User.findOne().select('_id name email');
    if (!sampleUser) {
      console.log('❌ Brak użytkowników w bazie danych');
      return;
    }

    console.log(`👤 Testowy użytkownik: ${sampleUser.name || sampleUser.email} (${sampleUser._id})`);

    // 5. Sprawdź wiadomości tego użytkownika
    const userMessages = await Message.find({
      $or: [
        { sender: sampleUser._id },
        { recipient: sampleUser._id }
      ]
    }).populate('sender', 'name email').populate('recipient', 'name email');

    console.log(`📨 Wiadomości użytkownika: ${userMessages.length}`);

    if (userMessages.length === 0) {
      console.log('⚠️ Użytkownik nie ma żadnych wiadomości');
      
      // Sprawdź czy są jakiekolwiek wiadomości w bazie
      const allMessages = await Message.find().limit(5).populate('sender', 'name email').populate('recipient', 'name email');
      console.log(`📨 Przykładowe wiadomości z bazy (${allMessages.length}):`);
      
      allMessages.forEach((msg, index) => {
        console.log(`  ${index + 1}. Od: ${msg.sender?.name || msg.sender?.email || 'Nieznany'} -> Do: ${msg.recipient?.name || msg.recipient?.email || 'Nieznany'}`);
        console.log(`     Temat: ${msg.subject}`);
        console.log(`     Data: ${msg.createdAt}`);
      });
      
      return;
    }

    // 6. Testuj funkcję getConversationsList
    console.log('\n🧪 TESTOWANIE FUNKCJI getConversationsList');
    console.log('===============================================');

    // Symuluj zapytanie jak w kontrolerze
    const userId = sampleUser._id;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    console.log(`🔍 Szukam konwersacji dla użytkownika: ${userObjectId}`);

    // Zapytanie jak w kontrolerze
    const query = {
      $or: [
        { sender: userObjectId, deletedBy: { $ne: userObjectId } },
        { recipient: userObjectId, deletedBy: { $ne: userObjectId } }
      ]
    };

    console.log('📋 Zapytanie MongoDB:', JSON.stringify(query, null, 2));

    const messages = await Message.find(query)
      .populate('sender', 'name email')
      .populate('recipient', 'name email')
      .populate('relatedAd', 'headline brand model')
      .sort({ createdAt: -1 });

    console.log(`📨 Znalezione wiadomości: ${messages.length}`);

    if (messages.length === 0) {
      console.log('❌ PROBLEM: Zapytanie nie zwraca żadnych wiadomości');
      
      // Sprawdź czy problem jest z deletedBy
      const queryWithoutDeleted = {
        $or: [
          { sender: userObjectId },
          { recipient: userObjectId }
        ]
      };
      
      const messagesWithoutDeletedFilter = await Message.find(queryWithoutDeleted);
      console.log(`📨 Wiadomości bez filtra deletedBy: ${messagesWithoutDeletedFilter.length}`);
      
      if (messagesWithoutDeletedFilter.length > 0) {
        console.log('🔍 Problem może być z filtrem deletedBy');
        
        // Sprawdź czy któraś wiadomość ma deletedBy
        const messagesWithDeletedBy = await Message.find({
          $or: [
            { sender: userObjectId },
            { recipient: userObjectId }
          ],
          deletedBy: { $exists: true, $ne: [] }
        });
        
        console.log(`📨 Wiadomości z deletedBy: ${messagesWithDeletedBy.length}`);
        
        if (messagesWithDeletedBy.length > 0) {
          console.log('🔍 Przykładowe wiadomości z deletedBy:');
          messagesWithDeletedBy.slice(0, 3).forEach((msg, index) => {
            console.log(`  ${index + 1}. ID: ${msg._id}, deletedBy: ${JSON.stringify(msg.deletedBy)}`);
          });
        }
      }
      
      return;
    }

    // 7. Testuj grupowanie konwersacji
    console.log('\n🔄 TESTOWANIE GRUPOWANIA KONWERSACJI');
    console.log('====================================');

    const conversationsByUserAndAd = {};
    const userIdStr = userObjectId.toString();

    messages.forEach((msg, index) => {
      console.log(`\n📨 Przetwarzanie wiadomości ${index + 1}/${messages.length}:`);
      console.log(`   ID: ${msg._id}`);
      console.log(`   Temat: ${msg.subject}`);
      
      // Pozyskaj ID nadawcy i odbiorcy
      let senderId = null;
      let recipientId = null;
      
      if (msg.sender) {
        senderId = typeof msg.sender === 'object' ? msg.sender._id.toString() : msg.sender.toString();
      }
      
      if (msg.recipient) {
        recipientId = typeof msg.recipient === 'object' ? msg.recipient._id.toString() : msg.recipient.toString();
      }
      
      console.log(`   Nadawca: ${senderId}`);
      console.log(`   Odbiorca: ${recipientId}`);
      
      if (!senderId || !recipientId) {
        console.log(`   ❌ Pominięto - brak nadawcy lub odbiorcy`);
        return;
      }
      
      // Określ rozmówcę
      let otherUserId, otherUser;
      
      if (senderId === userIdStr) {
        otherUserId = recipientId;
        otherUser = msg.recipient;
      } else {
        otherUserId = senderId;
        otherUser = msg.sender;
      }
      
      console.log(`   Rozmówca: ${otherUserId} (${otherUser?.name || otherUser?.email || 'Nieznany'})`);
      
      if (otherUserId === userIdStr) {
        console.log(`   ❌ Pominięto - wiadomość do samego siebie`);
        return;
      }
      
      // Określ ID ogłoszenia
      const adId = msg.relatedAd ? 
        (typeof msg.relatedAd === 'object' ? msg.relatedAd._id.toString() : msg.relatedAd.toString()) : 
        'no-ad';
      
      console.log(`   Ogłoszenie: ${adId}`);
      
      const conversationKey = `${otherUserId}:${adId}`;
      console.log(`   Klucz konwersacji: ${conversationKey}`);
      
      if (!conversationsByUserAndAd[conversationKey]) {
        conversationsByUserAndAd[conversationKey] = {
          user: {
            _id: otherUserId,
            name: typeof otherUser === 'object' ? (otherUser.name || otherUser.email || 'Nieznany') : 'Nieznany',
            email: typeof otherUser === 'object' ? (otherUser.email || '') : ''
          },
          lastMessage: msg,
          unreadCount: 0,
          adInfo: msg.relatedAd || null,
          conversationId: conversationKey
        };
        console.log(`   ✅ Utworzono nową konwersację`);
      } else {
        if (msg.createdAt > conversationsByUserAndAd[conversationKey].lastMessage.createdAt) {
          conversationsByUserAndAd[conversationKey].lastMessage = msg;
          console.log(`   🔄 Zaktualizowano ostatnią wiadomość`);
        }
      }
      
      // Zlicz nieprzeczytane
      if (recipientId === userIdStr && senderId === otherUserId && !msg.read) {
        conversationsByUserAndAd[conversationKey].unreadCount += 1;
        console.log(`   📬 Nieprzeczytana wiadomość (+1)`);
      }
    });

    // 8. Wynik grupowania
    const conversations = Object.values(conversationsByUserAndAd)
      .sort((a, b) => b.lastMessage.createdAt - a.lastMessage.createdAt);

    console.log(`\n📊 WYNIK GRUPOWANIA: ${conversations.length} konwersacji`);
    console.log('===========================================');

    conversations.forEach((conv, index) => {
      console.log(`\n${index + 1}. Konwersacja z: ${conv.user.name} (${conv.user._id})`);
      console.log(`   Ostatnia wiadomość: ${conv.lastMessage.subject}`);
      console.log(`   Data: ${conv.lastMessage.createdAt}`);
      console.log(`   Nieprzeczytane: ${conv.unreadCount}`);
      console.log(`   Ogłoszenie: ${conv.adInfo ? 
        (typeof conv.adInfo === 'object' ? 
          (conv.adInfo.headline || `${conv.adInfo.brand} ${conv.adInfo.model}`) : 
          'ID: ' + conv.adInfo) : 
        'brak'}`);
    });

    // 9. Test konkretnego endpointu
    console.log('\n🌐 TESTOWANIE ENDPOINTU /api/messages/conversations');
    console.log('==================================================');
    
    // Symuluj wywołanie API
    try {
      const { getConversationsList } = await import('../controllers/communication/conversations.js');
      
      // Symuluj req i res
      const mockReq = {
        user: { userId: sampleUser._id.toString() },
        query: {}
      };
      
      const mockRes = {
        status: (code) => ({
          json: (data) => {
            console.log(`📡 Odpowiedź API (${code}):`, JSON.stringify(data, null, 2));
            return data;
          }
        })
      };
      
      await getConversationsList(mockReq, mockRes);
      
    } catch (apiError) {
      console.error('❌ Błąd podczas testowania API:', apiError);
    }

  } catch (error) {
    console.error('❌ Błąd podczas diagnozy:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Rozłączono z bazą danych');
  }
}

// Uruchom diagnozę
debugConversationsIssue().catch(console.error);
