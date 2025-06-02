// Test API wiadomości
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/user.js';
import Message from './models/message.js';

// Konfiguracja zmiennych środowiskowych
dotenv.config();

// Funkcja łącząca z bazą danych
const connectToDB = async () => {
  try {
    console.log('Łączenie z bazą danych MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Połączono z bazą danych MongoDB');
    return true;
  } catch (err) {
    console.log('❌ MongoDB connection error:', err);
    return false;
  }
};

// Funkcja znajdująca użytkowników testowych
const findTestUsers = async () => {
  try {
    console.log('Szukanie użytkowników testowych...');
    
    // Szukamy dwóch użytkowników - dowolnych
    const users = await User.find().limit(2);
    
    if (users.length < 2) {
      console.log('❌ Nie znaleziono wystarczającej liczby użytkowników (minimum 2)');
      return null;
    }
    
    console.log(`✅ Znaleziono użytkowników: ${users[0].email} i ${users[1].email}`);
    return users;
  } catch (err) {
    console.log('❌ Błąd podczas szukania użytkowników:', err);
    return null;
  }
};

// Funkcja tworząca testowe wiadomości
const createTestMessages = async (users) => {
  try {
    console.log('Tworzenie testowych wiadomości...');
    
    const sender = users[0];
    const recipient = users[1];
    
    // Sprawdzenie czy istnieje już konwersacja między tymi użytkownikami
    const existingMessages = await Message.find({
      $or: [
        { sender: sender._id, recipient: recipient._id },
        { sender: recipient._id, recipient: sender._id }
      ]
    }).sort({ createdAt: -1 }).limit(5);
    
    if (existingMessages.length > 0) {
      console.log(`✅ Znaleziono ${existingMessages.length} istniejących wiadomości między użytkownikami`);
      
      // Wyświetlenie istniejących wiadomości
      for (const msg of existingMessages) {
        const senderUser = msg.sender.toString() === sender._id.toString() ? sender.email : recipient.email;
        console.log(`- [${new Date(msg.createdAt).toLocaleString()}] ${senderUser}: ${msg.content}`);
      }
      
      // Dodanie nowej wiadomości do istniejącej konwersacji
      const newMessage = new Message({
        sender: sender._id,
        recipient: recipient._id,
        content: `Test wiadomości wysłanej ${new Date().toLocaleString()}`,
        read: false,
        adId: existingMessages[0].adId
      });
      
      await newMessage.save();
      console.log('✅ Dodano nową wiadomość do istniejącej konwersacji');
      return true;
    } else {
      console.log('Nie znaleziono istniejących wiadomości, tworzenie nowej konwersacji...');
      
      // Tworzenie nowej konwersacji z trzema wiadomościami
      const messages = [
        {
          sender: sender._id,
          recipient: recipient._id,
          content: `Cześć! To jest pierwsza wiadomość testowa. Wygenerowana: ${new Date().toLocaleString()}`,
          read: true
        },
        {
          sender: recipient._id,
          recipient: sender._id,
          content: `Hej! To jest odpowiedź na twoją wiadomość. Wygenerowana: ${new Date().toLocaleString()}`,
          read: true
        },
        {
          sender: sender._id,
          recipient: recipient._id,
          content: `Świetnie! To jest ostatnia wiadomość testowa. Wygenerowana: ${new Date().toLocaleString()}`,
          read: false
        }
      ];
      
      await Message.insertMany(messages);
      console.log('✅ Utworzono nową konwersację z 3 wiadomościami');
      return true;
    }
  } catch (err) {
    console.log('❌ Błąd podczas tworzenia testowych wiadomości:', err);
    return false;
  }
};

// Funkcja testująca pobieranie konwersacji
const testGetConversations = async (userId) => {
  try {
    console.log(`\nTestowanie pobierania konwersacji dla użytkownika ${userId}...`);
    
    // Pobieranie listy wszystkich konwersacji użytkownika
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: mongoose.Types.ObjectId(userId) },
            { recipient: mongoose.Types.ObjectId(userId) }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$sender", mongoose.Types.ObjectId(userId)] },
              "$recipient",
              "$sender"
            ]
          },
          lastMessage: { $first: "$$ROOT" },
          messages: { $push: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                { 
                  $and: [
                    { $eq: ["$recipient", mongoose.Types.ObjectId(userId)] },
                    { $eq: ["$read", false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 1,
          "user._id": 1,
          "user.name": 1,
          "user.email": 1,
          lastMessage: 1,
          unreadCount: 1
        }
      }
    ]);
    
    console.log(`✅ Znaleziono ${conversations.length} konwersacji dla użytkownika`);
    
    if (conversations.length > 0) {
      // Wyświetlenie wszystkich konwersacji
      for (const convo of conversations) {
        const otherUser = convo.user.name || convo.user.email;
        console.log(`- Konwersacja z ${otherUser} - Nieprzeczytane: ${convo.unreadCount}`);
        console.log(`  Ostatnia wiadomość: ${convo.lastMessage.content}`);
      }
    }
    
    return conversations;
  } catch (err) {
    console.log('❌ Błąd podczas pobierania konwersacji:', err);
    return [];
  }
};

// Funkcja testująca pobieranie wiadomości z określonej konwersacji
const testGetMessages = async (userId, otherUserId) => {
  try {
    console.log(`\nTestowanie pobierania wiadomości między użytkownikami ${userId} i ${otherUserId}...`);
    
    // Pobieranie wszystkich wiadomości między dwoma użytkownikami
    const messages = await Message.find({
      $or: [
        { sender: userId, recipient: otherUserId },
        { sender: otherUserId, recipient: userId }
      ]
    }).sort({ createdAt: 1 });
    
    console.log(`✅ Znaleziono ${messages.length} wiadomości`);
    
    if (messages.length > 0) {
      // Wyświetlenie wszystkich wiadomości
      for (const msg of messages) {
        const isSender = msg.sender.toString() === userId.toString();
        console.log(`- [${new Date(msg.createdAt).toLocaleString()}] ${isSender ? 'Ja' : 'Rozmówca'}: ${msg.content}`);
      }
      
      // Oznaczenie nieprzeczytanych wiadomości jako przeczytane
      const unreadCount = await Message.countDocuments({
        sender: otherUserId,
        recipient: userId,
        read: false
      });
      
      if (unreadCount > 0) {
        await Message.updateMany(
          { sender: otherUserId, recipient: userId, read: false },
          { $set: { read: true } }
        );
        console.log(`✅ Oznaczono ${unreadCount} wiadomości jako przeczytane`);
      }
    }
    
    return messages;
  } catch (err) {
    console.log('❌ Błąd podczas pobierania wiadomości:', err);
    return [];
  }
};

// Główna funkcja testowa
const main = async () => {
  // Połączenie z bazą danych
  const connected = await connectToDB();
  if (!connected) {
    console.log('Przerwanie testu z powodu problemów z połączeniem z bazą danych');
    process.exit(1);
  }
  
  // Znalezienie użytkowników testowych
  const users = await findTestUsers();
  if (!users) {
    console.log('Przerwanie testu z powodu braku użytkowników testowych');
    process.exit(1);
  }
  
  // Utworzenie testowych wiadomości
  const messagesCreated = await createTestMessages(users);
  if (!messagesCreated) {
    console.log('Wystąpił błąd podczas tworzenia wiadomości testowych');
    // Kontynuujemy test mimo błędu, aby sprawdzić czy istnieją jakieś wiadomości
  }
  
  // Testowanie pobierania konwersacji
  const conversations = await testGetConversations(users[0]._id);
  
  // Jeśli znaleziono konwersacje, testujemy pobieranie wiadomości z pierwszej z nich
  if (conversations.length > 0) {
    const otherUserId = conversations[0]._id;
    await testGetMessages(users[0]._id, otherUserId);
  }
  
  // Rozłączenie z bazą danych
  await mongoose.disconnect();
  console.log('✅ Test zakończony. Rozłączono z bazą danych');
};

// Uruchomienie testu
main().catch(err => {
  console.error('❌ Nieobsłużony błąd:', err);
  mongoose.disconnect();
});