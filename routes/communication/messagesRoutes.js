// backend/routes/messagesRoutes.js - NAPRAWIONY KOD
import express from 'express';
import multer from 'multer';
import path from 'path';
import mongoose from 'mongoose';
import {
  getMessages,
  getMessage,
  sendMessage,
  sendMessageToUser,
  sendMessageToAd,
  saveDraft,
  markAsRead,
  toggleStar,
  deleteMessage,
  searchMessages,
  getUserSuggestions,
  getConversation,
  replyToMessage,
  getConversationsList,
  archiveMessage,
  unarchiveMessage,
  getUnreadCount
} from '../../controllers/communication/index.js';
import {
  starConversation,
  archiveConversation,
  deleteConversation
} from '../../controllers/communication/messageFlags.js';
import auth from '../../middleware/auth.js';
import Message from '../../models/communication/message.js';
import User from '../../models/user/user.js';
import Ad from '../../models/listings/ad.js';
import notificationService from '../../controllers/notifications/notificationController.js';

const router = express.Router();

// Konfiguracja multera do obsługi załączników
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/attachments/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'attachment-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // Limit 10MB
  }
});

// Zabezpiecz wszystkie ścieżki middleware'em autoryzacji
router.use(auth);

// ========== NOWE ENDPOINTY DLA KONWERSACJI ==========

// 🔥 GŁÓWNY ENDPOINT - Odpowiadanie w konwersacji z użytkownikiem
router.post('/conversation/:userId/reply', upload.array('attachments', 5), async (req, res) => {
  try {
    const { userId } = req.params;
    const { content } = req.body;
    const senderId = req.user.userId;
    
    console.log('🚀 Odpowiadanie w konwersacji:', { userId, senderId, hasContent: !!content });
    
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Treść wiadomości jest wymagana' });
    }
    
    // Sprawdź czy użytkownik istnieje
    const recipientUser = await User.findById(userId);
    if (!recipientUser) {
      return res.status(404).json({ message: 'Nie znaleziono użytkownika' });
    }
    
    // Sprawdź czy nie wysyłasz do siebie
    if (userId === senderId) {
      return res.status(400).json({ message: 'Nie możesz wysłać wiadomości do samego siebie' });
    }
    
    // Przetwarzanie załączników
    const attachments = req.files ? req.files.map(file => ({
      name: file.originalname,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype
    })) : [];

    // Znajdź ostatnią wiadomość w konwersacji dla tematu
    const lastMessage = await Message.findOne({
      $or: [
        { sender: senderId, recipient: userId },
        { sender: userId, recipient: senderId }
      ]
    }).sort({ createdAt: -1 });

    // Utwórz nową wiadomość
    const newMessage = new Message({
      sender: senderId,
      recipient: userId,
      subject: lastMessage?.subject ? 
        (lastMessage.subject.startsWith('Re:') ? lastMessage.subject : `Re: ${lastMessage.subject}`) : 
        'Nowa wiadomość',
      content: content.trim(),
      attachments,
      relatedAd: lastMessage?.relatedAd || null
    });

    await newMessage.save();
    console.log('✅ Wiadomość zapisana:', newMessage._id);

    // Powiadomienia
    try {
      const sender = await User.findById(senderId);
      const senderName = sender?.name || sender?.email || 'Użytkownik';
      
      let adTitle = null;
      if (newMessage.relatedAd) {
        const ad = await Ad.findById(newMessage.relatedAd);
        if (ad) {
          adTitle = ad.headline || `${ad.brand} ${ad.model}`;
        }
      }
      
      await notificationService.notifyNewMessage(userId, senderName, adTitle);
      console.log('✅ Powiadomienie wysłane');
    } catch (notificationError) {
      console.error('⚠️ Błąd powiadomienia:', notificationError);
    }

    res.status(201).json({ 
      message: 'Wiadomość wysłana',
      data: {
        _id: newMessage._id,
        content: newMessage.content,
        createdAt: newMessage.createdAt
      }
    });
  } catch (error) {
    console.error('💥 Błąd podczas odpowiadania w konwersacji:', error);
    res.status(500).json({ message: 'Błąd serwera', error: error.message });
  }
});

// 🔥 Oznaczanie konwersacji jako przeczytanej
router.patch('/conversation/:userId/read', async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.userId;
    
    console.log('📖 Oznaczanie konwersacji jako przeczytanej:', { userId, currentUserId });
    
    // Oznacz wszystkie wiadomości od tego użytkownika jako przeczytane
    const result = await Message.updateMany(
      { 
        sender: userId, 
        recipient: currentUserId, 
        read: false 
      },
      { read: true }
    );
    
    console.log('✅ Oznaczono jako przeczytane:', result.modifiedCount, 'wiadomości');
    
    res.status(200).json({ 
      message: 'Konwersacja oznaczona jako przeczytana',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('💥 Błąd podczas oznaczania konwersacji:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// 🔥 Przełączanie gwiazdki konwersacji
router.patch('/conversation/:userId/star', async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.userId;
    
    // Znajdź ostatnią wiadomość w konwersacji
    const lastMessage = await Message.findOne({
      $or: [
        { sender: currentUserId, recipient: userId },
        { sender: userId, recipient: currentUserId }
      ]
    }).sort({ createdAt: -1 });
    
    if (!lastMessage) {
      return res.status(404).json({ message: 'Konwersacja nie znaleziona' });
    }
    
    // Przełącz gwiazdkę
    lastMessage.starred = !lastMessage.starred;
    await lastMessage.save();
    
    res.status(200).json({ 
      message: 'Gwiazdka przełączona',
      starred: lastMessage.starred
    });
  } catch (error) {
    console.error('💥 Błąd podczas przełączania gwiazdki:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// 🔥 Usuwanie konwersacji
router.delete('/conversation/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.userId;
    
    // Oznacz wszystkie wiadomości w konwersacji jako usunięte
    const result = await Message.updateMany(
      {
        $or: [
          { sender: currentUserId, recipient: userId },
          { sender: userId, recipient: currentUserId }
        ]
      },
      { $addToSet: { deletedBy: currentUserId } }
    );
    
    res.status(200).json({ 
      message: 'Konwersacja usunięta',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('💥 Błąd podczas usuwania konwersacji:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// 🔥 Archiwizowanie konwersacji
router.patch('/conversation/:userId/archive', async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.userId;
    
    const result = await Message.updateMany(
      {
        $or: [
          { sender: currentUserId, recipient: userId },
          { sender: userId, recipient: currentUserId }
        ]
      },
      { archived: true }
    );
    
    res.status(200).json({ 
      message: 'Konwersacja zarchiwizowana',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('💥 Błąd podczas archiwizowania:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// 🔥 Przywracanie z archiwum
router.patch('/conversation/:userId/unarchive', async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.userId;
    
    const result = await Message.updateMany(
      {
        $or: [
          { sender: currentUserId, recipient: userId },
          { sender: userId, recipient: currentUserId }
        ]
      },
      { archived: false }
    );
    
    res.status(200).json({ 
      message: 'Konwersacja przywrócona z archiwum',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('💥 Błąd podczas przywracania:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// 🔥 Przenoszenie do kosza
router.patch('/conversation/:userId/trash', async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.userId;
    
    const result = await Message.updateMany(
      {
        $or: [
          { sender: currentUserId, recipient: userId },
          { sender: userId, recipient: currentUserId }
        ]
      },
      { $addToSet: { deletedBy: currentUserId } }
    );
    
    res.status(200).json({ 
      message: 'Konwersacja przeniesiona do kosza',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('💥 Błąd podczas przenoszenia do kosza:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// 🔥 Przenoszenie do folderu
router.patch('/conversation/:userId/move', async (req, res) => {
  try {
    const { userId } = req.params;
    const { folder } = req.body;
    const currentUserId = req.user.userId;
    
    let updateData = {};
    
    switch(folder) {
      case 'archived':
        updateData = { archived: true };
        break;
      case 'trash':
        updateData = { $addToSet: { deletedBy: currentUserId } };
        break;
      case 'inbox':
        updateData = { archived: false, $pull: { deletedBy: currentUserId } };
        break;
      default:
        return res.status(400).json({ message: 'Nieprawidłowy folder' });
    }
    
    const result = await Message.updateMany(
      {
        $or: [
          { sender: currentUserId, recipient: userId },
          { sender: userId, recipient: currentUserId }
        ]
      },
      updateData
    );
    
    res.status(200).json({ 
      message: `Konwersacja przeniesiona do ${folder}`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('💥 Błąd podczas przenoszenia:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// 🔥 Wyszukiwanie konwersacji
router.get('/conversations/search', async (req, res) => {
  try {
    const { query, folder = 'inbox' } = req.query;
    const userId = req.user.userId;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ message: 'Zapytanie musi mieć co najmniej 2 znaki' });
    }
    
    // Wyszukaj wiadomości
    let searchCriteria = {
      $or: [
        { subject: { $regex: query, $options: 'i' } },
        { content: { $regex: query, $options: 'i' } }
      ]
    };
    
    // Dodaj filtr folderu
    switch(folder) {
      case 'inbox':
        searchCriteria = {
          ...searchCriteria,
          recipient: userId,
          deletedBy: { $ne: userId }
        };
        break;
      case 'sent':
        searchCriteria = {
          ...searchCriteria,
          sender: userId,
          deletedBy: { $ne: userId }
        };
        break;
      default:
        searchCriteria = {
          ...searchCriteria,
          $or: [
            { sender: userId },
            { recipient: userId }
          ],
          deletedBy: { $ne: userId }
        };
    }
    
    const messages = await Message.find(searchCriteria)
      .populate('sender', 'name email')
      .populate('recipient', 'name email')
      .populate('relatedAd', 'headline brand model')
      .sort({ createdAt: -1 })
      .limit(50);
    
    // Grupuj według użytkowników
    const conversationsByUser = {};
    
    messages.forEach(msg => {
      const otherUserId = msg.sender._id.toString() === userId ? 
        msg.recipient._id.toString() : msg.sender._id.toString();
      
      const otherUser = msg.sender._id.toString() === userId ? msg.recipient : msg.sender;
      
      if (!conversationsByUser[otherUserId]) {
        conversationsByUser[otherUserId] = {
          user: otherUser,
          lastMessage: msg,
          unreadCount: 0,
          adInfo: msg.relatedAd || null
        };
      }
    });
    
    const conversations = Object.values(conversationsByUser);
    
    res.status(200).json(conversations);
  } catch (error) {
    console.error('💥 Błąd podczas wyszukiwania konwersacji:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// ========== NOWE ENDPOINTY DO ZARZĄDZANIA KONWERSACJAMI ==========

// 🌟 Oznaczanie całej konwersacji jako ważnej
router.patch('/conversations/:userId/star', starConversation);

// 📦 Przenoszenie całej konwersacji do archiwum  
router.patch('/conversations/:userId/archive', archiveConversation);

// 🗑️ Usuwanie całej konwersacji
router.delete('/conversations/:userId', deleteConversation);

// ========== ISTNIEJĄCE ENDPOINTY ==========

// WAŻNE: Trasy z wzorcami muszą być przed parametryzowanymi trasami
// Wyszukiwanie wiadomości
router.get('/search', searchMessages);

// Pobieranie liczby nieprzeczytanych wiadomości
router.get('/unread-count', getUnreadCount);

// Pobieranie sugestii użytkowników
router.get('/users/suggestions', getUserSuggestions);

// Pobieranie listy konwersacji użytkownika
router.get('/conversations', getConversationsList);

// Pobieranie konwersacji z konkretnym użytkownikiem
router.get('/conversation/:userId', getConversation);

// Skrócona wersja trasy dla konwersacji (dla kompatybilności z frontendem)
router.get('/c/:userId', getConversation);

// Pobieranie pojedynczej wiadomości
router.get('/message/:id', getMessage);

// Pobieranie wiadomości dla danego folderu (musi być na końcu, po innych trasach GET)
router.get('/:folder', getMessages);

// Wysyłanie nowej wiadomości - obsługuje wszystkie przypadki
router.post('/send', upload.array('attachments', 5), async (req, res) => {
  try {
    const { recipient, subject, content, adId } = req.body;
    
    // Sprawdź, czy mamy adId - wtedy wysyłamy wiadomość do właściciela ogłoszenia
    if (adId) {
      req.params.adId = adId;
      return sendMessageToAd(req, res);
    }
    
    // Sprawdź, czy recipient jest ID użytkownika - wtedy wysyłamy wiadomość do użytkownika
    if (recipient && mongoose.Types.ObjectId.isValid(recipient)) {
      req.params.userId = recipient;
      return sendMessageToUser(req, res);
    }
    
    // W przeciwnym razie używamy standardowej funkcji sendMessage
    return sendMessage(req, res);
  } catch (error) {
    console.error('Błąd podczas wysyłania wiadomości:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Wysyłanie wiadomości do użytkownika (z profilu użytkownika)
router.post('/send-to-user/:userId', upload.array('attachments', 5), sendMessageToUser);

// Wysyłanie wiadomości do właściciela ogłoszenia (ze szczegółów ogłoszenia)
router.post('/send-to-ad/:adId', upload.array('attachments', 5), sendMessageToAd);

// Odpowiadanie na wiadomość
router.post('/reply/:messageId', upload.array('attachments', 5), replyToMessage);

// Zapisywanie wiadomości roboczej
router.post('/draft', upload.array('attachments', 5), saveDraft);

// Oznaczanie wiadomości jako przeczytana
router.patch('/read/:id', markAsRead);

// Oznaczanie wiadomości gwiazdką
router.patch('/star/:id', toggleStar);

// Przenoszenie wiadomości do archiwum
router.patch('/archive/:id', archiveMessage);

// Przywracanie wiadomości z archiwum
router.patch('/unarchive/:id', unarchiveMessage);

// Edytowanie wiadomości
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, attachments } = req.body;
    const userId = req.user.userId;
    
    console.log('✏️ Edytowanie wiadomości:', { id, userId, hasContent: !!content });
    
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Treść wiadomości jest wymagana' });
    }
    
    // Znajdź wiadomość
    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ message: 'Wiadomość nie znaleziona' });
    }
    
    // Sprawdź czy użytkownik jest właścicielem wiadomości
    if (message.sender.toString() !== userId) {
      return res.status(403).json({ message: 'Brak uprawnień do edycji tej wiadomości' });
    }
    
    // Sprawdź czy wiadomość nie jest starsza niż 24 godziny (opcjonalne ograniczenie)
    const hoursSinceCreation = (Date.now() - message.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation > 24) {
      return res.status(400).json({ message: 'Nie można edytować wiadomości starszych niż 24 godziny' });
    }
    
    // Aktualizuj wiadomość
    message.content = content.trim();
    message.isEdited = true;
    message.editedAt = new Date();
    
    // Opcjonalnie aktualizuj załączniki (jeśli są przesłane)
    if (attachments && Array.isArray(attachments)) {
      message.attachments = attachments;
    }
    
    await message.save();
    
    console.log('✅ Wiadomość zaktualizowana:', message._id);
    
    res.status(200).json({
      message: 'Wiadomość zaktualizowana',
      data: {
        _id: message._id,
        content: message.content,
        isEdited: message.isEdited,
        editedAt: message.editedAt,
        attachments: message.attachments
      }
    });
  } catch (error) {
    console.error('💥 Błąd podczas edycji wiadomości:', error);
    res.status(500).json({ message: 'Błąd serwera', error: error.message });
  }
});

// Usuwanie wiadomości
router.delete('/:id', deleteMessage);

export default router;
