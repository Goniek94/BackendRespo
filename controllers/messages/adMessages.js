import Message from '../../models/message.js';
import User from '../../models/user.js';
import Ad from '../../models/ad.js';
import mongoose from 'mongoose';
import notificationService from '../../controllers/notificationController.js';
import socketService from '../../services/socketService.js';

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

// Wysyłanie wiadomości do właściciela ogłoszenia (ze szczegółów ogłoszenia)
export const sendMessageToAd = async (req, res) => {
  try {
    const { adId } = req.params;
    const { subject, content } = req.body;
    const senderId = req.user.userId;
    
    // Konwertuj senderId na ObjectId, aby zapewnić poprawne porównanie w MongoDB
    const senderObjectId = mongoose.Types.ObjectId.isValid(senderId) ? new mongoose.Types.ObjectId(senderId) : senderId;
    
    // Znajdź ogłoszenie
    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ message: 'Nie znaleziono ogłoszenia' });
    }
    
    // Znajdź właściciela ogłoszenia
    const ownerId = ad.owner;
    const ownerObjectId = mongoose.Types.ObjectId.isValid(ownerId) ? new mongoose.Types.ObjectId(ownerId) : ownerId;
    
    const owner = await User.findById(ownerObjectId);
    if (!owner) {
      return res.status(404).json({ message: 'Nie znaleziono właściciela ogłoszenia' });
    }
    
    // Możemy tymczasowo wyłączyć sprawdzanie, czy użytkownik wysyła wiadomość do siebie
    // To pozwala właścicielowi ogłoszenia przetestować funkcjonalność wiadomości
    /*
    if (senderId === ownerId.toString()) {
      return res.status(400).json({ message: 'Nie możesz wysłać wiadomości do samego siebie' });
    }
    */

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

    await newMessage.save();

    // Emit realtime event do odbiorcy (socket.io)
    if (socketService.isUserOnline(ownerObjectId.toString())) {
      socketService.sendNotification(ownerObjectId.toString(), { type: 'new_message' });
    }

    // Znajdź dane nadawcy dla powiadomienia
    const sender = await User.findById(senderId);
    if (!sender) {
      return res.status(404).json({ message: 'Nie znaleziono nadawcy' });
    }

    // Tworzenie powiadomienia o nowej wiadomości
    try {
      const senderName = sender.name || sender.email;
      await notificationService.notifyNewMessage(ownerId.toString(), senderName, adTitle);
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