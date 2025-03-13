import express from 'express';
import auth from '../middleware/auth.js';
import Notification from '../models/notification.js';

const router = express.Router();

// Pobieranie wszystkich powiadomień użytkownika
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (err) {
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Oznaczanie powiadomień jako przeczytane
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Powiadomienie nie znalezione' });
    }

    if (notification.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Brak dostępu do powiadomienia' });
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({ message: 'Powiadomienie oznaczone jako przeczytane' });
  } catch (err) {
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Zliczanie nieprzeczytanych powiadomień
router.get('/unread/count', auth, async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({ user: req.user.id, isRead: false });
    res.status(200).json({ unreadCount });
  } catch (err) {
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

export default router;
