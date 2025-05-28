import express from 'express';
import auth from '../middleware/auth.js';
import jwt from 'jsonwebtoken';
import notificationService from '../controllers/notificationController.js';
import Notification from '../models/notification.js';

const router = express.Router();

/**
 * Trasy testowe do powiadomień real-time
 */
const testRouter = express.Router();

/**
 * @route POST /api/notifications/test/send
 * @desc Testowe wysyłanie różnych typów powiadomień
 * @access Public (tylko do testów)
 */
testRouter.post('/send', async (req, res) => {
  try {
    const { userId, type, data } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'Brak ID użytkownika' });
    }
    
    if (!type) {
      return res.status(400).json({ error: 'Brak typu powiadomienia' });
    }
    
    let notification = null;
    
    switch (type) {
      case 'new_message':
        notification = await notificationService.notifyNewMessage(
          userId,
          data.senderName || 'Użytkownik',
          data.adTitle || 'Ogłoszenie',
          data.metadata || {}
        );
        break;
        
      case 'listing_liked':
        notification = await notificationService.notifyAdAddedToFavorites(
          userId,
          data.adTitle || 'Ogłoszenie',
          data.adId || null
        );
        break;
        
      case 'payment_completed':
        notification = await notificationService.notifyPaymentStatusChange(
          userId,
          'completed',
          data.adTitle || 'Ogłoszenie',
          data.metadata || {}
        );
        break;
        
      case 'listing_added':
        notification = await notificationService.notifyAdCreated(
          userId,
          data.adTitle || 'Ogłoszenie',
          data.adId || null
        );
        break;
        
      case 'listing_expiring':
        notification = await notificationService.notifyAdExpiringSoon(
          userId,
          data.adTitle || 'Ogłoszenie',
          data.daysLeft || 3,
          data.adId || null
        );
        break;
        
      default:
        return res.status(400).json({ error: 'Nieobsługiwany typ powiadomienia' });
    }
    
    if (!notification) {
      return res.status(500).json({ error: 'Nie udało się utworzyć powiadomienia' });
    }
    
    return res.status(200).json({
      success: true,
      notification: notification.toApiResponse ? notification.toApiResponse() : notification
    });
  } catch (error) {
    console.error('Błąd podczas wysyłania powiadomienia testowego:', error);
    return res.status(500).json({ error: error.message || 'Wystąpił błąd podczas wysyłania powiadomienia' });
  }
});

/**
 * @route POST /api/notifications/test/token
 * @desc Generuje token JWT do testów
 * @access Public (tylko do testów)
 */
testRouter.post('/token', (req, res) => {
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'Brak ID użytkownika' });
  }
  
  const token = jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'default_secret',
    { expiresIn: '1h' }
  );
  
  return res.status(200).json({ token });
});

/**
 * @route GET /api/notifications/test
 * @desc Serwuje stronę testową do demonstracji powiadomień real-time
 * @access Public (tylko do testów)
 */
testRouter.get('/', (req, res) => {
  res.sendFile('notification-tester.html', { root: './examples' });
});

// Rejestracja tras testowych
router.use('/test', testRouter);

/**
 * @route GET /api/notifications
 * @desc Pobieranie wszystkich powiadomień użytkownika z paginacją i filtrowaniem
 * @access Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, isRead, type, sort = 'createdAt', order = 'desc' } = req.query;
    
    // Budowanie filtru
    const filter = { user: req.user.userId };
    
    // Filtrowanie po statusie przeczytania
    if (isRead !== undefined) {
      filter.isRead = isRead === 'true';
    }
    
    // Filtrowanie po typie powiadomienia
    if (type) {
      filter.type = type;
    }
    
    // Sortowanie
    const sortOptions = {};
    sortOptions[sort] = order === 'desc' ? -1 : 1;
    
    // Wykonanie zapytania z paginacją
    const notifications = await Notification.find(filter)
      .sort(sortOptions)
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));
    
    // Liczba wszystkich pasujących powiadomień
    const total = await Notification.countDocuments(filter);
    
    // Liczba nieprzeczytanych powiadomień
    const unreadCount = await Notification.getUnreadCount(req.user.userId);
    
    // Konwersja do formatu API
    const formattedNotifications = notifications.map(notification => ({
      id: notification._id,
      message: notification.message,
      type: notification.type,
      isRead: notification.isRead,
      metadata: notification.metadata,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt
    }));
    
    res.status(200).json({
      notifications: formattedNotifications,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalNotifications: total,
      unreadCount
    });
  } catch (err) {
    console.error('Błąd podczas pobierania powiadomień:', err);
    res.status(500).json({ message: 'Błąd serwera', error: err.message });
  }
});

/**
 * @route GET /api/notifications/unread
 * @desc Pobieranie nieprzeczytanych powiadomień użytkownika
 * @access Private
 */
router.get('/unread', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const notifications = await notificationService.getUnreadNotifications(req.user.userId, parseInt(limit));
    
    // Konwersja do formatu API
    const formattedNotifications = notifications.map(notification => ({
      id: notification._id,
      message: notification.message,
      type: notification.type,
      isRead: notification.isRead,
      metadata: notification.metadata,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt
    }));
    
    res.status(200).json({
      notifications: formattedNotifications,
      unreadCount: await Notification.getUnreadCount(req.user.userId)
    });
  } catch (err) {
    console.error('Błąd podczas pobierania nieprzeczytanych powiadomień:', err);
    res.status(500).json({ message: 'Błąd serwera', error: err.message });
  }
});

/**
 * @route GET /api/notifications/unread/count
 * @desc Zliczanie nieprzeczytanych powiadomień
 * @access Private
 */
router.get('/unread/count', auth, async (req, res) => {
  try {
    const unreadCount = await Notification.getUnreadCount(req.user.userId);
    res.status(200).json({ unreadCount });
  } catch (err) {
    console.error('Błąd podczas zliczania nieprzeczytanych powiadomień:', err);
    res.status(500).json({ message: 'Błąd serwera', error: err.message });
  }
});

/**
 * @route PUT /api/notifications/:id/read
 * @desc Oznaczanie powiadomienia jako przeczytane
 * @access Private
 */
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await notificationService.markAsRead(req.params.id, req.user.userId);
    
    res.status(200).json({
      message: 'Powiadomienie oznaczone jako przeczytane',
      notification: {
        id: notification._id,
        message: notification.message,
        type: notification.type,
        isRead: notification.isRead,
        metadata: notification.metadata,
        createdAt: notification.createdAt,
        updatedAt: notification.updatedAt
      }
    });
  } catch (err) {
    console.error('Błąd podczas oznaczania powiadomienia jako przeczytane:', err);
    
    if (err.message === 'Powiadomienie nie znalezione') {
      return res.status(404).json({ message: err.message });
    }
    
    if (err.message === 'Brak uprawnień do tego powiadomienia') {
      return res.status(403).json({ message: err.message });
    }
    
    res.status(500).json({ message: 'Błąd serwera', error: err.message });
  }
});

/**
 * @route PUT /api/notifications/read-all
 * @desc Oznaczanie wszystkich powiadomień jako przeczytane
 * @access Private
 */
router.put('/read-all', auth, async (req, res) => {
  try {
    const result = await notificationService.markAllAsRead(req.user.userId);
    
    res.status(200).json({
      message: 'Wszystkie powiadomienia oznaczone jako przeczytane',
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    console.error('Błąd podczas oznaczania wszystkich powiadomień jako przeczytane:', err);
    res.status(500).json({ message: 'Błąd serwera', error: err.message });
  }
});

/**
 * @route DELETE /api/notifications/:id
 * @desc Usuwanie powiadomienia
 * @access Private
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    await notificationService.deleteNotification(req.params.id, req.user.userId);
    
    res.status(200).json({
      message: 'Powiadomienie usunięte'
    });
  } catch (err) {
    console.error('Błąd podczas usuwania powiadomienia:', err);
    
    if (err.message === 'Powiadomienie nie znalezione') {
      return res.status(404).json({ message: err.message });
    }
    
    if (err.message === 'Brak uprawnień do tego powiadomienia') {
      return res.status(403).json({ message: err.message });
    }
    
    res.status(500).json({ message: 'Błąd serwera', error: err.message });
  }
});

export default router;
