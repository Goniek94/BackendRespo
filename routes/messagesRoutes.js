
// backend/routes/messagesRoutes.js
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
  unarchiveMessage
} from '../controllers/messagesController.js';
import auth from '../middleware/auth.js';

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

// Usuwanie wiadomości
router.delete('/:id', deleteMessage);

export default router;
