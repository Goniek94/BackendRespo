/**
 * Password Controller
 * Handles password operations: change password, reset password, verify reset token
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../../models/user.js';
import { sendResetPasswordEmail } from '../../config/nodemailer.js';

/**
 * Change password (when user is logged in)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.userId;

  try {
    // Validate new password format
    const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ 
        message: 'New password does not meet security requirements.',
        field: 'newPassword'
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ 
        message: 'Current password is incorrect.',
        field: 'oldPassword'
      });
    }

    user.password = newPassword; // Pre-save hook will hash the password
    await user.save();

    return res.status(200).json({ message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Error changing password:', error);
    return res.status(500).json({ message: 'Server error while changing password.' });
  }
};

/**
 * Request password reset
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const requestPasswordReset = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User with this email address does not exist.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send email with token
    await sendResetPasswordEmail(email, token);

    return res.status(200).json({ message: 'Password reset link has been sent to the provided email address.' });
  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({ message: 'Server error during password reset.' });
  }
};

/**
 * Verify reset token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const verifyResetToken = async (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ 
      success: false,
      message: 'Password reset token is required.' 
    });
  }

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: 'Password reset token is invalid or expired.' 
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Token is valid.',
      email: user.email
    });
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Server error during token verification.' 
    });
  }
};

/**
 * Reset password
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  try {
    // Validate password format
    const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ 
        message: 'Password does not meet security requirements.',
        field: 'password'
      });
    }
    
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Password reset token is invalid or expired.' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.status(200).json({ message: 'Password has been changed successfully.' });
  } catch (error) {
    console.error('Error changing password:', error);
    return res.status(500).json({ message: 'Server error while changing password.' });
  }
};
