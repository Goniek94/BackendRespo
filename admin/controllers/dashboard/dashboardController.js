import User from '../../../models/user.js';
import Ad from '../../../models/ad.js';
import Report from '../../../models/report.js';

const getDashboardStats = async (req, res) => {
  try {
    // Get total users count
    const totalUsers = await User.countDocuments();

    // Get total ads count
    const totalListings = await Ad.countDocuments();

    // Get pending reports count (assuming reports have status field)
    const pendingReports = await Report.countDocuments({ status: 'pending' }).catch(() => 0);

    // Get recent users (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const newUsersThisWeek = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    // Get recent ads (last 7 days)
    const newListingsThisWeek = await Ad.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    // Get recent activity (last 10 activities)
    const recentUsers = await User.find()
      .select('name email createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentAds = await Ad.find()
      .select('title createdAt userId')
      .sort({ createdAt: -1 })
      .limit(5);

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
      recentActivity.push({
        id: `ad_${ad.title}`,
        type: 'listing_created',
        message: `Nowe ogłoszenie: ${ad.title}`,
        time: formatTimeAgo(ad.createdAt),
        timestamp: ad.createdAt
      });
    });

    // Sort by timestamp and take last 10
    recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const limitedActivity = recentActivity.slice(0, 10);

    // Calculate trends
    const userTrend = newUsersThisWeek > 0 ? `+${newUsersThisWeek} w tym tygodniu` : 'Brak nowych';
    const listingTrend = newListingsThisWeek > 0 ? `+${newListingsThisWeek} w tym tygodniu` : 'Brak nowych';
    const reportsTrend = pendingReports === 0 ? 'Wszystkie rozwiązane' : `${pendingReports} oczekujących`;

    const dashboardData = {
      stats: {
        totalUsers: totalUsers || 0,
        totalListings: totalListings || 0,
        pendingReports: pendingReports || 0,
        totalRevenue: 0 // TODO: Implement when payment system is ready
      },
      trends: {
        users: userTrend,
        listings: listingTrend,
        reports: reportsTrend,
        revenue: '0% zmiana'
      },
      recentActivity: limitedActivity,
      systemStatus: {
        api: 'healthy',
        database: 'healthy',
        auth: 'healthy'
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

export {
  getDashboardStats
};
