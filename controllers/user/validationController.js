import User from '../../models/user.js';

/**
 * Check if email exists
 */
export const checkEmailExists = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email jest wymagany'
      });
    }

    // Check if user with this email exists
    const existingUser = await User.findOne({ 
      email: email.toLowerCase().trim() 
    });

    res.status(200).json({
      success: true,
      exists: !!existingUser,
      message: existingUser ? 'Email już istnieje' : 'Email jest dostępny'
    });

  } catch (error) {
    console.error('❌ Check email error:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas sprawdzania email'
    });
  }
};

/**
 * Check if phone exists
 */
export const checkPhoneExists = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Numer telefonu jest wymagany'
      });
    }

    // Check if user with this phone exists
    const existingUser = await User.findOne({ 
      phoneNumber: phone 
    });

    res.status(200).json({
      success: true,
      exists: !!existingUser,
      message: existingUser ? 'Numer telefonu już istnieje' : 'Numer telefonu jest dostępny'
    });

  } catch (error) {
    console.error('❌ Check phone error:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas sprawdzania numeru telefonu'
    });
  }
};

/**
 * Verify email code (placeholder)
 */
export const verifyEmailCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email i kod są wymagane'
      });
    }

    // TODO: Implement email verification logic
    console.log(`📧 Email verification requested for: ${email} with code: ${code}`);

    res.status(200).json({
      success: true,
      message: 'Funkcja weryfikacji email tymczasowo niedostępna'
    });

  } catch (error) {
    console.error('❌ Verify email error:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas weryfikacji email'
    });
  }
};
