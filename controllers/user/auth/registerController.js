import { validationResult } from "express-validator";
import User from "../../../models/user/user.js";
import logger from "../../../utils/logger.js";
import {
  generateEmailVerificationToken,
  generateSecureCode,
} from "../../../utils/securityTokens.js";
import { verifyBothTokens } from "../../../utils/verification/tokenGenerator.js";
import { cleanupVerificationCodes } from "../../../routes/user/verification/preRegistrationVerification.js";
import {
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
} from "../../../middleware/auth.js";

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
  console.log("🟣 [STEP 4 - FINALIZE] /register - START");
  console.log("🟣 ==========================================");

  // DEBUG: Pokaż wszystkie dane z body
  console.log("📦 req.body (wszystkie pola):", {
    name: req.body.name,
    lastName: req.body.lastName,
    email: req.body.email,
    confirmEmail: req.body.confirmEmail,
    phone: req.body.phone,
    dob: req.body.dob,
    termsAccepted: req.body.termsAccepted,
    emailVerificationToken: req.body.emailVerificationToken
      ? `✅ Present (${req.body.emailVerificationToken.length} chars)`
      : "❌ Missing",
    phoneVerificationToken: req.body.phoneVerificationToken
      ? `✅ Present (${req.body.phoneVerificationToken.length} chars)`
      : "❌ Missing",
  });

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
      emailVerificationToken ? "✅ Present" : "❌ Missing",
    );
    console.log(
      "   Phone Verification Token:",
      phoneVerificationToken ? "✅ Present" : "❌ Missing",
    );

    // STEP 4: Validate required fields
    if (!emailVerificationToken || !phoneVerificationToken) {
      console.log("❌ Brak tokenów weryfikacyjnych");
      return res.status(400).json({
        success: false,
        message:
          "Musisz zweryfikować email i telefon przed rejestracją (Krok 2 i 3)",
        code: "MISSING_VERIFICATION_TOKENS",
      });
    }

    // Validate terms acceptance
    if (!termsAccepted) {
      console.log("❌ Regulamin nie zaakceptowany");
      return res.status(400).json({
        success: false,
        message: "Musisz zaakceptować regulamin, aby się zarejestrować",
        code: "TERMS_NOT_ACCEPTED",
      });
    }

    // STEP 4: Verify JWT tokens from pre-registration verification (Step 2 & 3)
    console.log("🔐 Weryfikuję tokeny JWT z Kroku 2 i 3...");

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
      formattedPhoneForVerification,
    );

    if (!tokensValid) {
      console.log("❌ Tokeny JWT są nieprawidłowe lub wygasłe");
      return res.status(400).json({
        success: false,
        message:
          "Tokeny weryfikacyjne są nieprawidłowe lub wygasłe. Rozpocznij proces rejestracji od nowa (Krok 2).",
        code: "INVALID_VERIFICATION_TOKENS",
      });
    }

    console.log("✅ Tokeny JWT zweryfikowane pomyślnie!");
    console.log("✅ Email i telefon zostały zweryfikowane w Krokach 2 i 3");

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

    // STEP 4: Double-check if user already exists (race condition protection)
    console.log("🔍 Sprawdzam czy użytkownik już istnieje (final check)...");
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
        code: "USER_ALREADY_EXISTS",
      });
    }
    console.log("✅ Email i telefon są wolne");

    // STEP 4: Create new user - FULLY VERIFIED (tokens were validated)
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
      dataProcessingAccepted: true,
      dataProcessingAcceptedAt: new Date(),

      // STEP 4: Mark as FULLY VERIFIED (tokens were validated in Step 2 & 3)
      isEmailVerified: true,
      emailVerified: true,
      isPhoneVerified: true,
      phoneVerified: true,
      isVerified: true,
      registrationStep: "completed",

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

    // STEP 4: Clean up verification codes after successful registration
    console.log("🧹 Czyszczę kody weryfikacyjne z Kroku 2 i 3...");
    await cleanupVerificationCodes(newUser.email, newUser.phoneNumber);

    // STEP 4: Generate secure auth tokens for immediate login (using dual-token system)
    console.log(
      "🎟️ Generuję bezpieczne tokeny autoryzacyjne (Access + Refresh)...",
    );
    const tokenPayload = {
      userId: newUser._id,
      role: newUser.role || "user",
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Set secure HttpOnly cookies (same as login flow)
    setAuthCookies(res, accessToken, refreshToken);
    console.log("✅ Tokeny ustawione w bezpiecznych HttpOnly cookies");

    // STEP 4: Return user data (without sensitive information)
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
      status: newUser.status,
      createdAt: newUser.createdAt,
    };

    logger.info("Multi-step wizard registration completed successfully", {
      userId: newUser._id,
      email: newUser.email,
      phone: newUser.phoneNumber,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });

    console.log("✅ Zwracam odpowiedź do frontendu");
    console.log("🟣 ==========================================");
    console.log("🟣 [STEP 4 - FINALIZE] /register - SUCCESS");
    console.log("🟣 ==========================================\n");

    res.status(201).json({
      success: true,
      message: "Rejestracja zakończona pomyślnie! Witamy w AutoSell!",
      user: userData,
      // Tokens are set in HttpOnly cookies - no need to return them in response
    });
  } catch (error) {
    console.error("❌ ==========================================");
    console.error("❌ [STEP 4 - FINALIZE] /register - ERROR");
    console.error("❌ ==========================================");
    console.error("❌ Registration error:", error);
    console.error("❌ Message:", error.message);
    console.error("❌ Stack:", error.stack);

    // 🔒 SECURITY: Handle MongoDB duplicate key error (race condition protection)
    if (error.code === 11000) {
      const duplicateField = error.keyPattern?.email ? "email" : "telefon";

      logger.warn("Race condition detected - duplicate user attempt", {
        error: error.message,
        field: duplicateField,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });

      console.error("❌ Race condition: Duplikat", duplicateField);

      return res.status(400).json({
        success: false,
        message: `Użytkownik z tym ${duplicateField === "email" ? "adresem email" : "numerem telefonu"} już istnieje`,
        code: "USER_ALREADY_EXISTS",
      });
    }

    logger.error("Registration finalization error", {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.status(500).json({
      success: false,
      message: "Błąd serwera podczas finalizacji rejestracji",
      code: "SERVER_ERROR",
    });
  }
};
