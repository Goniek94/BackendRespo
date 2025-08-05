import userService from '../../services/userService.js';
import { validationResult } from 'express-validator';

/**
 * Professional User Management Controller
 * Handles HTTP requests for user management in admin panel
 * Features: RESTful API, validation, error handling, security
 * 
 * @author Senior Developer
 * @version 1.0.0
 */

/**
 * Get paginated list of users with filtering
 * GET /admin/users
 */
export const getUsers = async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      search: req.query.search || '',
      role: req.query.role || '',
      status: req.query.status || '',
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc',
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom) : null,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo) : null
    };

    // Validate pagination limits
    if (options.limit > 100) {
      return res.status(400).json({
        success: false,
        error: 'Limit cannot exceed 100 items per page',
        code: 'INVALID_LIMIT'
      });
    }

    const result = await userService.getUsers(options);

    res.json({
      success: true,
      data: {
        users: result.users,
        pagination: {
          totalCount: result.pagination.totalCount,
          totalPages: result.pagination.totalPages,
          currentPage: result.pagination.currentPage,
          limit: result.pagination.limit,
          hasNextPage: result.pagination.hasNextPage,
          hasPrevPage: result.pagination.hasPrevPage
        }
      },
      message: `Retrieved ${result.users.length} users`
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve users',
      code: 'GET_USERS_FAILED',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get single user by ID
 * GET /admin/users/:id
 */
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format',
        code: 'INVALID_USER_ID'
      });
    }

    const user = await userService.getUserById(id);

    res.json({
      success: true,
      data: user,
      message: 'User retrieved successfully'
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user',
      code: 'GET_USER_FAILED',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update user information
 * PUT /admin/users/:id
 */
export const updateUser = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const updateData = req.body;
    const adminId = req.user._id;

    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format',
        code: 'INVALID_USER_ID'
      });
    }

    // Prevent admin from changing their own role to non-admin
    if (id === adminId.toString() && updateData.role && updateData.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Cannot change your own admin role',
        code: 'SELF_ROLE_CHANGE_FORBIDDEN'
      });
    }

    const updatedUser = await userService.updateUser(id, updateData, adminId);

    res.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Update user error:', error);
    
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update user',
      code: 'UPDATE_USER_FAILED',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Block or unblock user
 * POST /admin/users/:id/block
 */
export const toggleUserBlock = async (req, res) => {
  try {
    const { id } = req.params;
    const { blocked, reason } = req.body;
    const adminId = req.user._id;

    // Validate required fields
    if (typeof blocked !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Blocked status must be a boolean',
        code: 'INVALID_BLOCKED_STATUS'
      });
    }

    if (blocked && !reason) {
      return res.status(400).json({
        success: false,
        error: 'Reason is required when blocking a user',
        code: 'MISSING_BLOCK_REASON'
      });
    }

    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format',
        code: 'INVALID_USER_ID'
      });
    }

    // Prevent admin from blocking themselves
    if (id === adminId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Cannot block your own account',
        code: 'SELF_BLOCK_FORBIDDEN'
      });
    }

    const updatedUser = await userService.toggleUserBlock(id, blocked, reason, adminId);

    res.json({
      success: true,
      data: updatedUser,
      message: `User ${blocked ? 'blocked' : 'unblocked'} successfully`
    });
  } catch (error) {
    console.error('Toggle user block error:', error);
    
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.status(500).json({
      success: false,
      error: `Failed to ${req.body.blocked ? 'block' : 'unblock'} user`,
      code: 'TOGGLE_BLOCK_FAILED',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete user (soft delete)
 * DELETE /admin/users/:id
 */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user._id;

    // Validate required fields
    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Deletion reason must be at least 10 characters long',
        code: 'INVALID_DELETION_REASON'
      });
    }

    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format',
        code: 'INVALID_USER_ID'
      });
    }

    // Prevent admin from deleting themselves
    if (id === adminId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete your own account',
        code: 'SELF_DELETE_FORBIDDEN'
      });
    }

    const result = await userService.deleteUser(id, reason, adminId);

    res.json({
      success: true,
      data: result,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
      code: 'DELETE_USER_FAILED',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Bulk update users
 * POST /admin/users/bulk-update
 */
export const bulkUpdateUsers = async (req, res) => {
  try {
    const { userIds, updateData } = req.body;
    const adminId = req.user._id;

    // Validate required fields
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'User IDs array is required and cannot be empty',
        code: 'INVALID_USER_IDS'
      });
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Update data is required',
        code: 'MISSING_UPDATE_DATA'
      });
    }

    // Validate bulk operation limits
    if (userIds.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Cannot update more than 100 users at once',
        code: 'BULK_LIMIT_EXCEEDED'
      });
    }

    // Validate ObjectId formats
    const invalidIds = userIds.filter(id => !id.match(/^[0-9a-fA-F]{24}$/));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format detected',
        code: 'INVALID_USER_IDS',
        details: { invalidIds }
      });
    }

    // Prevent admin from including themselves in role changes
    if (updateData.role && userIds.includes(adminId.toString())) {
      return res.status(403).json({
        success: false,
        error: 'Cannot change your own role in bulk operations',
        code: 'SELF_ROLE_CHANGE_FORBIDDEN'
      });
    }

    const result = await userService.bulkUpdateUsers(userIds, updateData, adminId);

    res.json({
      success: true,
      data: result,
      message: `Bulk update completed: ${result.modifiedCount} users updated`
    });
  } catch (error) {
    console.error('Bulk update users error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Bulk update failed',
      code: 'BULK_UPDATE_FAILED',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user analytics
 * GET /admin/users/analytics
 */
export const getUserAnalytics = async (req, res) => {
  try {
    // Import User model directly to avoid service complications
    const User = (await import('../../../models/user/user.js')).default;

    // Simple direct queries to database
    const total = await User.countDocuments();
    const verified = await User.countDocuments({ 
      $or: [
        { isVerified: true },
        { emailVerified: true },
        { isEmailVerified: true }
      ]
    });
    const inactive = await User.countDocuments({ 
      $or: [
        { status: 'inactive' },
        { status: 'pending' },
        { registrationStep: { $lt: 5 } }
      ]
    });
    const blocked = await User.countDocuments({ 
      $or: [
        { status: 'blocked' },
        { status: 'suspended' }
      ]
    });

    // Return exactly what frontend expects
    const analytics = {
      total,
      verified,
      inactive,
      blocked
    };

    res.json({
      success: true,
      data: analytics,
      message: 'User analytics retrieved successfully'
    });
  } catch (error) {
    console.error('Get user analytics error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user analytics',
      code: 'ANALYTICS_FAILED',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Export users data
 * GET /admin/users/export
 */
export const exportUsers = async (req, res) => {
  try {
    const { format = 'json', filters = {} } = req.query;

    // Validate export format
    const validFormats = ['json', 'csv'];
    if (!validFormats.includes(format)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid export format. Must be json or csv',
        code: 'INVALID_EXPORT_FORMAT'
      });
    }

    // Get users with filters (no pagination for export)
    const options = {
      ...filters,
      page: 1,
      limit: 10000 // Large limit for export
    };

    const result = await userService.getUsers(options);

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=users-export.json');
      res.json({
        exportedAt: new Date(),
        totalUsers: result.pagination.totalCount,
        users: result.users
      });
    } else if (format === 'csv') {
      // Basic CSV implementation
      const csvHeaders = 'ID,Name,Email,Role,Status,Created At,Verified\n';
      const csvData = result.users.map(user => 
        `${user._id},${user.name},${user.email},${user.role},${user.status},${user.createdAt},${user.isVerified}`
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=users-export.csv');
      res.send(csvHeaders + csvData);
    }
  } catch (error) {
    console.error('Export users error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to export users',
      code: 'EXPORT_FAILED',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
