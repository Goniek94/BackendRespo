// admin/controllers/analytics/activeUsersController.js
import DailyActiveUser from "../../../models/analytics/DailyActiveUser.js";
import { startOfUTCDay } from "../../../middleware/analytics/trackDailyActive.js";

const addDays = (date, n) => new Date(date.getTime() + n * 24 * 60 * 60 * 1000);

/** GET /analytics/active-users/today  -> { today, prevDay, changePct } */
export const getActiveUsersToday = async (_req, res) => {
  try {
    const todayStart = startOfUTCDay();
    const tomorrowStart = addDays(todayStart, 1);
    const yesterdayStart = addDays(todayStart, -1);

    const [today, prevDay] = await Promise.all([
      DailyActiveUser.countDocuments({ day: todayStart }),
      DailyActiveUser.countDocuments({ day: yesterdayStart }),
    ]);

    const changePct =
      prevDay > 0
        ? Math.round(((today - prevDay) / prevDay) * 100)
        : today > 0
        ? 100
        : 0;

    return res.json({
      success: true,
      data: { today, prevDay, changePct },
    });
  } catch (err) {
    console.error("getActiveUsersToday error:", err);
    return res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
};

/** GET /analytics/active-users/range?from=YYYY-MM-DD&to=YYYY-MM-DD (opcjonalnie) */
export const getActiveUsersRange = async (req, res) => {
  try {
    const from = req.query.from ? new Date(req.query.from) : startOfUTCDay();
    const to = req.query.to ? new Date(req.query.to) : new Date(); // exclusive

    const pipeline = [
      {
        $match: {
          day: { $gte: startOfUTCDay(from), $lt: startOfUTCDay(to) },
        },
      },
      { $group: { _id: "$day", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ];

    const rows = await DailyActiveUser.aggregate(pipeline);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error("getActiveUsersRange error:", err);
    return res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
};
