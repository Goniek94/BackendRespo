import User from '../../models/user.js';

// Sprawdzanie czy email istnieje
export const checkEmailExists = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      message: 'Adres email jest wymagany.'
    });
  }

  try {
    const existingUser = await User.findOne({ email });
    return res.status(200).json({
      exists: !!existingUser
    });
  } catch (error) {
    console.error('Błąd sprawdzania email:', error);
    return res.status(500).json({
      message: 'Błąd podczas sprawdzania adresu email.'
    });
  }
};

// Sprawdzanie czy telefon istnieje
export const checkPhoneExists = async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({
      message: 'Numer telefonu jest wymagany.'
    });
  }

  try {
    const existingUser = await User.findOne({ phoneNumber: phone });
    return res.status(200).json({
      exists: !!existingUser
    });
  } catch (error) {
    console.error('Błąd sprawdzania telefonu:', error);
    return res.status(500).json({
      message: 'Błąd podczas sprawdzania numeru telefonu.'
    });
  }
};