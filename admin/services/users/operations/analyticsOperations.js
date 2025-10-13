// operations/analyticsOperations.js
// Analytics and reporting operations for users

import User from "../../../../models/user/user.js";

/**
 * Get user analytics and insights
 */
export const getUserAnalytics = async (options = {}) => {
  try {
    const { timeframe = "30d" } = options;

    const now = new Date();
    const daysBack = timeframe === "7d" ? 7 : timeframe === "30d" ? 30 : 90;
    const currentPeriodStart = new Date(
      now.getTime() - daysBack * 24 * 60 * 60 * 1000
    );
    const previousPeriodStart = new Date(
      currentPeriodStart.getTime() - daysBack * 24 * 60 * 60 * 1000
    );

    const [currentStats, previousStats] = await Promise.all([
      User.aggregate([
        {
          $facet: {
            total: [{ $count: "count" }],
            active: [{ $match: { status: "active" } }, { $count: "count" }],
            suspended: [
              { $match: { status: "suspended" } },
              { $count: "count" },
            ],
            banned: [{ $match: { status: "banned" } }, { $count: "count" }],
            verified: [{ $match: { isVerified: true } }, { $count: "count" }],
            inactive: [
              { $match: { status: { $in: ["inactive", "pending"] } } },
              { $count: "count" },
            ],
          },
        },
      ]),
      User.aggregate([
        { $match: { createdAt: { $lt: currentPeriodStart } } },
        {
          $facet: {
            total: [{ $count: "count" }],
            active: [{ $match: { status: "active" } }, { $count: "count" }],
            suspended: [
              { $match: { status: "suspended" } },
              { $count: "count" },
            ],
            banned: [{ $match: { status: "banned" } }, { $count: "count" }],
            verified: [{ $match: { isVerified: true } }, { $count: "count" }],
            inactive: [
              { $match: { status: { $in: ["inactive", "pending"] } } },
              { $count: "count" },
            ],
          },
        },
      ]),
    ]);

    const current = currentStats[0];
    const previous = previousStats[0];

    const total = current.total[0]?.count || 0;
    const active = current.active[0]?.count || 0;
    const suspended = current.suspended[0]?.count || 0;
    const banned = current.banned[0]?.count || 0;
    const verified = current.verified[0]?.count || 0;
    const inactive = current.inactive[0]?.count || 0;

    const prevTotal = previous.total[0]?.count || 0;
    const prevActive = previous.active[0]?.count || 0;
    const prevSuspended = previous.suspended[0]?.count || 0;
    const prevBanned = previous.banned[0]?.count || 0;
    const prevVerified = previous.verified[0]?.count || 0;
    const prevInactive = previous.inactive[0]?.count || 0;

    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    return {
      total,
      active,
      suspended,
      banned,
      verified,
      inactive,
      totalChange: calculateChange(total, prevTotal),
      activeChange: calculateChange(active, prevActive),
      suspendedChange: calculateChange(suspended, prevSuspended),
      bannedChange: calculateChange(banned, prevBanned),
      verifiedChange: calculateChange(verified, prevVerified),
      inactiveChange: calculateChange(inactive, prevInactive),
      totalUsers: total,
      verifiedUsers: verified,
      recentUsers: total - prevTotal,
      usersByRole: [],
      usersByStatus: [],
      timeframe,
      generatedAt: new Date(),
    };
  } catch (error) {
    throw new Error(`Failed to generate user analytics: ${error.message}`);
  }
};
