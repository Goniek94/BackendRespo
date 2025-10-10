import { validationResult } from "express-validator";
import User from "../../../models/user/user.js";
import logger from "../../../utils/logger.js";
import {
  generateEmailVerificationToken,
  generateSecureCode,
} from "../../../utils/securityTokens.js";

/**
 * Register new user with advanced verification
 * Features:
 * - Multi-step registration process
 * - Real-time email/phone validation
 * - SMS and Email verification codes
 * - Age validation (minimum 16 years)
 * - Phone number formatting (+48 prefix)
 * - Terms acceptance tracking
 */
export const registerUser = async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn("Registration validation failed", {
        errors: errors.array(),
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });

      return res.status(400).json({
        success: false,
        message: "Błędy walidacji",
        errors: errors.array(),
      });
    }

    const {
      name,
      lastName,
      email,
      password,
      phone,
      dob,
      termsAccepted,
      emailVerified,
      phoneVerified,
    } = req.body;

    // Validate terms acceptance
    if (!termsAccepted) {
      return res.status(400).json({
        success: false,
        message: "Musisz zaakceptować regulamin, aby się zarejestrować",
      });
    }

    // Format phone number to ensure +48 prefix for Polish numbers
    let formattedPhone = phone;
    if (phone.startsWith("48") && !phone.startsWith("+48")) {
      formattedPhone = "+" + phone;
    } else if (phone.match(/^[0-9]{9}$/)) {
      // If it's 9 digits, assume it's Polish number without prefix
      formattedPhone = "+48" + phone;
    } else if (!phone.startsWith("+")) {
      formattedPhone = "+48" + phone.replace(/^0+/, ""); // Remove leading zeros
    }

    // Validate age (minimum 16 years)
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    if (age < 16) {
      return res.status(400).json({
        success: false,
        message: "Musisz mieć co najmniej 16 lat, aby się zarejestrować",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase().trim() },
        { phoneNumber: formattedPhone },
      ],
    });

    if (existingUser) {
      logger.warn("Registration attempt with existing credentials", {
        email: email.toLowerCase().trim(),
        phone: formattedPhone,
        existingField:
          existingUser.email === email.toLowerCase().trim() ? "email" : "phone",
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });

      return res.status(400).json({
        success: false,
        message:
          existingUser.email === email.toLowerCase().trim()
            ? "Użytkownik z tym adresem email już istnieje"
            : "Użytkownik z tym numerem telefonu już istnieje",
      });
    }

    // Generate secure verification tokens using cryptographic functions
    const emailVerificationToken = generateEmailVerificationToken();
    const smsVerificationCode = generateSecureCode(6);

    // Create new user with email verification required
    // Password will be automatically hashed by User model middleware
    const newUser = new User({
      name: name.trim(),
      lastName: lastName?.trim(),
      email: email.toLowerCase().trim(),
      password: password, // Raw password - will be hashed by model middleware
      phoneNumber: formattedPhone,
      dob: new Date(dob),
      termsAccepted: true,
      termsAcceptedAt: new Date(),
      registrationStep: "email_verification",

      // Email verification token (24 hours validity)
      emailVerificationToken: emailVerificationToken,
      emailVerificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),

      // SMS verification code (10 minutes validity)
      smsVerificationCode: smsVerificationCode,
      smsVerificationCodeExpires: new Date(Date.now() + 10 * 60 * 1000),

      // Verification status - both email and phone require verification
      isEmailVerified: false,
      emailVerified: false,
      isPhoneVerified: false,
      phoneVerified: false,
      isVerified: false,

      role: "user",
      status: "active",
      createdAt: new Date(),
      lastActivity: new Date(),
      lastIP: req.ip,
      failedLoginAttempts: 0,
      accountLocked: false,
    });

    await newUser.save();

    // Send email verification link
    try {
      const { sendVerificationLinkEmail } = await import(
        "../../../config/nodemailer.js"
      );
      const verificationLink = `${
        process.env.FRONTEND_URL || "http://localhost:3001"
      }/verify-email?token=${emailVerificationToken}&email=${encodeURIComponent(
        email
      )}`;

      const emailSent = await sendVerificationLinkEmail(
        newUser.email,
        verificationLink,
        newUser.name
      );

      if (emailSent) {
        logger.info("Email verification link sent successfully", {
          userId: newUser._id,
          email: newUser.email,
          tokenLength: emailVerificationToken.length,
        });
      } else {
        logger.error("Failed to send email verification link", {
          userId: newUser._id,
          email: newUser.email,
        });
      }
    } catch (emailError) {
      logger.error("Error sending email verification link", {
        userId: newUser._id,
        email: newUser.email,
        error: emailError.message,
        stack: emailError.stack,
      });
    }

    // Return user data (without sensitive information)
    const userData = {
      id: newUser._id,
      name: newUser.name,
      lastName: newUser.lastName,
      email: newUser.email,
      phoneNumber: newUser.phoneNumber,
      registrationStep: newUser.registrationStep,
      isEmailVerified: newUser.isEmailVerified,
      isPhoneVerified: newUser.isPhoneVerified,
      isVerified: newUser.isVerified,
      role: newUser.role,
      createdAt: newUser.createdAt,
    };

    logger.info("Advanced user registration initiated", {
      userId: newUser._id,
      email: newUser.email,
      phone: newUser.phoneNumber,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.status(201).json({
      success: true,
      message:
        "Rejestracja rozpoczęta pomyślnie! Sprawdź swój email, aby otrzymać link weryfikacyjny.",
      user: userData,
      nextStep: "email_verification",
      verificationInfo: {
        emailSent: true,
        emailAddress: newUser.email,
        tokenExpires: newUser.emailVerificationTokenExpires,
      },
    });
  } catch (error) {
    logger.error("Registration error", {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.status(500).json({
      success: false,
      message: "Błąd serwera podczas rejestracji",
    });
  }
};
