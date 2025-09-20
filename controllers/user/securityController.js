import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';
import User from '../../models/user/user.js';
import logger from '../../utils/logger.js';
import { generatePasswordResetToken } from '../../utils/securityTokens.js';

/**
 * SECURITY CONTROLLER
 * Handles password reset, 2FA, and other security features
 */

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

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email jest wymagany'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Podaj prawidłowy adres email'
      });
    }

    // Find user by email
    const user = await User.findOne({ 
      email: email.toLowerCase().trim() 
    });

    // Always return success for security (don't reveal if email exists)
    const successMessage = 'Jeśli podany adres email istnieje w naszej bazie, wysłaliśmy instrukcje resetowania hasła';

    if (!user) {
      logger.info('Password reset requested for non-existent email', {
        email: email.toLowerCase().trim(),
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(200).json({
        success: true,
        message: successMessage
      });
    }

    // Generate reset token
    const resetToken = generatePasswordResetToken();

    // Set reset token and expiration (1 hour)
    user.passwordResetToken = resetToken;
    user.passwordResetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // Send password reset email
    try {
      const { sendPasswordResetEmail } = await import('../../config/nodemailer.js');
      const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
      
      const emailSent = await sendPasswordResetEmail(user.email, resetLink, user.name);
      
      if (emailSent) {
        logger.info('Password reset email sent successfully', {
          userId: user._id,
          email: user.email,
          ip: req.ip
        });
      } else {
        logger.error('Failed to send password reset email', {
          userId: user._id,
          email: user.email,
          ip: req.ip
        });
      }
    } catch (emailError) {
      logger.error('Error sending password reset email', {
        userId: user._id,
        email: user.email,
        error: emailError.message,
        ip: req.ip
      });
    }

    res.status(200).json({
      success: true,
      message: successMessage
    });

  } catch (error) {
    logger.error('Request password reset error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas żądania resetowania hasła'
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

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token i nowe hasło są wymagane'
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Hasło musi mieć co najmniej 8 znaków'
      });
    }

    // Find user by reset token
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetTokenExpires: { $gt: new Date() }
    });

    if (!user) {
      logger.warn('Invalid or expired password reset token used', {
        token: token.substring(0, 10) + '...',
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(400).json({
        success: false,
        message: 'Token resetowania hasła jest nieprawidłowy lub wygasł'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update user password and clear reset token
    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;
    user.failedLoginAttempts = 0; // Reset failed attempts
    user.accountLocked = false; // Unlock account if locked
    user.lockUntil = undefined;
    await user.save();

    logger.info('Password reset successful', {
      userId: user._id,
      email: user.email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      message: 'Hasło zostało pomyślnie zresetowane. Możesz się teraz zalogować.'
    });

  } catch (error) {
    logger.error('Reset password error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas resetowania hasła'
    });
  }
};

/**
 * Send 2FA code (placeholder for future implementation)
 */
export const send2FACode = async (req, res) => {
  try {
    // TODO: Implement 2FA code sending with SMS/Email
    logger.info('2FA code send requested', {
      userId: req.user?.userId,
      ip: req.ip
    });
    
    res.status(200).json({
      success: true,
      message: 'Funkcja 2FA będzie dostępna wkrótce'
    });
  } catch (error) {
    logger.error('Send 2FA error', {
      error: error.message,
      userId: req.user?.userId,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      message: 'Błąd serwera'
    });
  }
};

/**
 * Verify 2FA code (placeholder for future implementation)
 */
export const verify2FACode = async (req, res) => {
  try {
    // TODO: Implement 2FA code verification
    logger.info('2FA code verification requested', {
      userId: req.user?.userId,
      ip: req.ip
    });
    
    res.status(200).json({
      success: true,
      message: 'Funkcja 2FA będzie dostępna wkrótce'
    });
  } catch (error) {
    logger.error('Verify 2FA error', {
      error: error.message,
      userId: req.user?.userId,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      message: 'Błąd serwera'
    });
  }
};
