import User from '../../models/user.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendResetPasswordEmail } from '../../config/nodemailer.js';
import { validationResult } from 'express-validator';

// Żądanie resetu hasła
export const requestPasswordReset = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Użytkownik o podanym adresie email nie istnieje.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 godzina
    await user.save();

    try {
      // W produkcji:
      // await sendResetPasswordEmail(email, token);
      console.log(`Token resetu hasła dla ${email}: ${token}`);

      return res.status(200).json({ message: 'Link do resetowania hasła został wysłany na podany adres email.'
});
    } catch (emailError) {
      console.error('Błąd wysyłania emaila z resetem hasła:', emailError);
      return res.status(500).json({ message: 'Błąd serwera podczas wysyłania emaila.' });
    }
  } catch (error) {
    console.error('Błąd resetowania hasła:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas resetowania hasła.' });
  }
};

// Weryfikacja tokenu resetowania hasła
export const verifyResetToken = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'Token resetowania hasła jest wymagany.'
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
        message: 'Token resetowania hasła jest nieprawidłowy lub wygasł.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Token jest prawidłowy.',
      email: user.email
    });
  } catch (error) {
    console.error('Błąd weryfikacji tokenu:', error);
    return res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas weryfikacji tokenu.'
    });
  }
};

// Resetowanie hasła
export const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  try {
    // Weryfikacja formatu hasła
    const passwordRegex =
/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: 'Hasło nie spełnia wymagań bezpieczeństwa.',
        field: 'password'
      });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Token resetowania hasła jest nieprawidłowy lub wygasł.' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.status(200).json({ message: 'Hasło zostało zmienione pomyślnie.' });
  } catch (error) {
    console.error('Błąd przy zmianie hasła:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas zmiany hasła.' });
  }
};

// Zmiana hasła (gdy użytkownik jest zalogowany)
export const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.userId;

  console.log('Próba zmiany hasła dla użytkownika:', userId);
  console.log('Dane żądania:', { oldPassword: '***', newPassword: '***' });

  try {
    // Weryfikacja formatu nowego hasła
    const passwordRegex =
/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/;
    
    console.log('Sprawdzanie formatu hasła...');
    if (!passwordRegex.test(newPassword)) {
      console.log('Hasło nie spełnia wymagań bezpieczeństwa');
      return res.status(400).json({
        message: 'Nowe hasło nie spełnia wymagań bezpieczeństwa.',
        field: 'newPassword'
      });
    }
    console.log('Format hasła poprawny');

    console.log('Wyszukiwanie użytkownika w bazie danych...');
    const user = await User.findById(userId);
    if (!user) {
      console.log('Użytkownik nie znaleziony:', userId);
      return res.status(404).json({ message: 'Użytkownik nie został znaleziony.' });
    }
    console.log('Użytkownik znaleziony:', user._id);

    console.log('Porównywanie starego hasła...');
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      console.log('Stare hasło nieprawidłowe');
      return res.status(400).json({
        message: 'Obecne hasło jest nieprawidłowe.',
        field: 'oldPassword'
      });
    }
    console.log('Stare hasło poprawne');

    console.log('Aktualizacja hasła...');
    user.password = newPassword; // Hook pre-save zahashuje hasło
    
    try {
      await user.save();
      console.log('Hasło zaktualizowane pomyślnie');
    } catch (saveError) {
      console.error('Błąd podczas zapisywania hasła:', saveError);
      return res.status(500).json({ 
        message: 'Błąd serwera podczas zapisywania hasła.', 
        error: saveError.message 
      });
    }

    console.log('Zmiana hasła zakończona pomyślnie');
    return res.status(200).json({ message: 'Hasło zostało zmienione pomyślnie.' });
  } catch (error) {
    console.error('Błąd podczas zmiany hasła:', error);
    return res.status(500).json({ 
      message: 'Błąd serwera podczas zmiany hasła.', 
      error: error.message 
    });
  }
};
