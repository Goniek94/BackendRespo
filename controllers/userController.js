// src/controllers/userController.js
import crypto from 'crypto';
import { sendVerificationCode } from '../config/twilio.js'; 
import User from '../models/user.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendResetPasswordEmail } from '../config/nodemailer.js';
import { validationResult } from 'express-validator';

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

// Wysyłanie kodu 2FA
export const send2FACode = async (req, res) => {
  const { phone } = req.body;
  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await sendVerificationCode(phone, code);
    return res.status(200).json({ message: 'Kod weryfikacyjny został wysłany.' });
  } catch (error) {
    console.error('Błąd podczas wysyłania kodu:', error);
    return res.status(500).json({ message: 'Błąd podczas wysyłania kodu weryfikacyjnego.' });
  }
};

// Rejestracja użytkownika
export const registerUser = async (req, res) => {
  // Obsługa błędów walidacji
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, lastName, email, phone, password, dob } = req.body;

  try {
    // Sprawdź poprawność daty urodzenia
    let dobDate;
    try {
      dobDate = new Date(dob);
      if (isNaN(dobDate.getTime())) {
        return res.status(400).json({ 
          message: 'Nieprawidłowy format daty urodzenia.',
          field: 'dob' 
        });
      }
      
      // Sprawdź zakres wieku (16-100 lat)
      const today = new Date();
      let age = today.getFullYear() - dobDate.getFullYear();
      const monthDiff = today.getMonth() - dobDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) {
        age--;
      }
      
      if (age < 16 || age > 100) {
        return res.status(400).json({ 
          message: 'Musisz mieć co najmniej 16 lat i maksymalnie 100 lat, aby się zarejestrować.',
          field: 'dob' 
        });
      }
    } catch (err) {
      return res.status(400).json({ 
        message: 'Nieprawidłowy format daty urodzenia.',
        field: 'dob' 
      });
    }
    
    // Sprawdź format numeru telefonu dla polskiego numeru (tylko dla +48)
    if (phone.startsWith('+48') && !phone.match(/^\+48\d{9}$/)) {
      return res.status(400).json({ 
        message: 'Nieprawidłowy format polskiego numeru telefonu. Powinien zawierać prefiks +48 i dokładnie 9 cyfr.',
        field: 'phone' 
      });
    }
    
    // Ogólna walidacja formatu telefonu dla innych krajów
    if (!phone.match(/^\+\d{1,4}\d{6,14}$/)) {
      return res.status(400).json({ 
        message: 'Nieprawidłowy format numeru telefonu.',
        field: 'phone' 
      });
    }
    
    // Sprawdź czy użytkownik o takim email już istnieje
    const existingUserEmail = await User.findOne({ email });
    if (existingUserEmail) {
      return res.status(400).json({ 
        message: 'Użytkownik o tym adresie email już istnieje.',
        field: 'email' 
      });
    }

    // Sprawdź czy użytkownik o takim numerze telefonu już istnieje
    const existingUserPhone = await User.findOne({ phoneNumber: phone });
    if (existingUserPhone) {
      return res.status(400).json({ 
        message: 'Ten numer telefonu jest już przypisany do innego konta.',
        field: 'phone' 
      });
    }

    // Generuj kod 2FA
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Utwórz nowego użytkownika
    const user = new User({
      name,
      lastName,
      email,
      phoneNumber: phone, // Pełny numer z prefiksem
      password, // zahashuje się przez hook pre-save
      dob: dobDate, // Przechowuj jako obiekt Date
      is2FAEnabled: true, 
      twoFACode: code, 
      twoFACodeExpires: Date.now() + 10 * 60 * 1000
    });

    // Wyślij kod weryfikacyjny
    await sendVerificationCode(phone, code);

    // Zapisz użytkownika w bazie
    await user.save();

    return res.status(201).json({ 
      message: 'Zarejestrowano pomyślnie. Kod weryfikacyjny został wysłany.'
    });
  } catch (error) {
    console.error('Błąd podczas rejestracji:', error);
    return res.status(500).json({ message: 'Błąd podczas rejestracji użytkownika.' });
  }
};

// Logowanie użytkownika (z prawdziwym tokenem)
export const loginUser = async (req, res) => {
  // Walidacja
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Użytkownik nie istnieje.' });
    }

    // Sprawdź hasło
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Niepoprawne hasło.' });
    }

    // Generuj token JWT
    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );
    
    // Zwróć token i podstawowe dane
    return res.status(200).json({ 
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name || user.email.split('@')[0],
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        dob: user.dob ? user.dob.toISOString().split('T')[0] : null,
        isAuthenticated: true
      }
    });
  } catch (error) {
    console.error('Błąd podczas logowania:', error);
    return res.status(500).json({ message: 'Błąd podczas logowania użytkownika.' });
  }
};

// Weryfikacja kodu 2FA
export const verify2FACode = async (req, res) => {
  const { email, code } = req.body;
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ message: 'Niepoprawny format kodu 2FA.' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user || !user.is2FAEnabled) {
      return res.status(400).json({ message: '2FA nie jest włączone lub użytkownik nie istnieje.' });
    }

    if (user.twoFACodeExpires < Date.now()) {
      return res.status(400).json({ message: 'Kod wygasł. Proszę poprosić o nowy kod.' });
    }

    if (user.twoFACode === code) {
      user.twoFACode = null;
      user.twoFACodeExpires = null;
      await user.save();
      
      // Token JWT po 2FA
      const token = jwt.sign(
        { userId: user._id }, 
        process.env.JWT_SECRET, 
        { expiresIn: '1h' }
      );
      
      return res.status(200).json({ 
        message: 'Kod weryfikacyjny poprawny, zalogowano.',
        token,
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          name: user.name,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          dob: user.dob ? user.dob.toISOString().split('T')[0] : null,
          isAuthenticated: true
        }
      });
    }
    return res.status(400).json({ message: 'Niepoprawny kod weryfikacyjny.' });
  } catch (error) {
    console.error('Błąd podczas weryfikacji kodu:', error);
    return res.status(500).json({ message: 'Błąd podczas weryfikacji kodu.' });
  }
};

// Weryfikacja kodu email
export const verifyEmailCode = async (req, res) => {
  const { email, code } = req.body;
  console.log(`Próba weryfikacji kodu email: ${email}, kod: ${code}`);
  
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ 
      success: false,
      message: 'Niepoprawny format kodu weryfikacyjnego.' 
    });
  }

  try {
    // TESTOWO: Zawsze akceptuj kod 123456
    if (code === '123456') {
      console.log('Weryfikacja email udana - kod testowy 123456');
      return res.status(200).json({ 
        success: true, 
        message: 'Email zweryfikowany pomyślnie' 
      });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Użytkownik o podanym adresie email nie istnieje.' 
      });
    }

    // W realnej aplikacji sprawdź twoFACode itp.
    if (user.twoFACode === code) {
      user.twoFACode = null;
      user.twoFACodeExpires = null;
      await user.save();
      
      return res.status(200).json({ 
        success: true,
        message: 'Email zweryfikowany pomyślnie' 
      });
    }
    
    return res.status(400).json({ 
      success: false,
      message: 'Nieprawidłowy kod weryfikacyjny' 
    });
  } catch (error) {
    console.error('Błąd weryfikacji kodu email:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Błąd serwera podczas weryfikacji kodu'
    });
  }
};

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

    // Wysyłka maila z tokenem
    await sendResetPasswordEmail(email, token);

    return res.status(200).json({ message: 'Link do resetowania hasła został wysłany na podany adres email.' });
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
    const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/;
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
  const userId = req.user.id;

  try {
    // Weryfikacja formatu nowego hasła
    const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ 
        message: 'Nowe hasło nie spełnia wymagań bezpieczeństwa.',
        field: 'newPassword'
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Użytkownik nie został znaleziony.' });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ 
        message: 'Obecne hasło jest nieprawidłowe.',
        field: 'oldPassword'
      });
    }

    user.password = newPassword; // Hook pre-save zahashuje hasło
    await user.save();

    return res.status(200).json({ message: 'Hasło zostało zmienione pomyślnie.' });
  } catch (error) {
    console.error('Błąd podczas zmiany hasła:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas zmiany hasła.' });
  }
};

// Pobranie danych użytkownika
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Użytkownik nie został znaleziony.' });
    }
    
    // Zwracamy tylko bezpieczne dane
    return res.status(200).json({
      id: user._id,
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      dob: user.dob ? user.dob.toISOString().split('T')[0] : null,
      role: user.role,
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('Błąd pobierania profilu użytkownika:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas pobierania danych użytkownika.' });
  }
};

// Aktualizacja danych użytkownika
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, lastName } = req.body;
    
    // Sprawdź czy pola są poprawne
    if (name && name.length < 2) {
      return res.status(400).json({ 
        message: 'Imię musi zawierać co najmniej 2 znaki.',
        field: 'name'
      });
    }
    
    if (lastName && lastName.length < 2) {
      return res.status(400).json({ 
        message: 'Nazwisko musi zawierać co najmniej 2 znaki.',
        field: 'lastName'
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Użytkownik nie został znaleziony.' });
    }
    
    // Aktualizuj tylko dozwolone pola
    if (name) user.name = name;
    if (lastName) user.lastName = lastName;
    
    await user.save();
    
    return res.status(200).json({
      message: 'Profil został zaktualizowany pomyślnie.',
      user: {
        id: user._id,
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        dob: user.dob ? user.dob.toISOString().split('T')[0] : null,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Błąd aktualizacji profilu użytkownika:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas aktualizacji danych użytkownika.' });
  }
};