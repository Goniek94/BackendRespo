import Message from '../models/message.js';
import User from '../models/user.js';
import Ad from '../models/ad.js';
import mongoose from 'mongoose';
import notificationService from '../controllers/notificationController.js';
import { sendNewMessageEmail } from '../config/nodemailer.js';
import socketService from '../services/socketService.js';

// Pobieranie wiadomości dla danego folderu
export const getMessages = async (req, res) => {
  try {
    const { folder } = req.params;
    console.log('req.user:', req.user);
    const userId = req.user.userId;

    console.log(`getMessages - folder: ${folder}, userId: ${userId}`);

    // Konwertuj userId na ObjectId, aby zapewnić poprawne porównanie w MongoDB
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    
    console.log(`Przekonwertowane userObjectId: ${userObjectId}`);

    let query = {};
    
    // Uproszczone zapytania dla każdego folderu
    switch(folder) {
      case 'inbox':
        // Pobierz wszystkie wiadomości, gdzie użytkownik jest odbiorcą i nie usunął wiadomości
        query = { 
          recipient: userObjectId,
          deletedBy: { $ne: userObjectId }
        };
        break;
      case 'sent':
        // Pobierz wszystkie wiadomości, gdzie użytkownik jest nadawcą, nie są szkicami i nie usunął wiadomości
        query = { 
          sender: userObjectId,
          draft: false, 
          deletedBy: { $ne: userObjectId }
        };
        break;
      case 'drafts':
        // Pobierz wszystkie szkice użytkownika
        query = { 
          sender: userObjectId,
          draft: true, 
          deletedBy: { $ne: userObjectId }
        };
        break;
      case 'starred':
        // Pobierz wszystkie wiadomości oznaczone gwiazdką, gdzie użytkownik jest nadawcą lub odbiorcą
        query = { 
          $or: [
            { recipient: userObjectId, starred: true },
            { sender: userObjectId, starred: true }
          ],
          deletedBy: { $ne: userObjectId }
        };
        break;
      case 'trash':
        // Usuń wiadomości z kosza starsze niż 30 dni
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        await Message.deleteMany({
          deletedBy: userObjectId,
          createdAt: { $lt: thirtyDaysAgo }
        });
        // Pobierz wszystkie wiadomości usunięte przez użytkownika
        query = { 
          deletedBy: userObjectId
        };
        break;
      case 'archived':
        // Pobierz wszystkie zarchiwizowane wiadomości, gdzie użytkownik jest nadawcą lub odbiorcą
        query = { 
          $or: [
            { recipient: userObjectId, archived: true },
            { sender: userObjectId, archived: true }
          ],
          deletedBy: { $ne: userObjectId }
        };
        break;
      default:
        return res.status(400).json({ message: 'Nieprawidłowy folder' });
    }

    console.log('Query:', JSON.stringify(query));

    // Sprawdź, czy istnieją wiadomości dla tego zapytania
    const count = await Message.countDocuments(query);
    console.log(`Liczba wiadomości dla zapytania: ${count}`);
    
    // Sprawdź wszystkie wiadomości w bazie danych
    const allMessagesInDB = await Message.find({}).limit(10);
    console.log(`Wszystkie wiadomości w bazie danych (limit 10): ${allMessagesInDB.length}`);
    if (allMessagesInDB.length > 0) {
      console.log('Przykładowe wiadomości z bazy danych:');
      for (const msg of allMessagesInDB) {
        console.log(`ID: ${msg._id}`);
        console.log(`Nadawca: ${msg.sender} (typ: ${typeof msg.sender})`);
        console.log(`Odbiorca: ${msg.recipient} (typ: ${typeof msg.recipient})`);
        console.log(`Temat: ${msg.subject}`);
        console.log(`Treść: ${msg.content.substring(0, 50)}...`);
        console.log(`Usunięte przez: ${msg.deletedBy}`);
        console.log(`Przeczytane: ${msg.read}`);
        console.log(`Oznaczone gwiazdką: ${msg.starred}`);
        console.log(`Szkic: ${msg.draft}`);
        console.log(`Data utworzenia: ${msg.createdAt}`);
        console.log('---');
      }
    }
    
    // Sprawdź wiadomości dla tego użytkownika
    console.log(`Sprawdzanie wiadomości dla użytkownika ${userId} (${userObjectId})`);
    const userMessages = await Message.find({
      $or: [
        { sender: userObjectId },
        { recipient: userObjectId }
      ]
    }).limit(10);
    
    console.log(`Wiadomości dla użytkownika (limit 10): ${userMessages.length}`);
    if (userMessages.length > 0) {
      console.log('Przykładowe wiadomości dla użytkownika:');
      for (const msg of userMessages) {
        console.log(`ID: ${msg._id}`);
        console.log(`Nadawca: ${msg.sender} (typ: ${typeof msg.sender})`);
        console.log(`Odbiorca: ${msg.recipient} (typ: ${typeof msg.recipient})`);
        console.log(`Temat: ${msg.subject}`);
        console.log(`Treść: ${msg.content.substring(0, 50)}...`);
        console.log(`Usunięte przez: ${msg.deletedBy}`);
        console.log(`Przeczytane: ${msg.read}`);
        console.log(`Oznaczone gwiazdką: ${msg.starred}`);
        console.log(`Szkic: ${msg.draft}`);
        console.log(`Data utworzenia: ${msg.createdAt}`);
        console.log('---');
      }
    }
    
    // Sprawdź wiadomości dla tego zapytania
    console.log(`Sprawdzanie wiadomości dla zapytania: ${JSON.stringify(query)}`);
    const queryMessages = await Message.find(query).limit(10);
    
    console.log(`Wiadomości dla zapytania (limit 10): ${queryMessages.length}`);
    if (queryMessages.length > 0) {
      console.log('Przykładowe wiadomości dla zapytania:');
      for (const msg of queryMessages) {
        console.log(`ID: ${msg._id}`);
        console.log(`Nadawca: ${msg.sender} (typ: ${typeof msg.sender})`);
        console.log(`Odbiorca: ${msg.recipient} (typ: ${typeof msg.recipient})`);
        console.log(`Temat: ${msg.subject}`);
        console.log(`Treść: ${msg.content.substring(0, 50)}...`);
        console.log(`Usunięte przez: ${msg.deletedBy}`);
        console.log(`Przeczytane: ${msg.read}`);
        console.log(`Oznaczone gwiazdką: ${msg.starred}`);
        console.log(`Szkic: ${msg.draft}`);
        console.log(`Data utworzenia: ${msg.createdAt}`);
        console.log('---');
      }
    }

    // Pobierz szczegóły użytkownika
    const user = await User.findById(userId);
    console.log(`Użytkownik: ${user ? user.name || user.email : 'Nie znaleziono'} (ID: ${userId})`);

    // Pobierz wiadomości
    const messages = await Message.find(query)
      .populate('sender', 'name email')
      .populate('recipient', 'name email')
      .populate('relatedAd', 'headline brand model')
      .sort({ createdAt: -1 });

    console.log(`Znaleziono ${messages.length} wiadomości`);
    if (messages.length > 0) {
      console.log('Przykładowa wiadomość:', {
        id: messages[0]._id,
        sender: messages[0].sender ? (messages[0].sender.name || messages[0].sender.email) : 'Brak danych',
        recipient: messages[0].recipient ? (messages[0].recipient.name || messages[0].recipient.email) : 'Brak danych',
        subject: messages[0].subject,
        relatedAd: messages[0].relatedAd ? (messages[0].relatedAd.headline || `${messages[0].relatedAd.brand} ${messages[0].relatedAd.model}`) : 'Brak'
      });
    } else {
      console.log(`Brak wiadomości dla folderu ${folder}`);
      
      // Sprawdź, czy istnieją jakiekolwiek wiadomości dla tego użytkownika
      const allMessages = await Message.countDocuments({
        $or: [
          { sender: userId },
          { recipient: userId }
        ]
      });
      console.log(`Łączna liczba wiadomości dla użytkownika: ${allMessages}`);
    }

    res.status(200).json(messages);
  } catch (error) {
    console.error('Błąd w getMessages:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
};

// Pobieranie pojedynczej wiadomości
export const getMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    console.log(`getMessage - id: ${id}, userId: ${userId}`);

    // Konwertuj userId na ObjectId, aby zapewnić poprawne porównanie w MongoDB
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    
    console.log(`Przekonwertowane userObjectId: ${userObjectId}`);

    const message = await Message.findById(id)
      .populate('sender', 'name email')
      .populate('recipient', 'name email')
      .populate('relatedAd', 'headline brand model');

    if (!message) {
      console.log('Wiadomość nie znaleziona');
      return res.status(404).json({ message: 'Wiadomość nie znaleziona' });
    }

    console.log('Znaleziona wiadomość:', {
      id: message._id,
      sender: typeof message.sender === 'object' ? message.sender._id : message.sender,
      recipient: typeof message.recipient === 'object' ? message.recipient._id : message.recipient,
      subject: message.subject
    });

    // Sprawdź dostęp - porównaj ID jako stringi
    const senderId = typeof message.sender === 'object' ? message.sender._id.toString() : message.sender.toString();
    const recipientId = typeof message.recipient === 'object' ? message.recipient._id.toString() : message.recipient.toString();
    const userIdStr = userObjectId.toString();
    
    console.log(`Porównanie ID - sender: ${senderId}, recipient: ${recipientId}, userId: ${userIdStr}`);
    
    // Sprawdź, czy użytkownik jest nadawcą lub odbiorcą wiadomości
    const isUserSender = senderId === userIdStr;
    const isUserRecipient = recipientId === userIdStr;
    
    console.log(`Czy użytkownik jest nadawcą: ${isUserSender}, Czy użytkownik jest odbiorcą: ${isUserRecipient}`);
    
    if (!isUserSender && !isUserRecipient) {
      console.log('Brak dostępu do wiadomości - użytkownik nie jest ani nadawcą, ani odbiorcą');
      return res.status(403).json({ message: 'Brak dostępu do tej wiadomości' });
    }

    // Oznacz jako przeczytaną, jeśli odbiorca ją otwiera
    if (isUserRecipient && !message.read) {
      console.log('Oznaczanie wiadomości jako przeczytana');
      message.read = true;
      await message.save();
    }

    console.log('Zwracanie wiadomości');
    res.status(200).json(message);
  } catch (error) {
    console.error('Błąd w getMessage:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
};

// Wysyłanie nowej wiadomości
export const sendMessage = async (req, res) => {
  try {
    const { recipient, subject, content, adId } = req.body;
    const senderId = req.user.userId;
    
    // Konwertuj senderId na ObjectId, aby zapewnić poprawne porównanie w MongoDB
    const senderObjectId = mongoose.Types.ObjectId.isValid(senderId) ? new mongoose.Types.ObjectId(senderId) : senderId;
    
    // Znajdź odbiorcę
    let recipientUser;
    if (mongoose.Types.ObjectId.isValid(recipient)) {
      recipientUser = await User.findById(recipient);
    } else {
      recipientUser = await User.findOne({ email: recipient });
    }

    if (!recipientUser) {
      return res.status(404).json({ message: 'Nie znaleziono odbiorcy' });
    }

    // Przetwarzanie załączników
    const attachments = req.files ? req.files.map(file => ({
      name: file.originalname,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype
    })) : [];

    // Utwórz nową wiadomość
    const newMessage = new Message({
      sender: senderObjectId,
      recipient: recipientUser._id,
      subject,
      content,
      attachments,
      relatedAd: adId // Opcjonalne pole, jeśli wiadomość dotyczy ogłoszenia
    });

    await newMessage.save();

    // Emit realtime event do odbiorcy (socket.io)
    if (socketService.isUserOnline(recipientUser._id.toString())) {
      socketService.sendNotification(recipientUser._id.toString(), { type: 'new_message' });
    }

    // Znajdź dane nadawcy dla powiadomienia
    const sender = await User.findById(senderId);
    if (!sender) {
      return res.status(404).json({ message: 'Nie znaleziono nadawcy' });
    }

    // Tworzenie powiadomienia o nowej wiadomości
    try {
      let adTitle = null;
      
      // Jeśli wiadomość dotyczy ogłoszenia, pobierz jego tytuł
      if (adId && mongoose.Types.ObjectId.isValid(adId)) {
        const ad = await Ad.findById(adId);
        if (ad) {
          adTitle = ad.headline || `${ad.brand} ${ad.model}`;
        }
      }
      
      const senderName = sender.name || sender.email;
      
      // Powiadomienie w aplikacji
      await notificationService.notifyNewMessage(recipientUser._id.toString(), senderName, adTitle);
      console.log(`Utworzono powiadomienie o nowej wiadomości dla użytkownika ${recipientUser._id}`);
      
      // Powiadomienie e-mail
      if (recipientUser.email) {
        // Przygotuj podgląd treści wiadomości (maksymalnie 150 znaków)
        const messagePreview = content.length > 150 ? content.substring(0, 147) + '...' : content;
        
        // Wyślij e-mail
        await sendNewMessageEmail(
          recipientUser.email,
          senderName,
          subject,
          messagePreview,
          adTitle
        );
        console.log(`Wysłano powiadomienie e-mail o nowej wiadomości do ${recipientUser.email}`);
      }
    } catch (notificationError) {
      console.error('Błąd podczas tworzenia powiadomienia:', notificationError);
      // Nie przerywamy głównego procesu w przypadku błędu powiadomienia
    }

    res.status(201).json({ message: 'Wiadomość wysłana' });
  } catch (error) {
    res.status(500).json({ message: 'Błąd serwera' });
  }
};

// Zapisywanie wiadomości roboczej
export const saveDraft = async (req, res) => {
  try {
    const { recipient, subject, content, draftId } = req.body;
    const senderId = req.user.userId;
    
    // Konwertuj senderId na ObjectId, aby zapewnić poprawne porównanie w MongoDB
    const senderObjectId = mongoose.Types.ObjectId.isValid(senderId) ? new mongoose.Types.ObjectId(senderId) : senderId;
    
    // Przygotuj dane
    const draftData = {
      sender: senderObjectId,
      subject: subject || '',
      content: content || '',
      draft: true
    };

    // Dodaj załączniki, jeśli są
    if (req.files && req.files.length > 0) {
      draftData.attachments = req.files.map(file => ({
        name: file.originalname,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype
      }));
    }

    // Znajdź odbiorcę, jeśli podano
    if (recipient) {
      let recipientUser;
      if (mongoose.Types.ObjectId.isValid(recipient)) {
        recipientUser = await User.findById(recipient);
      } else {
        recipientUser = await User.findOne({ email: recipient });
      }

      if (recipientUser) {
        draftData.recipient = recipientUser._id;
      }
    } else {
      // Wymagane pole w MongoDB
      draftData.recipient = senderId; // Tymczasowo, odbiorca to nadawca
    }

    // Aktualizuj lub utwórz szkic
    let draft;
    if (draftId && mongoose.Types.ObjectId.isValid(draftId)) {
      draft = await Message.findOneAndUpdate(
        { _id: draftId, sender: senderId, draft: true },
        draftData,
        { new: true }
      );
      
      if (!draft) {
        return res.status(404).json({ message: 'Szkic nie znaleziony' });
      }
    } else {
      draft = new Message(draftData);
      await draft.save();
    }

    res.status(200).json({ draftId: draft._id });
  } catch (error) {
    res.status(500).json({ message: 'Błąd serwera' });
  }
};

// Oznaczanie jako przeczytane
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Konwertuj userId na ObjectId, aby zapewnić poprawne porównanie w MongoDB
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    const userIdStr = userObjectId.toString();

    const message = await Message.findById(id);
    
    if (!message) {
      return res.status(404).json({ message: 'Wiadomość nie znaleziona' });
    }
    
    if (message.recipient.toString() !== userIdStr) {
      return res.status(403).json({ message: 'Brak uprawnień' });
    }

    message.read = true;
    await message.save();

    res.status(200).json({ message: 'Oznaczono jako przeczytane' });
  } catch (error) {
    res.status(500).json({ message: 'Błąd serwera' });
  }
};

// Przełączanie gwiazdki
export const toggleStar = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Konwertuj userId na ObjectId, aby zapewnić poprawne porównanie w MongoDB
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    const userIdStr = userObjectId.toString();

    const message = await Message.findById(id);
    
    if (!message) {
      return res.status(404).json({ message: 'Wiadomość nie znaleziona' });
    }
    
    if (message.sender.toString() !== userIdStr && message.recipient.toString() !== userIdStr) {
      return res.status(403).json({ message: 'Brak uprawnień' });
    }

    message.starred = !message.starred;
    await message.save();

    res.status(200).json({ starred: message.starred });
  } catch (error) {
    res.status(500).json({ message: 'Błąd serwera' });
  }
};

// Usuwanie wiadomości
export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Konwertuj userId na ObjectId, aby zapewnić poprawne porównanie w MongoDB
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    const userIdStr = userObjectId.toString();

    const message = await Message.findById(id);
    
    if (!message) {
      return res.status(404).json({ message: 'Wiadomość nie znaleziona' });
    }
    
    if (message.sender.toString() !== userIdStr && message.recipient.toString() !== userIdStr) {
      return res.status(403).json({ message: 'Brak uprawnień' });
    }

    // Jeśli już jest w koszu, usuń całkowicie
    if (message.deletedBy.some(id => id.toString() === userIdStr)) {
      await Message.findByIdAndDelete(id);
      return res.status(200).json({ message: 'Wiadomość usunięta' });
    }
    
    // Dodaj do kosza
    message.deletedBy.push(userObjectId);
    await message.save();

    res.status(200).json({ message: 'Przeniesiono do kosza' });
  } catch (error) {
    res.status(500).json({ message: 'Błąd serwera' });
  }
};

// Wyszukiwanie wiadomości
export const searchMessages = async (req, res) => {
  try {
    const { query, folder } = req.query;
    const userId = req.user.userId;
    
    // Konwertuj userId na ObjectId, aby zapewnić poprawne porównanie w MongoDB
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    
    if (!query) {
      return res.status(400).json({ message: 'Brak parametru wyszukiwania' });
    }

    let searchCriteria = {
      $or: [
        { subject: { $regex: query, $options: 'i' } },
        { content: { $regex: query, $options: 'i' } }
      ]
    };

    // Dodaj kryteria folderu
    if (folder === 'inbox') {
      searchCriteria = { $and: [searchCriteria, { recipient: userObjectId, deletedBy: { $ne: userObjectId } }] };
    } else if (folder === 'sent') {
      searchCriteria = { $and: [searchCriteria, { sender: userObjectId, draft: false, deletedBy: { $ne: userObjectId } }] };
    } else if (folder === 'drafts') {
      searchCriteria = { $and: [searchCriteria, { sender: userObjectId, draft: true, deletedBy: { $ne: userObjectId } }] };
    } else if (folder === 'starred') {
      searchCriteria = { 
        $and: [
          searchCriteria, 
          { 
            $or: [{ recipient: userObjectId }, { sender: userObjectId }],
            starred: true,
            deletedBy: { $ne: userObjectId }
          }
        ] 
      };
    } else if (folder === 'trash') {
      searchCriteria = { $and: [searchCriteria, { deletedBy: userObjectId }] };
    } else if (folder === 'archived') {
      searchCriteria = { 
        $and: [
          searchCriteria, 
          { 
            $or: [{ recipient: userObjectId }, { sender: userObjectId }],
            archived: true,
            deletedBy: { $ne: userObjectId }
          }
        ] 
      };
    } else {
      // Wszystkie foldery
      searchCriteria = { 
        $and: [
          searchCriteria, 
          { $or: [{ recipient: userObjectId }, { sender: userObjectId }] },
          { deletedBy: { $ne: userObjectId } }
        ] 
      };
    }

    const messages = await Message.find(searchCriteria)
      .populate('sender', 'name email')
      .populate('recipient', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Błąd serwera' });
  }
};

// Sugestie użytkowników
export const getUserSuggestions = async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.user.userId;
    
    // Konwertuj userId na ObjectId, aby zapewnić poprawne porównanie w MongoDB
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    
    if (!query || query.length < 2) {
      return res.status(200).json([]);
    }

    const users = await User.find({
      _id: { $ne: userObjectId },
      $or: [
        { email: { $regex: query, $options: 'i' } },
        { name: { $regex: query, $options: 'i' } }
      ]
    })
    .select('name email')
    .limit(5);

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Błąd serwera' });
  }
};

// Wysyłanie wiadomości do użytkownika (z profilu użytkownika)
export const sendMessageToUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { subject, content } = req.body;
    const senderId = req.user.userId;
    
    // Konwertuj senderId na ObjectId, aby zapewnić poprawne porównanie w MongoDB
    const senderObjectId = mongoose.Types.ObjectId.isValid(senderId) ? new mongoose.Types.ObjectId(senderId) : senderId;
    const recipientObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    
    // Sprawdź czy użytkownik istnieje
    const recipientUser = await User.findById(recipientObjectId);
    if (!recipientUser) {
      return res.status(404).json({ message: 'Nie znaleziono użytkownika' });
    }
    
    // Sprawdź czy użytkownik nie wysyła wiadomości do samego siebie
    if (senderObjectId.toString() === recipientObjectId.toString()) {
      return res.status(400).json({ message: 'Nie możesz wysłać wiadomości do samego siebie' });
    }

    // Przetwarzanie załączników
    const attachments = req.files ? req.files.map(file => ({
      name: file.originalname,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype
    })) : [];

    // Utwórz nową wiadomość
    const newMessage = new Message({
      sender: senderObjectId,
      recipient: recipientUser._id,
      subject: subject || `Wiadomość do ${recipientUser.name || recipientUser.email}`,
      content,
      attachments
    });

    await newMessage.save();

    // Emit realtime event do odbiorcy (socket.io)
    if (socketService.isUserOnline(recipientUser._id.toString())) {
      socketService.sendNotification(recipientUser._id.toString(), { type: 'new_message' });
    }

    // Znajdź dane nadawcy dla powiadomienia
    const sender = await User.findById(senderId);
    if (!sender) {
      return res.status(404).json({ message: 'Nie znaleziono nadawcy' });
    }

    // Tworzenie powiadomienia o nowej wiadomości
    try {
      const senderName = sender.name || sender.email;
      await notificationService.notifyNewMessage(recipientUser._id.toString(), senderName, null);
      console.log(`Utworzono powiadomienie o nowej wiadomości dla użytkownika ${recipientUser._id}`);
    } catch (notificationError) {
      console.error('Błąd podczas tworzenia powiadomienia:', notificationError);
      // Nie przerywamy głównego procesu w przypadku błędu powiadomienia
    }

    res.status(201).json({ message: 'Wiadomość wysłana' });
  } catch (error) {
    console.error('Błąd podczas wysyłania wiadomości:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
};

// Pobieranie konwersacji między dwoma użytkownikami
export const getConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.userId;

    console.log('--- getConversation DEBUG ---');
    console.log('currentUserId (JWT):', currentUserId, 'typeof:', typeof currentUserId);
    console.log('userId (param):', userId, 'typeof:', typeof userId);

    // Konwertuj userId na ObjectId, aby zapewnić poprawne porównanie w MongoDB
    const currentUserObjectId = mongoose.Types.ObjectId.isValid(currentUserId) ? new mongoose.Types.ObjectId(currentUserId) : currentUserId;
    const otherUserObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;

    console.log('currentUserObjectId:', currentUserObjectId, 'typeof:', typeof currentUserObjectId);
    console.log('otherUserObjectId:', otherUserObjectId, 'typeof:', typeof otherUserObjectId);

    // Sprawdź czy użytkownik istnieje
    const otherUser = await User.findById(otherUserObjectId);
    if (!otherUser) {
      console.log('Nie znaleziono użytkownika:', otherUserObjectId);
      return res.status(404).json({ message: 'Nie znaleziono użytkownika' });
    }

    // Pobierz wiadomości między użytkownikami
    const messages = await Message.find({
      $or: [
        { sender: currentUserObjectId, recipient: otherUserObjectId, deletedBy: { $ne: currentUserObjectId } },
        { sender: otherUserObjectId, recipient: currentUserObjectId, deletedBy: { $ne: currentUserObjectId } }
      ]
    })
    .populate('sender', 'name email')
    .populate('recipient', 'name email')
    .populate('relatedAd', 'headline brand model')
    .sort({ createdAt: 1 });

    console.log('Znaleziono wiadomości:', messages.length);
    if (messages.length > 0) {
      messages.forEach(msg => {
        console.log('msg._id:', msg._id, '| sender:', msg.sender?._id, '| recipient:', msg.recipient?._id);
      });
    }

    // Oznacz wszystkie wiadomości od drugiego użytkownika jako przeczytane
    const unreadMessages = messages.filter(
      msg => msg.recipient.toString() === currentUserId && !msg.read
    );

    if (unreadMessages.length > 0) {
      await Message.updateMany(
        { _id: { $in: unreadMessages.map(msg => msg._id) } },
        { read: true }
      );
    }

    // Grupuj wiadomości według relatedAd, jeśli istnieje
    const conversationsByAd = {};
    messages.forEach(msg => {
      const adId = msg.relatedAd ? msg.relatedAd._id.toString() : 'general';
      if (!conversationsByAd[adId]) {
        conversationsByAd[adId] = {
          adInfo: msg.relatedAd || null,
          messages: []
        };
      }
      conversationsByAd[adId].messages.push(msg);
    });

    res.status(200).json({
      otherUser: {
        id: otherUser._id,
        name: otherUser.name,
        email: otherUser.email
      },
      conversations: conversationsByAd
    });
  } catch (error) {
    console.error('Błąd podczas pobierania konwersacji:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
};

// Odpowiadanie na wiadomość
export const replyToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const senderId = req.user.userId;
    
    // Konwertuj senderId na ObjectId, aby zapewnić poprawne porównanie w MongoDB
    const senderObjectId = mongoose.Types.ObjectId.isValid(senderId) ? new mongoose.Types.ObjectId(senderId) : senderId;
    const senderIdStr = senderObjectId.toString();
    
    // Znajdź oryginalną wiadomość
    const originalMessage = await Message.findById(messageId);
    if (!originalMessage) {
      return res.status(404).json({ message: 'Nie znaleziono wiadomości' });
    }
    
    // Sprawdź czy użytkownik ma dostęp do tej wiadomości
    if (originalMessage.sender.toString() !== senderIdStr && originalMessage.recipient.toString() !== senderIdStr) {
      return res.status(403).json({ message: 'Brak dostępu do tej wiadomości' });
    }
    
    // Określ odbiorcę (jeśli jesteś nadawcą, to odbiorca, jeśli jesteś odbiorcą, to nadawca)
    const recipientId = originalMessage.sender.toString() === senderIdStr 
      ? originalMessage.recipient 
      : originalMessage.sender;
    
    // Przetwarzanie załączników
    const attachments = req.files ? req.files.map(file => ({
      name: file.originalname,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype
    })) : [];
    
    // Utwórz nową wiadomość jako odpowiedź
    const newMessage = new Message({
      sender: senderObjectId,
      recipient: recipientId,
      subject: originalMessage.subject.startsWith('Re:') 
        ? originalMessage.subject 
        : `Re: ${originalMessage.subject}`,
      content,
      attachments,
      relatedAd: originalMessage.relatedAd
    });
    
    await newMessage.save();
    
    // Znajdź dane nadawcy dla powiadomienia
    const sender = await User.findById(senderId);
    if (!sender) {
      return res.status(404).json({ message: 'Nie znaleziono nadawcy' });
    }
    
    // Tworzenie powiadomienia o nowej wiadomości
    try {
      const senderName = sender.name || sender.email;
      
      // Jeśli wiadomość dotyczy ogłoszenia, pobierz jego tytuł
      let adTitle = null;
      if (originalMessage.relatedAd && mongoose.Types.ObjectId.isValid(originalMessage.relatedAd)) {
        const ad = await Ad.findById(originalMessage.relatedAd);
        if (ad) {
          adTitle = ad.headline || `${ad.brand} ${ad.model}`;
        }
      }
      
      await notificationService.notifyNewMessage(recipientId.toString(), senderName, adTitle);
      console.log(`Utworzono powiadomienie o nowej wiadomości dla użytkownika ${recipientId}`);
    } catch (notificationError) {
      console.error('Błąd podczas tworzenia powiadomienia:', notificationError);
      // Nie przerywamy głównego procesu w przypadku błędu powiadomienia
    }
    
    res.status(201).json({ message: 'Odpowiedź wysłana' });
  } catch (error) {
    console.error('Błąd podczas wysyłania odpowiedzi:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
};

/**
 * Pobieranie listy konwersacji użytkownika - wersja produkcyjna
 * Zwraca konwersacje w formacie zgodnym z oczekiwaniami frontu:
 * [{ user, lastMessage, unreadCount, adInfo }]
 */
export const getConversationsList = async (req, res) => {
  try {
    const userId = req.user.userId;
    // Pobierz parametr folder z zapytania
    const { folder } = req.query;
    
    console.log('=== getConversationsList START ===');
    console.log('userId z tokenu JWT:', userId, 'typ:', typeof userId);
    console.log('Folder z zapytania:', folder);
    
    // Sprawdź, czy userId jest poprawnym ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log(`BŁĄD: Nieprawidłowy format userId: ${userId}`);
      return res.status(400).json({ message: 'Nieprawidłowy identyfikator użytkownika' });
    }
    
    // Konwertuj userId na ObjectId
    const userObjectId = new mongoose.Types.ObjectId(userId);
    console.log(`Przekonwertowane userObjectId: ${userObjectId}`);
    
    // Sprawdź czy użytkownik istnieje
    const user = await User.findById(userObjectId);
    if (!user) {
      console.log(`BŁĄD: Nie znaleziono użytkownika o ID: ${userId}`);
      return res.status(404).json({ message: 'Nie znaleziono użytkownika' });
    }
    
    console.log(`Znaleziono użytkownika: ${user.name || user.email} (ID: ${user._id})`);
    
    // Przygotuj zapytanie bazowe w zależności od folderu
    let query = {};
    
    switch(folder) {
      case 'inbox':
        // Pobierz wiadomości, gdzie użytkownik jest odbiorcą i nie usunął wiadomości
        query = {
          recipient: userObjectId,
          deletedBy: { $ne: userObjectId }
        };
        break;
      case 'sent':
        // Pobierz wiadomości, gdzie użytkownik jest nadawcą, nie są szkicami i nie usunął wiadomości
        query = {
          sender: userObjectId,
          draft: false,
          deletedBy: { $ne: userObjectId }
        };
        break;
      case 'starred':
        // Pobierz wiadomości oznaczone gwiazdką, gdzie użytkownik jest nadawcą lub odbiorcą
        query = {
          $or: [
            { recipient: userObjectId, starred: true },
            { sender: userObjectId, starred: true }
          ],
          deletedBy: { $ne: userObjectId }
        };
        break;
      case 'archived':
        // Pobierz zarchiwizowane wiadomości, gdzie użytkownik jest nadawcą lub odbiorcą
        query = {
          $or: [
            { recipient: userObjectId, archived: true },
            { sender: userObjectId, archived: true }
          ],
          deletedBy: { $ne: userObjectId }
        };
        break;
      default:
        // Domyślnie pobierz wszystkie wiadomości (inbox)
        console.log('Używam domyślnego zapytania dla wszystkich konwersacji');
        query = {
          $or: [
            { sender: userObjectId, deletedBy: { $ne: userObjectId } },
            { recipient: userObjectId, deletedBy: { $ne: userObjectId } }
          ]
        };
    }
    
    console.log('Zapytanie do bazy danych:', JSON.stringify(query));
    
    // Pobierz wiadomości z bazy danych
    console.log('Pobieranie wiadomości z bazy danych...');
    const messages = await Message.find(query)
      .populate('sender', 'name email')
      .populate('recipient', 'name email')
      .populate('relatedAd', 'headline brand model')
      .sort({ createdAt: -1 });

    console.log(`Znaleziono ${messages.length} wiadomości dla użytkownika ${userId}`);
    
    // Sprawdź czy mamy wiadomości
    if (messages.length === 0) {
      console.log('Brak wiadomości dla użytkownika - zwracam pustą tablicę');
      return res.status(200).json([]);
    }
    
    // Debug - pokaż przykładową wiadomość
    if (messages.length > 0) {
      const exampleMsg = messages[0];
      console.log('Przykładowa wiadomość:');
      console.log(`- ID: ${exampleMsg._id}`);
      console.log(`- Nadawca: ${exampleMsg.sender ? 
        (typeof exampleMsg.sender === 'object' ? 
          `${exampleMsg.sender.name || exampleMsg.sender.email} (${exampleMsg.sender._id})` : 
          exampleMsg.sender) : 
        'brak'}`);
      console.log(`- Odbiorca: ${exampleMsg.recipient ? 
        (typeof exampleMsg.recipient === 'object' ? 
          `${exampleMsg.recipient.name || exampleMsg.recipient.email} (${exampleMsg.recipient._id})` : 
          exampleMsg.recipient) : 
        'brak'}`);
      console.log(`- Temat: ${exampleMsg.subject}`);
      console.log(`- Data: ${exampleMsg.createdAt}`);
    }

    // Grupuj wiadomości według rozmówcy
    console.log('Grupowanie wiadomości według rozmówcy...');
    const conversationsByUser = {};
    const userIdStr = userObjectId.toString();

    // Przetwarzanie każdej wiadomości
    messages.forEach((msg, index) => {
      console.log(`Przetwarzanie wiadomości ${index + 1}/${messages.length} (ID: ${msg._id})...`);
      
      // Pozyskaj ID nadawcy i odbiorcy (jako stringi)
      let senderId = null;
      let recipientId = null;
      
      // Sprawdź nadawcę
      if (msg.sender) {
        if (typeof msg.sender === 'object' && msg.sender._id) {
          senderId = msg.sender._id.toString();
        } else {
          senderId = msg.sender.toString();
        }
      }
      
      // Sprawdź odbiorcę
      if (msg.recipient) {
        if (typeof msg.recipient === 'object' && msg.recipient._id) {
          recipientId = msg.recipient._id.toString();
        } else {
          recipientId = msg.recipient.toString();
        }
      }
      
      // Jeśli brakuje nadawcy lub odbiorcy, pomiń wiadomość
      if (!senderId || !recipientId) {
        console.log(`  Pominięto wiadomość ${msg._id} - brak nadawcy lub odbiorcy`);
        return;
      }
      
      // Określ kim jest rozmówca
      let otherUserId, otherUser;
      
      if (senderId === userIdStr) {
        // Jeśli jesteś nadawcą, to rozmówcą jest odbiorca
        otherUserId = recipientId;
        otherUser = msg.recipient;
      } else {
        // Jeśli jesteś odbiorcą, to rozmówcą jest nadawca
        otherUserId = senderId;
        otherUser = msg.sender;
      }
      
      // Jeśli to wiadomość do samego siebie, pomiń
      if (otherUserId === userIdStr) {
        console.log(`  Pominięto wiadomość ${msg._id} - wysłana do samego siebie`);
        return;
      }
      
      // Jeśli nie mamy danych rozmówcy, pomiń
      if (!otherUser) {
        console.log(`  Pominięto wiadomość ${msg._id} - brak danych rozmówcy`);
        return;
      }
      
      // Przygotuj obiekt z danymi rozmówcy
      const otherUserObject = {
        _id: otherUserId,
        name: typeof otherUser === 'object' ? 
          (otherUser.name || otherUser.email || 'Nieznany użytkownik') : 
          'Nieznany użytkownik',
        email: typeof otherUser === 'object' ? (otherUser.email || '') : ''
      };
      
      console.log(`  Rozmówca: ${otherUserObject.name} (${otherUserObject._id})`);
      
      // Dodaj lub zaktualizuj konwersację
      if (!conversationsByUser[otherUserId]) {
        // Nowa konwersacja
        conversationsByUser[otherUserId] = {
          user: otherUserObject,
          lastMessage: msg,
          unreadCount: 0,
          adInfo: msg.relatedAd || null
        };
      } else if (msg.createdAt > conversationsByUser[otherUserId].lastMessage.createdAt) {
        // Aktualizuj tylko jeśli ta wiadomość jest nowsza
        conversationsByUser[otherUserId].lastMessage = msg;
        // Zachowaj informacje o ogłoszeniu tylko jeśli są dostępne
        if (msg.relatedAd) {
          conversationsByUser[otherUserId].adInfo = msg.relatedAd;
        }
      }
      
      // Zlicz nieprzeczytane wiadomości
      if (recipientId === userIdStr && senderId === otherUserId && !msg.read) {
        conversationsByUser[otherUserId].unreadCount += 1;
        console.log(`  Nieprzeczytana wiadomość od ${otherUserObject.name}`);
      }
    });
    
    // Konwertuj obiekt na tablicę i sortuj według daty ostatniej wiadomości
    console.log('Konwersja i sortowanie konwersacji...');
    const conversations = Object.values(conversationsByUser)
      .sort((a, b) => b.lastMessage.createdAt - a.lastMessage.createdAt);
    
    console.log(`Znaleziono ${conversations.length} konwersacji`);
    
    // Debug - pokaż przykładową konwersację
    if (conversations.length > 0) {
      const exampleConv = conversations[0];
      console.log('Przykładowa konwersacja:');
      console.log(`- Rozmówca: ${exampleConv.user.name} (${exampleConv.user._id})`);
      console.log(`- Ostatnia wiadomość: ${exampleConv.lastMessage.subject}`);
      console.log(`- Data: ${exampleConv.lastMessage.createdAt}`);
      console.log(`- Nieprzeczytane: ${exampleConv.unreadCount}`);
      console.log(`- Ogłoszenie: ${exampleConv.adInfo ? 
        (typeof exampleConv.adInfo === 'object' ? 
          (exampleConv.adInfo.headline || `${exampleConv.adInfo.brand} ${exampleConv.adInfo.model}`) : 
          'ID: ' + exampleConv.adInfo) : 
        'brak'}`);
    }
    
    console.log('=== getConversationsList END ===');
    return res.status(200).json(conversations);
  } catch (error) {
    console.error('Błąd podczas pobierania listy konwersacji:', error);
    return res.status(500).json({ message: 'Błąd serwera', error: error.message });
  }
};

// Przenoszenie wiadomości do archiwum
export const archiveMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Konwertuj userId na ObjectId, aby zapewnić poprawne porównanie w MongoDB
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    const userIdStr = userObjectId.toString();

    const message = await Message.findById(id);
    
    if (!message) {
      return res.status(404).json({ message: 'Wiadomość nie znaleziona' });
    }
    
    if (message.sender.toString() !== userIdStr && message.recipient.toString() !== userIdStr) {
      return res.status(403).json({ message: 'Brak uprawnień' });
    }

    // Dodaj flagę archived
    message.archived = true;
    await message.save();

    res.status(200).json({ message: 'Wiadomość przeniesiona do archiwum' });
  } catch (error) {
    console.error('Błąd podczas przenoszenia wiadomości do archiwum:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
};

// Przywracanie wiadomości z archiwum
export const unarchiveMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Konwertuj userId na ObjectId, aby zapewnić poprawne porównanie w MongoDB
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    const userIdStr = userObjectId.toString();

    const message = await Message.findById(id);
    
    if (!message) {
      return res.status(404).json({ message: 'Wiadomość nie znaleziona' });
    }
    
    if (message.sender.toString() !== userIdStr && message.recipient.toString() !== userIdStr) {
      return res.status(403).json({ message: 'Brak uprawnień' });
    }

    // Usuń flagę archived
    message.archived = false;
    await message.save();

    res.status(200).json({ message: 'Wiadomość przywrócona z archiwum' });
  } catch (error) {
    console.error('Błąd podczas przywracania wiadomości z archiwum:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
};

// Wysyłanie wiadomości do właściciela ogłoszenia (ze szczegółów ogłoszenia)
export const sendMessageToAd = async (req, res) => {
  try {
    const { adId } = req.params;
    const { subject, content } = req.body;
    const senderId = req.user.userId;
    
    // Konwertuj senderId na ObjectId, aby zapewnić poprawne porównanie w MongoDB
    const senderObjectId = mongoose.Types.ObjectId.isValid(senderId) ? new mongoose.Types.ObjectId(senderId) : senderId;
    
    console.log(`sendMessageToAd - adId: ${adId}, senderId: ${senderId}`);
    console.log(`Przekonwertowane senderObjectId: ${senderObjectId}`);
    
    // Znajdź ogłoszenie
    const ad = await Ad.findById(adId);
    if (!ad) {
      console.log(`Nie znaleziono ogłoszenia o ID: ${adId}`);
      return res.status(404).json({ message: 'Nie znaleziono ogłoszenia' });
    }
    
    console.log(`Znaleziono ogłoszenie: ${ad.headline || `${ad.brand} ${ad.model}`}`);
    console.log(`Właściciel ogłoszenia (ID): ${ad.owner}`);
    
    // Znajdź właściciela ogłoszenia
    const ownerId = ad.owner;
    const ownerObjectId = mongoose.Types.ObjectId.isValid(ownerId) ? new mongoose.Types.ObjectId(ownerId) : ownerId;
    
    console.log(`Przekonwertowane ownerObjectId: ${ownerObjectId}`);
    
    const owner = await User.findById(ownerObjectId);
    if (!owner) {
      console.log(`Nie znaleziono właściciela ogłoszenia o ID: ${ownerId}`);
      return res.status(404).json({ message: 'Nie znaleziono właściciela ogłoszenia' });
    }
    
    console.log(`Znaleziono właściciela ogłoszenia: ${owner.name || owner.email} (ID: ${owner._id})`);
    
// Sprawdź czy użytkownik nie wysyła wiadomości do samego siebie
// Tymczasowo wyłączamy to ograniczenie, aby umożliwić wysyłanie wiadomości do samego siebie
// if (senderId === ownerId.toString()) {
//   console.log('Użytkownik próbuje wysłać wiadomość do samego siebie');
//   return res.status(400).json({ message: 'Nie możesz wysłać wiadomości do samego siebie' });
// }

// Dodaj dodatkowe logowanie dla debugowania
console.log('Porównanie ID nadawcy i odbiorcy:');
console.log(`senderId: ${senderId} (typ: ${typeof senderId})`);
console.log(`senderObjectId: ${senderObjectId} (typ: ${typeof senderObjectId})`);
console.log(`ownerId: ${ownerId} (typ: ${typeof ownerId})`);
console.log(`ownerObjectId: ${ownerObjectId} (typ: ${typeof ownerObjectId})`);

    // Przetwarzanie załączników
    const attachments = req.files ? req.files.map(file => ({
      name: file.originalname,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype
    })) : [];

    // Utwórz tytuł ogłoszenia
    const adTitle = ad.headline || `${ad.brand} ${ad.model}`;
    
    // Utwórz nową wiadomość
    const newMessage = new Message({
      sender: senderObjectId,
      recipient: ownerObjectId,
      subject: subject || `Pytanie o ogłoszenie: ${adTitle}`,
      content,
      attachments,
      relatedAd: adId
    });

    console.log('Utworzono nową wiadomość:', {
      sender: newMessage.sender,
      recipient: newMessage.recipient,
      subject: newMessage.subject,
      relatedAd: newMessage.relatedAd
    });

    await newMessage.save();
    console.log(`Zapisano wiadomość w bazie danych (ID: ${newMessage._id})`);

    // Znajdź dane nadawcy dla powiadomienia
    const sender = await User.findById(senderId);
    if (!sender) {
      console.log(`Nie znaleziono nadawcy o ID: ${senderId}`);
      return res.status(404).json({ message: 'Nie znaleziono nadawcy' });
    }

    // Tworzenie powiadomienia o nowej wiadomości
    try {
      const senderName = sender.name || sender.email;
      await notificationService.notifyNewMessage(ownerId.toString(), senderName, adTitle);
      console.log(`Utworzono powiadomienie o nowej wiadomości dla użytkownika ${ownerId}`);
    } catch (notificationError) {
      console.error('Błąd podczas tworzenia powiadomienia:', notificationError);
      // Nie przerywamy głównego procesu w przypadku błędu powiadomienia
    }

    res.status(201).json({ message: 'Wiadomość wysłana' });
  } catch (error) {
    console.error('Błąd podczas wysyłania wiadomości:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
};
