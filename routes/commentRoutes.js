import express from 'express';
import auth from '../middleware/auth.js'; // Middleware do autoryzacji
import Comment from '../models/comment.js';
import Ad from '../models/ad.js'; // Import modelu ogłoszeń dla sprawdzenia istnienia ogłoszenia
import Notification from '../models/notification.js'; // Model powiadomień

const router = express.Router();

// Funkcja pomocnicza do tworzenia powiadomień
const createNotification = async (user, content) => {
  const notification = new Notification({
    user,
    content,
    isRead: false,
  });
  await notification.save();
};

// Dodawanie komentarza do ogłoszenia
router.post('/:adId', auth, async (req, res) => {
  const { content } = req.body;
  const { adId } = req.params;

  try {
    // Sprawdź, czy ogłoszenie istnieje
    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ message: 'Ogłoszenie nie istnieje' });
    }

    // Stwórz nowy komentarz
    const comment = new Comment({
      ad: adId,
      user: req.user.id, // ID użytkownika z middleware auth
      content,
    });

    await comment.save();

    // Dodanie powiadomienia dla właściciela ogłoszenia
    await createNotification(ad.owner, `Twój post "${ad.make} ${ad.model}" otrzymał nowy komentarz.`);

    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ message: 'Błąd serwera' });
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
    const comments = await Comment.find({ ad: adId }).populate('user', 'name'); // Pobierz także dane o użytkowniku
    res.status(200).json(comments);
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
    if (comment.user.toString() !== req.user.id) {
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
