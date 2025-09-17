import express from 'express';
import jwt from 'jsonwebtoken';
import auth from '../../middleware/auth.js';
import notificationManager from '../../services/notificationManager.js';
import Notification from '../../models/communication/notification.js';

const router = express.Router();

/**
 * Trasy testowe do powiadomień real-time
 */
const testRouter = express.Router();

/**
 * @route POST /api/notifications/test
 * @desc Prosty endpoint do testowania powiadomień w czasie rzeczywistym
 * @access Public (tylko do testów)
 */
testRouter.post('/', async (req, res) => {
  try {
    const { userId, title, message, type = 'system' } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'Brak ID użytkownika' });
    }
    
    if (!message) {
      return res.status(400).json({ error: 'Brak treści powiadomienia' });
    }
    
    // Utwórz powiadomienie bezpośrednio
    const notification = await notificationManager.createNotification(
      userId,
      title || 'Testowe powiadomienie',
      message,
      type,
      { metadata: { test: true } }
    );
    
    if (!notification) {
      return res.status(500).json({ error: 'Nie udało się utworzyć powiadomienia' });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Powiadomienie wysłane pomyślnie',
      notification: notification.toApiResponse ? notification.toApiResponse() : notification
    });
  } catch (error) {
    console.error('Błąd podczas wysyłania powiadomienia testowego:', error);
    return res.status(500).json({ error: error.message || 'Wystąpił błąd podczas wysyłania powiadomienia' });
  }
});

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
        notification = await notificationManager.notifyNewMessage(
          userId,
          data.senderName || 'Użytkownik',
          data.adTitle || 'Ogłoszenie',
          data.metadata || {}
        );
        break;
        
      case 'listing_liked':
        notification = await notificationManager.notifyAdAddedToFavorites(
          userId,
          data.adTitle || 'Ogłoszenie',
          data.adId || null
        );
        break;
        
      case 'payment_completed':
        notification = await notificationManager.notifyPaymentStatusChange(
          userId,
          'completed',
          data.adTitle || 'Ogłoszenie',
          data.metadata || {}
        );
        break;
        
      case 'listing_added':
        notification = await notificationManager.notifyAdCreated(
          userId,
          data.adTitle || 'Ogłoszenie',
          data.adId || null
        );
        break;
        
      case 'listing_expiring':
        notification = await notificationManager.notifyAdExpiringSoon(
          userId,
          data.adTitle || 'Ogłoszenie',
          data.daysLeft || 3,
          data.adId || null
        );
        break;
        
      case 'listing_expired':
        notification = await notificationManager.notifyAdExpired(
          userId,
          data.adTitle || 'Ogłoszenie',
          data.adId || null
        );
        break;
        
      case 'listing_viewed':
        notification = await notificationManager.notifyAdViewed(
          userId,
          data.adTitle || 'Ogłoszenie',
          data.viewCount || null,
          data.adId || null
        );
        break;
        
      case 'comment_reply':
        notification = await notificationManager.notifyCommentReply(
          userId,
          data.adTitle || 'Ogłoszenie',
          data.adId || null,
          data.commentId || null
        );
        break;
        
      case 'payment_failed':
        notification = await notificationManager.notifyPaymentFailed(
          userId,
          data.reason || null,
          data.metadata || {}
        );
        break;
        
      case 'payment_refunded':
        notification = await notificationManager.notifyPaymentRefunded(
          userId,
          data.amount || null,
          data.metadata || {}
        );
        break;
        
      case 'account_activity':
        notification = await notificationManager.notifyAccountActivity(
          userId,
          data.activity || 'Nieznana aktywność',
          data.metadata || {}
        );
        break;
        
      case 'profile_viewed':
        notification = await notificationManager.notifyProfileViewed(
          userId,
          data.viewerName || null,
          data.metadata || {}
        );
        break;
        
      case 'maintenance_notification':
        notification = await notificationManager.notifyMaintenance(
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
    
    const notifications = await notificationManager.getUnreadNotifications(req.user.userId, parseInt(limit));
    
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
 * @route GET /api/notifications/unread-count
 * @desc Zliczanie nieprzeczytanych powiadomień z podziałem na typy
 * @access Private
 */
router.get('/unread-count', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Pobierz wszystkie nieprzeczytane powiadomienia (włącznie z powiadomieniami o wiadomościach)
    const allUnreadNotifications = await Notification.countDocuments({ 
      user: userId, 
      isRead: false 
    });
    
    // Pobierz rzeczywiste nieprzeczytane wiadomości z modelu Message
    // Tylko te w skrzynce odbiorczej (nie usunięte, nie w archiwum, nie drafty)
    const Message = (await import('../../models/communication/message.js')).default;
    const unreadMessages = await Message.countDocuments({
      recipient: userId,        // Użytkownik jest odbiorcą
      read: false,             // Nieprzeczytane
      deletedBy: { $ne: userId }, // Nie usunięte przez użytkownika
      archived: { $ne: true }, // Nie w archiwum
      draft: { $ne: true },    // Nie drafty
      unsent: { $ne: true }    // Nie cofnięte
    });
    
    // LICZNIK WIADOMOŚCI = tylko rzeczywiste nieprzeczytane wiadomości w skrzynce
    const messageCount = unreadMessages;
    
    // LICZNIK POWIADOMIEŃ = wszystkie nieprzeczytane powiadomienia (włącznie z powiadomieniami o wiadomościach)
    const notificationCount = allUnreadNotifications;
    
    // Całkowita liczba nieprzeczytanych elementów
    const totalUnread = messageCount + notificationCount;
    
    console.log(`📊 Rozdzielone liczniki dla użytkownika ${userId}:`, {
      realMessages: unreadMessages,
      allNotifications: allUnreadNotifications,
      messageCount,
      notificationCount,
      totalUnread,
      note: 'Liczniki są teraz rozdzielone - wiadomości to tylko rzeczywiste wiadomości, powiadomienia to wszystkie powiadomienia'
    });
    
    res.status(200).json({ 
      unreadCount: totalUnread,
      messages: messageCount,        // Tylko rzeczywiste wiadomości
      notifications: notificationCount, // Wszystkie powiadomienia
      breakdown: {
        realMessages: unreadMessages,
        allNotifications: allUnreadNotifications,
        separated: true
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
    const notification = await notificationManager.markAsRead(req.params.id, req.user.userId);
    
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
 * @route PATCH /api/notifications/mark-all-read
 * @desc Oznaczanie wszystkich powiadomień jako przeczytane
 * @access Private
 */
router.patch('/mark-all-read', auth, async (req, res) => {
  try {
    const result = await notificationManager.markAllAsRead(req.user.userId);
    
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
    await notificationManager.deleteNotification(req.params.id, req.user.userId);
    
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

/**
 * @route POST /api/notifications/send
 * @desc Wysyłanie nowego powiadomienia
 * @access Private
 */
router.post('/send', auth, async (req, res) => {
  try {
    const { type, recipientId, title, message, relatedId, actionUrl } = req.body;
    
    if (!type || !recipientId || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Brak wymaganych pól: type, recipientId, title, message'
      });
    }
    
    // Utwórz powiadomienie używając notificationManager
    const notification = await notificationManager.createNotification(
      recipientId,
      title,
      message,
      type,
      { 
        relatedId,
        actionUrl,
        senderId: req.user.userId
      }
    );
    
    if (!notification) {
      return res.status(500).json({
        success: false,
        message: 'Nie udało się utworzyć powiadomienia'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Powiadomienie wysłane pomyślnie',
      data: {
        notification: {
          id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          metadata: notification.metadata,
          createdAt: notification.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd podczas wysyłania powiadomienia'
    });
  }
});

// Endpoint testowy do tworzenia powiadomień
router.post('/test-create', auth, async (req, res) => {
  try {
    const { type, title, message, metadata = {} } = req.body;
    const userId = req.user.userId;
    
    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Brak tytułu lub treści powiadomienia'
      });
    }
    
    // Utwórz powiadomienie używając notificationManager
    const notification = await notificationManager.createNotification(
      userId,
      title,
      message,
      type || 'SYSTEM_NOTIFICATION',
      { metadata }
    );
    
    if (!notification) {
      return res.status(500).json({
        success: false,
        message: 'Nie udało się utworzyć powiadomienia'
      });
    }
    
    res.json({
      success: true,
      message: 'Powiadomienie utworzone pomyślnie',
      notification: {
        id: notification._id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        metadata: notification.metadata,
        createdAt: notification.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd podczas tworzenia powiadomienia testowego'
    });
  }
});

// Pobierz statystyki powiadomień
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await notificationManager.getNotificationStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd podczas pobierania statystyk powiadomień'
    });
  }
});

export default router;
