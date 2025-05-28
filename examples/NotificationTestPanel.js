/**
 * Panel testowy do demonstracji działania systemu powiadomień real-time
 * Ten plik pokazuje, jak wysyłać różne typy powiadomień przez Socket.io
 */

import express from 'express';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';
import notificationService from '../controllers/notificationController.js';

const router = express.Router();

/**
 * Endpoint testowy do wysyłania różnych typów powiadomień
 * @route POST /api/test/notifications/send
 * @param {string} userId - ID użytkownika, który otrzyma powiadomienie
 * @param {string} type - Typ powiadomienia (new_message, listing_liked, payment_completed, listing_added, listing_expiring)
 * @param {Object} data - Dane potrzebne do stworzenia powiadomienia
 */
router.post('/send', async (req, res) => {
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
 * Endpoint do generowania tokenu testowego
 * @route POST /api/test/notifications/token
 * @param {string} userId - ID użytkownika
 */
router.post('/token', (req, res) => {
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

export default router;