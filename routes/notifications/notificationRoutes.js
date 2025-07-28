import express from 'express';
import jwt from 'jsonwebtoken';
import auth from '../../middleware/auth.js';
import notificationService from '../../controllers/notifications/notificationController.js';
import Notification from '../../models/notification.js';

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
        
      case 'listing_expired':
        notification = await notificationService.notifyAdExpired(
          userId,
          data.adTitle || 'Ogłoszenie',
          data.adId || null
        );
        break;
        
      case 'listing_viewed':
        notification = await notificationService.notifyAdViewed(
          userId,
          data.adTitle || 'Ogłoszenie',
          data.viewCount || null,
          data.adId || null
        );
        break;
        
      case 'comment_reply':
        notification = await notificationService.notifyCommentReply(
          userId,
          data.adTitle || 'Ogłoszenie',
          data.adId || null,
          data.commentId || null
        );
        break;
        
      case 'payment_failed':
        notification = await notificationService.notifyPaymentFailed(
          userId,
          data.reason || null,
          data.metadata || {}
        );
        break;
        
      case 'payment_refunded':
        notification = await notificationService.notifyPaymentRefunded(
          userId,
          data.amount || null,
          data.metadata || {}
        );
        break;
        
      case 'account_activity':
        notification = await notificationService.notifyAccountActivity(
          userId,
          data.activity || 'Nieznana aktywność',
          data.metadata || {}
        );
        break;
        
      case 'profile_viewed':
        notification = await notificationService.notifyProfileViewed(
          userId,
          data.viewerName || null,
          data.metadata || {}
        );
        break;
        
      case 'maintenance_notification':
        notification = await notificationService.notifyMaintenance(
          userId,
          data.message || 'Planowana konserwacja systemu',
          data.scheduledTime || null,
          data.metadata || {}
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
    const formattedNotifications = notifications.map(notification => 
      notification.toApiResponse ? notification.toApiResponse() : {
        id: notification._id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        isRead: notification.isRead,
        link: notification.link,
        adId: notification.adId,
        metadata: notification.metadata,
        createdAt: notification.createdAt,
        updatedAt: notification.updatedAt
      }
    );
    
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
    const formattedNotifications = notifications.map(notification => 
      notification.toApiResponse ? notification.toApiResponse() : {
        id: notification._id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        isRead: notification.isRead,
        link: notification.link,
        adId: notification.adId,
        metadata: notification.metadata,
        createdAt: notification.createdAt,
        updatedAt: notification.updatedAt
      }
    );
    
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
 * @desc Zliczanie nieprzeczytanych powiadomień z podziałem na typy
 * @access Private
 */
router.get('/unread/count', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Pobierz wszystkie nieprzeczytane powiadomienia
    const unreadNotifications = await Notification.find({ 
      user: userId, 
      isRead: false 
    }).select('type');
    
    // Podziel na kategorie
    let messageCount = 0;
    let notificationCount = 0;
    
    unreadNotifications.forEach(notification => {
      if (notification.type === 'new_message') {
        messageCount++;
      } else {
        notificationCount++;
      }
    });
    
    // Dodatkowo pobierz nieprzeczytane wiadomości z modelu Message
    const Message = (await import('../../models/message.js')).default;
    const unreadMessages = await Message.countDocuments({
      recipient: userId,
      read: false,
      deletedBy: { $ne: userId }
    });
    
    // Użyj większej wartości (powiadomienia vs rzeczywiste wiadomości)
    const finalMessageCount = Math.max(messageCount, unreadMessages);
    
    const totalUnread = finalMessageCount + notificationCount;
    
    res.status(200).json({ 
      unreadCount: totalUnread,
      messages: finalMessageCount,
      notifications: notificationCount,
      breakdown: {
        messageNotifications: messageCount,
        actualMessages: unreadMessages,
        otherNotifications: notificationCount
      }
    });
  } catch (err) {
    console.error('Błąd podczas zliczania nieprzeczytanych powiadomień:', err);
    res.status(500).json({ message: 'Błąd serwera', error: err.message });
  }
});

/**
 * @route PATCH /api/notifications/:id/read
 * @desc Oznaczanie powiadomienia jako przeczytane
 * @access Private
 */
router.patch('/:id/read', auth, async (req, res) => {
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
 * @route PATCH /api/notifications/read-all
 * @desc Oznaczanie wszystkich powiadomień jako przeczytane
 * @access Private
 */
router.patch('/read-all', auth, async (req, res) => {
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
