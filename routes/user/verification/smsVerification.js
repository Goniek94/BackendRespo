/**
 * SMS VERIFICATION ROUTES
 * Trasy związane z weryfikacją SMS
 */

import express from "express";

const router = express.Router();

// Advanced SMS verification endpoint for registration process
router.post("/verify-sms-advanced", async (req, res) => {
  const { verifySMSCodeAdvanced } = await import(
    "../../../controllers/user/verificationController.js"
  );
  return verifySMSCodeAdvanced(req, res);
});

// Verify SMS code - SYMULACJA: akceptuje kod "123456"
router.post("/verify-sms-code", async (req, res) => {
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      return res.status(400).json({
        success: false,
        message: "Numer telefonu i kod są wymagane",
      });
    }

    // SYMULACJA: W trybie deweloperskim akceptujemy kod "123456"
    if (process.env.NODE_ENV !== "production") {
      console.log("🔧 MOCK MODE: Weryfikacja kodu SMS:", phone, "Kod:", code);

      if (code === "123456") {
        // Znajdź użytkownika i oznacz telefon jako zweryfikowany
        const User = (await import("../../../models/user/User.js")).default;
        const user = await User.findOne({ phoneNumber: phone });

        if (user && !user.isPhoneVerified) {
          user.isPhoneVerified = true;
          user.smsVerificationCode = null;
          user.smsVerificationCodeExpires = null;
          await user.save();
          console.log("✅ Telefon automatycznie zweryfikowany:", phone);
        }

        return res.status(200).json({
          success: true,
          message: "Numer telefonu został zweryfikowany (tryb deweloperski)",
          verified: true,
        });
      } else {
        return res.status(400).json({
          success: false,
          message: "Nieprawidłowy kod weryfikacyjny. Użyj kodu: 123456",
        });
      }
    }

    // W trybie produkcyjnym - normalna weryfikacja kodu
    const User = (await import("../../../models/user/User.js")).default;
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

    // Sprawdź kod i czas wygaśnięcia
    if (!user.smsVerificationCode || user.smsVerificationCode !== code) {
      return res.status(400).json({
        success: false,
        message: "Nieprawidłowy kod weryfikacyjny",
      });
    }

    if (
      user.smsVerificationCodeExpires &&
      user.smsVerificationCodeExpires < new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: "Kod weryfikacyjny wygasł",
      });
    }

    // Oznacz telefon jako zweryfikowany
    user.isPhoneVerified = true;
    user.smsVerificationCode = null;
    user.smsVerificationCodeExpires = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Numer telefonu został zweryfikowany",
      verified: true,
    });
  } catch (error) {
    console.error("Verify SMS code error:", error);
    res.status(500).json({
      success: false,
      message: "Błąd serwera podczas weryfikacji kodu",
    });
  }
});

// Send SMS code to any phone number (for testing/development)
router.post("/send-sms-code", async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Numer telefonu jest wymagany",
      });
    }

    // W trybie deweloperskim zawsze zwracamy kod "123456"
    const smsVerificationCode =
      process.env.NODE_ENV !== "production"
        ? "123456"
        : require("crypto").randomInt(100000, 999999).toString();

    // Send SMS - SYMULACJA W TRYBIE DEWELOPERSKIM
    if (process.env.NODE_ENV !== "production") {
      // W trybie deweloperskim tylko symulujemy wysyłanie
      console.log(
        "MOCK MODE: Symulacja wysyłania kodu SMS na numer:",
        phone,
        "Kod:",
        smsVerificationCode
      );
    } else {
      // W trybie produkcyjnym wysyłamy prawdziwy SMS
      try {
        const { sendVerificationCode: sendSMSCode } = await import(
          "../../../config/twilio.js"
        );
        await sendSMSCode(phone, smsVerificationCode);
      } catch (smsError) {
        console.error("Failed to send SMS verification code:", smsError);
        return res.status(500).json({
          success: false,
          message: "Błąd wysyłania kodu SMS",
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "Kod weryfikacyjny został wysłany SMS",
      devCode:
        process.env.NODE_ENV !== "production" ? smsVerificationCode : undefined,
    });
  } catch (error) {
    console.error("Send SMS code error:", error);
    res.status(500).json({
      success: false,
      message: "Błąd serwera podczas wysyłania kodu",
    });
  }
});

// Resend SMS verification code
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
    const User = (await import("../../../models/user/User.js")).default;
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

    // Generate new code - w trybie deweloperskim zawsze "123456"
    const smsVerificationCode =
      process.env.NODE_ENV !== "production"
        ? "123456"
        : require("crypto").randomInt(100000, 999999).toString();
    user.smsVerificationCode = smsVerificationCode;
    user.smsVerificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await user.save();

    // Send SMS - SYMULACJA W TRYBIE DEWELOPERSKIM
    if (process.env.NODE_ENV !== "production") {
      // W trybie deweloperskim tylko symulujemy wysyłanie
      console.log(
        "MOCK MODE: Symulacja wysyłania kodu SMS na numer:",
        user.phoneNumber,
        "Kod:",
        smsVerificationCode
      );
    } else {
      // W trybie produkcyjnym wysyłamy prawdziwy SMS
      try {
        const { sendVerificationCode: sendSMSCode } = await import(
          "../../../config/twilio.js"
        );
        await sendSMSCode(user.phoneNumber, smsVerificationCode);
      } catch (smsError) {
        console.error("Failed to resend SMS verification code:", smsError);
      }
    }

    res.status(200).json({
      success: true,
      message: "Nowy kod weryfikacyjny został wysłany SMS",
      devCode:
        process.env.NODE_ENV !== "production" ? smsVerificationCode : undefined,
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
