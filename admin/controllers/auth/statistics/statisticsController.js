// admin/controllers/statisticsController.js
import User from "../../../../models/user/user.js";
import Ad from "../../../../models/listings/ad.js";

// Jeśli masz model płatności – odkomentuj i dopasuj nazwę/ścieżkę.
// import Payment from "../../../../models/payments/payment.js";

const parseRange = (q) => {
  const now = new Date();
  const map = { last_7_days: 7, last_30_days: 30, last_90_days: 90 };
  if (q === "this_year") {
    const start = new Date(now.getFullYear(), 0, 1);
    return { start, end: now, groupBy: "%Y-%m" };
  }
  const days = map[q] ?? 30;
  const start = new Date(now);
  start.setDate(start.getDate() - days + 1);
  return { start, end: now, groupBy: "%Y-%m-%d" };
};

/** KARTY */
export const overviewStats = async (req, res) => {
  try {
    const { timeRange = "last_30_days" } = req.query;
    const { start, end } = parseRange(timeRange);

    const [newUsers, newListings] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: start, $lte: end } }),
      Ad.countDocuments({ createdAt: { $gte: start, $lte: end } }),
    ]);

    // Przychody – jeśli nie masz modelu Payment, zwróć 0
    let revenue = 0;
    /*
    const revenueAgg = await Payment.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end }, status: "paid" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    revenue = revenueAgg[0]?.total ?? 0;
    */

    const conversion =
      newUsers > 0 ? Math.round((newListings / newUsers) * 100) : 0;

    res.json({
      success: true,
      data: { newUsers, newListings, revenue, conversion },
    });
  } catch (e) {
    res
      .status(500)
      .json({ success: false, message: "Błąd statystyk (overview)" });
  }
};

/** WYKRESY */
export const timeseriesStats = async (req, res) => {
  try {
    const { timeRange = "last_30_days" } = req.query;
    const { start, end, groupBy } = parseRange(timeRange);

    const fmt = { $dateToString: { format: groupBy, date: "$createdAt" } };

    const [usersSeries, listingsSeries /*, revenueSeries*/] = await Promise.all(
      [
        User.aggregate([
          { $match: { createdAt: { $gte: start, $lte: end } } },
          { $group: { _id: fmt, value: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]),
        Ad.aggregate([
          { $match: { createdAt: { $gte: start, $lte: end } } },
          { $group: { _id: fmt, value: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]),
        // Jeśli masz Payment:
        /*
      Payment.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end }, status: "paid" } },
        { $group: { _id: fmt, value: { $sum: "$amount" } } },
        { $sort: { _id: 1 } }
      ])
      */
      ]
    );

    res.json({
      success: true,
      data: {
        users: usersSeries.map((x) => ({ date: x._id, value: x.value })),
        listings: listingsSeries.map((x) => ({ date: x._id, value: x.value })),
        revenue: [], // podmień powyżej gdy dołożysz Payment
        activity: [], // dodasz, gdy będziesz miał metrykę aktywności
      },
    });
  } catch (e) {
    res
      .status(500)
      .json({ success: false, message: "Błąd statystyk (timeseries)" });
  }
};

/** EKSPORT */
export const exportStats = async (req, res) => {
  try {
    const { timeRange = "last_30_days" } = req.query;
    const { start, end } = parseRange(timeRange);

    const [users, listings] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: start, $lte: end } }),
      Ad.countDocuments({ createdAt: { $gte: start, $lte: end } }),
    ]);

    const csv = `metric,value\nusers,${users}\nlistings,${listings}\n`;
    res.setHeader("Content-Disposition", "attachment; filename=statistics.csv");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.send(csv);
  } catch (e) {
    res
      .status(500)
      .json({ success: false, message: "Błąd eksportu statystyk" });
  }
};
