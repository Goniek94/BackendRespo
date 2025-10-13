// admin/services/userService.js
// Main User Service - Clean importer architecture
// All business logic is in separate operation modules

import * as userCrudOps from "./users/operations/userCrudOperations.js";
import * as analyticsOps from "./users/operations/analyticsOperations.js";

/**
 * Professional User Management Service
 * Clean architecture with separated concerns:
 * - CRUD operations (userCrudOperations.js)
 * - Analytics operations (analyticsOperations.js)
 * - Query helpers (helpers/queryBuilder.js)
 * - Data mapping (helpers/dataMapper.js)
 *
 * @version 2.0.0 - Refactored to modular architecture
 */
class UserService {
  // ========================================
  // CRUD Operations
  // ========================================

  /**
   * Get paginated list of users with filtering and sorting
   */
  async getUsers(options = {}) {
    return userCrudOps.getUsers(options);
  }

  /**
   * Get single user by ID with detailed information
   */
  async getUserById(userId) {
    return userCrudOps.getUserById(userId);
  }

  /**
   * Update user information
   */
  async updateUser(userId, updateData, adminId) {
    return userCrudOps.updateUser(userId, updateData, adminId);
  }

  /**
   * Block or unblock user
   */
  async toggleUserBlock(userId, blocked, reason, adminId, blockUntil = null) {
    return userCrudOps.toggleUserBlock(
      userId,
      blocked,
      reason,
      adminId,
      blockUntil
    );
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(userId, reason, adminId) {
    return userCrudOps.deleteUser(userId, reason, adminId);
  }

  /**
   * Bulk update users
   */
  async bulkUpdateUsers(userIds, updateData, adminId) {
    return userCrudOps.bulkUpdateUsers(userIds, updateData, adminId);
  }

  /**
   * Get user statistics
   */
  async getUserStatistics(userId) {
    return userCrudOps.getUserStatistics(userId);
  }

  // ========================================
  // Analytics Operations
  // ========================================

  /**
   * Get user analytics and insights
   */
  async getUserAnalytics(options = {}) {
    return analyticsOps.getUserAnalytics(options);
  }
}

export default new UserService();
