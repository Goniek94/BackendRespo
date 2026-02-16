/**
 * PRE-REGISTRATION VERIFICATION
 * Verifies email and phone BEFORE user account is created
 * Uses MongoDB with TTL for temporary code storage and JWT tokens for verification proof
 */

import express from "express";
import User from "../../../models/user/user.js";
import VerificationCode from "../../../models/verification/VerificationCode.js";
import logger from "../../../utils/logger.js";
import {
  generateCode,
  hashCode,
  verifyCode,
} from "../../../utils/verification/codeGenerator.js";
import { generateVerificationToken } from "../../../utils/verification/tokenGenerator.js";

const router = express.Router();

/**
 * 1️⃣ Check if email is available
 * POST /api/users/pre-register/check-email
 */
router.post("/check-email", async (req, res) => {
  console.log("\n🔵 ==========================================");
  console.log("🔵 [PRE-REG] /check-email - START");
  console.log("🔵 ==========================================");

  try {
    const { email } = req.body;
    console.log("📧 Email:", email);

    if (!email) {
      return res.status(400).json({
        available: false,
        message: "Email jest wymagany",
      });
    }

    // Check if email exists in database
    const exists = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    console.log(exists ? "❌ Email zajęty" : "✅ Email dostępny");

    res.json({
      available: !exists,
      message: exists ? "Email zajęty" : "Email dostępny",
    });
  } catch (error) {
    console.error("❌ Check email error:", error);
    res.status(500).json({
      available: false,
      message: "Błąd sprawdzania emaila",
    });
  }
});

/**
 * 2️⃣ Send email verification code BEFORE registration
 * POST /api/users/pre-register/send-email-verification
 */
router.post("/send-email-verification", async (req, res) => {
  console.log("\n🟡 ==========================================");
  console.log("🟡 [PRE-REGISTRATION] /send-email-code - START");
  console.log("🟡 ==========================================");

  try {
    const { email } = req.body;
    console.log("📧 Email:", email);

    if (!email) {
      console.log("❌ Brak emaila");
      return res.status(400).json({
        success: false,
        message: "Email jest wymagany",
      });
    }

    // Check if email already exists
    console.log("🔍 Sprawdzam czy email już istnieje...");
    const existingUser = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (existingUser) {
      console.log("❌ Email już istnieje");
      return res.status(400).json({
        success: false,
        message: "Email jest już zajęty",
      });
    }

    console.log("✅ Email wolny");

    // Generate 6-digit code
    console.log("🔐 Generuję kod...");
    const code = generateCode();
    const hashedCode = await hashCode(code);
    console.log("✅ Kod wygenerowany i zahashowany");

    // Remove old verification code if exists
    await VerificationCode.deleteOne({
      identifier: email.toLowerCase().trim(),
      type: "email",
    });

    // Save new code (10 minutes expiry)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await VerificationCode.create({
      identifier: email.toLowerCase().trim(),
      code: hashedCode,
      type: "email",
      expiresAt,
      verified: false,
    });
    console.log("💾 Kod zapisany w bazie (10 minut)");

    // Send email
    console.log("📤 Wysyłam email...");
    try {
      const { sendRegistrationVerificationCode } =
        await import("../../../services/emailService.js");
      await sendRegistrationVerificationCode(email, code, "");
      console.log("✅ Email wysłany");
    } catch (emailError) {
      console.error("❌ Błąd emaila:", emailError);
      await VerificationCode.deleteOne({
        identifier: email.toLowerCase().trim(),
        type: "email",
      });
      return res.status(500).json({
        success: false,
        message: "Błąd wysyłania kodu",
      });
    }

    console.log("✅ Sukces");
    console.log("🟡 ==========================================");
    console.log("🟡 [PRE-REG] /send-email-verification - SUCCESS");
    console.log("🟡 ==========================================\n");

    res.status(200).json({
      success: true,
      message: "Kod wysłany na email",
      expiresAt,
      ...(process.env.NODE_ENV !== "production" && { devCode: code }),
    });
  } catch (error) {
    console.error("❌ ==========================================");
    console.error("❌ [PRE-REGISTRATION] /send-email-code - ERROR");
    console.error("❌ ==========================================");
    console.error("❌ Error:", error);
    console.error("❌ Message:", error.message);
    console.error("❌ Stack:", error.stack);

    logger.error("Pre-registration send email code error", {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      message: "Błąd serwera podczas wysyłania kodu",
    });
  }
});

/**
 * 3️⃣ Verify email code and issue JWT token
 * POST /api/users/pre-register/verify-email-code
 */
router.post("/verify-email-code", async (req, res) => {
  console.log("\n🟢 ==========================================");
  console.log("🟢 [PRE-REG] /verify-email-code - START");
  console.log("🟢 ==========================================");

  try {
    const { email, code } = req.body;
    console.log("📧 Email:", email);
    console.log("🔑 Kod:", code);

    if (!email || !code) {
      return res.status(400).json({
        verified: false,
        message: "Email i kod są wymagane",
      });
    }

    // Get verification from database
    const verification = await VerificationCode.findOne({
      identifier: email.toLowerCase().trim(),
      type: "email",
    });

    if (!verification) {
      console.log("❌ Brak kodu");
      return res.status(400).json({
        verified: false,
        message: "Brak aktywnego kodu. Wyślij ponownie.",
      });
    }

    // Check expiry
    if (new Date() > verification.expiresAt) {
      console.log("❌ Kod wygasł");
      await VerificationCode.deleteOne({ _id: verification._id });
      return res.status(400).json({
        verified: false,
        message: "Kod wygasł. Wyślij ponownie.",
        expired: true,
      });
    }

    // Verify code
    console.log("🔍 Weryfikuję kod...");
    const isValid = await verifyCode(code.trim(), verification.code);

    if (!isValid) {
      console.log("❌ Nieprawidłowy kod");

      // Increment attempts (rate limiting)
      verification.attempts += 1;
      await verification.save();

      if (verification.attempts >= 5) {
        await VerificationCode.deleteOne({ _id: verification._id });
        return res.status(400).json({
          verified: false,
          message: "Zbyt wiele prób. Wyślij nowy kod.",
        });
      }

      return res.status(400).json({
        verified: false,
        message: "Nieprawidłowy kod",
      });
    }

    console.log("✅ Kod poprawny!");

    // Generate JWT token
    const verificationToken = generateVerificationToken(email, "email");
    console.log("🎟️ Token JWT wygenerowany");

    // Mark as verified and save token
    verification.verified = true;
    verification.verificationToken = verificationToken;
    await verification.save();

    console.log("✅ Email zweryfikowany");
    console.log("🟢 ==========================================");
    console.log("🟢 [PRE-REG] /verify-email-code - SUCCESS");
    console.log("🟢 ==========================================\n");

    res.status(200).json({
      verified: true,
      message: "Email zweryfikowany!",
      verificationToken,
    });
  } catch (error) {
    console.error("❌ ==========================================");
    console.error("❌ [PRE-REGISTRATION] /verify-email-code - ERROR");
    console.error("❌ ==========================================");
    console.error("❌ Error:", error);
    console.error("❌ Message:", error.message);
    console.error("❌ Stack:", error.stack);

    logger.error("Pre-registration verify email code error", {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      message: "Błąd serwera podczas weryfikacji kodu",
    });
  }
});

/**
 * 4️⃣ Check if phone is available
 * POST /api/users/pre-register/check-phone
 */
router.post("/check-phone", async (req, res) => {
  console.log("\n🔵 ==========================================");
  console.log("🔵 [PRE-REG] /check-phone - START");
  console.log("🔵 ==========================================");

  try {
    const { phone } = req.body;
    console.log("📱 Phone:", phone);

    if (!phone) {
      return res.status(400).json({
        available: false,
        message: "Telefon jest wymagany",
      });
    }

    // Check if phone exists
    const exists = await User.findOne({
      phoneNumber: phone,
    });

    console.log(exists ? "❌ Telefon zajęty" : "✅ Telefon dostępny");

    res.json({
      available: !exists,
      message: exists ? "Numer zajęty" : "Numer dostępny",
    });
  } catch (error) {
    console.error("❌ Check phone error:", error);
    res.status(500).json({
      available: false,
      message: "Błąd sprawdzania telefonu",
    });
  }
});

/**
 * 5️⃣ Send phone verification code (SMS simulation)
 * POST /api/users/pre-register/send-phone-verification
 */
router.post("/send-phone-verification", async (req, res) => {
  console.log("\n🟡 ==========================================");
  console.log("🟡 [PRE-REG] /send-phone-verification - START");
  console.log("🟡 ==========================================");

  try {
    const { phone } = req.body;
    console.log("📱 Phone:", phone);

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Telefon jest wymagany",
      });
    }

    // Check if phone already exists
    console.log("🔍 Sprawdzam czy telefon już istnieje...");
    const existingUser = await User.findOne({
      phoneNumber: phone,
    });

    if (existingUser) {
      console.log("❌ Telefon już istnieje");
      return res.status(400).json({
        success: false,
        message: "Numer telefonu jest już zajęty",
      });
    }

    console.log("✅ Telefon wolny");

    // Generate 4-digit code for Twilio
    console.log("🔐 Generuję kod SMS (4 cyfry dla Twilio)...");
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const hashedCode = await hashCode(code);
    console.log("✅ Kod wygenerowany i zahashowany");

    // Remove old verification code if exists
    await VerificationCode.deleteOne({
      identifier: phone,
      type: "phone",
    });

    // Save new code (10 minutes expiry)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await VerificationCode.create({
      identifier: phone,
      code: hashedCode,
      type: "phone",
      expiresAt,
      verified: false,
    });
    console.log("💾 Kod zapisany w bazie (10 minut)");

    // Send SMS przez SMSAPI
    console.log("📱 Wysyłam SMS przez SMSAPI...");
    try {
      const { sendVerificationCode } =
        await import("../../../config/smsapi.js");
      const smsResult = await sendVerificationCode(phone, code);

      if (!smsResult.success) {
        console.error("❌ Błąd wysyłania SMS:", smsResult.error);
        await VerificationCode.deleteOne({
          identifier: phone,
          type: "phone",
        });
        return res.status(500).json({
          success: false,
          message: "Błąd wysyłania kodu SMS",
        });
      }
      console.log("✅ SMS wysłany przez SMSAPI!");
      logger.info("SMS verification code sent via SMSAPI", {
        phone: phone,
        id: smsResult.id,
        simulated: smsResult.simulated || false,
      });
    } catch (smsError) {
      console.error("❌ Błąd wysyłania SMS:", smsError);
      logger.error("Error sending SMS via SMSAPI", {
        phone: phone,
        error: smsError.message,
        stack: smsError.stack,
      });
      await VerificationCode.deleteOne({
        identifier: phone,
        type: "phone",
      });
      return res.status(500).json({
        success: false,
        message: "Błąd wysyłania kodu SMS",
      });
    }

    console.log("✅ Sukces");
    console.log("🟡 ==========================================");
    console.log("🟡 [PRE-REG] /send-phone-verification - SUCCESS");
    console.log("🟡 ==========================================\n");

    res.status(200).json({
      success: true,
      message: "Kod SMS wysłany",
      expiresAt,
      ...(process.env.NODE_ENV !== "production" && { devCode: code }),
    });
  } catch (error) {
    console.error("❌ ==========================================");
    console.error("❌ [PRE-REG] /send-phone-verification - ERROR");
    console.error("❌ ==========================================");
    console.error("❌ Error:", error);
    console.error("❌ Message:", error.message);
    console.error("❌ Stack:", error.stack);

    logger.error("Pre-registration send phone code error", {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      message: "Błąd serwera podczas wysyłania kodu SMS",
    });
  }
});

/**
 * 6️⃣ Verify phone code and issue JWT token
 * POST /api/users/pre-register/verify-phone-code
 */
router.post("/verify-phone-code", async (req, res) => {
  console.log("\n🟢 ==========================================");
  console.log("🟢 [PRE-REG] /verify-phone-code - START");
  console.log("🟢 ==========================================");

  try {
    const { phone, code } = req.body;
    console.log("📱 Phone:", phone);
    console.log("🔑 Kod:", code);

    if (!phone || !code) {
      return res.status(400).json({
        verified: false,
        message: "Telefon i kod są wymagane",
      });
    }

    // Get verification from database
    const verification = await VerificationCode.findOne({
      identifier: phone,
      type: "phone",
    });

    if (!verification) {
      console.log("❌ Brak kodu");
      return res.status(400).json({
        verified: false,
        message: "Brak aktywnego kodu. Wyślij ponownie.",
      });
    }

    // Check expiry
    if (new Date() > verification.expiresAt) {
      console.log("❌ Kod wygasł");
      await VerificationCode.deleteOne({ _id: verification._id });
      return res.status(400).json({
        verified: false,
        message: "Kod wygasł. Wyślij ponownie.",
        expired: true,
      });
    }

    // Verify code
    console.log("🔍 Weryfikuję kod...");
    const isValid = await verifyCode(code.trim(), verification.code);

    if (!isValid) {
      console.log("❌ Nieprawidłowy kod");

      // Increment attempts (rate limiting)
      verification.attempts += 1;
      await verification.save();

      if (verification.attempts >= 5) {
        await VerificationCode.deleteOne({ _id: verification._id });
        return res.status(400).json({
          verified: false,
          message: "Zbyt wiele prób. Wyślij nowy kod.",
        });
      }

      return res.status(400).json({
        verified: false,
        message: "Nieprawidłowy kod",
      });
    }

    console.log("✅ Kod poprawny!");

    // Generate JWT token
    const verificationToken = generateVerificationToken(phone, "phone");
    console.log("🎟️ Token JWT wygenerowany");

    // Mark as verified and save token
    verification.verified = true;
    verification.verificationToken = verificationToken;
    await verification.save();

    console.log("✅ Telefon zweryfikowany");
    console.log("🟢 ==========================================");
    console.log("🟢 [PRE-REG] /verify-phone-code - SUCCESS");
    console.log("🟢 ==========================================\n");

    res.status(200).json({
      verified: true,
      message: "Telefon zweryfikowany!",
      verificationToken,
    });
  } catch (error) {
    console.error("❌ ==========================================");
    console.error("❌ [PRE-REG] /verify-phone-code - ERROR");
    console.error("❌ ==========================================");
    console.error("❌ Error:", error);
    console.error("❌ Message:", error.message);
    console.error("❌ Stack:", error.stack);

    logger.error("Pre-registration verify phone code error", {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      message: "Błąd serwera podczas weryfikacji kodu",
    });
  }
});

/**
 * Helper function to clean up verification codes after successful registration
 * Called from registerController after user is created
 */
export async function cleanupVerificationCodes(email, phone) {
  try {
    await VerificationCode.deleteMany({
      $or: [
        { identifier: email.toLowerCase().trim(), type: "email" },
        { identifier: phone, type: "phone" },
      ],
    });
    console.log(`🗑️ Cleaned up verification codes for: ${email}, ${phone}`);
  } catch (error) {
    console.error("Error cleaning up verification codes:", error);
  }
}

export default router;
