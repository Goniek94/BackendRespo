import User from "../../models/user/user.js";
import AdminActivity from "../models/AdminActivity.js";

/**
 * Professional User Management Service
 * Handles all user-related business logic for admin panel
 * Features: CRUD operations, bulk actions, analytics, security
 *
 * @author Senior Developer
 * @version 1.0.0
 */

class UserService {
  /**
   * Get paginated list of users with filtering and sorting
   * @param {Object} options - Query options
   * @param {number} options.page - Page number (default: 1)
   * @param {number} options.limit - Items per page (default: 20)
   * @param {string} options.search - Search term for name/email
   * @param {string} options.role - Filter by user role
   * @param {string} options.status - Filter by user status
   * @param {string} options.sortBy - Sort field (default: 'createdAt')
   * @param {string} options.sortOrder - Sort order (default: 'desc')
   * @param {Date} options.dateFrom - Filter from date
   * @param {Date} options.dateTo - Filter to date
   * @returns {Object} Paginated users with metadata
   */
  async getUsers(options = {}) {
    const {
      page = 1,
      limit = 20,
      search = "",
      role = "",
      status = "",
      sortBy = "createdAt",
      sortOrder = "desc",
      dateFrom,
      dateTo,
    } = options;

    // Build query object
    const query = {};

    // Search in name and email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by role
    if (role) {
      query.role = role;
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const sortOptions = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

    try {
      // Execute queries in parallel for better performance
      const [rawUsers, totalCount] = await Promise.all([
        User.find(query)
          .select("-password -__v")
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        User.countDocuments(query),
      ]);

      // Map MongoDB fields to frontend-expected fields
      const users = rawUsers.map((user) => ({
        ...user,
        id: user._id.toString(),
        phone: user.phoneNumber || "",
        verified: user.isVerified || false,
        listings_count: 0, // TODO: Add actual count from listings collection
        last_active: user.lastActivity || user.lastLogin,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
      }));

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          limit: parseInt(limit),
          hasNextPage,
          hasPrevPage,
        },
        filters: {
          search,
          role,
          status,
          sortBy,
          sortOrder,
          dateFrom,
          dateTo,
        },
      };
    } catch (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }
  }

  /**
   * Get single user by ID with detailed information
   * @param {string} userId - User ID
   * @returns {Object} User details with statistics
   */
  async getUserById(userId) {
    try {
      const user = await User.findById(userId).select("-password -__v").lean();

      if (!user) {
        throw new Error("User not found");
      }

      // Get user statistics (could be extended with more metrics)
      const stats = await this.getUserStatistics(userId);

      return {
        ...user,
        statistics: stats,
      };
    } catch (error) {
      throw new Error(`Failed to fetch user: ${error.message}`);
    }
  }

  /**
   * Update user information
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @param {string} adminId - ID of admin performing the update
   * @returns {Object} Updated user
   */
  async updateUser(userId, updateData, adminId) {
    try {
      // Get current user data for audit trail
      const currentUser = await User.findById(userId).lean();
      if (!currentUser) {
        throw new Error("User not found");
      }

      // Validate update data
      const allowedFields = [
        "name",
        "lastName",
        "email",
        "role",
        "status",
        "isVerified",
        "phone",
        "phoneNumber",
        "location",
        "preferences",
        "password",
        "isEmailVerified",
        "emailVerified",
        "isPhoneVerified",
        "phoneVerified",
        "dateOfBirth", // ✅ DODANE
      ];

      const filteredData = {};
      Object.keys(updateData).forEach((key) => {
        if (allowedFields.includes(key)) {
          filteredData[key] = updateData[key];
        }
      });

      // Map phoneNumber to phone for database consistency
      if (filteredData.phoneNumber) {
        filteredData.phone = filteredData.phoneNumber;
        delete filteredData.phoneNumber;
      }

      // Handle password hashing if password is being updated
      if (filteredData.password) {
        const bcrypt = await import("bcrypt");
        filteredData.password = await bcrypt.hash(filteredData.password, 12);
      }

      // Update user
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          ...filteredData,
          updatedAt: new Date(),
        },
        {
          new: true,
          runValidators: true,
        }
      ).select("-password -__v");

      // Log admin activity
      await AdminActivity.create({
        adminId,
        actionType: "user_updated",
        targetResource: {
          resourceType: "user",
          resourceId: userId,
          resourceIdentifier: updatedUser.email,
        },
        actionDetails: {
          previousState: {
            name: currentUser.name,
            email: currentUser.email,
            role: currentUser.role,
            status: currentUser.status,
            isVerified: currentUser.isVerified,
          },
          newState: {
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            status: updatedUser.status,
            isVerified: updatedUser.isVerified,
          },
          metadata: {
            fieldsChanged: Object.keys(filteredData),
          },
        },
        requestContext: {
          ipAddress: "0.0.0.0", // Will be set by middleware
          userAgent: "Admin Panel",
          sessionId: "admin_session",
        },
        result: {
          status: "success",
          message: "User updated successfully",
        },
      });

      return updatedUser;
    } catch (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  /**
   * Block or unblock user
   * @param {string} userId - User ID
   * @param {boolean} blocked - Block status
   * @param {string} reason - Reason for blocking/unblocking
   * @param {string} adminId - ID of admin performing the action
   * @returns {Object} Updated user
   */
  async toggleUserBlock(userId, blocked, reason, adminId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      const previousStatus = user.status;
      const newStatus = blocked ? "blocked" : "active";

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          status: newStatus,
          updatedAt: new Date(),
        },
        { new: true }
      ).select("-password -__v");

      // Log admin activity
      await AdminActivity.create({
        adminId,
        actionType: blocked ? "user_blocked" : "user_unblocked",
        targetResource: {
          resourceType: "user",
          resourceId: userId,
          resourceIdentifier: user.email,
        },
        actionDetails: {
          previousState: { status: previousStatus },
          newState: { status: newStatus },
          reason,
          metadata: {
            action: blocked ? "block" : "unblock",
          },
        },
        requestContext: {
          ipAddress: "0.0.0.0",
          userAgent: "Admin Panel",
          sessionId: "admin_session",
        },
        result: {
          status: "success",
          message: `User ${blocked ? "blocked" : "unblocked"} successfully`,
        },
      });

      return updatedUser;
    } catch (error) {
      throw new Error(
        `Failed to ${blocked ? "block" : "unblock"} user: ${error.message}`
      );
    }
  }

  /**
   * Delete user (soft delete)
   * @param {string} userId - User ID
   * @param {string} reason - Reason for deletion
   * @param {string} adminId - ID of admin performing the deletion
   * @returns {Object} Success message
   */
  async deleteUser(userId, reason, adminId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Soft delete - mark as deleted instead of removing from database
      await User.findByIdAndUpdate(userId, {
        status: "deleted",
        deletedAt: new Date(),
        deletedBy: adminId,
      });

      // Log admin activity
      await AdminActivity.create({
        adminId,
        actionType: "user_deleted",
        targetResource: {
          resourceType: "user",
          resourceId: userId,
          resourceIdentifier: user.email,
        },
        actionDetails: {
          reason,
          metadata: {
            originalStatus: user.status,
            deletionType: "soft_delete",
          },
        },
        requestContext: {
          ipAddress: "0.0.0.0",
          userAgent: "Admin Panel",
          sessionId: "admin_session",
        },
        result: {
          status: "success",
          message: "User deleted successfully",
        },
        securityFlags: {
          riskLevel: "high",
          requiresReview: true,
          complianceRelevant: true,
        },
      });

      return {
        success: true,
        message: "User deleted successfully",
        deletedUser: {
          id: userId,
          email: user.email,
          name: user.name,
        },
      };
    } catch (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  /**
   * Get user statistics
   * @param {string} userId - User ID
   * @returns {Object} User statistics
   */
  async getUserStatistics(userId) {
    try {
      // This would typically involve queries to other collections
      // For now, returning basic structure
      return {
        totalListings: 0, // await Listing.countDocuments({ userId })
        activeListings: 0,
        totalTransactions: 0,
        totalSpent: 0,
        accountAge: 0, // Calculate from createdAt
        lastActivity: null,
        verificationStatus: "pending",
      };
    } catch (error) {
      console.error("Failed to get user statistics:", error);
      return {
        totalListings: 0,
        activeListings: 0,
        totalTransactions: 0,
        totalSpent: 0,
        accountAge: 0,
        lastActivity: null,
        verificationStatus: "unknown",
      };
    }
  }

  /**
   * Bulk update users
   * @param {Array} userIds - Array of user IDs
   * @param {Object} updateData - Data to update
   * @param {string} adminId - ID of admin performing the update
   * @returns {Object} Bulk update results
   */
  async bulkUpdateUsers(userIds, updateData, adminId) {
    try {
      const allowedFields = ["role", "status", "isVerified"];
      const filteredData = {};

      Object.keys(updateData).forEach((key) => {
        if (allowedFields.includes(key)) {
          filteredData[key] = updateData[key];
        }
      });

      const result = await User.updateMany(
        { _id: { $in: userIds } },
        {
          ...filteredData,
          updatedAt: new Date(),
        }
      );

      // Log bulk admin activity
      await AdminActivity.create({
        adminId,
        actionType: "bulk_operation",
        targetResource: {
          resourceType: "bulk",
          resourceIdentifier: "user_bulk_update",
        },
        actionDetails: {
          newState: filteredData,
          affectedCount: result.modifiedCount,
          metadata: {
            operation: "bulk_update",
            targetIds: userIds,
            fieldsChanged: Object.keys(filteredData),
          },
        },
        requestContext: {
          ipAddress: "0.0.0.0",
          userAgent: "Admin Panel",
          sessionId: "admin_session",
        },
        result: {
          status: "success",
          message: `Bulk updated ${result.modifiedCount} users`,
        },
        securityFlags: {
          riskLevel: "medium",
          requiresReview: true,
        },
      });

      return {
        success: true,
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
        message: `Successfully updated ${result.modifiedCount} users`,
      };
    } catch (error) {
      throw new Error(`Bulk update failed: ${error.message}`);
    }
  }

  /**
   * Get user analytics and insights
   * @param {Object} options - Analytics options
   * @returns {Object} User analytics data
   */
  async getUserAnalytics(options = {}) {
    try {
      const { timeframe = "30d" } = options;

      // Calculate date range for change comparison
      const now = new Date();
      const daysBack = timeframe === "7d" ? 7 : timeframe === "30d" ? 30 : 90;
      const currentPeriodStart = new Date(
        now.getTime() - daysBack * 24 * 60 * 60 * 1000
      );
      const previousPeriodStart = new Date(
        currentPeriodStart.getTime() - daysBack * 24 * 60 * 60 * 1000
      );

      // Get current period stats
      const [currentStats, previousStats] = await Promise.all([
        User.aggregate([
          {
            $facet: {
              total: [{ $count: "count" }],
              verified: [{ $match: { isVerified: true } }, { $count: "count" }],
              inactive: [
                { $match: { status: { $in: ["inactive", "pending"] } } },
                { $count: "count" },
              ],
              blocked: [{ $match: { status: "blocked" } }, { $count: "count" }],
            },
          },
        ]),
        User.aggregate([
          {
            $match: { createdAt: { $lt: currentPeriodStart } },
          },
          {
            $facet: {
              total: [{ $count: "count" }],
              verified: [{ $match: { isVerified: true } }, { $count: "count" }],
              inactive: [
                { $match: { status: { $in: ["inactive", "pending"] } } },
                { $count: "count" },
              ],
              blocked: [{ $match: { status: "blocked" } }, { $count: "count" }],
            },
          },
        ]),
      ]);

      const current = currentStats[0];
      const previous = previousStats[0];

      // Calculate current values
      const total = current.total[0]?.count || 0;
      const verified = current.verified[0]?.count || 0;
      const inactive = current.inactive[0]?.count || 0;
      const blocked = current.blocked[0]?.count || 0;

      // Calculate previous values for change calculation
      const prevTotal = previous.total[0]?.count || 0;
      const prevVerified = previous.verified[0]?.count || 0;
      const prevInactive = previous.inactive[0]?.count || 0;
      const prevBlocked = previous.blocked[0]?.count || 0;

      // Calculate percentage changes
      const calculateChange = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      return {
        total,
        verified,
        inactive,
        blocked,
        totalChange: calculateChange(total, prevTotal),
        verifiedChange: calculateChange(verified, prevVerified),
        inactiveChange: calculateChange(inactive, prevInactive),
        blockedChange: calculateChange(blocked, prevBlocked),
        // Dodatkowe dane dla kompatybilności
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
  }
}

export default new UserService();
