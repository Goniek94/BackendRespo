// src/routes/messagesRoutes.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import { 
  getMessages, 
  getMessage, 
  sendMessage, 
  saveDraft, 
  markAsRead, 
  toggleStar, 
  deleteMessage, 
  searchMessages,
  getUserSuggestions
} from '../controllers/messagesController';
import { authMiddleware } from '../middleware/authMiddleware';

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
router.use(authMiddleware);

// Pobieranie wiadomości dla danego folderu
router.get('/:folder', getMessages);

// Pobieranie pojedynczej wiadomości
router.get('/message/:id', getMessage);

// Wysyłanie nowej wiadomości
router.post('/send', upload.array('attachments', 5), sendMessage);

// Zapisywanie wiadomości roboczej
router.post('/draft', upload.array('attachments', 5), saveDraft);

// Oznaczanie wiadomości jako przeczytana
router.patch('/read/:id', markAsRead);

// Oznaczanie wiadomości gwiazdką
router.patch('/star/:id', toggleStar);

// Usuwanie wiadomości
router.delete('/:id', deleteMessage);

// Wyszukiwanie wiadomości
router.get('/search', searchMessages);

// Pobieranie sugestii użytkowników
router.get('/users/suggestions', getUserSuggestions);

export default router;