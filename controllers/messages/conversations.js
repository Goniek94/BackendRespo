import Message from '../../models/message.js';
import User from '../../models/user.js';
import Ad from '../../models/ad.js';
import mongoose from 'mongoose';
import notificationService from '../../controllers/notificationController.js';

// Pobieranie konwersacji między dwoma użytkownikami
export const getConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.userId;

    // Konwertuj userId na ObjectId, aby zapewnić poprawne porównanie w MongoDB
    const currentUserObjectId = mongoose.Types.ObjectId.isValid(currentUserId) ? new mongoose.Types.ObjectId(currentUserId) : currentUserId;
    const otherUserObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;

    // Sprawdź czy użytkownik istnieje
    const otherUser = await User.findById(otherUserObjectId);
    if (!otherUser) {
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

    // Oznacz wszystkie wiadomości od drugiego użytkownika jako przeczytane
    const unreadMessages = messages.filter(
      msg => msg.recipient._id.toString() === currentUserId && !msg.read
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
    
    // Konwertuj senderId na ObjectId
    const senderObjectId = mongoose.Types.ObjectId.isValid(senderId) ? new mongoose.Types.ObjectId(senderId) : senderId;
    const senderIdStr = senderObjectId.toString();
    
    // Znajdź oryginalną wiadomość
    const originalMessage = await Message.findById(messageId).populate('sender').populate('recipient');
    if (!originalMessage) {
      return res.status(404).json({ message: 'Nie znaleziono wiadomości' });
    }
    
    // Sprawdź czy użytkownik ma dostęp do tej wiadomości
    const originalSenderId = typeof originalMessage.sender === 'object' ? 
      originalMessage.sender._id.toString() : originalMessage.sender.toString();
    
    const originalRecipientId = typeof originalMessage.recipient === 'object' ? 
      originalMessage.recipient._id.toString() : originalMessage.recipient.toString();
    
    if (originalSenderId !== senderIdStr && originalRecipientId !== senderIdStr) {
      return res.status(403).json({ message: 'Brak dostępu do tej wiadomości' });
    }
    
    // Określ odbiorcę
    const recipientId = originalSenderId === senderIdStr ? originalMessage.recipient : originalMessage.sender;
    const recipientObjectId = typeof recipientId === 'object' ? recipientId._id : recipientId;
    
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
      recipient: recipientObjectId,
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
      
      await notificationService.notifyNewMessage(
        recipientObjectId.toString(),
        senderName,
        adTitle
      );
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
 * Pobieranie listy konwersacji użytkownika
 * Zwraca konwersacje w formacie: [{ user, lastMessage, unreadCount, adInfo }]
 */
export const getConversationsList = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { folder } = req.query;
    
    // Sprawdź, czy userId jest poprawnym ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Nieprawidłowy identyfikator użytkownika' });
    }
    
    // Konwertuj userId na ObjectId
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    // Sprawdź czy użytkownik istnieje
    const user = await User.findById(userObjectId);
    if (!user) {
      return res.status(404).json({ message: 'Nie znaleziono użytkownika' });
    }
    
    // Przygotuj zapytanie bazowe w zależności od folderu
    let query = {};
    
    switch(folder) {
      case 'inbox':
        query = {
          recipient: userObjectId,
          deletedBy: { $ne: userObjectId }
        };
        break;
      case 'sent':
        query = {
          sender: userObjectId,
          draft: false,
          deletedBy: { $ne: userObjectId }
        };
        break;
      case 'starred':
        query = {
          $or: [
            { recipient: userObjectId, starred: true },
            { sender: userObjectId, starred: true }
          ],
          deletedBy: { $ne: userObjectId }
        };
        break;
      case 'archived':
        query = {
          $or: [
            { recipient: userObjectId, archived: true },
            { sender: userObjectId, archived: true }
          ],
          deletedBy: { $ne: userObjectId }
        };
        break;
      default:
        // Domyślnie pobierz wszystkie wiadomości
        query = {
          $or: [
            { sender: userObjectId, deletedBy: { $ne: userObjectId } },
            { recipient: userObjectId, deletedBy: { $ne: userObjectId } }
          ]
        };
    }
    
    // Pobierz wiadomości z bazy danych
    const messages = await Message.find(query)
      .populate('sender', 'name email')
      .populate('recipient', 'name email')
      .populate('relatedAd', 'headline brand model')
      .sort({ createdAt: -1 });
    
    // Sprawdź czy mamy wiadomości
    if (messages.length === 0) {
      return res.status(200).json([]);
    }

    // Grupuj wiadomości według rozmówcy
    const conversationsByUser = {};
    const userIdStr = userObjectId.toString();

    // Przetwarzanie każdej wiadomości
    messages.forEach((msg) => {
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
      
      // Jeśli to wiadomość do samego siebie lub nie mamy danych rozmówcy, pomiń
      if (otherUserId === userIdStr || !otherUser) {
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
      }
    });
    
    // Konwertuj obiekt na tablicę i sortuj według daty ostatniej wiadomości
    const conversations = Object.values(conversationsByUser)
      .sort((a, b) => b.lastMessage.createdAt - a.lastMessage.createdAt);
    
    return res.status(200).json(conversations);
  } catch (error) {
    console.error('Błąd podczas pobierania listy konwersacji:', error);
    return res.status(500).json({ message: 'Błąd serwera', error: error.message });
  }
};