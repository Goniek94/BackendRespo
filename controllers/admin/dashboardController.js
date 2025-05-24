// controllers/admin/dashboardController.js
/**
 * Kontroler do obsługi funkcji dashboardu administratora
 * Controller for handling admin dashboard functions
 */

import Ad from '../../models/ad.js';
import User from '../../models/user.js';
import Comment from '../../models/comment.js';
import Notification from '../../models/notification.js';

/**
 * Pobiera statystyki dla dashboardu administratora
 * Retrieves statistics for the admin dashboard
 */
export const getDashboardStats = async (req, res) => {
  try {
    // Pobierz liczby rekordów / Get record counts
    const usersCount = await User.countDocuments();
    const adsCount = await Ad.countDocuments();
    const commentsCount = await Comment.countDocuments();
    const notificationsCount = await Notification.countDocuments();
    
    // Pobierz ostatnie aktywności / Get recent activities
    const recentAds = await Ad.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'email name lastName');
      
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('email name lastName createdAt role');
      
    const recentComments = await Comment.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'email name lastName')
      .populate('ad', 'title');
    
    // Zwróć dane / Return data
    return res.status(200).json({
      stats: {
        usersCount,
        adsCount,
        commentsCount,
        notificationsCount
      },
      recentActivity: {
        ads: recentAds,
        users: recentUsers,
        comments: recentComments
      }
    });
  } catch (error) {
    console.error('Błąd podczas pobierania statystyk dashboardu:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas pobierania statystyk.' });
  }
};
