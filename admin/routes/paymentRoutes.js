// admin/routes/paymentRoutes.js
import express from "express";
import mongoose from "mongoose";
import Transaction from "../../models/payments/Transaction.js";

const router = express.Router();

/* ------------- helpers ------------- */
const isStr = (v) => typeof v === "string";
const asStr = (v) => (isStr(v) ? v.trim() : undefined);
const asBool = (v) =>
  v === true || v === "true"
    ? true
    : v === false || v === "false"
    ? false
    : undefined;
const asInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
};

const buildMatch = (q = {}) => {
  const m = {};
  const status = asStr(q.status);
  const type = asStr(q.type);
  const user = asStr(q.user);
  const ad = asStr(q.ad);
  const method = asStr(q.method);
  const from = asStr(q.from);
  const to = asStr(q.to);

  if (status) m.status = status;
  if (type) m.type = type;
  if (method) m.paymentMethod = method;
  if (user && mongoose.isValidObjectId(user))
    m.userId = new mongoose.Types.ObjectId(user);
  if (ad && mongoose.isValidObjectId(ad))
    m.adId = new mongoose.Types.ObjectId(ad);
  if (from || to) {
    m.createdAt = {};
    if (from) m.createdAt.$gte = new Date(from);
    if (to) m.createdAt.$lt = new Date(to);
  }
  return m;
};

// Join ad and optionally filter "only active"
const withActiveAd = (onlyActive) => [
  {
    $lookup: { from: "ads", localField: "adId", foreignField: "_id", as: "ad" },
  },
  { $unwind: { path: "$ad", preserveNullAndEmptyArrays: true } },
  ...(onlyActive
    ? [
        {
          $match: {
            $or: [{ adId: { $exists: false } }, { "ad.active": true }],
          },
        },
      ]
    : []),
];

/* ------------- LIST: GET /admin/payments ------------- */
// Purpose: Return data for table (pagination, filters, sort + joined user/ad)
// Why: View: User – Ad (type) – Amount – Status – Date
// Effect: Stable data source for UI; default onlyActive=true (can be disabled)
router.get("/", async (req, res) => {
  try {
    const page = asInt(req.query.page) || 1;
    const limit = asInt(req.query.limit) || 20;
    const sort = asStr(req.query.sort) || "createdAt";
    const dir = asStr(req.query.dir) === "asc" ? 1 : -1;
    const onlyActive = asBool(req.query.onlyActive);
    const match = buildMatch(req.query);

    const pipeline = [
      { $match: match },
      ...withActiveAd(onlyActive !== false), // default true
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      { $sort: { [sort]: dir, _id: -1 } },
      {
        $facet: {
          rows: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                userId: 1,
                "user.email": 1,
                "user.name": 1,
                adId: 1,
                "ad.headline": 1,
                type: 1,
                amount: 1,
                currency: 1,
                status: 1,
                paymentMethod: 1,
                createdAt: 1,
                updatedAt: 1,
              },
            },
          ],
          meta: [{ $count: "total" }],
        },
      },
    ];

    const [agg] = await Transaction.aggregate(pipeline);
    const total = agg?.meta?.[0]?.total || 0;

    res.json({
      success: true,
      data: agg?.rows || [],
      meta: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("[Payments] List error:", error);
    res.status(500).json({
      success: false,
      error: "Błąd podczas pobierania listy płatności",
      code: "PAYMENTS_LIST_ERROR",
    });
  }
});

/* ------------- KPI: GET /admin/payments/stats ------------- */
// Purpose: Count quick cards (standards, featured, revenue, success rate) for active Ads
// Why: Header indicators in panel
// Effect: 4 numbers reacting to filters; default onlyActive=true
router.get("/stats", async (req, res) => {
  try {
    const match = buildMatch(req.query);
    const onlyActive = asBool(req.query.onlyActive);

    const pipeline = [
      { $match: match },
      ...withActiveAd(onlyActive !== false), // default true
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                all: { $sum: 1 },
                succ: {
                  $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
                },
                fail: {
                  $sum: {
                    $cond: [{ $in: ["$status", ["failed", "canceled"]] }, 1, 0],
                  },
                },
                revenue: {
                  $sum: {
                    $cond: [{ $eq: ["$status", "completed"] }, "$amount", 0],
                  },
                },
              },
            },
            {
              $addFields: {
                successRate: {
                  $cond: [
                    { $gt: ["$all", 0] },
                    { $multiply: [{ $divide: ["$succ", "$all"] }, 100] },
                    0,
                  ],
                },
              },
            },
          ],
          byType: [
            { $match: { status: "completed" } },
            {
              $group: {
                _id: "$type",
                qty: { $sum: 1 },
                revenue: { $sum: "$amount" },
              },
            },
            { $sort: { revenue: -1 } },
          ],
        },
      },
    ];

    const [agg] = await Transaction.aggregate(pipeline);
    const totals = agg?.totals?.[0] || {
      all: 0,
      succ: 0,
      fail: 0,
      revenue: 0,
      successRate: 0,
    };
    const byType = {};
    (agg?.byType || []).forEach((x) => {
      byType[x._id] = { qty: x.qty, revenue: x.revenue };
    });

    res.json({ success: true, totals, byType });
  } catch (error) {
    console.error("[Payments] Stats error:", error);
    res.status(500).json({
      success: false,
      error: "Błąd podczas pobierania statystyk płatności",
      code: "PAYMENTS_STATS_ERROR",
    });
  }
});

/* ------------- USER RANKING: GET /admin/payments/stats/users ------------- */
// Purpose: Group by userId how much they bought and for how much (completed), default only active Ads
// Why: View "who buys the most"
// Effect: List of top N users with sums and quantity
router.get("/stats/users", async (req, res) => {
  try {
    const match = buildMatch(req.query);
    const onlyActive = asBool(req.query.onlyActive);
    const limit = asInt(req.query.limit) || 50;

    const pipeline = [
      { $match: match },
      ...withActiveAd(onlyActive !== false),
      { $match: { status: "completed" } },
      {
        $group: {
          _id: "$userId",
          qty: { $sum: 1 },
          revenue: { $sum: "$amount" },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          userId: "$_id",
          _id: 0,
          qty: 1,
          revenue: 1,
          "user.email": 1,
          "user.name": 1,
        },
      },
    ];

    const rows = await Transaction.aggregate(pipeline);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("[Payments] User ranking error:", error);
    res.status(500).json({
      success: false,
      error: "Błąd podczas pobierania rankingu użytkowników",
      code: "PAYMENTS_USER_RANKING_ERROR",
    });
  }
});

/* ------------- EXPORT: GET /admin/payments/export ------------- */
// Purpose: Generate CSV (or XLSX in future) with current filters
// Why: Monthly extract for download
// Effect: CSV stream with transaction rows + basic columns
router.get("/export", async (req, res) => {
  try {
    const match = buildMatch(req.query);
    const onlyActive = asBool(req.query.onlyActive);

    const rows = await Transaction.aggregate([
      { $match: match },
      ...withActiveAd(onlyActive !== false),
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          createdAt: 1,
          userEmail: "$user.email",
          userName: "$user.name",
          userId: 1,
          adId: 1,
          adTitle: "$ad.headline",
          type: 1,
          amount: 1,
          currency: 1,
          status: 1,
          paymentMethod: 1,
          transactionId: 1,
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    const esc = (v = "") => {
      const s = (v ?? "").toString();
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const header = [
      "createdAt",
      "userEmail",
      "userName",
      "userId",
      "adId",
      "adTitle",
      "type",
      "amount",
      "currency",
      "status",
      "paymentMethod",
      "transactionId",
    ].join(",");

    const body = rows
      .map((r) =>
        [
          r.createdAt?.toISOString?.() || "",
          r.userEmail || "",
          r.userName || "",
          r.userId || "",
          r.adId || "",
          r.adTitle || "",
          r.type || "",
          r.amount ?? "",
          r.currency || "PLN",
          r.status || "",
          r.paymentMethod || "",
          r.transactionId || "",
        ]
          .map(esc)
          .join(",")
      )
      .join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="payments.csv"');
    res.status(200).send([header, body].join("\n"));
  } catch (error) {
    console.error("[Payments] Export error:", error);
    res.status(500).json({
      success: false,
      error: "Błąd podczas eksportu płatności",
      code: "PAYMENTS_EXPORT_ERROR",
    });
  }
});

export default router;
