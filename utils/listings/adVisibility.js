// utils/listings/adVisibility.js
/**
 * Common visibility filter for advertisements
 * This filter defines which ads are publicly visible and should be used consistently
 * across both the counter and the public/admin listing views
 */

/**
 * Returns MongoDB query filter for publicly visible (active) advertisements
 * These ads meet all criteria to be displayed on the platform
 *
 * @returns {Object} MongoDB query object
 */
export const publicActiveFilter = () => {
  const now = new Date();

  return {
    // 1) Ads with "active" or "approved" status (publicly visible)
    status: { $in: ["active", "approved"] },

    // 2) Not expired - either no expiry date or expiry date is in the future
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gt: now } },
    ],

    // 3) Optional additional conditions (uncomment if needed):

    // Ensure at least one image exists
    // images: { $exists: true, $type: "array", $ne: [] },

    // Ensure title is not empty
    // title: { $exists: true, $ne: "" },

    // Ensure price is set
    // price: { $exists: true, $ne: null },
  };
};

/**
 * Returns count of publicly visible advertisements
 * Uses the same filter as the listing view to ensure consistency
 *
 * @param {Model} AdModel - Mongoose Ad model
 * @returns {Promise<number>} Count of active ads
 */
export const getPublicActiveCount = async (AdModel) => {
  try {
    const count = await AdModel.countDocuments(publicActiveFilter());
    return count;
  } catch (error) {
    console.error("Error counting public active ads:", error);
    throw error;
  }
};
