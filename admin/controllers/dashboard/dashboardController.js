// admin/controllers/dashboard/dashboardController.js
import User from "../../../models/user/user.js";
import Ad from "../../../models/listings/ad.js";
import DailyActiveUser from "../../../models/analytics/DailyActiveUser.js";

/* ========= Helpers ========= */
const n = (x, d = 0) => (Number.isFinite(x) ? x : d);

const ranges = () => {
  const now = new Date();
  const d7 = new Date(now);
  d7.setDate(d7.getDate() - 7);
  const d30 = new Date(now);
  d30.setDate(d30.getDate() - 30);
  return { now, d7, d30 };
};

const safeCount = async (Model, filter = {}) => {
  try {
    return await Model.countDocuments(filter).exec();
  } catch {
    return 0;
  }
};

const safeFind = async (
  Model,
  filter = {},
  select = "",
  { sort, limit } = {}
) => {
  try {
    const q = Model.find(filter).select(select);
    if (sort) q.sort(sort);
    if (limit) q.limit(limit);
    return await q.lean().exec();
  } catch {
    return [];
  }
};

function timeAgo(date) {
  const now = new Date();
  const d = new Date(date);
  const mins = Math.floor((now - d) / (1000 * 60));
  if (mins < 1) return "Przed chwilą";
  if (mins < 60) return `${mins} minut temu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} godzin temu`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} dni temu`;
  const weeks = Math.floor(days / 7);
  return `${weeks} tygodni temu`;
}

/* ========= GŁÓWNY ENDPOINT: GET /api/admin-panel/dashboard ========= */
export const getDashboardStats = async (_req, res) => {
  try {
    const { d7, d30 } = ranges();

    // 1) Podstawowe liczniki
    const now = new Date();
    const activeListingsFilter = {
      $or: [{ status: "active" }, { status: "approved" }],
      $and: [
        {
          $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: null },
            { expiresAt: { $gt: now } },
          ],
        },
      ],
    };

    const [totalUsers, totalListings, activeListings] = await Promise.all([
      safeCount(User, {}),
      safeCount(Ad, {}),
      safeCount(Ad, activeListingsFilter),
    ]);

    // 2) Wzrosty
    const [newUsers7, newAds7, newUsers30, newAds30] = await Promise.all([
      safeCount(User, { createdAt: { $gte: d7 } }),
      safeCount(Ad, { createdAt: { $gte: d7 } }),
      safeCount(User, { createdAt: { $gte: d30 } }),
      safeCount(Ad, { createdAt: { $gte: d30 } }),
    ]);

    // 3) Aktywni użytkownicy z DailyActiveUser (ostatnie 30 dni)
    const today = new Date();
    const startOfToday = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
    );

    // Unikalne użytkownicy z ostatnich 30 dni
    const activeUsersData = await DailyActiveUser.distinct("user", {
      day: { $gte: d30 },
    }).catch(() => []);
    const activeUsers = activeUsersData.length;

    // Aktywni użytkownicy dzisiaj (dla karty "Aktywni użytkownicy dziś")
    const activeUsersToday = await DailyActiveUser.countDocuments({
      day: startOfToday,
    }).catch(() => 0);

    // 4) Ostatnia aktywność (użytkownicy + ogłoszenia)
    const recentUsers = await safeFind(
      User,
      {},
      "name lastName email createdAt role",
      { sort: { createdAt: -1 }, limit: 5 }
    );

    // ad.user -> ref do User
    const recentAdsRaw = await Ad.find({})
      .select("title createdAt user")
      .populate("user", "name lastName email")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean()
      .exec()
      .catch(() => []);

    const activity = [];

    recentUsers.forEach((u) => {
      const label = [u.name, u.lastName].filter(Boolean).join(" ") || u.email;
      activity.push({
        id: `user_${u._id}`,
        type: "user_registered",
        message: `Nowy użytkownik: ${label}`,
        time: timeAgo(u.createdAt),
        timestamp: u.createdAt,
      });
    });

    recentAdsRaw.forEach((ad) => {
      const owner =
        (ad.user &&
          ([ad.user.name, ad.user.lastName].filter(Boolean).join(" ") ||
            ad.user.email)) ||
        "Nieznany użytkownik";
      activity.push({
        id: `ad_${ad._id}`,
        type: "listing_created",
        message: `Nowe ogłoszenie: ${ad.title} (${owner})`,
        time: timeAgo(ad.createdAt),
        timestamp: ad.createdAt,
      });
    });

    activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const recentActivity = activity.slice(0, 10);

    // 5) Dane dla frontu (kompatybilne z Twoim UI)
    const pendingReports = 0; // gdy dodasz model reportów – podmienisz
    const totalRevenue = 0; // gdy dodasz płatności – podmienisz
    const activityRate =
      totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;

    const data = {
      stats: {
        totalUsers: n(totalUsers),
        activeListings: n(activeListings), // Aktywne ogłoszenia (bez wygasłych)
        pendingReports: n(pendingReports),
        monthlyRevenue: n(totalRevenue), // Frontend oczekuje monthlyRevenue
        activeUsersToday: n(activeUsersToday), // Aktywni użytkownicy dzisiaj
        newMessages: 0, // Placeholder
        avgListingPrice: 0, // Placeholder
        featuredListings: 0, // Placeholder
        activityRate: `${activityRate}%`,
      },
      weeklyGrowth: {
        users: n(newUsers7),
        listings: n(newAds7),
      },
      monthlyGrowth: {
        users: n(newUsers30),
        listings: n(newAds30),
      },
      // Brak statusów w Ad -> zwróćmy tylko total, reszta 0 (bez błędów)
      listingStats: {
        active: 0,
        pending: 0,
        expired: 0,
        sold: 0,
        total: n(totalListings),
      },
      userStats: {
        total: n(totalUsers),
        active: n(activeUsers),
      },
      trends: {
        totalUsers: { change: 0 },
        activeListings: { change: 0 },
        pendingReports: { change: 0 },
        monthlyRevenue: { change: 0 },
        activeUsersToday: { change: 0 },
        newMessages: { change: 0 },
        avgListingPrice: { change: 0 },
        featuredListings: { change: 0 },
      },
      recentActivity,
      systemStatus: {
        api: "healthy",
        database: "healthy",
        auth: "healthy",
        uptime: Math.floor(process.uptime()),
        memory:
          Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + " MB",
      },
    };

    res.json({ success: true, data });
  } catch (err) {
    console.error("[getDashboardStats] error:", err);
    res
      .status(500)
      .json({ success: false, message: err?.message || "Internal error" });
  }
};

/* ===== Proste aliasy (zostawiam, bo trasy je importują) ===== */
export const getDetailedUserStats = async (_req, res) => {
  const total = await safeCount(User, {});
  res.json({
    success: true,
    data: {
      period: "30d",
      totalUsers: total,
      registrationTimeline: [],
      activeUsers: 0,
      usersByRole: [],
      usersByVerification: [],
    },
  });
};

export const getDetailedListingStats = async (_req, res) => {
  const total = await safeCount(Ad, {});
  res.json({
    success: true,
    data: {
      period: "30d",
      totalListings: total,
      creationTimeline: [],
      listingsByStatus: [],
      listingsByBrand: [],
      priceStats: {},
    },
  });
};

export const getDetailedMessageStats = async (_req, res) => {
  res.json({
    success: true,
    data: {
      period: "30d",
      totalMessages: 0,
      messageTimeline: [],
      unreadMessages: 0,
      messagesWithAttachments: 0,
      mostActiveUsers: [],
      readRate: 0,
    },
  });
};

export const getSystemHealth = async (_req, res) => {
  const mem = process.memoryUsage();
  const uptime = Math.floor(process.uptime());
  res.json({
    success: true,
    data: {
      status: "healthy",
      uptime,
      memory: {
        used: Math.round(mem.heapUsed / 1024 / 1024),
        total: Math.round(mem.heapTotal / 1024 / 1024),
      },
      environment: process.env.NODE_ENV || "development",
      nodeVersion: process.version,
    },
  });
};

export const getActivityTimeline = async (_req, res) =>
  res.json({ success: true, data: { activities: [], total: 0, limit: 50 } });
