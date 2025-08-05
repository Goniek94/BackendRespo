import mongoose from 'mongoose';

/**
 * Report Model Schema
 * Model for user reports and admin moderation
 */

const reportSchema = new mongoose.Schema({
  // Reporter information
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Reported item details
  reportedItem: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  
  reportType: {
    type: String,
    enum: ['user', 'ad', 'comment', 'message'],
    required: true,
    index: true
  },
  
  // Report details
  reason: {
    type: String,
    enum: [
      'spam',
      'inappropriate_content',
      'harassment',
      'fake_listing',
      'scam',
      'copyright_violation',
      'violence',
      'hate_speech',
      'other'
    ],
    required: true,
    index: true
  },
  
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  
  // Status and processing
  status: {
    type: String,
    enum: ['pending', 'investigating', 'resolved', 'rejected'],
    default: 'pending',
    index: true
  },
  
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  
  // Admin handling
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  resolvedAt: {
    type: Date,
    index: true
  },
  
  adminNote: {
    type: String,
    maxlength: 1000
  },
  
  actionTaken: {
    type: String,
    enum: [
      'none',
      'warning',
      'content_removed',
      'account_suspended',
      'account_banned',
      'other'
    ],
    default: 'none'
  },
  
  // Evidence and attachments
  evidence: [{
    type: {
      type: String,
      enum: ['screenshot', 'url', 'text', 'other']
    },
    content: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Metadata
  metadata: {
    userAgent: String,
    ipAddress: String,
    reportedAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  }
}, {
  timestamps: true,
  collection: 'reports'
});

// Indexes for performance
reportSchema.index({ reporter: 1, reportType: 1 });
reportSchema.index({ status: 1, priority: 1 });
reportSchema.index({ assignedTo: 1, status: 1 });
reportSchema.index({ createdAt: -1 });
reportSchema.index({ 'metadata.reportedAt': -1 });

// Virtual for report age
reportSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual for resolution time
reportSchema.virtual('resolutionTimeInHours').get(function() {
  if (!this.resolvedAt) return null;
  return Math.floor((this.resolvedAt - this.createdAt) / (1000 * 60 * 60));
});

// Static methods
reportSchema.statics.getReportStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const totalReports = await this.countDocuments();
  const pendingReports = await this.countDocuments({ status: 'pending' });
  const resolvedReports = await this.countDocuments({ status: 'resolved' });
  
  return {
    total: totalReports,
    pending: pendingReports,
    resolved: resolvedReports,
    byStatus: stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {})
  };
};

reportSchema.statics.getReportsByType = async function() {
  return await this.aggregate([
    {
      $group: {
        _id: '$reportType',
        count: { $sum: 1 }
      }
    }
  ]);
};

reportSchema.statics.getReportsByReason = async function() {
  return await this.aggregate([
    {
      $group: {
        _id: '$reason',
        count: { $sum: 1 }
      }
    }
  ]);
};

// Instance methods
reportSchema.methods.assign = async function(adminId) {
  this.assignedTo = adminId;
  this.status = 'investigating';
  return await this.save();
};

reportSchema.methods.resolve = async function(adminId, action = 'none', note = '') {
  this.status = 'resolved';
  this.resolvedBy = adminId;
  this.resolvedAt = new Date();
  this.actionTaken = action;
  this.adminNote = note;
  return await this.save();
};

reportSchema.methods.reject = async function(adminId, note = '') {
  this.status = 'rejected';
  this.resolvedBy = adminId;
  this.resolvedAt = new Date();
  this.adminNote = note;
  return await this.save();
};

// Pre-save middleware
reportSchema.pre('save', function(next) {
  // Auto-assign priority based on reason
  if (this.isNew) {
    const urgentReasons = ['violence', 'hate_speech', 'harassment'];
    const highReasons = ['scam', 'fake_listing'];
    
    if (urgentReasons.includes(this.reason)) {
      this.priority = 'urgent';
    } else if (highReasons.includes(this.reason)) {
      this.priority = 'high';
    }
  }
  
  next();
});

// Post-save middleware for notifications
reportSchema.post('save', async function(doc) {
  // Here you could add logic to notify admins of new reports
  // or notify users when their reports are resolved
});

const Report = mongoose.model('Report', reportSchema);

export default Report;
