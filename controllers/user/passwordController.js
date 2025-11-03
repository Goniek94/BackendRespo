import bcrypt from "bcryptjs";
import crypto from "crypto";
import { validationResult } from "express-validator";
import User from "../../models/user/user.js";
import logger from "../../utils/logger.js";

/**
 * Change password (when user is logged in)
 */
export const changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Błędy walidacji",
        errors: errors.array(),
      });
    }

    const userId = req.user._id;
    const { oldPassword, newPassword } = req.body;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Użytkownik nie został znaleziony",
      });
    }

    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Stare hasło jest nieprawidłowe",
      });
    }

    // Update password - will be automatically hashed by User model middleware
    user.password = newPassword;
    user.updatedAt = new Date();
    await user.save();

    logger.auth("Password changed successfully", {
      userId: user._id,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.status(200).json({
      success: true,
      message: "Hasło zostało zmienione pomyślnie",
    });
  } catch (error) {
    console.error("❌ Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Błąd serwera podczas zmiany hasła",
    });
  }
};

/**
 * Request password reset
 */
export const requestPasswordReset = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Błędy walidacji",
        errors: errors.array(),
      });
    }

    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "Jeśli podany adres email istnieje w naszej bazie, wysłaliśmy instrukcje resetowania hasła",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save reset token to user
    user.passwordResetToken = resetToken;
    user.passwordResetTokenExpires = resetTokenExpiry;
    await user.save();

    // Send email with reset link
    try {
      const { sendPasswordResetEmail } = await import(
        "../../services/emailService.js"
      );
      const resetLink = `${
        process.env.FRONTEND_URL || "http://localhost:3001"
      }/reset-password?token=${resetToken}&email=${encodeURIComponent(
        user.email
      )}`;
      await sendPasswordResetEmail(user.email, resetToken, user.name);

      logger.auth("Password reset email sent", {
        userId: user._id,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });
    } catch (emailError) {
      console.error("❌ Failed to send password reset email:", emailError);
      // Don't fail the request if email fails
    }

    logger.auth("Password reset requested", {
      userId: user._id,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.status(200).json({
      success: true,
      message:
        "Jeśli podany adres email istnieje w naszej bazie, wysłaliśmy instrukcje resetowania hasła",
    });
  } catch (error) {
    console.error("❌ Request password reset error:", error);
    res.status(500).json({
      success: false,
      message: "Błąd serwera podczas żądania resetowania hasła",
    });
  }
};

/**
 * Verify reset token
 */
export const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Token resetowania hasła jest nieprawidłowy lub wygasł",
      });
    }

    res.status(200).json({
      success: true,
      message: "Token jest prawidłowy",
    });
  } catch (error) {
    console.error("❌ Verify reset token error:", error);
    res.status(500).json({
      success: false,
      message: "Błąd serwera podczas weryfikacji tokenu",
    });
  }
};

/**
 * Reset password with token
 */
export const resetPassword = async (req, res) => {
  try {
    console.log("🔵 [resetPassword] Otrzymano żądanie:");
    console.log("📦 Body:", req.body);
    console.log("📧 Token:", req.body.token);
    console.log("🔐 Password:", req.body.password ? "[UKRYTE]" : "BRAK");

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("❌ [resetPassword] Błędy walidacji:");
      errors.array().forEach((err) => {
        console.log(`   - ${err.param}: ${err.msg}`);
      });
      return res.status(400).json({
        success: false,
        message: "Błędy walidacji",
        errors: errors.array(),
      });
    }

    const { token, password } = req.body;

    console.log("🔍 [resetPassword] Szukam użytkownika z tokenem...");
    console.log("🔑 Token do wyszukania:", token);
    console.log("⏰ Obecny czas:", Date.now());

    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetTokenExpires: { $gt: Date.now() },
    });

    console.log("👤 Użytkownik znaleziony:", user ? "TAK" : "NIE");
    if (user) {
      console.log("📧 Email użytkownika:", user.email);
      console.log("⏰ Token wygasa:", user.passwordResetTokenExpires);
      console.log("🔑 Token w bazie:", user.passwordResetToken);
      console.log("✅ Tokeny identyczne:", user.passwordResetToken === token);
    }

    if (!user) {
      // Sprawdź czy w ogóle istnieje użytkownik z tym tokenem (bez sprawdzania expiry)
      const userWithToken = await User.findOne({ passwordResetToken: token });
      if (userWithToken) {
        console.log("⚠️ Token istnieje ale WYGASŁ");
        console.log("⏰ Wygasł:", userWithToken.passwordResetTokenExpires);
        console.log("⏰ Teraz:", new Date());
      } else {
        console.log("❌ Token NIE ISTNIEJE w bazie");
      }

      return res.status(400).json({
        success: false,
        message: "Token resetowania hasła jest nieprawidłowy lub wygasł",
      });
    }

    // Update password and clear reset token
    // Password will be automatically hashed by User model middleware
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;
    user.failedLoginAttempts = 0; // Reset failed attempts
    user.accountLocked = false; // Unlock account
    user.lockUntil = undefined;
    user.updatedAt = new Date();
    await user.save();

    logger.auth("Password reset successfully", {
      userId: user._id,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.status(200).json({
      success: true,
      message: "Hasło zostało zresetowane pomyślnie",
    });
  } catch (error) {
    console.error("❌ Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Błąd serwera podczas resetowania hasła",
    });
  }
};
