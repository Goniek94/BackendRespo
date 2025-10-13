// operations/userCrudOperations.js
// CRUD operations for user management

import User from "../../../../models/user/user.js";
import AdminActivity from "../../../models/AdminActivity.js";
import Ad from "../../../../models/listings/ad.js";
import {
  buildUserQuery,
  buildSortOptions,
  calculatePagination,
} from "../helpers/queryBuilder.js";
import {
  getAdsCountForUsers,
  mapUserToFrontend,
  validateAndFilterUpdateData,
} from "../helpers/dataMapper.js";

/**
 * Get paginated list of users with filtering and sorting
 */
export const getUsers = async (options = {}) => {
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

  const query = buildUserQuery({ search, role, status, dateFrom, dateTo });
  const sortOptions = buildSortOptions(sortBy, sortOrder);
  const skip = (page - 1) * limit;

  try {
    const [rawUsers, totalCount] = await Promise.all([
      User.find(query)
        .select("-password -__v")
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query),
    ]);

    const userIds = rawUsers.map((u) => u._id);
    const adsCountMap = await getAdsCountForUsers(userIds);
    const users = rawUsers.map((user) => mapUserToFrontend(user, adsCountMap));

    return {
      users,
      pagination: calculatePagination(totalCount, page, limit),
      filters: { search, role, status, sortBy, sortOrder, dateFrom, dateTo },
    };
  } catch (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }
};

/**
 * Get single user by ID with detailed information
 */
export const getUserById = async (userId) => {
  try {
    const user = await User.findById(userId).select("-password -__v").lean();

    if (!user) {
      throw new Error("User not found");
    }

    const stats = await getUserStatistics(userId);

    return {
      ...user,
      statistics: stats,
    };
  } catch (error) {
    throw new Error(`Failed to fetch user: ${error.message}`);
  }
};

/**
 * Update user information
 */
export const updateUser = async (userId, updateData, adminId) => {
  try {
    const currentUser = await User.findById(userId).lean();
    if (!currentUser) {
      throw new Error("User not found");
    }

    let filteredData = validateAndFilterUpdateData(updateData);

    // Email validation
    if (filteredData.email) {
      const normalizedNewEmail = filteredData.email.toLowerCase().trim();
      const normalizedCurrentEmail = currentUser.email.toLowerCase().trim();

      if (normalizedNewEmail !== normalizedCurrentEmail) {
        const emailExists = await User.findOne({
          email: normalizedNewEmail,
          _id: { $ne: userId },
        });

        if (emailExists) {
          throw new Error(
            `Email ${normalizedNewEmail} is already in use by another user`
          );
        }
        filteredData.email = normalizedNewEmail;
      } else {
        delete filteredData.email;
      }
    }

    // Phone validation
    const phoneToCheck = filteredData.phoneNumber || filteredData.phone;
    if (phoneToCheck && phoneToCheck !== currentUser.phoneNumber) {
      const phoneExists = await User.findOne({
        phoneNumber: phoneToCheck,
        _id: { $ne: userId },
      });

      if (phoneExists) {
        throw new Error(
          `Phone number ${phoneToCheck} is already in use by another user`
        );
      }
      filteredData.phoneNumber = phoneToCheck;
      delete filteredData.phone;
    }

    // Password hashing
    if (filteredData.password) {
      const bcrypt = await import("bcrypt");
      filteredData.password = await bcrypt.hash(filteredData.password, 12);
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { ...filteredData, updatedAt: new Date() },
      { new: true, runValidators: true, context: "query" }
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
        metadata: { fieldsChanged: Object.keys(filteredData) },
      },
      requestContext: {
        ipAddress: "0.0.0.0",
        userAgent: "Admin Panel",
        sessionId: "admin_session",
      },
      result: { status: "success", message: "User updated successfully" },
    });

    return updatedUser;
  } catch (error) {
    throw new Error(`Failed to update user: ${error.message}`);
  }
};

/**
 * Block or unblock user
 */
export const toggleUserBlock = async (
  userId,
  blocked,
  reason,
  adminId,
  blockUntil = null
) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const previousStatus = user.status;
    const newStatus = blocked ? "blocked" : "active";

    const updateData = {
      status: newStatus,
      updatedAt: new Date(),
    };

    if (blocked) {
      updateData.blockedAt = new Date();
      updateData.blockedBy = adminId;
      updateData.blockReason = reason;
      if (blockUntil) {
        updateData.blockUntil = blockUntil;
      }
      updateData.accountLocked = true;
    } else {
      updateData.blockedAt = null;
      updateData.blockedBy = null;
      updateData.blockReason = null;
      updateData.blockUntil = null;
      updateData.accountLocked = false;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    }).select("-password -__v");

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
          blockUntil: blockUntil || null,
          temporary: !!blockUntil,
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
};

/**
 * Delete user (soft delete)
 */
export const deleteUser = async (userId, reason, adminId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    await User.findByIdAndUpdate(userId, {
      status: "deleted",
      deletedAt: new Date(),
      deletedBy: adminId,
    });

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
      result: { status: "success", message: "User deleted successfully" },
      securityFlags: {
        riskLevel: "high",
        requiresReview: true,
        complianceRelevant: true,
      },
    });

    return {
      success: true,
      message: "User deleted successfully",
      deletedUser: { id: userId, email: user.email, name: user.name },
    };
  } catch (error) {
    throw new Error(`Failed to delete user: ${error.message}`);
  }
};

/**
 * Bulk update users
 */
export const bulkUpdateUsers = async (userIds, updateData, adminId) => {
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
      { ...filteredData, updatedAt: new Date() }
    );

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
      securityFlags: { riskLevel: "medium", requiresReview: true },
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
};

/**
 * Get user statistics
 */
export const getUserStatistics = async (userId) => {
  try {
    const totalListings = await Ad.countDocuments({
      $or: [{ user: userId }, { owner: userId }],
    });

    const activeListings = await Ad.countDocuments({
      $or: [{ user: userId }, { owner: userId }],
      status: { $in: ["active", "approved"] },
    });

    return {
      totalListings,
      activeListings,
      totalTransactions: 0,
      totalSpent: 0,
      accountAge: 0,
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
};
