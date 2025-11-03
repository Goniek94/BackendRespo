/**
 * Verification Code Model
 * Stores temporary verification codes for email and phone verification
 * BEFORE user registration (pre-registration verification)
 *
 * Features:
 * - Auto-expire with MongoDB TTL index (10 minutes)
 * - Bcrypt hashed codes for security
 * - JWT tokens after successful verification
 * - Unique constraint per identifier+type
 */

import mongoose from "mongoose";

const verificationCodeSchema = new mongoose.Schema(
  {
    // Email or phone number
    identifier: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
      trim: true,
    },

    // Hashed verification code (bcrypt)
    code: {
      type: String,
      required: true,
    },

    // Type of verification (email or phone)
    type: {
      type: String,
      enum: ["email", "phone"],
      required: true,
    },

    // JWT token issued after successful verification
    // This token is sent to frontend and later used in /register endpoint
    verificationToken: {
      type: String,
      default: null,
    },

    // Verification status
    verified: {
      type: Boolean,
      default: false,
    },

    // Number of verification attempts (rate limiting)
    attempts: {
      type: Number,
      default: 0,
    },

    // Expiration date (TTL index)
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // MongoDB TTL index - auto-delete expired documents
    },

    // Creation timestamp
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index - only one active code per identifier+type
verificationCodeSchema.index({ identifier: 1, type: 1 }, { unique: true });

// Index for faster queries on verified codes
verificationCodeSchema.index({ verified: 1, expiresAt: 1 });

const VerificationCode = mongoose.model(
  "VerificationCode",
  verificationCodeSchema
);

export default VerificationCode;
