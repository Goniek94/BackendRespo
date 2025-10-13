// helpers/dataMapper.js
// Data mapping utilities for transforming user data

import Ad from "../../../../models/listings/ad.js";

/**
 * Get ads count for multiple users efficiently
 * @param {Array} userIds - Array of user IDs
 * @returns {Map} Map of userId -> ads count
 */
export const getAdsCountForUsers = async (userIds) => {
  const adsCountAggregation = await Ad.aggregate([
    {
      $match: {
        $or: [{ user: { $in: userIds } }, { owner: { $in: userIds } }],
      },
    },
    {
      $group: {
        _id: { $ifNull: ["$user", "$owner"] },
        count: { $sum: 1 },
      },
    },
  ]);

  const adsCountMap = new Map();
  adsCountAggregation.forEach((item) => {
    if (item._id) {
      adsCountMap.set(item._id.toString(), item.count);
    }
  });

  return adsCountMap;
};

/**
 * Map MongoDB user document to frontend-expected format
 * @param {Object} user - MongoDB user document
 * @param {Map} adsCountMap - Map of userId -> ads count
 * @returns {Object} Mapped user object
 */
export const mapUserToFrontend = (user, adsCountMap) => {
  return {
    ...user,
    id: user._id.toString(),
    phone: user.phoneNumber || "",
    verified: user.isVerified || false,
    adsCount: adsCountMap.get(user._id.toString()) || 0,
    listings_count: adsCountMap.get(user._id.toString()) || 0,
    last_active: user.lastActivity || user.lastLogin,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
  };
};

/**
 * Validate and filter update data
 * @param {Object} updateData - Raw update data
 * @returns {Object} Filtered and validated data
 */
export const validateAndFilterUpdateData = (updateData) => {
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
    "dateOfBirth",
    "dob",
    "blockUntil",
    "accountLocked",
    "blockedAt",
    "blockedBy",
    "blockReason",
    "statusReason",
  ];

  const filteredData = {};
  Object.keys(updateData).forEach((key) => {
    if (allowedFields.includes(key)) {
      filteredData[key] = updateData[key];
    }
  });

  // Map dateOfBirth to dob (frontend uses dateOfBirth, DB uses dob)
  if (filteredData.dateOfBirth) {
    filteredData.dob = filteredData.dateOfBirth;
    delete filteredData.dateOfBirth;
  }

  // Remove phone field if exists (use phoneNumber instead)
  if (filteredData.phone && !filteredData.phoneNumber) {
    filteredData.phoneNumber = filteredData.phone;
    delete filteredData.phone;
  }

  return filteredData;
};
