import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { validationResult } from 'express-validator';
import User from '../../models/user.js';

/**
 * Change password (when user is logged in)
 */
export const changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Błędy walidacji',
        errors: errors.array()
      });
    }

    const userId = req.user._id;
    const { oldPassword, newPassword } = req.body;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Użytkownik nie został znaleziony'
      });
    }

    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Stare hasło jest nieprawidłowe'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    user.password = hashedNewPassword;
    user.updatedAt = new Date();
    await user.save();

    console.log(`✅ Password changed successfully for user: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Hasło zostało zmienione pomyślnie'
    });

  } catch (error) {
    console.error('❌ Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas zmiany hasła'
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
        message: 'Błędy walidacji',
        errors: errors.array()
      });
    }

    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ 
      email: email.toLowerCase().trim() 
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'Jeśli podany adres email istnieje w naszej bazie, wysłaliśmy instrukcje resetowania hasła'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save reset token to user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    // TODO: Send email with reset link
    console.log(`🔑 Password reset requested for: ${email}`);
    console.log(`Reset token: ${resetToken}`);

    res.status(200).json({
      success: true,
      message: 'Jeśli podany adres email istnieje w naszej bazie, wysłaliśmy instrukcje resetowania hasła'
    });

  } catch (error) {
    console.error('❌ Request password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas żądania resetowania hasła'
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
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token resetowania hasła jest nieprawidłowy lub wygasł'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Token jest prawidłowy'
    });

  } catch (error) {
    console.error('❌ Verify reset token error:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas weryfikacji tokenu'
    });
  }
};

/**
 * Reset password with token
 */
export const resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Błędy walidacji',
        errors: errors.array()
      });
    }

    const { token, password } = req.body;

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token resetowania hasła jest nieprawidłowy lub wygasł'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update password and clear reset token
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.failedLoginAttempts = 0; // Reset failed attempts
    user.accountLocked = false; // Unlock account
    user.lockUntil = undefined;
    user.updatedAt = new Date();
    await user.save();

    console.log(`✅ Password reset successfully for user: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Hasło zostało zresetowane pomyślnie'
    });

  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas resetowania hasła'
    });
  }
};
