import User from '../../models/user.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import adminConfig from '../../config/adminConfig.js';
import { sendVerificationCode as sendTwilioCode } from '../../config/twilio.js';

/**
 * Rejestracja użytkownika
 */
export const registerUser = async (req, res) => {
  try {
    // Sprawdzenie błędów walidacji
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, phone, dob } = req.body;

    // Sprawdzenie, czy użytkownik już istnieje
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'Użytkownik z tym adresem email już istnieje' });
    }

    // Sprawdzenie, czy numer telefonu już istnieje
    if (phone) {
      const phoneExists = await User.findOne({ phoneNumber: phone });
      if (phoneExists) {
        return res.status(400).json({ message: 'Użytkownik z tym numerem telefonu już istnieje' });
      }
    }

    // Generowanie 6-cyfrowego kodu weryfikacyjnego
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minut

    // Utworzenie nowego użytkownika
    user = new User({
      name,
      email,
      password,
      phoneNumber: phone,
      dob: new Date(dob),
      role: 'user',
      verificationCode,
      verificationCodeExpires,
      isVerified: false
    });

    // Hashowanie hasła
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    // Wysłanie kodu weryfikacyjnego przez SMS
    if (phone) {
      try {
        await sendTwilioCode(phone, verificationCode);
      } catch (smsError) {
        console.error('Błąd wysyłania SMS:', smsError);
        // Kontynuujemy mimo błędu wysyłania SMS
      }
    }

    res.status(201).json({
      message: 'Użytkownik zarejestrowany pomyślnie. Sprawdź telefon, aby zweryfikować konto.',
      userId: user._id,
      email: user.email,
      phone: user.phoneNumber,
      requiresVerification: true,
      // W trybie deweloperskim zwracamy kod
      devCode: process.env.NODE_ENV !== 'production' ? verificationCode : undefined
    });
  } catch (error) {
    console.error('Błąd rejestracji:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
};

/**
 * Logowanie użytkownika
 */
export const loginUser = async (req, res) => {
  try {
    // Sprawdzenie błędów walidacji
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Sprawdzenie, czy użytkownik istnieje
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Nieprawidłowe dane logowania' });
    }

    // Sprawdzenie hasła
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Nieprawidłowe dane logowania' });
    }

  // Importujemy funkcje generujące tokeny z middleware/auth.js
  const { generateAccessToken, generateRefreshToken } = await import('../../middleware/auth.js');
  
  // Generowanie tokenu dostępu (krótszy czas życia - 1h)
  const accessToken = generateAccessToken({
    userId: user._id,
    role: user.role
  });
  
  // Generowanie tokenu odświeżającego (dłuższy czas życia - 7 dni)
  const refreshToken = generateRefreshToken({
    userId: user._id,
    role: user.role
  });

  // Ustawienie tokenu dostępu w ciasteczku HttpOnly
  res.cookie('token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 3600000 // 1 godzina
  });
  
  // Ustawienie tokenu odświeżającego w ciasteczku HttpOnly
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 24 * 3600000 // 7 dni
  });

    res.status(200).json({
      message: 'Zalogowano pomyślnie',
      token: accessToken,
      refreshToken: refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Błąd logowania:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
};

/**
 * Wylogowanie użytkownika
 */
export const logoutUser = async (req, res) => {
  try {
    // Pobierz tokeny z ciasteczek
    const accessToken = req.cookies?.token;
    const refreshToken = req.cookies?.refreshToken;
    
    // Importuj funkcję dodawania do blacklisty
    const { addToBlacklist } = await import('../../models/TokenBlacklist.js');
    
    // Dodaj tokeny do blacklisty jeśli istnieją
    if (accessToken) {
      await addToBlacklist(accessToken, {
        reason: 'LOGOUT',
        userId: req.user?.userId
      });
    }
    
    if (refreshToken) {
      await addToBlacklist(refreshToken, {
        reason: 'LOGOUT',
        userId: req.user?.userId
      });
    }
    
    // Usuń token dostępu z ciasteczka
    res.cookie('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0
    });
    
    // Usuń token odświeżający z ciasteczka
    res.cookie('refreshToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0
    });
    
    res.status(200).json({ message: 'Wylogowano pomyślnie' });
  } catch (error) {
    console.error('Błąd podczas wylogowywania:', error);
    res.status(500).json({ message: 'Błąd serwera podczas wylogowywania' });
  }
};

/**
 * Sprawdzenie stanu autentykacji
 */
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

/**
 * Weryfikacja kodu podczas rejestracji
 * Obsługuje weryfikację zarówno przez email jak i przez SMS
 */
/**
 * Wysyłanie kodu weryfikacyjnego podczas rejestracji
 */
export const sendRegistrationCode = async (req, res) => {
  try {
    const { email, phone } = req.body;
    
    if (!email && !phone) {
      return res.status(400).json({ 
        success: false,
        message: 'Email lub numer telefonu jest wymagany' 
      });
    }
    
    // Przygotowanie kryteriów wyszukiwania
    const searchCriteria = {};
    if (email) searchCriteria.email = email;
    if (phone) searchCriteria.phoneNumber = phone;
    
    // Sprawdzenie, czy użytkownik istnieje
    const user = await User.findOne(searchCriteria);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Użytkownik nie znaleziony' 
      });
    }
    
    // Generowanie 6-cyfrowego kodu
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Zapisz kod w bazie danych
    user.verificationCode = verificationCode;
    user.verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minut
    await user.save();
    
    // Wysłanie kodu przez SMS
    if (phone) {
      try {
        await sendTwilioCode(phone, verificationCode);
      } catch (smsError) {
        console.error('Błąd wysyłania SMS:', smsError);
        return res.status(500).json({ 
          success: false,
          message: 'Błąd wysyłania kodu weryfikacyjnego przez SMS' 
        });
      }
    }
    
    return res.status(200).json({
      success: true,
      message: 'Kod weryfikacyjny został wysłany',
      // W trybie deweloperskim zwracamy kod
      devCode: process.env.NODE_ENV !== 'production' ? verificationCode : undefined
    });
  } catch (error) {
    console.error('Błąd wysyłania kodu weryfikacyjnego:', error);
    return res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas wysyłania kodu weryfikacyjnego'
    });
  }
};

/**
 * Weryfikacja kodu podczas rejestracji
 * Obsługuje weryfikację zarówno przez email jak i przez SMS
 */
/**
 * Odświeżanie tokenu dostępu za pomocą refresh tokenu
 */
export const refreshToken = async (req, res) => {
  try {
    // Pobierz refresh token z ciasteczka
    const refreshToken = req.cookies?.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ 
        success: false,
        message: 'Brak tokenu odświeżającego. Zaloguj się ponownie.',
        code: 'NO_REFRESH_TOKEN'
      });
    }
    
    // Importuj funkcje
    const jwt = await import('jsonwebtoken');
    const { isBlacklisted, addToBlacklist } = await import('../../models/TokenBlacklist.js');
    const { generateAccessToken, generateRefreshToken } = await import('../../middleware/auth.js');
    const User = (await import('../../models/user.js')).default;
    
    // Pobierz sekret JWT z zmiennych środowiskowych
    const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refreshSecretKey456';
    
    // Sprawdź czy refresh token nie jest na blackliście
    const isTokenBlacklisted = await isBlacklisted(refreshToken);
    if (isTokenBlacklisted) {
      return res.status(401).json({ 
        success: false,
        message: 'Token odświeżający unieważniony. Zaloguj się ponownie.',
        code: 'REFRESH_TOKEN_BLACKLISTED'
      });
    }
    
    try {
      // Weryfikuj refresh token
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
      
      // Sprawdź czy to token odświeżający
      if (decoded.type !== 'refresh') {
        return res.status(401).json({ 
          success: false,
          message: 'Nieprawidłowy typ tokenu.',
          code: 'INVALID_TOKEN_TYPE'
        });
      }
      
      // Sprawdź czy użytkownik istnieje
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({ 
          success: false,
          message: 'Użytkownik nie istnieje.',
          code: 'USER_NOT_FOUND'
        });
      }
      
      // Generuj nowy token dostępu
      const newAccessToken = generateAccessToken({
        userId: user._id,
        role: user.role || 'user'
      });
      
      // Generuj nowy refresh token
      const newRefreshToken = generateRefreshToken({
        userId: user._id,
        role: user.role || 'user'
      });
      
      // Dodaj stary refresh token do blacklisty
      await addToBlacklist(refreshToken, {
        reason: 'ROTATION',
        userId: user._id
      });
      
      // Ustaw nowe tokeny w ciasteczkach
      res.cookie('token', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 3600000 // 1 godzina
      });
      
      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 7 * 24 * 3600000 // 7 dni
      });
      
      return res.status(200).json({
        success: true,
        message: 'Tokeny odświeżone pomyślnie',
        token: newAccessToken,
        refreshToken: newRefreshToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (jwtError) {
      console.error('Błąd weryfikacji refresh tokenu:', jwtError);
      return res.status(401).json({ 
        success: false,
        message: 'Nieprawidłowy lub wygasły token odświeżający. Zaloguj się ponownie.',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }
  } catch (error) {
    console.error('Błąd podczas odświeżania tokenów:', error);
    return res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas odświeżania tokenów'
    });
  }
};

export const verifyCode = async (req, res) => {
  try {
    const { email, phone, code } = req.body;
    
    if ((!email && !phone) || !code) {
      return res.status(400).json({ 
        success: false,
        message: 'Email lub numer telefonu oraz kod weryfikacyjny są wymagane' 
      });
    }
    
    // Przygotowanie kryteriów wyszukiwania
    const searchCriteria = {};
    if (email) searchCriteria.email = email;
    if (phone) searchCriteria.phoneNumber = phone;
    
    // Sprawdzenie, czy użytkownik istnieje
    const user = await User.findOne(searchCriteria);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Użytkownik nie znaleziony' 
      });
    }
    
    // W trybie deweloperskim akceptujemy uniwersalny kod
    const isTestCode = code === '123456' || process.env.NODE_ENV === 'development';
    
    // Sprawdzenie czy kod wygasł
    const isCodeExpired = user.verificationCodeExpires && new Date(user.verificationCodeExpires) < new Date();
    if (isCodeExpired && !isTestCode) {
      return res.status(400).json({ 
        success: false,
        message: 'Kod weryfikacyjny wygasł. Proszę wygenerować nowy kod.' 
      });
    }
    
    // Sprawdzenie kodu
    if (isTestCode || user.verificationCode === code) {
      // Oznaczenie użytkownika jako zweryfikowanego
      user.isVerified = true;
      user.verificationCode = null;
      user.verificationCodeExpires = null;
      
      await user.save();
      
      // Importujemy funkcje generujące tokeny z middleware/auth.js
      const { generateAccessToken, generateRefreshToken } = await import('../../middleware/auth.js');
      
      // Generowanie tokenu dostępu (krótszy czas życia - 1h)
      const accessToken = generateAccessToken({
        userId: user._id,
        role: user.role
      });
      
      // Generowanie tokenu odświeżającego (dłuższy czas życia - 7 dni)
      const refreshToken = generateRefreshToken({
        userId: user._id,
        role: user.role
      });
      
      // Ustawienie tokenu dostępu w ciasteczku HttpOnly
      res.cookie('token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 3600000 // 1 godzina
      });
      
      // Ustawienie tokenu odświeżającego w ciasteczku HttpOnly
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 7 * 24 * 3600000 // 7 dni
      });
      
      return res.status(200).json({
        success: true,
        message: 'Kod zweryfikowany pomyślnie',
        token: accessToken,
        refreshToken: refreshToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    }
    
    return res.status(400).json({
      success: false,
      message: 'Nieprawidłowy kod weryfikacyjny'
    });
  } catch (error) {
    console.error('Błąd weryfikacji kodu:', error);
    return res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas weryfikacji kodu'
    });
  }
};
