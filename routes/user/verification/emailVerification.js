/**
 * EMAIL VERIFICATION ROUTES
 * Trasy związane z weryfikacją emaila
 */

import express from "express";
import { verifyEmailCode } from "../../../controllers/user/index.js";
import User from "../../../models/user/user.js";
import logger from "../../../utils/logger.js";
import { generateEmailVerificationToken } from "../../../utils/securityTokens.js";

const router = express.Router();

// Weryfikacja kodu email (legacy)
router.post("/verify-email", verifyEmailCode);

// Weryfikacja emaila przez token z linku
router.get("/verify-email/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { email } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token weryfikacyjny jest wymagany",
      });
    }

    // Find user by token and email
    const user = await User.findOne({
      emailVerificationToken: token,
      email: email ? email.toLowerCase().trim() : undefined,
      emailVerificationTokenExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Token weryfikacyjny jest nieprawidłowy lub wygasł",
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email jest już zweryfikowany",
      });
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.emailVerified = true;
    user.isVerified = user.isEmailVerified && user.isPhoneVerified;
    user.registrationStep = user.isVerified ? "completed" : "sms_verification";
    user.emailVerificationToken = null;
    user.emailVerificationTokenExpires = null;

    await user.save();

    logger.info("Email verified successfully", {
      userId: user._id,
      email: user.email,
      ip: req.ip,
    });

    res.status(200).json({
      success: true,
      message: "Email został pomyślnie zweryfikowany!",
      user: {
        id: user._id,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        isVerified: user.isVerified,
        registrationStep: user.registrationStep,
      },
    });
  } catch (error) {
    logger.error("Email verification error", {
      error: error.message,
      stack: error.stack,
      token: req.params.token,
      ip: req.ip,
    });

    res.status(500).json({
      success: false,
      message: "Błąd serwera podczas weryfikacji emaila",
    });
  }
});

// Advanced verification endpoints for registration process
router.post("/verify-email-advanced", async (req, res) => {
  const { verifyEmailCodeAdvanced } = await import(
    "../../../controllers/user/verificationController.js"
  );
  return verifyEmailCodeAdvanced(req, res);
});

// Send email verification link - prawdziwe wysyłanie przez Brevo
router.post("/send-email-verification-link", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email jest wymagany",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Użytkownik nie został znaleziony",
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email jest już zweryfikowany",
      });
    }

    // Generate new verification token using secure method
    const emailVerificationToken = generateEmailVerificationToken();
    user.emailVerificationToken = emailVerificationToken;
    user.emailVerificationTokenExpires = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    );

    await user.save();

    // Send real email via Brevo
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
        user.email,
        verificationLink,
        user.name
      );

      if (!emailSent) {
        return res.status(500).json({
          success: false,
          message: "Błąd wysyłania linku weryfikacyjnego",
        });
      }

      logger.info("Email verification link resent successfully", {
        userId: user._id,
        email: user.email,
        ip: req.ip,
      });
    } catch (emailError) {
      logger.error("Failed to send email verification link", {
        error: emailError.message,
        userId: user._id,
        email: user.email,
        ip: req.ip,
      });

      return res.status(500).json({
        success: false,
        message: "Błąd wysyłania linku weryfikacyjnego",
      });
    }

    res.status(200).json({
      success: true,
      message: "Link weryfikacyjny został wysłany na email",
      tokenExpires: user.emailVerificationTokenExpires,
    });
  } catch (error) {
    logger.error("Send email verification link error", {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
    });

    res.status(500).json({
      success: false,
      message: "Błąd serwera podczas wysyłania linku",
    });
  }
});

// Resend email verification code (for registration)
router.post("/resend-email-code", async (req, res) => {
  console.log("\n🔵 ==========================================");
  console.log("🔵 [BACKEND] /resend-email-code - START");
  console.log("🔵 ==========================================");

  try {
    const { email } = req.body;
    console.log("📧 Otrzymany email:", email);

    if (!email) {
      console.log("❌ Brak emaila w request body");
      return res.status(400).json({
        success: false,
        message: "Email jest wymagany",
      });
    }

    // Find user
    console.log("🔍 Szukam użytkownika w bazie...");
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      console.log("❌ Użytkownik nie znaleziony w bazie");
      return res.status(404).json({
        success: false,
        message: "Użytkownik nie został znaleziony",
      });
    }

    console.log("✅ Użytkownik znaleziony:", {
      id: user._id,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
    });

    if (user.isEmailVerified) {
      console.log("⚠️ Email już zweryfikowany");
      return res.status(400).json({
        success: false,
        message: "Email jest już zweryfikowany",
      });
    }

    // Generate new code using crypto
    console.log("🔐 Generuję nowy kod weryfikacyjny...");
    const { generateSecureCode } = await import(
      "../../../utils/securityTokens.js"
    );
    const emailVerificationCode = generateSecureCode(6);
    console.log("✅ Kod wygenerowany:", emailVerificationCode);

    console.log("💾 Zapisuję kod w bazie danych...");
    user.emailVerificationCode = emailVerificationCode;
    user.emailVerificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    console.log("⏰ Kod ważny do:", user.emailVerificationCodeExpires);

    await user.save();
    console.log("✅ Kod zapisany w bazie");

    // Send email with Resend
    console.log("📤 Wysyłam email z kodem...");
    try {
      const { sendRegistrationVerificationCode } = await import(
        "../../../services/emailService.js"
      );
      await sendRegistrationVerificationCode(
        user.email,
        emailVerificationCode,
        user.name
      );

      console.log("✅ Email wysłany pomyślnie przez Resend");
      logger.info("✅ Email verification code sent via Resend", {
        email: user.email,
        userId: user._id,
      });
    } catch (emailError) {
      console.error("❌ Błąd wysyłania emaila:", emailError);
      logger.error("❌ Failed to send email verification code", {
        error: emailError.message,
        email: user.email,
      });
      return res.status(500).json({
        success: false,
        message: "Błąd wysyłania kodu weryfikacyjnego",
      });
    }

    console.log("✅ Zwracam odpowiedź do frontendu");
    console.log("🔵 ==========================================");
    console.log("🔵 [BACKEND] /resend-email-code - SUCCESS");
    console.log("🔵 ==========================================\n");

    res.status(200).json({
      success: true,
      message: "Nowy kod weryfikacyjny został wysłany na email",
      codeExpires: user.emailVerificationCodeExpires,
      devCode:
        process.env.NODE_ENV !== "production"
          ? emailVerificationCode
          : undefined,
    });
  } catch (error) {
    console.error("❌ ==========================================");
    console.error("❌ [BACKEND] /resend-email-code - ERROR");
    console.error("❌ ==========================================");
    console.error("❌ Error:", error);
    console.error("❌ Message:", error.message);
    console.error("❌ Stack:", error.stack);

    logger.error("Resend email code error", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Błąd serwera podczas wysyłania kodu",
    });
  }
});

export default router;
