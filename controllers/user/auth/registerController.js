import { validationResult } from "express-validator";
import User from "../../../models/user/user.js";
import logger from "../../../utils/logger.js";
import {
  generateEmailVerificationToken,
  generateSecureCode,
} from "../../../utils/securityTokens.js";
import { verifyBothTokens } from "../../../utils/verification/tokenGenerator.js";
import { cleanupVerificationCodes } from "../../../routes/user/verification/preRegistrationVerification.js";

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
  console.log("\n🟣 ==========================================");
  console.log("🟣 [BACKEND] /register - START");
  console.log("🟣 ==========================================");

  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("❌ Błędy walidacji:", errors.array());
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
      emailVerificationToken,
      phoneVerificationToken,
    } = req.body;

    console.log("📦 Otrzymane dane rejestracyjne:");
    console.log("   Imię:", name);
    console.log("   Nazwisko:", lastName);
    console.log("   Email:", email);
    console.log("   Telefon:", phone);
    console.log("   Data urodzenia:", dob);
    console.log("   Regulamin zaakceptowany:", termsAccepted);
    console.log(
      "   Email Verification Token:",
      emailVerificationToken ? "✅ Present" : "❌ Missing"
    );
    console.log(
      "   Phone Verification Token:",
      phoneVerificationToken ? "✅ Present" : "❌ Missing"
    );

    // Validate terms acceptance
    if (!termsAccepted) {
      console.log("❌ Regulamin nie zaakceptowany");
      return res.status(400).json({
        success: false,
        message: "Musisz zaakceptować regulamin, aby się zarejestrować",
      });
    }

    // NEW: Verify JWT tokens from pre-registration verification
    if (emailVerificationToken && phoneVerificationToken) {
      console.log("🔐 Weryfikuję tokeny JWT z pre-registration...");

      // Format phone for verification
      let formattedPhoneForVerification = phone;
      if (phone.startsWith("48") && !phone.startsWith("+48")) {
        formattedPhoneForVerification = "+" + phone;
      } else if (phone.match(/^[0-9]{9}$/)) {
        formattedPhoneForVerification = "+48" + phone;
      } else if (!phone.startsWith("+")) {
        formattedPhoneForVerification = "+48" + phone.replace(/^0+/, "");
      }

      const tokensValid = verifyBothTokens(
        emailVerificationToken,
        phoneVerificationToken,
        email,
        formattedPhoneForVerification
      );

      if (!tokensValid) {
        console.log("❌ Tokeny JWT są nieprawidłowe lub wygasłe");
        return res.status(400).json({
          success: false,
          message:
            "Tokeny weryfikacyjne są nieprawidłowe lub wygasłe. Zweryfikuj email i telefon ponownie.",
        });
      }

      console.log("✅ Tokeny JWT zweryfikowane pomyślnie!");
      console.log("✅ Email i telefon zostały zweryfikowane PRZED rejestracją");
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
    console.log("🔍 Sprawdzam czy użytkownik już istnieje...");
    console.log("   Szukam email:", email.toLowerCase().trim());
    console.log("   Szukam telefon:", formattedPhone);

    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase().trim() },
        { phoneNumber: formattedPhone },
      ],
    });

    if (existingUser) {
      const duplicateField =
        existingUser.email === email.toLowerCase().trim() ? "email" : "phone";
      console.log("❌ Użytkownik już istnieje! Duplikat:", duplicateField);

      logger.warn("Registration attempt with existing credentials", {
        email: email.toLowerCase().trim(),
        phone: formattedPhone,
        existingField: duplicateField,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });

      return res.status(400).json({
        success: false,
        message:
          duplicateField === "email"
            ? "Użytkownik z tym adresem email już istnieje"
            : "Użytkownik z tym numerem telefonu już istnieje",
      });
    }
    console.log("✅ Email i telefon są wolne");

    // Generate secure verification codes using cryptographic functions
    console.log("🔐 Generuję bezpieczne kody weryfikacyjne...");
    const emailVerificationCode = generateSecureCode(6); // 6-digit code for email
    const smsVerificationCode = generateSecureCode(6); // 6-digit code for SMS
    console.log("✅ Kod email:", emailVerificationCode);
    console.log("✅ Kod SMS:", smsVerificationCode);

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

      // Email verification code (15 minutes validity)
      emailVerificationCode: emailVerificationCode,
      emailVerificationCodeExpires: new Date(Date.now() + 15 * 60 * 1000),

      // SMS verification code (15 minutes validity)
      smsVerificationCode: smsVerificationCode,
      smsVerificationCodeExpires: new Date(Date.now() + 15 * 60 * 1000),

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

    console.log("💾 Zapisuję użytkownika w bazie danych...");
    await newUser.save();
    console.log("✅ Użytkownik zapisany! ID:", newUser._id);

    // NEW: Clean up verification codes after successful registration
    if (emailVerificationToken && phoneVerificationToken) {
      console.log("🧹 Czyszczę kody weryfikacyjne z pre-registration...");
      await cleanupVerificationCodes(newUser.email, newUser.phoneNumber);
    }

    // Send email verification code
    console.log("📤 Wysyłam kod weryfikacyjny na email...");
    try {
      const { sendRegistrationVerificationCode } = await import(
        "../../../services/emailService.js"
      );

      const emailSent = await sendRegistrationVerificationCode(
        newUser.email,
        emailVerificationCode,
        newUser.name
      );

      if (emailSent) {
        console.log("✅ Email z kodem wysłany pomyślnie!");
        logger.info("Email verification code sent successfully", {
          userId: newUser._id,
          email: newUser.email,
          codeLength: emailVerificationCode.length,
        });
      } else {
        console.log("❌ Nie udało się wysłać emaila");
        logger.error("Failed to send email verification code", {
          userId: newUser._id,
          email: newUser.email,
        });
      }
    } catch (emailError) {
      console.error("❌ Błąd wysyłania emaila:", emailError);
      logger.error("Error sending email verification code", {
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

    console.log("✅ Zwracam odpowiedź do frontendu");
    console.log("🟣 ==========================================");
    console.log("🟣 [BACKEND] /register - SUCCESS");
    console.log("🟣 ==========================================\n");

    res.status(201).json({
      success: true,
      message:
        "Rejestracja rozpoczęta pomyślnie! Sprawdź swój email, aby otrzymać kod weryfikacyjny.",
      user: userData,
      nextStep: "email_verification",
      verificationInfo: {
        emailSent: true,
        emailAddress: newUser.email,
        codeExpires: newUser.emailVerificationCodeExpires,
      },
      // Include code in development for testing
      ...(process.env.NODE_ENV !== "production" && {
        devCode: emailVerificationCode,
      }),
    });
  } catch (error) {
    console.error("❌ ==========================================");
    console.error("❌ [BACKEND] /register - ERROR");
    console.error("❌ ==========================================");
    console.error("❌ Registration error:", error);
    console.error("❌ Message:", error.message);
    console.error("❌ Stack:", error.stack);

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
