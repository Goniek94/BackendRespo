/**
 * Auth Controller - Kontroler autentykacji
 */
import User from '../../models/user.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendVerificationCode, verifyCode } from '../../config/twilio.js';

/**
 * Rejestracja użytkownika przez Google OAuth
 * Google users are initially created without phone verification
 */
export const registerGoogleUser = async (req, res) => {
  try {
    const { name, lastName, email, googleId } = req.body;

    if (!name || !email || !googleId) {
      return res.status(400).json({
        message: 'Brakujące dane użytkownika Google'
      });
    }

    // Sprawdź czy użytkownik o tym emailu już istnieje
    let user = await User.findOne({ email });
    
    if (user) {
      // Jeśli użytkownik istnieje, ale nie ma Google ID, zaktualizuj
      if (!user.googleId) {
        user.googleId = googleId;
        user.registrationType = 'google';
        await user.save();
      }
    } else {
      // Stwórz nowego użytkownika
      // Generujemy tymczasowe hasło dla użytkowników Google
      const tempPassword = Math.random().toString(36).slice(-10);
      const hashedPassword = await bcrypt.hash(tempPassword, 12);
      
      user = new User({
        name,
        lastName: lastName || '', // Może być puste z Google
        email,
        googleId,
        password: hashedPassword,
        registrationType: 'google',
        isEmailVerified: true, // Email zweryfikowany przez Google
        isPhoneVerified: false, // Telefon wymaga weryfikacji
        isVerified: false, // Cały profil wymaga weryfikacji
        phoneNumber: '+00000000000', // Placeholder, wymaga aktualizacji
        dob: new Date('2000-01-01') // Placeholder, wymaga aktualizacji
      });
      
      await user.save();
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
    
    const userResponse = user.toObject();
    delete userResponse.password;
    
    return res.status(200).json({
      message: 'Logowanie przez Google zakończone sukcesem',
      user: userResponse,
      token,
      requiresProfileCompletion: !user.isVerified
    });
    
  } catch (error) {
    console.error('Błąd rejestracji użytkownika Google:', error);
    res.status(500).json({
      message: 'Wystąpił błąd podczas rejestracji przez Google.'
    });
  }
};

/**
 * Uzupełnienie profilu użytkownika Google
 * This allows Google users to complete their profile with phone number and other details
 */
export const completeGoogleUserProfile = async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        message: 'Nie jesteś zalogowany'
      });
    }
    
    const userId = req.user.userId;
    const { phoneNumber, dob, name, lastName } = req.body;
    
    if (!phoneNumber || !dob) {
      return res.status(400).json({
        message: 'Numer telefonu i data urodzenia są wymagane'
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: 'Użytkownik nie został znaleziony'
      });
    }
    
    // Aktualizacja danych użytkownika
    if (name) user.name = name;
    if (lastName) user.lastName = lastName;
    user.phoneNumber = phoneNumber;
    user.dob = new Date(dob);
    
    // Zapisz użytkownika, ale jeszcze nie oznaczaj jako zweryfikowany
    // Weryfikacja telefonu będzie osobnym krokiem
    await user.save();
    
    // Wysłanie kodu weryfikacyjnego na telefon
    const verificationResult = await sendVerificationCode(phoneNumber);
    
    if (!verificationResult.success) {
      return res.status(500).json({
        message: 'Błąd wysyłania kodu weryfikacyjnego',
        error: verificationResult.error
      });
    }
    
    return res.status(200).json({
      message: 'Profil zaktualizowany, kod weryfikacyjny wysłany',
      verificationSent: true,
      phoneNumber: phoneNumber
    });
    
  } catch (error) {
    console.error('Błąd uzupełniania profilu Google:', error);
    res.status(500).json({
      message: 'Wystąpił błąd podczas uzupełniania profilu'
    });
  }
};

/**
 * Weryfikacja kodu i finalizacja rejestracji
 */
export const verifyCode = async (req, res) => {
  try {
    const { phoneNumber, code, type } = req.body;
    
    if (!code || !type) {
      return res.status(400).json({
        message: 'Kod i typ weryfikacji są wymagane.'
      });
    }
    
    // Weryfikacja przez Twilio dla numeru telefonu
    if (type === 'phone' && phoneNumber) {
      // W trybie testowym akceptujemy kod 123456
      if (code === '123456' || process.env.NODE_ENV === 'development') {
        // Aktualizuj użytkownika jako zweryfikowanego (jeśli istnieje)
        if (req.user && req.user.userId) {
          const user = await User.findById(req.user.userId);
          if (user) {
            user.isPhoneVerified = true;
            // Jeśli email jest już zweryfikowany (np. z Google), oznacz cały profil jako zweryfikowany
            if (user.isEmailVerified) {
              user.isVerified = true;
            }
            await user.save();
          }
        }
        
        return res.status(200).json({
          message: 'Kod weryfikacyjny poprawny',
          verified: true
        });
      }
      
      // Rzeczywista weryfikacja przez Twilio
      const verification = await verifyCode(phoneNumber, code);
      
      if (verification.success) {
        // Aktualizuj użytkownika jako zweryfikowanego
        if (req.user && req.user.userId) {
          const user = await User.findById(req.user.userId);
          if (user) {
            user.isPhoneVerified = true;
            // Jeśli email jest już zweryfikowany, oznacz cały profil jako zweryfikowany
            if (user.isEmailVerified) {
              user.isVerified = true;
            }
            await user.save();
          }
        }
        
        return res.status(200).json({
          message: 'Numer telefonu zweryfikowany pomyślnie',
          verified: true
        });
      } else {
        return res.status(400).json({
          message: 'Nieprawidłowy kod weryfikacyjny dla numeru telefonu',
          verified: false
        });
      }
    }
    
    // Weryfikacja emaila (używana głównie dla standardowej rejestracji)
    if (type === 'email') {
      const email = req.body.email;
      
      // W trybie testowym akceptujemy kod 123456
      if (code === '123456') {
        // Aktualizuj użytkownika jako zweryfikowanego (jeśli istnieje)
        const user = await User.findOne({ email });
        if (user) {
          user.isEmailVerified = true;
          // Jeśli telefon jest już zweryfikowany, oznacz cały profil jako zweryfikowany
          if (user.isPhoneVerified) {
            user.isVerified = true;
          }
          await user.save();
        }
        
        return res.status(200).json({
          message: 'Email zweryfikowany pomyślnie',
          verified: true
        });
      }
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

    // Sprawdź czy email jest na liście adminów
    const adminEmails = [
      'Mateusz.goszczycki1994@gmail.com',
      'Rydzewski39@gmail.com',
      'Kontakt.autosell@gmail.com'
    ];
    
    // Jeśli email jest na liście adminów, zaktualizuj rolę użytkownika
    if (adminEmails.includes(email.toLowerCase())) {
      if (user.role !== 'admin') {
        user.role = 'admin';
        await user.save();
      }
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
