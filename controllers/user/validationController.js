/**
 * Validation Controller
 * Handles user validation operations: check email/phone existence, verify email code
 */

import User from '../../models/user.js';

/**
 * Check if email exists
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const checkEmailExists = async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ 
      exists: false,
      message: 'Adres email jest wymagany.',
      valid: false
    });
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      exists: false,
      message: 'Nieprawidłowy format adresu email.',
      valid: false
    });
  }

  try {
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      return res.status(200).json({ 
        exists: true,
        message: 'Ten adres email jest już zarejestrowany. Spróbuj się zalogować lub użyj innego adresu.',
        valid: false,
        code: 'EMAIL_ALREADY_EXISTS'
      });
    }
    
    return res.status(200).json({ 
      exists: false,
      message: 'Adres email jest dostępny.',
      valid: true
    });
  } catch (error) {
    console.error('Error checking email:', error);
    return res.status(500).json({ 
      exists: false,
      message: 'Błąd podczas sprawdzania adresu email.',
      valid: false
    });
  }
};

/**
 * Check if phone exists
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const checkPhoneExists = async (req, res) => {
  const { phone } = req.body;
  
  if (!phone) {
    return res.status(400).json({ 
      exists: false,
      message: 'Numer telefonu jest wymagany.',
      valid: false
    });
  }

  // Basic phone format validation
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({ 
      exists: false,
      message: 'Numer telefonu musi zaczynać się od + i zawierać kod kraju (np. +48123456789).',
      valid: false
    });
  }

  try {
    const existingUser = await User.findOne({ phoneNumber: phone });
    
    if (existingUser) {
      return res.status(200).json({ 
        exists: true,
        message: 'Ten numer telefonu jest już przypisany do innego konta. Użyj innego numeru.',
        valid: false,
        code: 'PHONE_ALREADY_EXISTS'
      });
    }
    
    return res.status(200).json({ 
      exists: false,
      message: 'Numer telefonu jest dostępny.',
      valid: true
    });
  } catch (error) {
    console.error('Error checking phone:', error);
    return res.status(500).json({ 
      exists: false,
      message: 'Błąd podczas sprawdzania numeru telefonu.',
      valid: false
    });
  }
};

/**
 * Verify email code
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const verifyEmailCode = async (req, res) => {
  const { email, code } = req.body;
  console.log(`Email verification attempt: ${email}, code: ${code}`);
  
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ 
      success: false,
      message: 'Invalid verification code format.' 
    });
  }

  try {
    // TEST: Always accept code 123456
    if (code === '123456') {
      console.log('Email verification successful - test code 123456');
      return res.status(200).json({ 
        success: true, 
        message: 'Email verified successfully' 
      });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User with this email address does not exist.' 
      });
    }

    // In real application check twoFACode etc.
    if (user.twoFACode === code) {
      user.twoFACode = null;
      user.twoFACodeExpires = null;
      await user.save();
      
      return res.status(200).json({ 
        success: true,
        message: 'Email verified successfully' 
      });
    }
    
    return res.status(400).json({ 
      success: false,
      message: 'Invalid verification code' 
    });
  } catch (error) {
    console.error('Email code verification error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Server error during code verification'
    });
  }
};
