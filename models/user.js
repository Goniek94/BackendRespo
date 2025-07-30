import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function(v) {
        return /^\+[1-9]\d{1,14}$/.test(v); // Poprawiony format E.164
      },
      message: props => `${props.value} nie jest prawidłowym numerem telefonu!`
    }
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  dob: {
    type: Date,
    required: true,
    validate: {
      validator: function(date) {
        const today = new Date();
        let age = today.getFullYear() - date.getFullYear();
        const monthDiff = today.getMonth() - date.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
          age--;
        }
        return age >= 16;
      },
      message: 'Musisz mieć co najmniej 16 lat'
    }
  },
  registrationType: {
    type: String,
    enum: ['standard', 'google', 'facebook'],
    default: 'standard'
  },
  street: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  postalCode: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    default: 'pl'
  },
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin'],
    default: 'user'
  },
  is2FAEnabled: {
    type: Boolean,
    default: false
  },
  twoFACode: {
    type: String
  },
  twoFACodeExpires: {
    type: Date
  },
  
  // Email verification fields
  emailVerificationCode: {
    type: String
  },
  emailVerificationCodeExpires: {
    type: Date
  },
  
  // SMS verification fields
  smsVerificationCode: {
    type: String
  },
  smsVerificationCodeExpires: {
    type: Date
  },
  
  // Terms acceptance
  termsAccepted: {
    type: Boolean,
    default: false
  },
  termsAcceptedAt: {
    type: Date
  },
  
  // Registration completion tracking
  registrationStep: {
    type: String,
    enum: ['basic_info', 'email_verification', 'sms_verification', 'completed'],
    default: 'basic_info'
  },
  
  isVerified: {
    type: Boolean,
    default: false
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'banned'],
    default: 'active'
  },
  suspendedUntil: {
    type: Date
  },
  suspendedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  suspensionReason: {
    type: String
  },
  bannedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  banReason: {
    type: String
  },
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ad'
  }],

  // User notification preferences
  notificationPreferences: {
    email: { type: Boolean, default: true }, // Email notifications
    sms: { type: Boolean, default: false },  // SMS notifications
    push: { type: Boolean, default: false }  // Push notifications
  },

  // User privacy settings
  privacySettings: {
    showEmail: { type: Boolean, default: false },
    showPhone: { type: Boolean, default: false },
    showProfile: { type: Boolean, default: true }
  },

  // User security settings
  securitySettings: {
    twoFactorAuth: { type: Boolean, default: false },
    loginAlerts: { type: Boolean, default: true }
  },
  
  // Bonusy użytkownika / User bonuses
  bonuses: [{
    type: {
      type: String,
      enum: ['discount', 'free_listing', 'featured_listing', 'premium_account', 'other'],
      required: true
    },
    value: {
      type: Number,
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    isUsed: {
      type: Boolean,
      default: false
    },
    expiresAt: {
      type: Date
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);
