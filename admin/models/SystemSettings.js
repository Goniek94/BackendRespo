import mongoose from 'mongoose';

/**
 * Professional System Settings Model
 * Centralized configuration management for the marketplace platform
 * Implements type-safe settings with validation and versioning
 * 
 * @author Senior Developer
 * @version 1.0.0
 */

const systemSettingsSchema = new mongoose.Schema({
  // Setting identification
  key: {
    type: String,
    required: [true, 'Setting key is required'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [2, 'Setting key must be at least 2 characters'],
    maxlength: [100, 'Setting key cannot exceed 100 characters'],
    match: [/^[a-z0-9_.-]+$/, 'Setting key can only contain lowercase letters, numbers, dots, hyphens and underscores'],
    index: true
  },
  
  // Human-readable setting information
  displayName: {
    type: String,
    required: [true, 'Display name is required'],
    trim: true,
    maxlength: [200, 'Display name cannot exceed 200 characters']
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  // Setting categorization
  category: {
    type: String,
    enum: {
      values: [
        'general', 'security', 'payment', 'notification', 'moderation',
        'listing', 'user', 'email', 'sms', 'analytics', 'maintenance',
        'api', 'upload', 'search', 'promotion', 'reporting'
      ],
      message: 'Invalid setting category: {VALUE}'
    },
    required: [true, 'Setting category is required'],
    index: true
  },
  
  // Value type and constraints
  valueType: {
    type: String,
    enum: {
      values: ['string', 'number', 'boolean', 'array', 'object', 'email', 'url', 'json'],
      message: 'Invalid value type: {VALUE}'
    },
    required: [true, 'Value type is required'],
    index: true
  },
  
  // Current setting value
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Setting value is required'],
    validate: {
      validator: function(value) {
        return this.validateValue(value);
      },
      message: 'Invalid value for the specified type'
    }
  },
  
  // Default value for reset functionality
  defaultValue: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Default value is required']
  },
  
  // Value constraints and validation
  constraints: {
    // For string values
    minLength: {
      type: Number,
      min: [0, 'Minimum length cannot be negative']
    },
    maxLength: {
      type: Number,
      min: [1, 'Maximum length must be at least 1']
    },
    pattern: {
      type: String // Regex pattern for string validation
    },
    
    // For number values
    minValue: Number,
    maxValue: Number,
    step: Number, // For decimal precision
    
    // For array values
    minItems: {
      type: Number,
      min: [0, 'Minimum items cannot be negative']
    },
    maxItems: {
      type: Number,
      min: [1, 'Maximum items must be at least 1']
    },
    allowedValues: [mongoose.Schema.Types.Mixed], // Enum-like constraints
    
    // For object values
    requiredFields: [String],
    allowedFields: [String]
  },
  
  // Setting behavior configuration
  behavior: {
    // Can this setting be modified at runtime?
    isReadonly: {
      type: Boolean,
      default: false
    },
    
    // Does changing this setting require system restart?
    requiresRestart: {
      type: Boolean,
      default: false
    },
    
    // Is this setting sensitive (should be encrypted/masked)?
    isSensitive: {
      type: Boolean,
      default: false
    },
    
    // Should this setting be cached for performance?
    cacheable: {
      type: Boolean,
      default: true
    },
    
    // Cache TTL in seconds
    cacheTTL: {
      type: Number,
      default: 300, // 5 minutes
      min: [1, 'Cache TTL must be at least 1 second']
    },
    
    // Should changes to this setting be logged?
    auditChanges: {
      type: Boolean,
      default: true
    }
  },
  
  // Access control
  permissions: {
    // Who can view this setting?
    viewRoles: [{
      type: String,
      enum: ['admin', 'moderator', 'support'],
      default: ['admin']
    }],
    
    // Who can modify this setting?
    editRoles: [{
      type: String,
      enum: ['admin', 'moderator'],
      default: ['admin']
    }],
    
    // Specific users who can access (overrides roles)
    allowedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  
  // Change tracking
  changeHistory: [{
    previousValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [500, 'Change reason cannot exceed 500 characters']
    },
    ipAddress: String,
    userAgent: String
  }],
  
  // Validation and dependencies
  validation: {
    // Custom validation function name
    customValidator: String,
    
    // Settings that this setting depends on
    dependencies: [{
      settingKey: String,
      condition: String, // 'equals', 'not_equals', 'greater_than', etc.
      value: mongoose.Schema.Types.Mixed
    }],
    
    // Settings that depend on this setting
    dependents: [String]
  },
  
  // UI configuration for admin panel
  ui: {
    // Input type for admin interface
    inputType: {
      type: String,
      enum: [
        'text', 'textarea', 'number', 'checkbox', 'select', 
        'multiselect', 'radio', 'color', 'date', 'time',
        'file', 'json_editor', 'code_editor'
      ],
      default: 'text'
    },
    
    // Options for select/radio inputs
    options: [{
      label: String,
      value: mongoose.Schema.Types.Mixed
    }],
    
    // Placeholder text
    placeholder: String,
    
    // Help text for users
    helpText: String,
    
    // Display order in admin panel
    sortOrder: {
      type: Number,
      default: 0
    },
    
    // Should this setting be visible in admin panel?
    visible: {
      type: Boolean,
      default: true
    },
    
    // Icon for the setting
    icon: String
  },
  
  // Environment-specific overrides
  environmentOverrides: {
    development: mongoose.Schema.Types.Mixed,
    staging: mongoose.Schema.Types.Mixed,
    production: mongoose.Schema.Types.Mixed
  },
  
  // Metadata
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // Administrative fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required']
  },
  
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
  
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      // Mask sensitive values in JSON output
      if (doc.behavior.isSensitive && ret.value) {
        ret.value = '***MASKED***';
      }
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes for optimal performance
systemSettingsSchema.index({ key: 1 }, { unique: true });
systemSettingsSchema.index({ category: 1, 'ui.sortOrder': 1 });
systemSettingsSchema.index({ 'behavior.cacheable': 1 });
systemSettingsSchema.index({ 'permissions.viewRoles': 1 });
systemSettingsSchema.index({ tags: 1 });

// Virtual fields
systemSettingsSchema.virtual('effectiveValue').get(function() {
  const env = process.env.NODE_ENV || 'development';
  return this.environmentOverrides[env] !== undefined 
    ? this.environmentOverrides[env] 
    : this.value;
});

systemSettingsSchema.virtual('hasChanged').get(function() {
  return this.changeHistory && this.changeHistory.length > 0;
});

systemSettingsSchema.virtual('lastChanged').get(function() {
  if (!this.changeHistory || this.changeHistory.length === 0) return null;
  return this.changeHistory[this.changeHistory.length - 1].changedAt;
});

// Instance methods
systemSettingsSchema.methods.validateValue = function(value) {
  const { valueType, constraints } = this;
  
  // Type validation
  switch (valueType) {
    case 'string':
      if (typeof value !== 'string') return false;
      if (constraints.minLength && value.length < constraints.minLength) return false;
      if (constraints.maxLength && value.length > constraints.maxLength) return false;
      if (constraints.pattern && !new RegExp(constraints.pattern).test(value)) return false;
      break;
      
    case 'number':
      if (typeof value !== 'number' || isNaN(value)) return false;
      if (constraints.minValue !== undefined && value < constraints.minValue) return false;
      if (constraints.maxValue !== undefined && value > constraints.maxValue) return false;
      break;
      
    case 'boolean':
      if (typeof value !== 'boolean') return false;
      break;
      
    case 'array':
      if (!Array.isArray(value)) return false;
      if (constraints.minItems && value.length < constraints.minItems) return false;
      if (constraints.maxItems && value.length > constraints.maxItems) return false;
      if (constraints.allowedValues && !value.every(v => constraints.allowedValues.includes(v))) return false;
      break;
      
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (typeof value !== 'string' || !emailRegex.test(value)) return false;
      break;
      
    case 'url':
      try {
        new URL(value);
      } catch {
        return false;
      }
      break;
      
    case 'json':
      if (typeof value === 'string') {
        try {
          JSON.parse(value);
        } catch {
          return false;
        }
      }
      break;
  }
  
  return true;
};

systemSettingsSchema.methods.updateValue = async function(newValue, changedBy, reason, requestContext = {}) {
  // Validate new value
  if (!this.validateValue(newValue)) {
    throw new Error('Invalid value for setting type and constraints');
  }
  
  // Check if setting is readonly
  if (this.behavior.isReadonly) {
    throw new Error('Cannot modify readonly setting');
  }
  
  // Store change history
  const changeRecord = {
    previousValue: this.value,
    newValue: newValue,
    changedBy: changedBy,
    changedAt: new Date(),
    reason: reason,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent
  };
  
  this.changeHistory.push(changeRecord);
  this.value = newValue;
  this.lastModifiedBy = changedBy;
  
  return this.save();
};

const SystemSettings = mongoose.model('SystemSettings', systemSettingsSchema);

export default SystemSettings;
