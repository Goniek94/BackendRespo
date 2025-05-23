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
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ad'
  }],
  
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