import Message from '../../models/communication/message.js';
import User from '../../models/user/user.js';
import Ad from '../../models/listings/ad.js';
import mongoose from 'mongoose';
import notificationService from '../notifications/notificationController.js';
import { sendNewMessageEmail } from '../../config/nodemailer.js';
import socketService from '../../services/socketService.js';

// Pobieranie wiadomości dla danego folderu
export const getMessages = async (req, res) => {
  try {
    const { folder } = req.params;
    const userId = req.user.userId;

    // Konwertuj userId na ObjectId, aby zapewnić poprawne porównanie w MongoDB
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;

    let query = {};
    
    // Zapytania dla każdego folderu
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

    // Pobierz wiadomości
    const messages = await Message.find(query)
      .populate('sender', 'name email')
      .populate('recipient', 'name email')
      .populate('relatedAd', 'headline brand model')
      .sort({ createdAt: -1 });

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

    // Konwertuj userId na ObjectId, aby zapewnić poprawne porównanie w MongoDB
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;

    const message = await Message.findById(id)
      .populate('sender', 'name email')
      .populate('recipient', 'name email')
      .populate('relatedAd', 'headline brand model');

    if (!message) {
      return res.status(404).json({ message: 'Wiadomość nie znaleziona' });
    }

    // Sprawdź dostęp - porównaj ID jako stringi
    const senderId = typeof message.sender === 'object' ? message.sender._id.toString() : message.sender.toString();
    const recipientId = typeof message.recipient === 'object' ? message.recipient._id.toString() : message.recipient.toString();
    const userIdStr = userObjectId.toString();
    
    // Sprawdź, czy użytkownik jest nadawcą lub odbiorcą wiadomości
    const isUserSender = senderId === userIdStr;
    const isUserRecipient = recipientId === userIdStr;
    
    if (!isUserSender && !isUserRecipient) {
      return res.status(403).json({ message: 'Brak dostępu do tej wiadomości' });
    }

    // Oznacz jako przeczytaną, jeśli odbiorca ją otwiera
    if (isUserRecipient && !message.read) {
      message.read = true;
      await message.save();
    }

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

    // Tworzenie powiadomienia o nowej wiadomości z inteligentną logiką
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
      const recipientId = recipientUser._id.toString();
      const senderIdStr = senderObjectId.toString();
      
      // Sprawdź, czy należy wysłać powiadomienie (inteligentna logika)
      const shouldNotify = socketService.shouldSendMessageNotification(recipientId, senderIdStr);
      
      if (shouldNotify) {
        console.log(`Wysyłam powiadomienie o nowej wiadomości od ${senderName} do ${recipientId}`);
        
        // Powiadomienie w aplikacji
        await notificationService.notifyNewMessage(recipientId, senderName, adTitle);
        
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
        }
      } else {
        console.log(`Pomijam powiadomienie o wiadomości od ${senderName} do ${recipientId} - użytkownik jest aktywny w konwersacji lub otrzymał już powiadomienie`);
      }
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
