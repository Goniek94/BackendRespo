import mongoose from 'mongoose';

/**
 * Professional Promotion Model
 * Handles discount campaigns, promotional offers, and marketing incentives
 * Implements comprehensive validation and business logic
 * 
 * @author Senior Developer
 * @version 1.0.0
 */

const promotionSchema = new mongoose.Schema({
  // Basic promotion information
  title: {
    type: String,
    required: [true, 'Promotion title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters long'],
    maxlength: [100, 'Title cannot exceed 100 characters'],
    index: true
  },
  
  description: {
    type: String,
    required: [true, 'Promotion description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  // Promotion type and value configuration
  type: {
    type: String,
    enum: {
      values: ['percentage', 'fixed_amount', 'free_listing', 'featured_upgrade', 'bonus_credits'],
      message: 'Invalid promotion type: {VALUE}'
    },
    required: [true, 'Promotion type is required'],
    index: true
  },
  
  value: {
    type: Number,
    required: [true, 'Promotion value is required'],
    min: [0, 'Promotion value cannot be negative'],
    validate: {
      validator: function(value) {
        // Percentage discounts should not exceed 100%
        if (this.type === 'percentage' && value > 100) {
          return false;
        }
        // Fixed amounts should be reasonable
        if (this.type === 'fixed_amount' && value > 10000) {
          return false;
        }
        return true;
      },
      message: 'Invalid promotion value for the selected type'
    }
  },
  
  // Validity period
  validFrom: {
    type: Date,
    required: [true, 'Valid from date is required'],
    validate: {
      validator: function(date) {
        return date >= new Date();
      },
      message: 'Valid from date cannot be in the past'
    }
  },
  
  validTo: {
    type: Date,
    required: [true, 'Valid to date is required'],
    validate: {
      validator: function(date) {
        return date > this.validFrom;
      },
      message: 'Valid to date must be after valid from date'
    }
  },
  
  // Usage limitations
  usageLimit: {
    type: Number,
    default: null, // null means unlimited
    min: [1, 'Usage limit must be at least 1'],
    validate: {
      validator: function(value) {
        return value === null || value > 0;
      },
      message: 'Usage limit must be positive or null for unlimited'
    }
  },
  
  usedCount: {
    type: Number,
    default: 0,
    min: [0, 'Used count cannot be negative']
  },
  
  maxUsagePerUser: {
    type: Number,
    default: 1,
    min: [1, 'Max usage per user must be at least 1']
  },
  
  // Targeting configuration
  targetType: {
    type: String,
    enum: {
      values: ['all_users', 'specific_users', 'user_role', 'category', 'price_range', 'location'],
      message: 'Invalid target type: {VALUE}'
    },
    default: 'all_users',
    index: true
  },
  
  targetCriteria: {
    // Flexible object to store targeting criteria based on targetType
    userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    roles: [{ type: String, enum: ['user', 'premium', 'dealer'] }],
    categories: [String],
    minPrice: Number,
    maxPrice: Number,
    locations: [String],
    brands: [String]
  },
  
  // Business conditions
  conditions: {
    minOrderValue: {
      type: Number,
      default: 0,
      min: [0, 'Minimum order value cannot be negative']
    },
    
    applicableCategories: [{
      type: String,
      trim: true
    }],
    
    excludedCategories: [{
      type: String,
      trim: true
    }],
    
    newUsersOnly: {
      type: Boolean,
      default: false
    },
    
    requiresVerification: {
      type: Boolean,
      default: false
    }
  },
  
  // Status and management
  status: {
    type: String,
    enum: {
      values: ['draft', 'active', 'paused', 'expired', 'cancelled'],
      message: 'Invalid promotion status: {VALUE}'
    },
    default: 'draft',
    index: true
  },
  
  priority: {
    type: Number,
    default: 0,
    min: [0, 'Priority cannot be negative'],
    max: [100, 'Priority cannot exceed 100']
  },
  
  // Administrative fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required'],
    index: true
  },
  
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  approvedAt: {
    type: Date
  },
  
  // Analytics and tracking
  analytics: {
    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 }
  },
  
  // Metadata
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  internalNotes: {
    type: String,
    maxlength: [1000, 'Internal notes cannot exceed 1000 characters']
  }
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for optimal query performance
promotionSchema.index({ status: 1, validFrom: 1, validTo: 1 });
promotionSchema.index({ type: 1, status: 1 });
promotionSchema.index({ createdBy: 1, createdAt: -1 });
promotionSchema.index({ validFrom: 1, validTo: 1 });
promotionSchema.index({ 'targetCriteria.categories': 1 });

// Virtual fields
promotionSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.status === 'active' && 
         this.validFrom <= now && 
         this.validTo >= now &&
         (this.usageLimit === null || this.usedCount < this.usageLimit);
});

promotionSchema.virtual('remainingUses').get(function() {
  if (this.usageLimit === null) return null;
  return Math.max(0, this.usageLimit - this.usedCount);
});

promotionSchema.virtual('usagePercentage').get(function() {
  if (this.usageLimit === null) return 0;
  return Math.round((this.usedCount / this.usageLimit) * 100);
});

// Instance methods
promotionSchema.methods.canBeUsedBy = function(user, orderValue = 0) {
  // Check if promotion is active
  if (!this.isActive) return { canUse: false, reason: 'Promotion is not active' };
  
  // Check minimum order value
  if (orderValue < this.conditions.minOrderValue) {
    return { canUse: false, reason: 'Order value below minimum requirement' };
  }
  
  // Check user-specific conditions
  if (this.conditions.newUsersOnly && user.createdAt < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
    return { canUse: false, reason: 'Promotion is for new users only' };
  }
  
  // Check verification requirement
  if (this.conditions.requiresVerification && !user.isVerified) {
    return { canUse: false, reason: 'User verification required' };
  }
  
  return { canUse: true };
};

promotionSchema.methods.calculateDiscount = function(originalPrice) {
  switch (this.type) {
    case 'percentage':
      return Math.round(originalPrice * (this.value / 100));
    case 'fixed_amount':
      return Math.min(this.value, originalPrice);
    case 'free_listing':
      return originalPrice;
    default:
      return 0;
  }
};

promotionSchema.methods.incrementUsage = async function() {
  this.usedCount += 1;
  this.analytics.conversions += 1;
  return this.save();
};

// Static methods
promotionSchema.statics.findActivePromotions = function(targetType = null) {
  const query = {
    status: 'active',
    validFrom: { $lte: new Date() },
    validTo: { $gte: new Date() }
  };
  
  if (targetType) {
    query.targetType = targetType;
  }
  
  return this.find(query).sort({ priority: -1, createdAt: -1 });
};

promotionSchema.statics.findByCategory = function(category) {
  return this.find({
    status: 'active',
    validFrom: { $lte: new Date() },
    validTo: { $gte: new Date() },
    $or: [
      { targetType: 'all_users' },
      { 'targetCriteria.categories': category }
    ]
  }).sort({ priority: -1 });
};

// Pre-save middleware
promotionSchema.pre('save', function(next) {
  // Auto-expire promotions
  if (this.validTo < new Date() && this.status === 'active') {
    this.status = 'expired';
  }
  
  // Validate usage limit
  if (this.usageLimit && this.usedCount >= this.usageLimit && this.status === 'active') {
    this.status = 'expired';
  }
  
  next();
});

// Post-save middleware for analytics
promotionSchema.post('save', function(doc) {
  // Could trigger analytics updates or notifications here
  if (doc.status === 'active' && doc.isModified('status')) {
    // Log promotion activation
    console.log(`Promotion "${doc.title}" has been activated`);
  }
});

const Promotion = mongoose.model('Promotion', promotionSchema);

export default Promotion;
