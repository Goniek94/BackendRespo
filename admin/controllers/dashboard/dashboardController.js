import User from '../../../models/user/user.js';
import Ad from '../../../models/listings/ad.js';
import Message from '../../../models/communication/message.js';

const getDashboardStats = async (req, res) => {
  try {
    // Date ranges for statistics
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // Basic counts
    const totalUsers = await User.countDocuments();
    const totalListings = await Ad.countDocuments();
    const totalMessages = await Message.countDocuments();
    const pendingReports = 0; // TODO: Implement when Report model is ready

    // Recent activity counts
    const newUsersThisWeek = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    const newListingsThisWeek = await Ad.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    const newMessagesThisWeek = await Message.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    // Monthly statistics
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    const newListingsThisMonth = await Ad.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    const newMessagesThisMonth = await Message.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Active users (users who logged in within last 30 days)
    const activeUsers = await User.countDocuments({
      lastActivity: { $gte: thirtyDaysAgo }
    });

    // Listings by status
    const activeListings = await Ad.countDocuments({ status: 'active' });
    const pendingListings = await Ad.countDocuments({ status: 'pending' });
    const expiredListings = await Ad.countDocuments({ status: 'expired' });
    const soldListings = await Ad.countDocuments({ status: 'sold' });

    // User statistics by role
    const adminUsers = await User.countDocuments({ role: 'admin' });
    const regularUsers = await User.countDocuments({ role: { $ne: 'admin' } });

    // Message statistics
    const unreadMessages = await Message.countDocuments({ read: false });
    const messagesWithAttachments = await Message.countDocuments({
      attachments: { $exists: true, $not: { $size: 0 } }
    });

    // Get recent activity (last 10 activities)
    const recentUsers = await User.find()
      .select('name email createdAt role')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentAds = await Ad.find()
      .select('headline createdAt owner status')
      .populate('owner', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentMessages = await Message.find()
      .select('subject createdAt sender recipient')
      .populate('sender', 'name email')
      .populate('recipient', 'name email')
      .sort({ createdAt: -1 })
      .limit(3);

    // Format recent activity
    const recentActivity = [];
    
    // Add recent users
    recentUsers.forEach(user => {
      recentActivity.push({
        id: `user_${user.email}`,
        type: 'user_registered',
        message: `Nowy użytkownik: ${user.name || user.email}`,
        time: formatTimeAgo(user.createdAt),
        timestamp: user.createdAt
      });
    });

    // Add recent ads
    recentAds.forEach(ad => {
      const ownerName = ad.owner ? (ad.owner.name || ad.owner.email) : 'Nieznany użytkownik';
      recentActivity.push({
        id: `ad_${ad._id}`,
        type: 'listing_created',
        message: `Nowe ogłoszenie: ${ad.headline} (${ownerName})`,
        time: formatTimeAgo(ad.createdAt),
        timestamp: ad.createdAt,
        status: ad.status
      });
    });

    // Add recent messages
    recentMessages.forEach(msg => {
      const senderName = msg.sender ? (msg.sender.name || msg.sender.email) : 'Nieznany nadawca';
      const recipientName = msg.recipient ? (msg.recipient.name || msg.recipient.email) : 'Nieznany odbiorca';
      recentActivity.push({
        id: `msg_${msg._id}`,
        type: 'message_sent',
        message: `Wiadomość: ${msg.subject || 'Bez tematu'} (${senderName} → ${recipientName})`,
        time: formatTimeAgo(msg.createdAt),
        timestamp: msg.createdAt
      });
    });

    // Sort by timestamp and take last 10
    recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const limitedActivity = recentActivity.slice(0, 10);

    // Calculate trends and percentages
    const userGrowthWeek = newUsersThisWeek > 0 ? `+${newUsersThisWeek} w tym tygodniu` : 'Brak nowych';
    const listingGrowthWeek = newListingsThisWeek > 0 ? `+${newListingsThisWeek} w tym tygodniu` : 'Brak nowych';
    const messageGrowthWeek = newMessagesThisWeek > 0 ? `+${newMessagesThisWeek} w tym tygodniu` : 'Brak nowych';
    const reportsTrend = pendingReports === 0 ? 'Wszystkie rozwiązane' : `${pendingReports} oczekujących`;

    // Calculate activity rate
    const activityRate = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;

    const dashboardData = {
      // Basic statistics
      stats: {
        totalUsers: totalUsers || 0,
        totalListings: totalListings || 0,
        totalMessages: totalMessages || 0,
        pendingReports: pendingReports || 0,
        activeUsers: activeUsers || 0,
        activityRate: `${activityRate}%`,
        totalRevenue: 0 // TODO: Implement when payment system is ready
      },

      // Weekly growth
      weeklyGrowth: {
        users: newUsersThisWeek || 0,
        listings: newListingsThisWeek || 0,
        messages: newMessagesThisWeek || 0
      },

      // Monthly growth
      monthlyGrowth: {
        users: newUsersThisMonth || 0,
        listings: newListingsThisMonth || 0,
        messages: newMessagesThisMonth || 0
      },

      // Listing statistics
      listingStats: {
        active: activeListings || 0,
        pending: pendingListings || 0,
        expired: expiredListings || 0,
        sold: soldListings || 0,
        total: totalListings || 0
      },

      // User statistics
      userStats: {
        admins: adminUsers || 0,
        regular: regularUsers || 0,
        active: activeUsers || 0,
        total: totalUsers || 0
      },

      // Message statistics
      messageStats: {
        total: totalMessages || 0,
        unread: unreadMessages || 0,
        withAttachments: messagesWithAttachments || 0,
        thisWeek: newMessagesThisWeek || 0
      },

      // Trends (for backward compatibility)
      trends: {
        users: userGrowthWeek,
        listings: listingGrowthWeek,
        messages: messageGrowthWeek,
        reports: reportsTrend,
        revenue: '0% zmiana'
      },

      // Recent activity
      recentActivity: limitedActivity,

      // System status
      systemStatus: {
        api: 'healthy',
        database: 'healthy',
        auth: 'healthy',
        uptime: Math.floor(process.uptime()),
        memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB'
      }
    };

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Nie udało się pobrać danych dashboardu'
    });
  }
};

// Helper function to format time ago
const formatTimeAgo = (dateString) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInMinutes = Math.floor((now - date) / (1000 * 60));

  if (diffInMinutes < 1) return 'Przed chwilą';
  if (diffInMinutes < 60) return `${diffInMinutes} minut temu`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} godzin temu`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} dni temu`;
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  return `${diffInWeeks} tygodni temu`;
};

// Get detailed user statistics
const getDetailedUserStats = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // User registration timeline
    const userRegistrations = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    // User activity statistics
    const activeUsers = await User.countDocuments({
      lastActivity: { $gte: startDate }
    });

    // Users by role
    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    // Users by verification status
    const usersByVerification = await User.aggregate([
      {
        $group: {
          _id: '$isVerified',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        period,
        registrationTimeline: userRegistrations,
        activeUsers,
        usersByRole,
        usersByVerification,
        totalUsers: await User.countDocuments()
      }
    });

  } catch (error) {
    console.error('Detailed user stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Nie udało się pobrać szczegółowych statystyk użytkowników'
    });
  }
};

// Get detailed listing statistics
const getDetailedListingStats = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Listings creation timeline
    const listingCreations = await Ad.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    // Listings by status
    const listingsByStatus = await Ad.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Listings by brand (top 10)
    const listingsByBrand = await Ad.aggregate([
      {
        $group: {
          _id: '$brand',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Price statistics
    const priceStats = await Ad.aggregate([
      {
        $match: {
          price: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: null,
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          totalListings: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        period,
        creationTimeline: listingCreations,
        listingsByStatus,
        listingsByBrand,
        priceStats: priceStats[0] || {},
        totalListings: await Ad.countDocuments()
      }
    });

  } catch (error) {
    console.error('Detailed listing stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Nie udało się pobrać szczegółowych statystyk ogłoszeń'
    });
  }
};

// Get detailed message statistics
const getDetailedMessageStats = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Messages timeline
    const messageTimeline = await Message.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    // Message statistics
    const totalMessages = await Message.countDocuments();
    const unreadMessages = await Message.countDocuments({ read: false });
    const messagesWithAttachments = await Message.countDocuments({
      attachments: { $exists: true, $not: { $size: 0 } }
    });

    // Most active users (by messages sent)
    const mostActiveUsers = await Message.aggregate([
      {
        $group: {
          _id: '$sender',
          messageCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          _id: 1,
          messageCount: 1,
          userName: '$user.name',
          userEmail: '$user.email'
        }
      },
      {
        $sort: { messageCount: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.json({
      success: true,
      data: {
        period,
        messageTimeline,
        totalMessages,
        unreadMessages,
        messagesWithAttachments,
        mostActiveUsers,
        readRate: totalMessages > 0 ? Math.round(((totalMessages - unreadMessages) / totalMessages) * 100) : 0
      }
    });

  } catch (error) {
    console.error('Detailed message stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Nie udało się pobrać szczegółowych statystyk wiadomości'
    });
  }
};

// Get system health information
const getSystemHealth = async (req, res) => {
  try {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    // Database connection status
    const mongoose = await import('mongoose');
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // System metrics
    const systemHealth = {
      status: 'healthy',
      uptime: Math.floor(uptime),
      uptimeFormatted: formatUptime(uptime),
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024)
      },
      database: {
        status: dbStatus,
        name: 'MongoDB Atlas'
      },
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    };

    res.json({
      success: true,
      data: systemHealth
    });

  } catch (error) {
    console.error('System health error:', error);
    res.status(500).json({
      success: false,
      error: 'Nie udało się pobrać informacji o zdrowiu systemu'
    });
  }
};

// Get activity timeline
const getActivityTimeline = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    // Get recent users
    const recentUsers = await User.find()
      .select('name email createdAt role')
      .sort({ createdAt: -1 })
      .limit(Math.floor(limit / 3));

    // Get recent ads
    const recentAds = await Ad.find()
      .select('headline createdAt owner status')
      .populate('owner', 'name email')
      .sort({ createdAt: -1 })
      .limit(Math.floor(limit / 3));

    // Get recent messages
    const recentMessages = await Message.find()
      .select('subject createdAt sender recipient')
      .populate('sender', 'name email')
      .populate('recipient', 'name email')
      .sort({ createdAt: -1 })
      .limit(Math.floor(limit / 3));

    // Combine and format activities
    const activities = [];
    
    recentUsers.forEach(user => {
      activities.push({
        id: `user_${user._id}`,
        type: 'user_registered',
        title: 'Nowy użytkownik',
        description: `${user.name || user.email} dołączył do platformy`,
        timestamp: user.createdAt,
        metadata: {
          userId: user._id,
          userRole: user.role
        }
      });
    });

    recentAds.forEach(ad => {
      const ownerName = ad.owner ? (ad.owner.name || ad.owner.email) : 'Nieznany użytkownik';
      activities.push({
        id: `ad_${ad._id}`,
        type: 'listing_created',
        title: 'Nowe ogłoszenie',
        description: `${ownerName} dodał ogłoszenie: ${ad.headline}`,
        timestamp: ad.createdAt,
        metadata: {
          adId: ad._id,
          status: ad.status,
          ownerId: ad.owner?._id
        }
      });
    });

    recentMessages.forEach(msg => {
      const senderName = msg.sender ? (msg.sender.name || msg.sender.email) : 'Nieznany nadawca';
      const recipientName = msg.recipient ? (msg.recipient.name || msg.recipient.email) : 'Nieznany odbiorca';
      activities.push({
        id: `msg_${msg._id}`,
        type: 'message_sent',
        title: 'Nowa wiadomość',
        description: `${senderName} wysłał wiadomość do ${recipientName}`,
        timestamp: msg.createdAt,
        metadata: {
          messageId: msg._id,
          senderId: msg.sender?._id,
          recipientId: msg.recipient?._id,
          subject: msg.subject
        }
      });
    });

    // Sort by timestamp and limit
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const limitedActivities = activities.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: {
        activities: limitedActivities,
        total: activities.length,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Activity timeline error:', error);
    res.status(500).json({
      success: false,
      error: 'Nie udało się pobrać osi czasu aktywności'
    });
  }
};

// Helper function to format uptime
const formatUptime = (seconds) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

export {
  getDashboardStats,
  getDetailedUserStats,
  getDetailedListingStats,
  getDetailedMessageStats,
  getSystemHealth,
  getActivityTimeline
};
