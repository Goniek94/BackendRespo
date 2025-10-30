import User from "../../../models/user/user.js";
import Ad from "../../../models/listings/ad.js";
import Payment from "../../../models/payments/payment.js";
import Comment from "../../../models/listings/comment.js";
import Message from "../../../models/communication/message.js";

/**
 * Get system statistics with chart data
 */
export const getStatistics = async (req, res) => {
  try {
    const { timeRange = "last_30_days" } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;
    let days = 30;

    switch (timeRange) {
      case "last_7_days":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        days = 7;
        break;
      case "last_30_days":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        days = 30;
        break;
      case "last_90_days":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        days = 90;
        break;
      case "this_year":
        startDate = new Date(now.getFullYear(), 0, 1);
        days = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        days = 30;
    }

    // Basic counts
    const [
      totalUsers,
      newUsers,
      totalAds,
      newAds,
      activeAds,
      totalPayments,
      revenueData,
      totalComments,
      totalViews,
      totalFavorites,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: startDate } }),
      Ad.countDocuments(),
      Ad.countDocuments({ createdAt: { $gte: startDate } }),
      Ad.countDocuments({ status: "active" }),
      Payment.countDocuments(),
      Payment.aggregate([
        { $match: { status: "completed", createdAt: { $gte: startDate } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Comment.countDocuments({ createdAt: { $gte: startDate } }),
      Ad.aggregate([{ $group: { _id: null, total: { $sum: "$views" } } }]),
      Ad.aggregate([{ $group: { _id: null, total: { $sum: "$favorites" } } }]),
    ]);

    const revenue = revenueData[0]?.total || 0;
    const views = totalViews[0]?.total || 0;
    const favorites = totalFavorites[0]?.total || 0;

    // Calculate conversion rate (users who created ads)
    const usersWithAds = await Ad.distinct("user");
    const conversion =
      totalUsers > 0 ? Math.round((usersWithAds.length / totalUsers) * 100) : 0;

    // User registrations over time (for chart)
    const userRegistrations = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Listings over time (for chart)
    const listingsOverTime = await Ad.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Revenue over time (for chart)
    const revenueOverTime = await Payment.aggregate([
      {
        $match: {
          status: "completed",
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          revenue: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Top car brands (for chart)
    const topBrands = await Ad.aggregate([
      {
        $match: {
          brand: { $ne: "" },
          status: { $in: ["active", "approved"] },
        },
      },
      { $group: { _id: "$brand", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // Ads by status (for chart)
    const adsByStatus = await Ad.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Top users by ads
    const topUsersByAds = await Ad.aggregate([
      { $match: { user: { $exists: true, $ne: null } } },
      { $group: { _id: "$user", adsCount: { $sum: 1 } } },
      { $sort: { adsCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      { $unwind: "$userInfo" },
      {
        $project: {
          name: {
            $concat: [
              "$userInfo.firstName",
              " ",
              { $ifNull: ["$userInfo.lastName", ""] },
            ],
          },
          ads: "$adsCount",
        },
      },
    ]);

    // Format chart data
    const formatChartData = (data, field = "count") => {
      const dataMap = new Map(data.map((d) => [d._id, d[field]]));
      const result = [];

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const label =
          days <= 7
            ? date.toLocaleDateString("pl-PL", {
                day: "numeric",
                month: "short",
              })
            : days <= 30
            ? `${date.getDate()} ${date.toLocaleDateString("pl-PL", {
                month: "short",
              })}`
            : date.toLocaleDateString("pl-PL", {
                day: "numeric",
                month: "short",
              });

        result.push({
          date: label,
          value: dataMap.get(dateStr) || 0,
        });
      }

      return result;
    };

    // Response data
    const statistics = {
      success: true,
      data: {
        // Top cards (in header)
        cards: {
          newUsers,
          newListings: newAds,
          revenue: Math.round(revenue / 100), // Convert from cents to PLN
          conversion,
        },
        // Charts data
        charts: {
          // User registrations timeline
          userRegistrations: formatChartData(userRegistrations),
          // Listings timeline
          listingsOverTime: formatChartData(listingsOverTime),
          // Revenue timeline
          revenueOverTime: formatChartData(revenueOverTime, "revenue").map(
            (d) => ({
              ...d,
              value: Math.round(d.value / 100), // Convert to PLN
            })
          ),
          // Activity breakdown (pie chart)
          activity: [
            { name: "Wyświetlenia", value: views },
            { name: "Komentarze", value: totalComments },
            { name: "Ulubione", value: favorites },
            { name: "Ogłoszenia", value: totalAds },
          ],
          // Top brands (horizontal bar)
          topBrands: topBrands.map((b) => ({
            category: b._id || "Inne",
            count: b.count,
          })),
          // Ads by status (pie chart)
          adsByStatus: adsByStatus.map((s) => ({
            name:
              s._id === "active"
                ? "Aktywne"
                : s._id === "pending"
                ? "Oczekujące"
                : s._id === "approved"
                ? "Zatwierdzone"
                : s._id === "rejected"
                ? "Odrzucone"
                : s._id === "archived"
                ? "Archiwalne"
                : "Inne",
            value: s.count,
          })),
        },
        // Detailed stats
        detailed: {
          users: {
            total: totalUsers,
            new: newUsers,
            withAds: usersWithAds.length,
            conversion,
          },
          ads: {
            total: totalAds,
            new: newAds,
            active: activeAds,
            views,
            favorites,
          },
          revenue: {
            total: Math.round(revenue / 100),
            payments: totalPayments,
          },
          engagement: {
            comments: totalComments,
            views,
            favorites,
          },
          topUsers: topUsersByAds,
        },
      },
    };

    res.status(200).json(statistics);
  } catch (error) {
    console.error("Error fetching statistics:", error);
    res.status(500).json({
      success: false,
      message: "Błąd podczas pobierania statystyk",
      error: error.message,
    });
  }
};
