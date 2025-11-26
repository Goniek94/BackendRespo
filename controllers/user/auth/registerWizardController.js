/**
 * MULTI-STEP WIZARD REGISTRATION CONTROLLER
 * 
 * Professional 4-step registration process with verification BEFORE account creation
 * 
 * FLOW:
 * Step 1: Personal data (Frontend only - no API call)
 * Step 2: Email verification → JWT token
 * Step 3: Phone verification (Twilio SMS) → JWT token
 * Step 4: Finalize registration → Create account in database
 * 
 * SECURITY:
 * - JWT tokens with 10-minute expiry
 * - Bcrypt hashed verification codes
 * - Rate limiting per step
 * - No "dead accounts" in database
 * - Double-check for duplicates before account creation
 * 
 * @author AutoSell Development Team
 * @version 2.0.0
 */

import User from "../../../models/user/user.js";
import VerificationCode from "../../../models/verification/VerificationCode.js";
import logger from "../../../utils/logger.js";
import {
  generateCode,
  hashCode,
  verifyCode,
} from "../../../utils/verification/codeGenerator.js";
import {
  generateVerificationToken,
  verifyVerificationToken,
} from "../../../utils/verification/tokenGenerator.js";
import { sendRegistrationVerificationCode } from "../../../services/emailService.js";
import { sendVerificationCode as sendTwilioSMS } from "../../../config/twilio.js";

// Constants
const EMAIL_CODE_LENGTH = 6;
const SMS_CODE_LENGTH = 4;
const CODE_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_VERIFICATION_ATTEMPTS = 5;

/**
 * STEP 2: Send email verification code
 * POST /api/users/register/step2/send-email
 * 
 * Rate Limit: 3 requests per 5 minutes per email
 * Resend Cooldown: 60 seconds
 */
export const step2SendEmail = async (req, res) => {
  console.log("\n🔵 ==========================================");
  console.log("🔵 [WIZARD STEP 2] Send Email Code - START");
  console.log("🔵 ==========================================");

  try {
    const { email } = req.body;

    // Validation
    if (!email) {
      console.log("❌ Email is required");
      return res.status(400).json({
        success: false,
        message: "Email jest wymagany",
        code: "EMAIL_REQUIRED",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log("📧 Email:", normalizedEmail);

    // Check if email already exists in database
    console.log("🔍 Checking if email exists in database...");
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      console.log("❌ Email already registered");
      logger.warn("Registration attempt with existing email", {
        email: normalizedEmail,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });

      return res.status(400).json({
        success: false,
        message: "Ten adres email jest już zarejestrowany",
        code: "EMAIL_ALREADY_EXISTS",
      });
    }

    console.log("✅ Email is available");

    // Check for recent code (resend cooldown)
    const existingCode = await VerificationCode.findOne({
      identifier: normalizedEmail,
      type: "email",
    });

    if (existingCode) {
      const timeSinceCreation = Date.now() - existingCode.createdAt.getTime();
      const cooldownMs = RESEND_COOLDOWN_SECONDS * 1000;

      if (timeSinceCreation < cooldownMs) {
        const remainingSeconds = Math.ceil(
          (cooldownMs - timeSinceCreation) / 1000
        );
        console.log(
          `⏱️ Resend cooldown active: ${remainingSeconds}s remaining`
        );

        return res.status(429).json({
          success: false,
          message: `Możesz wysłać kod ponownie za ${remainingSeconds} sekund`,
          code: "RESEND_COOLDOWN_ACTIVE",
          retryAfter: remainingSeconds,
        });
      }

      // Cooldown expired, delete old code
      console.log("🗑️ Deleting expired code");
      await VerificationCode.deleteOne({ _id: existingCode._id });
    }

    // Generate secure 6-digit code
    console.log("🔐 Generating verification code...");
    const verificationCode = generateCode();
    const hashedCode = await hashCode(verificationCode);
    console.log(`✅ Code generated: ${verificationCode.substring(0, 2)}****`);

    // Save code to database with TTL
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);
    await VerificationCode.create({
      identifier: normalizedEmail,
      code: hashedCode,
      type: "email",
      expiresAt,
      verified: false,
      attempts: 0,
    });

    console.log(
      `💾 Code saved to database (expires in ${CODE_EXPIRY_MINUTES} minutes)`
    );

    // Send email with verification code
    console.log("📤 Sending verification email...");
    try {
      await sendRegistrationVerificationCode(
        normalizedEmail,
        verificationCode,
        "" // Name not available yet in step 2
      );
      console.log("✅ Email sent successfully");

      logger.info("Email verification code sent (Wizard Step 2)", {
        email: normalizedEmail,
        codeLength: EMAIL_CODE_LENGTH,
        expiresAt,
        ip: req.ip,
      });
    } catch (emailError) {
      console.error("❌ Failed to send email:", emailError);
      logger.error("Failed to send email verification code", {
        email: normalizedEmail,
        error: emailError.message,
        stack: emailError.stack,
      });

      // Delete code if email failed
      await VerificationCode.deleteOne({
        identifier: normalizedEmail,
        type: "email",
      });

      return res.status(500).json({
        success: false,
        message: "Nie udało się wysłać kodu weryfikacyjnego. Spróbuj ponownie.",
        code: "EMAIL_SEND_FAILED",
      });
    }

    console.log("✅ Step 2 Send Email - SUCCESS");
    console.log("🔵 ==========================================\n");

    res.status(200).json({
      success: true,
      message: "Kod weryfikacyjny został wysłany na Twój email",
      data: {
        email: normalizedEmail,
        expiresAt,
        expiresInMinutes: CODE_EXPIRY_MINUTES,
        canResendAt: new Date(Date.now() + RESEND_COOLDOWN_SECONDS * 1000),
      },
      // Include code in development for testing
      ...(process.env.NODE_ENV !== "production" && {
        devCode: verificationCode,
      }),
    });
  } catch (error) {
    console.error("❌ ==========================================");
    console.error("❌ [WIZARD STEP 2] Send Email Code - ERROR");
    console.error("❌ ==========================================");
    console.error("❌ Error:", error);
    console.error("❌ Message:", error.message);
    console.error("❌ Stack:", error.stack);

    logger.error("Step 2 Send Email error", {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
    });

    res.status(500).json({
      success: false,
      message: "Wystąpił błąd serwera. Spróbuj ponownie później.",
      code: "SERVER_ERROR",
    });
  }
};

/**
 * STEP 2: Verify email code and issue JWT token
 * POST /api/users/register/step2/verify-email
 * 
 * Rate Limit: 5 attempts per code
 */
export const step2VerifyEmail = async (req, res) => {
  console.log("\n🟢 ==========================================");
  console.log("🟢 [WIZARD STEP 2] Verify Email Code - START");
  console.log("🟢 ==========================================");

  try {
    const { email, code } = req.body;

    // Validation
    if (!email || !code) {
      console.log("❌ Email and code are required");
      return res.status(400).json({
        success: false,
        message: "Email i kod weryfikacyjny są wymagane",
        code: "MISSING_FIELDS",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedCode = code.trim();

    console.log("📧 Email:", normalizedEmail);
    console.log("🔑 Code:", normalizedCode.substring(0, 2) + "****");

    // Validate code format
    if (!/^\d{6}$/.test(normalizedCode)) {
      console.log("❌ Invalid code format");
      return res.status(400).json({
        success: false,
        message: "Kod weryfikacyjny musi składać się z 6 cyfr",
        code: "INVALID_CODE_FORMAT",
      });
    }

    // Get verification code from database
    const verification = await VerificationCode.findOne({
      identifier: normalizedEmail,
      type: "email",
    });

    if (!verification) {
      console.log("❌ No verification code found");
      return res.status(400).json({
        success: false,
        message: "Nie znaleziono kodu weryfikacyjnego. Wyślij kod ponownie.",
        code: "CODE_NOT_FOUND",
      });
    }

    // Check if code expired
    if (new Date() > verification.expiresAt) {
      console.log("❌ Code expired");
      await VerificationCode.deleteOne({ _id: verification._id });

      return res.status(400).json({
        success: false,
        message: "Kod weryfikacyjny wygasł. Wyślij nowy kod.",
        code: "CODE_EXPIRED",
        expired: true,
      });
    }

    // Check if already verified
    if (verification.verified) {
      console.log("⚠️ Code already verified");
      return res.status(400).json({
        success: false,
        message: "Ten kod został już użyty. Wyślij nowy kod.",
        code: "CODE_ALREADY_USED",
      });
    }

    // Verify code
    console.log("🔍 Verifying code...");
    const isValid = await verifyCode(normalizedCode, verification.code);

    if (!isValid) {
      console.log("❌ Invalid code");

      // Increment attempts
      verification.attempts += 1;
      await verification.save();

      const remainingAttempts = MAX_VERIFICATION_ATTEMPTS - verification.attempts;

      logger.warn("Invalid email verification code attempt", {
        email: normalizedEmail,
        attempts: verification.attempts,
        remainingAttempts,
        ip: req.ip,
      });

      // Delete code after max attempts
      if (verification.attempts >= MAX_VERIFICATION_ATTEMPTS) {
        console.log("❌ Max attempts reached, deleting code");
        await VerificationCode.deleteOne({ _id: verification._id });

        return res.status(400).json({
          success: false,
          message: "Zbyt wiele nieprawidłowych prób. Wyślij nowy kod.",
          code: "MAX_ATTEMPTS_EXCEEDED",
        });
      }

      return res.status(400).json({
        success: false,
        message: `Nieprawidłowy kod weryfikacyjny. Pozostało prób: ${remainingAttempts}`,
        code: "INVALID_CODE",
        remainingAttempts,
      });
    }

    console.log("✅ Code is valid!");

    // Generate JWT token
    console.log("🎟️ Generating JWT token...");
    const emailVerificationToken = generateVerificationToken(
      normalizedEmail,
      "email"
    );

    // Mark as verified
    verification.verified = true;
    verification.verificationToken = emailVerificationToken;
    await verification.save();

    console.log("✅ Email verified successfully");
    console.log("🟢 ==========================================\n");

    logger.info("Email verified successfully (Wizard Step 2)", {
      email: normalizedEmail,
      ip: req.ip,
    });

    res.status(200).json({
      success: true,
      message: "Email zweryfikowany pomyślnie!",
      data: {
        emailVerificationToken,
        email: normalizedEmail,
        verified: true,
      },
    });
  } catch (error) {
    console.error("❌ ==========================================");
    console.error("❌ [WIZARD STEP 2] Verify Email Code - ERROR");
    console.error("❌ ==========================================");
    console.error("❌ Error:", error);
    console.error("❌ Message:", error.message);
    console.error("❌ Stack:", error.stack);

    logger.error("Step 2 Verify Email error", {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
    });

    res.status(500).json({
      success: false,
      message: "Wystąpił błąd serwera. Spróbuj ponownie później.",
      code: "SERVER_ERROR",
    });
  }
};

/**
 * STEP 3: Send SMS verification code via Twilio
 * POST /api/users/register/step3/send-sms
 * 
 * Rate Limit: 3 requests per 5 minutes per phone
 * Resend Cooldown: 60 seconds
 */
export const step3SendSMS = async (req, res) => {
  console.log("\n🔵 ==========================================");
  console.log("🔵 [WIZARD STEP 3] Send SMS Code - START");
  console.log("🔵 ==========================================");

  try {
    const { phone } = req.body;

    // Validation
    if (!phone) {
      console.log("❌ Phone is required");
      return res.status(400).json({
        success: false,
        message: "Numer telefonu jest wymagany",
        code: "PHONE_REQUIRED",
      });
    }

    // Format phone number to E.164 (+48XXXXXXXXX)
    let formattedPhone = phone.trim();
    if (phone.startsWith("48") && !phone.startsWith("+48")) {
      formattedPhone = "+" + phone;
    } else if (phone.match(/^[0-9]{9}$/)) {
      formattedPhone = "+48" + phone;
    } else if (!phone.startsWith("+")) {
      formattedPhone = "+48" + phone.replace(/^0+/, "");
    }

    console.log("📱 Phone:", formattedPhone);

    // Validate phone format
    if (!/^\+[1-9]\d{1,14}$/.test(formattedPhone)) {
      console.log("❌ Invalid phone format");
      return res.status(400).json({
        success: false,
        message: "Nieprawidłowy format numeru telefonu",
        code: "INVALID_PHONE_FORMAT",
      });
    }

    // Check if phone already exists in database
    console.log("🔍 Checking if phone exists in database...");
    const existingUser = await User.findOne({ phoneNumber: formattedPhone });

    if (existingUser) {
      console.log("❌ Phone already registered");
      logger.warn("Registration attempt with existing phone", {
        phone: formattedPhone,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });

      return res.status(400).json({
        success: false,
        message: "Ten numer telefonu jest już zarejestrowany",
        code: "PHONE_ALREADY_EXISTS",
      });
    }

    console.log("✅ Phone is available");

    // Check for recent code (resend cooldown)
    const existingCode = await VerificationCode.findOne({
      identifier: formattedPhone,
      type: "phone",
    });

    if (existingCode) {
      const timeSinceCreation = Date.now() - existingCode.createdAt.getTime();
      const cooldownMs = RESEND_COOLDOWN_SECONDS * 1000;

      if (timeSinceCreation < cooldownMs) {
        const remainingSeconds = Math.ceil(
          (cooldownMs - timeSinceCreation) / 1000
        );
        console.log(
          `⏱️ Resend cooldown active: ${remainingSeconds}s remaining`
        );

        return res.status(429).json({
          success: false,
          message: `Możesz wysłać kod ponownie za ${remainingSeconds} sekund`,
          code: "RESEND_COOLDOWN_ACTIVE",
          retryAfter: remainingSeconds,
        });
      }

      // Cooldown expired, delete old code
      console.log("🗑️ Deleting expired code");
      await VerificationCode.deleteOne({ _id: existingCode._id });
    }

    // Generate secure 4-digit code (Twilio requirement)
