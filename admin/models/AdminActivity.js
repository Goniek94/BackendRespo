import mongoose from 'mongoose';

/**
 * Professional Admin Activity Logging Model
 * Comprehensive audit trail system for administrative actions
 * Implements security best practices and compliance requirements
 * 
 * @author Senior Developer
 * @version 1.0.0
 */

const adminActivitySchema = new mongoose.Schema({
  // Administrator who performed the action
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Admin ID is required for activity logging'],
    index: true
  },
  
  // Action type classification
  actionType: {
    type: String,
    enum: {
      values: [
        // User management actions
        'user_created', 'user_updated', 'user_blocked', 'user_unblocked', 
        'user_deleted', 'user_role_changed', 'user_permissions_modified',
        
        // Listing management actions
        'listing_approved', 'listing_rejected', 'listing_featured', 
        'listing_unfeatured', 'listing_deleted', 'listing_restored',
        
        // Promotion management actions
        'promotion_created', 'promotion_updated', 'promotion_activated',
        'promotion_deactivated', 'promotion_deleted',
        
        // Report management actions
        'report_assigned', 'report_resolved', 'report_dismissed',
        'report_escalated', 'report_closed',
        
        // System management actions
        'settings_updated', 'system_backup', 'system_maintenance',
        'bulk_operation', 'data_export', 'data_import',
        
        // Security actions
        'login_attempt', 'logout', 'password_reset', 'session_terminated',
        'security_alert', 'access_denied'
      ],
      message: 'Invalid action type: {VALUE}'
    },
    required: [true, 'Action type is required'],
    index: true
  },
  
  // Target resource information
  targetResource: {
    resourceType: {
      type: String,
      enum: ['user', 'listing', 'promotion', 'report', 'system', 'bulk'],
      required: [true, 'Target resource type is required'],
      index: true
    },
    
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true
    },
    
    resourceIdentifier: {
      type: String, // Human-readable identifier (email, title, etc.)
      trim: true,
      maxlength: [200, 'Resource identifier too long']
    }
  },
  
  // Detailed action context
  actionDetails: {
    // Previous state (for updates/changes)
    previousState: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    
    // New state (for updates/changes)
    newState: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    
    // Additional context data
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    
    // Reason or comment for the action
    reason: {
      type: String,
      trim: true,
      maxlength: [500, 'Reason cannot exceed 500 characters']
    },
    
    // Affected items count (for bulk operations)
    affectedCount: {
      type: Number,
      min: [0, 'Affected count cannot be negative'],
      default: 1
    }
  },
  
  // Request context for security tracking
  requestContext: {
    ipAddress: {
      type: String,
      required: [true, 'IP address is required for security tracking'],
      validate: {
        validator: function(ip) {
          // Basic IP validation (IPv4 and IPv6)
          const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
          const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
          return ipv4Regex.test(ip) || ipv6Regex.test(ip) || ip === '::1' || ip === '127.0.0.1';
        },
        message: 'Invalid IP address format'
      },
      index: true
    },
    
    userAgent: {
      type: String,
      required: [true, 'User agent is required for security tracking'],
      maxlength: [1000, 'User agent string too long']
    },
    
    sessionId: {
      type: String,
      required: [true, 'Session ID is required'],
      index: true
    },
    
    requestId: {
      type: String, // Unique request identifier for tracing
      index: true
    },
    
    geolocation: {
      country: String,
      city: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    }
  },
  
  // Action result and status
  result: {
    status: {
      type: String,
      enum: {
        values: ['success', 'failure', 'partial_success', 'warning'],
        message: 'Invalid result status: {VALUE}'
      },
      required: [true, 'Result status is required'],
      index: true
    },
    
    message: {
      type: String,
      trim: true,
      maxlength: [1000, 'Result message too long']
    },
    
    errorCode: {
      type: String,
      trim: true
    },
    
    executionTime: {
      type: Number, // Execution time in milliseconds
      min: [0, 'Execution time cannot be negative']
    }
  },
  
  // Risk assessment and security flags
  securityFlags: {
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
      index: true
    },
    
    suspiciousActivity: {
      type: Boolean,
      default: false,
      index: true
    },
    
    requiresReview: {
      type: Boolean,
      default: false,
      index: true
    },
    
    complianceRelevant: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  
  // Audit trail metadata
  auditMetadata: {
    correlationId: {
      type: String, // For linking related actions
      index: true
    },
    
    batchId: {
      type: String, // For bulk operations
      index: true
    },
    
    parentActionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminActivity' // For nested/cascading actions
    },
    
    tags: [{
      type: String,
      trim: true,
      lowercase: true
    }]
  }
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Comprehensive indexing for optimal query performance
adminActivitySchema.index({ adminId: 1, createdAt: -1 });
adminActivitySchema.index({ actionType: 1, createdAt: -1 });
adminActivitySchema.index({ 'targetResource.resourceType': 1, 'targetResource.resourceId': 1 });
adminActivitySchema.index({ 'requestContext.ipAddress': 1, createdAt: -1 });
adminActivitySchema.index({ 'result.status': 1, createdAt: -1 });
adminActivitySchema.index({ 'securityFlags.riskLevel': 1, 'securityFlags.suspiciousActivity': 1 });
adminActivitySchema.index({ createdAt: -1 }); // For general chronological queries
adminActivitySchema.index({ 'auditMetadata.correlationId': 1 });

// Virtual fields for enhanced functionality
adminActivitySchema.virtual('isHighRisk').get(function() {
  return this.securityFlags.riskLevel === 'high' || 
         this.securityFlags.riskLevel === 'critical' ||
         this.securityFlags.suspiciousActivity;
});

adminActivitySchema.virtual('actionCategory').get(function() {
  const actionType = this.actionType;
  if (actionType.startsWith('user_')) return 'user_management';
  if (actionType.startsWith('listing_')) return 'listing_management';
  if (actionType.startsWith('promotion_')) return 'promotion_management';
  if (actionType.startsWith('report_')) return 'report_management';
  if (actionType.includes('login') || actionType.includes('security')) return 'security';
  return 'system';
});

// Instance methods for business logic
adminActivitySchema.methods.markAsReviewed = async function(reviewedBy) {
  this.securityFlags.requiresReview = false;
  this.auditMetadata.reviewedBy = reviewedBy;
  this.auditMetadata.reviewedAt = new Date();
  return this.save();
};

adminActivitySchema.methods.escalate = async function(escalatedBy, reason) {
  this.securityFlags.riskLevel = 'high';
  this.securityFlags.requiresReview = true;
  this.actionDetails.escalationReason = reason;
  this.auditMetadata.escalatedBy = escalatedBy;
  this.auditMetadata.escalatedAt = new Date();
  return this.save();
};

// Static methods for common queries
adminActivitySchema.statics.findByAdmin = function(adminId, limit = 50) {
  return this.find({ adminId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('adminId', 'name email role');
};

adminActivitySchema.statics.findByResource = function(resourceType, resourceId) {
  return this.find({
    'targetResource.resourceType': resourceType,
    'targetResource.resourceId': resourceId
  }).sort({ createdAt: -1 });
};

adminActivitySchema.statics.findSuspiciousActivity = function(timeframe = 24) {
  const since = new Date(Date.now() - timeframe * 60 * 60 * 1000);
  return this.find({
    createdAt: { $gte: since },
    $or: [
      { 'securityFlags.suspiciousActivity': true },
      { 'securityFlags.riskLevel': { $in: ['high', 'critical'] } },
      { 'result.status': 'failure' }
    ]
  }).sort({ createdAt: -1 });
};

adminActivitySchema.statics.getActivityStats = function(adminId, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return this.aggregate([
    { $match: { adminId: new mongoose.Types.ObjectId(adminId), createdAt: { $gte: since } } },
    {
      $group: {
        _id: '$actionType',
        count: { $sum: 1 },
        successCount: {
          $sum: { $cond: [{ $eq: ['$result.status', 'success'] }, 1, 0] }
        },
        failureCount: {
          $sum: { $cond: [{ $eq: ['$result.status', 'failure'] }, 1, 0] }
        }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Pre-save middleware for automatic risk assessment
adminActivitySchema.pre('save', function(next) {
  // Auto-assign risk levels based on action type
  const highRiskActions = [
    'user_deleted', 'user_role_changed', 'listing_deleted',
    'system_backup', 'bulk_operation', 'settings_updated'
  ];
  
  const mediumRiskActions = [
    'user_blocked', 'listing_rejected', 'promotion_deleted',
    'report_escalated'
  ];
  
  if (highRiskActions.includes(this.actionType)) {
    this.securityFlags.riskLevel = 'high';
    this.securityFlags.requiresReview = true;
  } else if (mediumRiskActions.includes(this.actionType)) {
    this.securityFlags.riskLevel = 'medium';
  }
  
  // Mark compliance-relevant actions
  const complianceActions = [
    'user_deleted', 'data_export', 'data_import',
    'user_permissions_modified', 'settings_updated'
  ];
  
  if (complianceActions.includes(this.actionType)) {
    this.securityFlags.complianceRelevant = true;
  }
  
  next();
});

// Post-save middleware for real-time monitoring
adminActivitySchema.post('save', function(doc) {
  // Trigger real-time alerts for high-risk activities
  if (doc.isHighRisk) {
    // Could integrate with monitoring systems here
    console.log(`HIGH RISK ACTIVITY: ${doc.actionType} by admin ${doc.adminId}`);
  }
  
  // Log compliance-relevant activities
  if (doc.securityFlags.complianceRelevant) {
    console.log(`COMPLIANCE LOG: ${doc.actionType} - ${doc.createdAt}`);
  }
});

const AdminActivity = mongoose.model('AdminActivity', adminActivitySchema);

export default AdminActivity;
