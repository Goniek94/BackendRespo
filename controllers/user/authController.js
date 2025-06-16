import User from '../../models/user.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import adminConfig from '../../config/adminConfig.js';

/**
 * Rejestracja użytkownika
 * @param {Object} req - Obiekt żądania
 * @param {Object} res - Obiekt odpowiedzi
 * @returns {Object} - Odpowiedź JSON
 */
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
      password, // zahaszuje się przez hook pre-save
      dob: dobDate, // Przechowuj jako obiekt Date
      is2FAEnabled: true, 
      twoFACode: code, 
      twoFACodeExpires: Date.now() + 10 * 60 * 1000
    });

    // Wyślij kod weryfikacyjny
    // await sendVerificationCode(phone, code);

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

/**
 * Logowanie użytkownika
 * @param {Object} req - Obiekt żądania
 * @param {Object} res - Obiekt odpowiedzi
 * @returns {Object} - Odpowiedź JSON
 */
export const loginUser = async (req, res) => {
  // FAKE LOGIN FOR TESTING: Always return success and a fake token, no DB required
  // !!! REMOVE THIS BLOCK AFTER TESTING !!!
  try {
    const fakeUser = {
      _id: '1',
      email: 'test@autosell.pl',
      role: 'user',
      name: 'Test',
      lastName: 'User',
      phoneNumber: '+48123456789',
      dob: '1990-01-01',
    };
    const token = jwt.sign(
      {
        userId: fakeUser._id,
        role: fakeUser.role,
        lastActivity: Date.now(),
      },
      process.env.JWT_SECRET || 'testsecret',
      { expiresIn: '24h' }
    );
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 86400000,
    });
    return res.status(200).json({
      user: {
        id: fakeUser._id,
        email: fakeUser.email,
        role: fakeUser.role,
        name: fakeUser.name,
        lastName: fakeUser.lastName,
        phoneNumber: fakeUser.phoneNumber,
        dob: fakeUser.dob,
        isAuthenticated: true,
        isAdmin: false,
        isModerator: false,
      },
      token: token,
    });
  } catch (error) {
    console.error('Fake login error:', error);
    return res.status(500).json({ message: 'Fake login error.' });
  }

  /*
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
    
    // Sprawdź czy email jest na liście administratorów i aktualizuj rolę jeśli potrzeba
    if (adminConfig.adminEmails.includes(email) && user.role !== 'admin') {
      console.log(`Wykryto administratora: ${email} - aktualizacja roli`);
      user.role = adminConfig.defaultAdminRole;
      await user.save();
    }

    // Generuj token JWT z uwzględnieniem roli
    const token = jwt.sign(
      { 
        userId: user._id,
        role: user.role,  // Dodajemy rolę do tokenu
        lastActivity: Date.now() // Dodajemy timestamp ostatniej aktywności
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' } // Zwiększamy czas ważności tokenu do 24h
    );
    
    // Ustawiamy token w HttpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Tylko HTTPS na produkcji
      sameSite: 'strict',
      path: '/',
      maxAge: 86400000 // 24 godziny w milisekundach
    });
    
    // Zwróć dane użytkownika i token
    return res.status(200).json({ 
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name || user.email.split('@')[0],
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        dob: user.dob ? user.dob.toISOString().split('T')[0] : null,
        isAuthenticated: true,
        isAdmin: user.role === 'admin',
        isModerator: user.role === 'moderator'
      },
      token: token // Dodajemy token do odpowiedzi
    });
  } catch (error) {
    console.error('Błąd podczas logowania:', error);
    return res.status(500).json({ message: 'Błąd podczas logowania użytkownika.' });
  }
  */
};

/**
 * Wylogowanie użytkownika
 * @param {Object} req - Obiekt żądania
 * @param {Object} res - Obiekt odpowiedzi
 * @returns {Object} - Odpowiedź JSON
 */
export const logoutUser = (req, res) => {
  console.log('Wylogowywanie użytkownika...');
  
  // Usuwamy ciasteczko z tokenem
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
  
  console.log('Ciasteczko z tokenem zostało usunięte');
  return res.status(200).json({ message: 'Wylogowano pomyślnie.' });
};

/**
 * Sprawdzanie stanu autoryzacji
 * @param {Object} req - Obiekt żądania
 * @param {Object} res - Obiekt odpowiedzi
 * @returns {Object} - Odpowiedź JSON
 */
export const checkAuth = (req, res) => {
  console.log('Sprawdzanie stanu autoryzacji...');
  console.log('Dane użytkownika z tokenu:', req.user);
  
  return res.status(200).json({ 
    isAuthenticated: true,
    user: {
      id: req.user.userId,
      role: req.user.role || 'user'
    }
  });
};

/**
 * Odświeżanie tokenu JWT
 * @param {Object} req - Obiekt żądania
 * @param {Object} res - Obiekt odpowiedzi
 * @returns {Object} - Odpowiedź JSON z nowym tokenem
 */
export const refreshToken = async (req, res) => {
  try {
    // Pobierz ID użytkownika z middleware auth
    const userId = req.user.userId;
    console.log('Odświeżanie tokenu dla użytkownika:', userId);
    
    // Pobierz użytkownika z bazy danych
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Użytkownik nie został znaleziony.' });
    }
    
    console.log('Użytkownik znaleziony');
    
    // Po udanym logowaniu resetuj licznik prób
    if (user.resetLoginAttempts) {
      console.log('Resetuję licznik nieudanych prób logowania');
      await user.resetLoginAttempts();
    }

    // Generuj token JWT z dłuższym czasem ważności
    const token = jwt.sign(
      { 
        userId: user._id,
        role: user.role,
        lastActivity: Date.now()
      }, 
      process.env.JWT_SECRET || 'tajnyKluczJWT123', 
      { expiresIn: '24h' }
    );
    
    console.log('Wygenerowano token JWT');
    
    // Ustawiamy token w HttpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000 // 24 godziny w milisekundach
    });
    
    // Zwróć dane użytkownika oraz token (dla zgodności z frontendem)
    return res.status(200).json({ 
      token: token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name || user.email.split('@')[0],
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        dob: user.dob ? user.dob.toISOString().split('T')[0] : null,
        isAuthenticated: true
      },
      debug: process.env.NODE_ENV !== 'production' ? {
        is2FAEnabled: !!user.is2FAEnabled,
        twoFACode: user.twoFACode
      } : undefined
    });
  } catch (error) {
    console.error('Błąd podczas odświeżania tokenu:', error);
    return res.status(500).json({ message: 'Błąd podczas odświeżania tokenu.' });
  }
};

/**
 * Pobranie danych użytkownika
 * @param {Object} req - Obiekt żądania
 * @param {Object} res - Obiekt odpowiedzi
 * @returns {Object} - Odpowiedź JSON
 */
export const getUserData = async (req, res) => {
  console.log('Pobieranie danych użytkownika...');
  try {
    const userId = req.user.userId;
    console.log('ID użytkownika z tokenu:', userId);
    
    const user = await User.findById(userId).select('-password');
    if (!user) {
      console.log('Użytkownik nie został znaleziony');
      return res.status(404).json({ message: 'Użytkownik nie został znaleziony.' });
    }
    
    console.log('Znaleziono użytkownika, zwracam dane');
    return res.status(200).json({ 
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
    console.error('Błąd pobierania danych użytkownika:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas pobierania danych użytkownika.' });
  }
};

// Register or authenticate user via Google OAuth
export const registerGoogleUser = async (req, res) => {
  return res.status(501).json({ message: 'Google auth not implemented.' });
};

// Complete Google profile with additional data
export const completeGoogleUserProfile = async (req, res) => {
  return res.status(501).json({ message: 'Complete Google profile not implemented.' });
};
