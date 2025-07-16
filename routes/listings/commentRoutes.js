import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import auth from '../../middleware/auth.js'; // Middleware do autoryzacji
import Comment from '../../models/comment.js';
import Ad from '../../models/ad.js'; // Import modelu ogłoszeń dla sprawdzenia istnienia ogłoszenia
import Notification from '../../models/notification.js'; // Model powiadomień

const router = express.Router();

// Konfiguracja multer dla przesyłania zdjęć
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/comments';
    // Sprawdź, czy katalog istnieje, jeśli nie - utwórz go
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Filtr plików - akceptujemy tylko obrazy
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Dozwolone są tylko pliki graficzne!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // Limit 5MB
  }
});

// Funkcja pomocnicza do tworzenia powiadomień
const createNotification = async (user, content) => {
  const notification = new Notification({
    user,
    content,
    isRead: false,
  });
  await notification.save();
};

// Dodawanie komentarza do ogłoszenia (z obrazem)
router.post('/:adId', auth, upload.single('image'), async (req, res) => {
  try {
    const { content } = req.body;
    const { adId } = req.params;
    
    // Sprawdź, czy przesłano zdjęcie
    if (!req.file) {
      return res.status(400).json({ message: 'Zdjęcie jest wymagane' });
    }

    // Sprawdź, czy ogłoszenie istnieje
    const ad = await Ad.findById(adId);
    if (!ad) {
      // Usuń przesłany plik, jeśli ogłoszenie nie istnieje
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ message: 'Ogłoszenie nie istnieje' });
    }

    // Sprawdź, czy użytkownik już dodał komentarz
    const existingComment = await Comment.findOne({ ad: adId, user: req.user.userId });
    if (existingComment) {
      // Usuń przesłany plik, jeśli użytkownik już skomentował
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ message: 'Możesz dodać tylko jeden komentarz do ogłoszenia' });
    }

    // Ścieżka do zapisanego pliku
    const imagePath = `/${req.file.path.replace(/\\/g, '/')}`;

    // Stwórz nowy komentarz
    const comment = new Comment({
      ad: adId,
      user: mongoose.Types.ObjectId(req.user.userId || req.user.id), // Konwersja na ObjectId
      content,
      image: imagePath
    });

    await comment.save();

    // Dodanie powiadomienia dla właściciela ogłoszenia
    await createNotification(ad.owner, `Twój post "${ad.make} ${ad.model}" otrzymał nowy komentarz.`);

    // Pobierz dane użytkownika, aby zwrócić pełny komentarz
    const populatedComment = await Comment.findById(comment._id).populate('user', 'name lastName');

    res.status(201).json(populatedComment);
  } catch (err) {
    console.error('Błąd podczas dodawania komentarza:', err);
    // Usuń przesłany plik w przypadku błędu
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Błąd serwera podczas dodawania komentarza' });
  }
});

// Pobieranie komentarzy dla konkretnego ogłoszenia
router.get('/:adId', async (req, res) => {
  const { adId } = req.params;

  try {
    // Sprawdź, czy ogłoszenie istnieje
    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ message: 'Ogłoszenie nie istnieje' });
    }

    // Pobierz komentarze przypisane do ogłoszenia
    const comments = await Comment.find({ ad: adId }).populate('user', 'name lastName'); // Pobierz także dane o użytkowniku
    res.status(200).json(comments);
  } catch (err) {
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Sprawdzenie, czy użytkownik już skomentował ogłoszenie
router.get('/:adId/user', auth, async (req, res) => {
  const { adId } = req.params;
  const userId = req.user.userId;

  try {
    // Sprawdź, czy ogłoszenie istnieje
    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ message: 'Ogłoszenie nie istnieje' });
    }

    // Sprawdź, czy użytkownik już dodał komentarz
    const existingComment = await Comment.findOne({ ad: adId, user: userId });
    
    res.status(200).json({ 
      hasCommented: !!existingComment,
      comment: existingComment
    });
  } catch (err) {
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Usuwanie komentarza
router.delete('/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: 'Komentarz nie znaleziony' });
    }

    // Sprawdź, czy komentarz należy do użytkownika
    if (comment.user.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Brak dostępu do tego komentarza' });
    }

    await comment.remove();

    // Dodanie powiadomienia dla użytkownika o usunięciu komentarza
    await createNotification(comment.user, 'Twój komentarz został usunięty.');

    res.status(200).json({ message: 'Komentarz usunięty' });
  } catch (err) {
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Eksport domyślny routera
export default router;
