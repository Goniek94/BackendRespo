import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: (props) => `${props.value} is not a valid email!`,
      },
    },
    isEmailVerified: {
      type: Boolean,
      default: false, // Domyślnie email nie jest zweryfikowany
    },
    // Dodane pole dla kompatybilności z frontendem
    emailVerified: {
      type: Boolean,
      default: false, // Domyślnie email nie jest zweryfikowany
    },
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: function (v) {
          return /^\+[1-9]\d{1,14}$/.test(v); // Poprawiony format E.164
        },
        message: (props) =>
          `${props.value} nie jest prawidłowym numerem telefonu!`,
      },
    },
    isPhoneVerified: {
      type: Boolean,
      default: false, // SECURITY FIX: Phone must be verified, not default true
    },
    // Dodane pole dla kompatybilności z frontendem
    phoneVerified: {
      type: Boolean,
      default: false, // SECURITY FIX: Phone must be verified, not default true
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    dob: {
      type: Date,
      required: true,
      validate: {
        validator: function (date) {
          const today = new Date();
          let age = today.getFullYear() - date.getFullYear();
          const monthDiff = today.getMonth() - date.getMonth();
          if (
            monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < date.getDate())
          ) {
            age--;
          }
          return age >= 16;
        },
        message: "Musisz mieć co najmniej 16 lat",
      },
    },
    registrationType: {
      type: String,
      enum: ["standard", "google", "facebook"],
      default: "standard",
    },
    street: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    postalCode: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      default: "pl",
    },
    role: {
      type: String,
      enum: ["user", "moderator", "admin"],
      default: "user",
    },
    is2FAEnabled: {
      type: Boolean,
      default: false,
    },
    twoFACode: {
      type: String,
    },
    twoFACodeExpires: {
      type: Date,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },

    // Email verification fields
    emailVerificationCode: {
      type: String,
    },
    emailVerificationCodeExpires: {
      type: Date,
    },
    emailVerificationToken: {
      type: String,
    },
    emailVerificationTokenExpires: {
      type: Date,
    },
    pendingEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },

    // SMS verification fields
    smsVerificationCode: {
      type: String,
    },
    smsVerificationCodeExpires: {
      type: Date,
    },
    pendingPhone: {
      type: String,
    },

    // Password reset fields
    passwordResetToken: {
      type: String,
    },
    passwordResetTokenExpires: {
      type: Date,
    },

    // Account security fields
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    accountLocked: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
    },
    lastActivity: {
      type: Date,
    },
    lastIP: {
      type: String,
    },

    // User agreements and consents
    termsAccepted: {
      type: Boolean,
      required: true,
      default: false,
    },
    termsAcceptedAt: {
      type: Date,
    },
    dataProcessingAccepted: {
      type: Boolean,
      required: true,
      default: false,
    },
    dataProcessingAcceptedAt: {
      type: Date,
    },
    marketingAccepted: {
      type: Boolean,
      default: false,
    },
    marketingAcceptedAt: {
      type: Date,
    },

    // Multi-step registration tracking
    registrationStep: {
      type: String,
      enum: ["email_verification", "sms_verification", "completed"],
      default: "email_verification",
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["active", "suspended", "banned", "blocked", "deleted", "pending"],
      default: "active",
    },
    suspendedUntil: {
      type: Date,
    },
    suspendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    suspensionReason: {
      type: String,
    },
    // Structured suspension data (for detailed info)
    suspension: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    suspensionEndDate: {
      type: Date,
    },
    suspensionInfo: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    bannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    bannedAt: {
      type: Date,
    },
    banReason: {
      type: String,
    },
    // Structured ban data (for detailed info)
    ban: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    banInfo: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    // Blocking fields
    blockedAt: {
      type: Date,
    },
    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    blockReason: {
      type: String,
    },
    blockUntil: {
      type: Date,
    },
    statusReason: {
      type: String,
    },
    // Deletion fields
    deletedAt: {
      type: Date,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    deletionReason: {
      type: String,
    },
    // Structured deletion data (for detailed info)
    deletion: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    deletionInfo: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Ad",
      },
    ],

    // User notification preferences
    notificationPreferences: {
      email: { type: Boolean, default: true }, // Email notifications
      sms: { type: Boolean, default: false }, // SMS notifications
      push: { type: Boolean, default: false }, // Push notifications
    },

    // User privacy settings
    privacySettings: {
      showEmail: { type: Boolean, default: false },
      showPhone: { type: Boolean, default: false },
      showProfile: { type: Boolean, default: true },
    },

    // User security settings
    securitySettings: {
      twoFactorAuth: { type: Boolean, default: false },
      loginAlerts: { type: Boolean, default: true },
    },

    // Bonusy użytkownika / User bonuses
    bonuses: [
      {
        type: {
          type: String,
          enum: [
            "discount",
            "free_listing",
            "featured_listing",
            "premium_account",
            "other",
          ],
          required: true,
        },
        value: {
          type: Number,
          required: true,
        },
        description: {
          type: String,
          default: "",
        },
        isUsed: {
          type: Boolean,
          default: false,
        },
        expiresAt: {
          type: Date,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Use existing model if already compiled, otherwise compile it
// This prevents OverwriteModelError when module is imported multiple times
export default mongoose.models.User || mongoose.model("User", userSchema);
