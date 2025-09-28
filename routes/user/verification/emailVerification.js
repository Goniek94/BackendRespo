/**
 * EMAIL VERIFICATION ROUTES
 * Trasy związane z weryfikacją emaila
 */

import express from "express";
import { verifyEmailCode } from "../../../controllers/user/index.js";

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
    const User = (await import("../../../models/user/User.js")).default;
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

    const logger = (await import("../../../utils/logger.js")).default;
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
    const logger = (await import("../../../utils/logger.js")).default;
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

    const User = (await import("../../../models/user/User.js")).default;
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
    const { generateEmailVerificationToken } = await import(
      "../../../utils/securityTokens.js"
    );
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

      const logger = (await import("../../../utils/logger.js")).default;
      logger.info("Email verification link resent successfully", {
        userId: user._id,
        email: user.email,
        ip: req.ip,
      });
    } catch (emailError) {
      const logger = (await import("../../../utils/logger.js")).default;
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
    const logger = (await import("../../../utils/logger.js")).default;
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

// Resend email verification code
router.post("/resend-email-code", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email jest wymagany",
      });
    }

    // Find user
    const User = (await import("../../../models/user/User.js")).default;
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

    // Generate new code
    const emailVerificationCode = require("crypto")
      .randomInt(100000, 999999)
      .toString();
    user.emailVerificationCode = emailVerificationCode;
    user.emailVerificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await user.save();

    // Send email - SYMULACJA W TRYBIE DEWELOPERSKIM
    if (process.env.NODE_ENV !== "production") {
      // W trybie deweloperskim tylko symulujemy wysyłanie
      console.log(
        "MOCK MODE: Symulacja wysyłania kodu weryfikacyjnego na email:",
        user.email,
        "Kod:",
        emailVerificationCode
      );
    } else {
      // W trybie produkcyjnym wysyłamy prawdziwy email
      try {
        const { sendVerificationEmail } = await import(
          "../../../config/nodemailer.js"
        );
        await sendVerificationEmail(
          user.email,
          emailVerificationCode,
          user.name
        );
      } catch (emailError) {
        console.error("Failed to resend email verification code:", emailError);
      }
    }

    res.status(200).json({
      success: true,
      message: "Nowy kod weryfikacyjny został wysłany na email",
      devCode:
        process.env.NODE_ENV !== "production"
          ? emailVerificationCode
          : undefined,
    });
  } catch (error) {
    console.error("Resend email code error:", error);
    res.status(500).json({
      success: false,
      message: "Błąd serwera podczas wysyłania kodu",
    });
  }
});

export default router;
