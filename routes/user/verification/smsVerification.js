import express from "express";
import { verifyEmailCode } from "../../../controllers/user/index.js";

const router = express.Router();

/**
 * VERIFICATION ROUTES
 * Trasy związane z weryfikacją email i SMS
 */

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
    const User = (await import("../../models/user/user.js")).default;
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

    const logger = (await import("../../utils/logger.js")).default;
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
    const logger = (await import("../../utils/logger.js")).default;
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
    "../../controllers/user/verificationController.js"
  );
  return verifyEmailCodeAdvanced(req, res);
});

// ✅ VERIFY SMS ADVANCED - Weryfikacja kodu SMS
router.post("/verify-sms-advanced", async (req, res) => {
  try {
    const { phone, code } = req.body;

    console.log("📱 Weryfikacja SMS:", { phone, code });

    if (!phone || !code) {
      return res.status(400).json({
        success: false,
        message: "Telefon i kod są wymagane",
      });
    }

    // Znajdź usera po telefonie
    const User = (await import("../../models/user/user.js")).default;
    const user = await User.findOne({ phoneNumber: phone });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Użytkownik nie znaleziony",
      });
    }

    // Sprawdź czy już zweryfikowany
    if (user.isPhoneVerified) {
      return res.status(400).json({
        success: false,
        message: "Telefon już zweryfikowany",
      });
    }

    // Sprawdź czy kod wygasł
    if (new Date() > user.smsVerificationCodeExpires) {
      return res.status(400).json({
        success: false,
        message: "Kod wygasł. Wyślij nowy kod.",
      });
    }

    // Sprawdź kod
    if (user.smsVerificationCode !== code) {
      return res.status(400).json({
        success: false,
        message: "Nieprawidłowy kod weryfikacyjny",
      });
    }

    // ✅ Zweryfikuj!
    user.isPhoneVerified = true;
    user.phoneVerified = true;
    user.smsVerificationCode = null;
    user.smsVerificationCodeExpires = null;
    user.isVerified = user.isEmailVerified && user.isPhoneVerified;
    user.registrationStep = user.isVerified
      ? "completed"
      : "email_verification";

    await user.save();

    console.log("✅ Telefon zweryfikowany:", user._id);

    const logger = (await import("../../utils/logger.js")).default;
    logger.info("Phone verified successfully", {
      userId: user._id,
      phone,
    });

    res.json({
      success: true,
      message: "Telefon zweryfikowany pomyślnie!",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phoneNumber,
        isPhoneVerified: true,
        isVerified: user.isVerified,
        registrationStep: user.registrationStep,
      },
    });
  } catch (error) {
    console.error("❌ Błąd weryfikacji:", error);
    const logger = (await import("../../utils/logger.js")).default;
    logger.error("Verify SMS error", {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      message: "Błąd serwera podczas weryfikacji",
    });
  }
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

    const User = (await import("../../models/user/user.js")).default;
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

    // Generate new verification token
    const emailVerificationToken =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15) +
      Date.now().toString(36);
    user.emailVerificationToken = emailVerificationToken;
    user.emailVerificationTokenExpires = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    );

    await user.save();

    // Send real email via Brevo
    try {
      const { sendVerificationLinkEmail } = await import(
        "../../config/nodemailer.js"
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

      const logger = (await import("../../utils/logger.js")).default;
      logger.info("Email verification link resent successfully", {
        userId: user._id,
        email: user.email,
        ip: req.ip,
      });
    } catch (emailError) {
      const logger = (await import("../../utils/logger.js")).default;
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
    const logger = (await import("../../utils/logger.js")).default;
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

// ✅ SEND SMS CODE - Wysyłanie/ponowne wysyłanie kodu SMS przez SMSAPI
router.post("/send-sms-code", async (req, res) => {
  try {
    const { phone } = req.body;

    console.log("🔄 Ponowne wysłanie kodu SMS:", { phone });

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Numer telefonu jest wymagany",
      });
    }

    // Znajdź użytkownika
    const User = (await import("../../models/user/user.js")).default;
    const user = await User.findOne({ phoneNumber: phone });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Użytkownik nie został znaleziony",
      });
    }

    if (user.isPhoneVerified) {
      return res.status(400).json({
        success: false,
        message: "Numer telefonu jest już zweryfikowany",
      });
    }

    // Wygeneruj nowy kod (6 cyfr)
    const smsVerificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    user.smsVerificationCode = smsVerificationCode;
    user.smsVerificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await user.save();

    console.log("🔐 Nowy kod SMS:", smsVerificationCode);

    // Wyślij SMS przez SMSAPI (lub MOCK)
    if (process.env.MOCK_SMS !== "false") {
      // MOCK MODE - tylko konsola
      console.log("📱 MOCK SMS do:", phone);
      console.log("Twój kod weryfikacyjny:", smsVerificationCode);
      console.log("Kod ważny przez 15 minut.\n");
    } else {
      // PRAWDZIWY SMS przez SMSAPI
      try {
        const { sendVerificationSMS } = await import("../../config/smsapi.js");
        await sendVerificationSMS(phone, smsVerificationCode, user.name);
      } catch (smsError) {
        console.error("❌ Błąd wysyłania SMS:", smsError);
        const logger = (await import("../../utils/logger.js")).default;
        logger.error("SMS send error", {
          error: smsError.message,
          phone,
        });
        return res.status(500).json({
          success: false,
          message: "Błąd wysyłania kodu SMS",
        });
      }
    }

    const logger = (await import("../../utils/logger.js")).default;
    logger.info("SMS code sent/resent successfully", {
      userId: user._id,
      phone,
    });

    res.status(200).json({
      success: true,
      message: "Kod weryfikacyjny został wysłany SMS",
      data: {
        phone,
        codeExpiresAt: user.smsVerificationCodeExpires,
        // W trybie dev/mock zwróć kod
        ...(process.env.MOCK_SMS !== "false" && {
          devCode: smsVerificationCode,
        }),
      },
    });
  } catch (error) {
    console.error("❌ Send SMS code error:", error);
    res.status(500).json({
      success: false,
      message: "Błąd serwera podczas wysyłania kodu",
    });
  }
});

// Resend verification codes
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
    const User = (await import("../../models/user/user.js")).default;
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
    const emailVerificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    user.emailVerificationCode = emailVerificationCode;
    user.emailVerificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await user.save();

    // Send email - obsługa MOCK_EMAIL
    if (process.env.MOCK_EMAIL !== "false") {
      console.log(
        "MOCK MODE: Symulacja wysyłania kodu na email:",
        user.email,
        "Kod:",
        emailVerificationCode
      );
    } else {
      try {
        const { sendVerificationEmail } = await import(
          "../../config/nodemailer.js"
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
        process.env.MOCK_EMAIL !== "false" ? emailVerificationCode : undefined,
    });
  } catch (error) {
    console.error("Resend email code error:", error);
    res.status(500).json({
      success: false,
      message: "Błąd serwera podczas wysyłania kodu",
    });
  }
});

// ✅ RESEND SMS CODE - Ponowne wysłanie kodu SMS
router.post("/resend-sms-code", async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Numer telefonu jest wymagany",
      });
    }

    // Find user
    const User = (await import("../../models/user/user.js")).default;
    const user = await User.findOne({ phoneNumber: phone });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Użytkownik nie został znaleziony",
      });
    }

    if (user.isPhoneVerified) {
      return res.status(400).json({
        success: false,
        message: "Numer telefonu jest już zweryfikowany",
      });
    }

    // Generate new code
    const smsVerificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    user.smsVerificationCode = smsVerificationCode;
    user.smsVerificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await user.save();

    // Send SMS - obsługa MOCK_SMS
    if (process.env.MOCK_SMS !== "false") {
      console.log(
        "📱 MOCK SMS do:",
        user.phoneNumber,
        "| Kod:",
        smsVerificationCode
      );
    } else {
      try {
        const { sendVerificationSMS } = await import("../../config/smsapi.js");
        await sendVerificationSMS(
          user.phoneNumber,
          smsVerificationCode,
          user.name
        );
      } catch (smsError) {
        console.error("Failed to resend SMS verification code:", smsError);
      }
    }

    res.status(200).json({
      success: true,
      message: "Nowy kod weryfikacyjny został wysłany SMS",
      devCode:
        process.env.MOCK_SMS !== "false" ? smsVerificationCode : undefined,
    });
  } catch (error) {
    console.error("Resend SMS code error:", error);
    res.status(500).json({
      success: false,
      message: "Błąd serwera podczas wysyłania kodu",
    });
  }
});

export default router;
