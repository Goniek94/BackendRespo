/**
 * Auth Controller - Kontroler autentykacji
 */
import User from '../../models/user.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const registerGoogleUser = (req, res) => {
  res.status(501).json({ message: 'registerGoogleUser not implemented' });
};

export const completeGoogleUserProfile = (req, res) => {
  res.status(501).json({ message: 'completeGoogleUserProfile not implemented' });
};

/**
 * Weryfikacja kodu i finalizacja rejestracji
 */
export const verifyCode = async (req, res) => {
  try {
    const { email, code, type } = req.body;
    
    if (!email || !code || !type) {
      return res.status(400).json({
        message: 'Email, kod i typ weryfikacji są wymagane.'
      });
    }
    
    // W trybie testowym akceptujemy kod 123456
    if (code === '123456') {
      if (type === 'email') {
        // Aktualizuj użytkownika jako zweryfikowanego (jeśli istnieje)
        const user = await User.findOne({ email });
        if (user) {
          user.isEmailVerified = true;
          await user.save();
        }
      }
      
      return res.status(200).json({
        message: 'Kod weryfikacyjny poprawny',
        verified: true
      });
    }
    
    return res.status(400).json({
      message: 'Nieprawidłowy kod weryfikacyjny',
      verified: false
    });
  } catch (error) {
    console.error('Błąd weryfikacji kodu:', error);
    res.status(500).json({
      message: 'Wystąpił błąd podczas weryfikacji. Spróbuj ponownie później.'
    });
  }
};

export const registerUser = async (req, res) => {
  try {
    const { name, lastName, email, phone, password, dob, marketingAccepted } = req.body;

    // Podstawowa walidacja
    if (!name || !lastName || !email || !phone || !password || !dob) {
      return res.status(400).json({
        message: 'Wszystkie wymagane pola muszą być wypełnione.'
      });
    }

    // Sprawdź czy email już istnieje
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        message: 'Użytkownik o tym adresie email już istnieje.'
      });
    }

    // Sprawdź czy telefon już istnieje
    const existingPhone = await User.findOne({ phoneNumber: phone });
    if (existingPhone) {
      return res.status(400).json({
        message: 'Użytkownik o tym numerze telefonu już istnieje.'
      });
    }

    // Stwórz nowego użytkownika
    const newUser = new User({
      name,
      lastName,
      email,
      phoneNumber: phone,
      password, // Zostanie zahashowane przez middleware pre-save
      dob: new Date(dob),
      notificationPreferences: {
        email: true,
        sms: false,
        push: false
      },
      privacySettings: {
        showEmail: false,
        showPhone: false,
        showProfile: true
      },
      isEmailVerified: true, // Zakładamy, że email zweryfikowany przez process rejestracji
      isPhoneVerified: true, // Zakładamy, że telefon zweryfikowany przez process rejestracji
      isVerified: true,      // Użytkownik jest zweryfikowany
      registrationType: 'standard'
    });

    // Zapisz użytkownika w bazie
    await newUser.save();

    // Tworzenie tokena JWT
    const token = jwt.sign(
      { 
        userId: newUser._id, 
        email: newUser.email, 
        role: newUser.role || 'user',
        lastActivity: Date.now()
      },
      process.env.JWT_SECRET || 'tajnyklucz',
      { expiresIn: '7d' }
    );

    // Ustawienie tokena w cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dni
    });

    // Zwróć użytkownika bez hasła i z tokenem
    const userResponse = newUser.toObject();
    delete userResponse.password;

    res.status(201).json({
      message: 'Rejestracja zakończona sukcesem',
      user: userResponse,
      token
    });
  } catch (error) {
    console.error('Błąd rejestracji użytkownika:', error);
    res.status(500).json({
      message: 'Wystąpił błąd podczas rejestracji. Spróbuj ponownie później.'
    });
  }
};


export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email i hasło są wymagane.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Nieprawidłowy email lub hasło.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Nieprawidłowy email lub hasło.' });
    }

    // Tworzenie tokena JWT
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role || 'user',
        lastActivity: Date.now()
      },
      process.env.JWT_SECRET || 'tajnyklucz',
      { expiresIn: '7d' }
    );

    // Ustawienie tokena w cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dni
    });

    res.status(200).json({
      message: 'Zalogowano pomyślnie',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        lastName: user.lastName,
        role: user.role
      },
      token
    });
  } catch (error) {
    res.status(500).json({ message: 'Błąd serwera podczas logowania.' });
  }
};

export const logout = (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0
  });
  res.status(200).json({ message: 'Wylogowano' });
};

export const checkAuth = async (req, res) => {
  try {
    // Token już sprawdzony przez middleware auth
    const userId = req.user.userId;
    
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Użytkownik nie znaleziony' });
    }
    
    res.status(200).json({ 
      isAuthenticated: true,
      user
    });
  } catch (error) {
    console.error('Błąd sprawdzania autentykacji:', error);
    res.status(500).json({ 
      isAuthenticated: false,
      message: 'Błąd sprawdzania autentykacji' 
    });
  }
};
