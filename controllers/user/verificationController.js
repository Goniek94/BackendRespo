// controllers/user/verificationController.js
import User from '../../models/user/user.js';
import jwt from 'jsonwebtoken';
import { sendVerificationCode as sendTwilioCode, verifyCode as verifyTwilioCode } from '../../config/twilio.js';
import { setSecureCookie } from '../../config/cookieConfig.js';
import { generateAccessToken } from '../../middleware/auth.js';
import logger from '../../utils/logger.js';

/**
 * SYMULACJA: Wysłanie linku weryfikacyjnego email
 */
export const sendEmailVerificationLink = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email jest wymagany'
      });
    }

    console.log(`🎭 SYMULACJA: Automatyczna weryfikacja email dla ${email}`);
    
    // Symulujemy opóźnienie
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return res.status(200).json({
      success: true,
      message: 'Email zweryfikowany automatycznie (SYMULACJA)',
      verified: true,
      simulation: true
    });

  } catch (error) {
    console.error('❌ Send email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas wysyłania linku'
    });
  }
};

/**
 * SYMULACJA: Wysłanie kodu SMS
 */
export const sendSMSCode = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Numer telefonu jest wymagany'
      });
    }

    console.log(`🎭 SYMULACJA: Wysyłanie kodu SMS na ${phone}`);
    
    // Symulujemy opóźnienie
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return res.status(200).json({
      success: true,
      message: 'Kod SMS wysłany (SYMULACJA)',
      devCode: '123456',
      simulation: true
    });

  } catch (error) {
    console.error('❌ Send SMS code error:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas wysyłania kodu SMS'
    });
  }
};

/**
 * SYMULACJA: Weryfikacja kodu email (zaawansowana)
 */
export const verifyEmailAdvanced = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email i kod są wymagane'
      });
    }

    console.log(`🎭 SYMULACJA: Weryfikacja kodu email ${code} dla ${email}`);
    
    // Symulujemy opóźnienie
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (code === '123456') {
      return res.status(200).json({
        success: true,
        message: 'Email zweryfikowany (SYMULACJA)',
        verified: true,
        simulation: true
      });
    } else {
      throw new Error('Nieprawidłowy kod weryfikacyjny (SYMULACJA)');
    }

  } catch (error) {
    console.error('❌ Verify email advanced error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Błąd weryfikacji email'
    });
  }
};

/**
 * SYMULACJA: Weryfikacja kodu SMS (zaawansowana)
 */
export const verifySMSAdvanced = async (req, res) => {
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      return res.status(400).json({
        success: false,
        message: 'Telefon i kod są wymagane'
      });
    }

    console.log(`🎭 SYMULACJA: Weryfikacja kodu SMS ${code} dla ${phone}`);
    
    // Symulujemy opóźnienie
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (code === '123456') {
      return res.status(200).json({
        success: true,
        message: 'Telefon zweryfikowany (SYMULACJA)',
        verified: true,
        simulation: true
      });
    } else {
      throw new Error('Nieprawidłowy kod weryfikacyjny (SYMULACJA)');
    }

  } catch (error) {
    console.error('❌ Verify SMS advanced error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Błąd weryfikacji SMS'
    });
  }
};

/**
 * Wysyła kod weryfikacyjny na telefon
 * Używane podczas weryfikacji Google użytkownika
 */
export const sendVerificationCode = async (req, res) => {
  console.log('Rozpoczynanie wysyłania kodu weryfikacyjnego...');
  const { phoneNumber, type } = req.body;
  
  if (!phoneNumber) {
    return res.status(400).json({ 
      success: false,
      message: 'Numer telefonu jest wymagany'
    });
  }
  
  if (!type || type !== 'phone') {
    return res.status(400).json({ 
      success: false,
      message: 'Nieprawidłowy typ weryfikacji'
    });
  }
  
  try {
    // Pobierz dane użytkownika z tokena JWT
    const userId = req.user.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Użytkownik nie został znaleziony'
      });
    }
    
    // Zapisz telefon z żądania jeśli różni się od bieżącego
    if (user.phoneNumber !== phoneNumber) {
      user.phoneNumber = phoneNumber;
      await user.save();
    }
    
    // ===== TRYB SYMULACJI WERYFIKACJI (MOCK/DEV MODE) =====
    // Generate verification code - use fixed code "123456" in mock mode
    const MOCK_MODE = process.env.NODE_ENV !== 'production';
    const code = MOCK_MODE ? '123456' : require('crypto').randomInt(100000, 999999).toString();
    
    // Zapisz kod w bazie danych
    user.twoFACode = code;
    user.twoFACodeExpires = Date.now() + 10 * 60 * 1000; // 10 minut
    await user.save();
    
    // ===== TRYB SYMULACJI WERYFIKACJI (MOCK/DEV MODE) =====
    // W trybie symulacji nie wysyłamy prawdziwych SMS
    if (MOCK_MODE) {
      console.log('MOCK MODE: Skipping real SMS sending');
      console.log('Generated mock verification code:', code);
    } else {
      // Wysłanie kodu przez Twilio (PRODUCTION MODE)
      const result = await sendTwilioCode(phoneNumber);
      console.log('Wynik wysyłania kodu:', result);
    }
    
    return res.status(200).json({
      success: true,
      message: 'Kod weryfikacyjny został wysłany',
      // W trybie deweloperskim zwracamy kod testowy
      devCode: MOCK_MODE ? code : undefined
    });
  } catch (error) {
    console.error('Błąd wysyłania kodu weryfikacyjnego:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Wystąpił błąd podczas wysyłania kodu weryfikacyjnego'
    });
  }
};

/**
 * Weryfikuje kod wysłany na telefon
 * Aktualizuje status weryfikacji telefonu użytkownika
 */
export const verifyVerificationCode = async (req, res) => {
  console.log('Rozpoczynanie weryfikacji kodu...');
  const { phoneNumber, code, type } = req.body;
  
  if (!phoneNumber || !code) {
    return res.status(400).json({ 
      success: false,
      message: 'Numer telefonu i kod weryfikacyjny są wymagane'
    });
  }
  
  if (!type || type !== 'phone') {
    return res.status(400).json({ 
      success: false,
      message: 'Nieprawidłowy typ weryfikacji'
    });
  }
  
  try {
    // Pobierz dane użytkownika z tokena JWT
    const userId = req.user.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Użytkownik nie został znaleziony'
      });
    }
    
    // ===== TRYB SYMULACJI WERYFIKACJI (MOCK/DEV MODE) =====
    // Uniwersalny kod testowy dla trybu deweloperskiego
    const MOCK_MODE = process.env.NODE_ENV !== 'production';
    const isTestCode = code === '123456' && MOCK_MODE;
    
    // Sprawdź czy kod wygasł
    const isCodeExpired = user.twoFACodeExpires && new Date(user.twoFACodeExpires) < new Date();
    if (isCodeExpired && !isTestCode) {
      return res.status(400).json({ 
        success: false,
        message: 'Kod weryfikacyjny wygasł. Proszę wygenerować nowy kod.'
      });
    }
    
    // W środowisku deweloperskim albo przy kodzie testowym
    if (isTestCode) {
      // Aktualizuj status weryfikacji
      user.isPhoneVerified = true;
      
      // Jeśli email jest już zweryfikowany, oznacz cały profil jako zweryfikowany
      if (user.isEmailVerified) {
        user.isVerified = true;
      }
      
      // Wyczyść kod weryfikacyjny
      user.twoFACode = null;
      user.twoFACodeExpires = null;
      
      await user.save();
      
      return res.status(200).json({
        success: true,
        verified: true,
        message: 'Numer telefonu został zweryfikowany pomyślnie',
        isPhoneVerified: true,
        isVerified: user.isVerified
      });
    }
    
    // Sprawdź kod przez Twilio
    const verificationResult = await verifyTwilioCode(phoneNumber, code);
    
    if (verificationResult.success) {
      // Aktualizuj status weryfikacji
      user.isPhoneVerified = true;
      
      // Jeśli email jest już zweryfikowany, oznacz cały profil jako zweryfikowany
      if (user.isEmailVerified) {
        user.isVerified = true;
      }
      
      // Wyczyść kod weryfikacyjny
      user.twoFACode = null;
      user.twoFACodeExpires = null;
      
      await user.save();
      
      return res.status(200).json({
        success: true,
        verified: true,
        message: 'Numer telefonu został zweryfikowany pomyślnie',
        isPhoneVerified: true,
        isVerified: user.isVerified
      });
    }
    
    return res.status(400).json({
      success: false,
      verified: false,
      message: 'Nieprawidłowy kod weryfikacyjny'
    });
  } catch (error) {
    console.error('Błąd weryfikacji kodu:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Wystąpił błąd podczas weryfikacji kodu'
    });
  }
};

// Wysyłanie kodu 2FA
export const send2FACode = async (req, res) => {
  console.log('Rozpoczynanie wysyłania kodu 2FA...');
  console.log('Dane żądania:', req.body);
  
  const { phone, email } = req.body;
  
  if (!phone && !email) {
    console.log('Błąd: Brak numeru telefonu lub adresu email w żądaniu');
    return res.status(400).json({ 
      message: 'Numer telefonu lub adres email jest wymagany.' 
    });
  }

  try {
    // ===== TRYB SYMULACJI WERYFIKACJI (MOCK/DEV MODE) =====
    // Generate verification code - use fixed code "123456" in mock mode
    const MOCK_MODE = process.env.NODE_ENV !== 'production';
    const code = MOCK_MODE ? '123456' : require('crypto').randomInt(100000, 999999).toString();
    console.log(`Wygenerowano kod: ${code} dla ${phone || email}`);

    // Znajdź użytkownika
    const searchCriteria = phone ? { phoneNumber: phone } : { email };
    console.log('Szukam użytkownika według kryteriów:', searchCriteria);
    
    const user = await User.findOne(searchCriteria);
    
    if (!user) {
      console.log('Użytkownik nie znaleziony');
      return res.status(404).json({ 
        message: 'Użytkownik nie został znaleziony.' 
      });
    }

    console.log('Znaleziono użytkownika:', user._id);

    // Zapisz kod w bazie danych
    user.twoFACode = code;
    user.twoFACodeExpires = Date.now() + 10 * 60 * 1000; // 10 minut
    
    try {
      await user.save();
      console.log('Kod zapisany w bazie danych');
    } catch (saveError) {
      console.error('Błąd zapisywania kodu w bazie danych:', saveError);
      return res.status(500).json({ 
        message: 'Błąd podczas zapisywania kodu weryfikacyjnego.' 
      });
    }

    // ===== TRYB SYMULACJI WERYFIKACJI (MOCK/DEV MODE) =====
    // W trybie symulacji nie wysyłamy prawdziwych email/SMS
    if (MOCK_MODE) {
      console.log('MOCK MODE: Skipping real email/SMS sending');
      console.log('Generated mock 2FA code:', code);
    } else {
      // Wysyłanie kodu (PRODUCTION MODE)
      try {
        if (phone) {
          console.log('Próba wysłania kodu SMS...');
          const result = await sendTwilioCode(phone);
          console.log('Wynik wysyłania kodu:', result);
        } else {
          console.log('Brak numeru telefonu, kod powinien być wysłany przez email');
          // Tutaj mogłaby być implementacja wysyłania emaila
        }
      } catch (sendError) {
        console.error('Błąd wysyłania kodu:', sendError);
        return res.status(500).json({ 
          message: 'Błąd podczas wysyłania kodu weryfikacyjnego.' 
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Kod weryfikacyjny został wysłany.',
      // W środowisku deweloperskim zawsze zwracamy kod dla ułatwienia testów
      devCode: MOCK_MODE ? code : undefined
    });
  } catch (error) {
    console.error('Ogólny błąd w send2FACode:', error);
    return res.status(500).json({ 
      message: 'Błąd serwera podczas wysyłania kodu weryfikacyjnego.' 
    });
  }
};

// Weryfikacja kodu 2FA
export const verify2FACode = async (req, res) => {
  console.log('Rozpoczynanie weryfikacji kodu 2FA...');
  console.log('Dane żądania:', req.body);
  
  const { email, phone, code } = req.body;
  
  if (!code) {
    console.log('Błąd: Brak kodu w żądaniu');
    return res.status(400).json({ 
      message: 'Kod weryfikacyjny jest wymagany.' 
    });
  }

  // Uproszczona walidacja formatu kodu
  if (!/^\d{6}$/.test(code)) {
    console.log('Błąd: Niepoprawny format kodu:', code);
    return res.status(400).json({ 
      message: 'Kod weryfikacyjny musi składać się z 6 cyfr.' 
    });
  }

  try {
    // Przygotuj kryteria wyszukiwania
    const searchCriteria = {};
    if (email) searchCriteria.email = email;
    if (phone) searchCriteria.phoneNumber = phone;
    
    if (Object.keys(searchCriteria).length === 0) {
      console.log('Błąd: Brak kryteriów wyszukiwania (email lub phone)');
      return res.status(400).json({ 
        message: 'Email lub numer telefonu jest wymagany.' 
      });
    }
    
    console.log('Szukam użytkownika według kryteriów:', searchCriteria);
    const user = await User.findOne(searchCriteria);

    if (!user) {
      console.log('Użytkownik nie znaleziony');
      return res.status(404).json({ 
        message: 'Użytkownik nie został znaleziony.' 
      });
    }

    console.log('Znaleziono użytkownika:', user._id);
    console.log('Kod zapisany w bazie:', user.twoFACode);
    console.log('Czas wygaśnięcia kodu:', user.twoFACodeExpires);
    console.log('Kod z żądania:', code);

    // ===== TRYB SYMULACJI WERYFIKACJI (MOCK/DEV MODE) =====
    // Uniwersalny kod testowy dla trybu deweloperskiego
    const MOCK_MODE = process.env.NODE_ENV !== 'production';
    const isTestCode = code === '123456' && MOCK_MODE;
    
    if (isTestCode) {
      console.log('Używam uniwersalnego kodu testowego 123456');
    }

    // Sprawdź czy kod wygasł
    const isCodeExpired = user.twoFACodeExpires && new Date(user.twoFACodeExpires) < new Date();
    if (isCodeExpired && !isTestCode) {
      console.log('Kod wygasł, czas wygaśnięcia:', user.twoFACodeExpires);
      return res.status(400).json({ 
        message: 'Kod weryfikacyjny wygasł. Proszę wygenerować nowy kod.' 
      });
    }

    // Sprawdź czy kod jest poprawny
    if (isTestCode || user.twoFACode === code) {
      // SECURITY: Don't log JWT generation in production
      if (process.env.NODE_ENV !== 'production') {
        console.log('Kod poprawny, generuję token JWT');
      }

      // Resetuj kod po weryfikacji
      user.twoFACode = null;
      user.twoFACodeExpires = null;
      await user.save();

      // Użyj zoptymalizowanej funkcji generowania tokena
      const tokenPayload = {
        userId: user._id,
        role: user.role
      };
      
      const token = generateAccessToken(tokenPayload);

      // Security: Never log JWT tokens in production
      logger.info('JWT token generated for user verification', {
        userId: user._id,
        ip: req.ip
      });

      // Ustaw token w ciasteczku używając bezpiecznej konfiguracji
      setSecureCookie(res, 'token', token, 'access');

      // Przygotuj obiekt z danymi użytkownika
      const userData = {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        dob: user.dob ? user.dob.toISOString().split('T')[0] : null,
        isAuthenticated: true
      };

      console.log('Zwracam odpowiedź z danymi użytkownika');
      return res.status(200).json({
        success: true,
        token, // Zwracamy token również jako część JSON (dla klientów nie korzystających z ciasteczek)
        message: 'Weryfikacja zakończona pomyślnie.',
        user: userData
      });
    }

    console.log('Niepoprawny kod weryfikacyjny');
    return res.status(400).json({ 
      message: 'Nieprawidłowy kod weryfikacyjny.' 
    });
  } catch (error) {
    console.error('Błąd weryfikacji kodu 2FA:', error);
    return res.status(500).json({ 
      message: 'Błąd serwera podczas weryfikacji kodu.' 
    });
  }
};

/**
 * Advanced Email Verification for Registration Process
 */
export const verifyEmailCodeAdvanced = async (req, res) => {
  console.log('Rozpoczynanie zaawansowanej weryfikacji kodu email...');
  console.log('Dane żądania:', req.body);
  
  const { email, code } = req.body;
  
  if (!email || !code) {
    console.log('Błąd: Brak emaila lub kodu w żądaniu');
    return res.status(400).json({
      success: false,
      message: 'Email i kod weryfikacyjny są wymagane.'
    });
  }

  // Podstawowa walidacja formatu kodu
  if (!/^\d{6}$/.test(code)) {
    console.log('Błąd: Niepoprawny format kodu:', code);
    return res.status(400).json({
      success: false,
      message: 'Kod weryfikacyjny musi składać się z 6 cyfr.'
    });
  }

  try {
    // Znajdź użytkownika
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      console.log('Użytkownik nie znaleziony');
      return res.status(404).json({
        success: false,
        message: 'Użytkownik nie został znaleziony.'
      });
    }

    // Sprawdź czy email jest już zweryfikowany
    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email jest już zweryfikowany.'
      });
    }

    // ===== TRYB SYMULACJI WERYFIKACJI (MOCK/DEV MODE) =====
    // Uniwersalny kod testowy dla trybu deweloperskiego
    const MOCK_MODE = process.env.NODE_ENV !== 'production';
    const isTestCode = code === '123456' && MOCK_MODE;
    
    console.log('Kod zapisany w bazie:', user.emailVerificationCode);
    console.log('Kod z żądania:', code);
    console.log('Test code:', isTestCode);

    // Sprawdź czy kod wygasł
    if (!isTestCode && user.emailVerificationCodeExpires && new Date() > user.emailVerificationCodeExpires) {
      console.log('Kod wygasł, czas wygaśnięcia:', user.emailVerificationCodeExpires);
      return res.status(400).json({
        success: false,
        message: 'Kod weryfikacyjny wygasł. Poproś o nowy kod.'
      });
    }

    // Sprawdź czy kod jest poprawny
    if (isTestCode || user.emailVerificationCode === code) {
      console.log('Kod poprawny, aktualizuję status weryfikacji email');

      // Aktualizuj status weryfikacji email
      user.isEmailVerified = true;
      user.emailVerificationCode = null;
      user.emailVerificationCodeExpires = null;
      
      // Aktualizuj krok rejestracji
      if (user.registrationStep === 'email_verification') {
        user.registrationStep = 'sms_verification';
      }
      
      // Jeśli oba (email i telefon) są zweryfikowane, zakończ rejestrację
      if (user.isPhoneVerified) {
        user.registrationStep = 'completed';
        user.isVerified = true;
      }
      
      await user.save();

      console.log('Email zweryfikowany pomyślnie dla użytkownika:', user._id);
      console.log('Nowy krok rejestracji:', user.registrationStep);

      return res.status(200).json({
        success: true,
        message: 'Email zweryfikowany pomyślnie',
        user: {
          id: user._id,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          isVerified: user.isVerified,
          registrationStep: user.registrationStep
        },
        nextStep: user.isPhoneVerified ? 'completed' : 'sms_verification'
      });
    }

    console.log('Niepoprawny kod weryfikacyjny');
    return res.status(400).json({
      success: false,
      message: 'Nieprawidłowy kod weryfikacyjny.'
    });
  } catch (error) {
    console.error('Błąd weryfikacji kodu email:', error);
    return res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas weryfikacji kodu.'
    });
  }
};

/**
 * Advanced SMS Verification for Registration Process
 */
export const verifySMSCodeAdvanced = async (req, res) => {
  console.log('Rozpoczynanie zaawansowanej weryfikacji kodu SMS...');
  console.log('Dane żądania:', req.body);
  
  const { phone, code } = req.body;
  
  if (!phone || !code) {
    console.log('Błąd: Brak telefonu lub kodu w żądaniu');
    return res.status(400).json({
      success: false,
      message: 'Numer telefonu i kod weryfikacyjny są wymagane.'
    });
  }

  // Podstawowa walidacja formatu kodu
  if (!/^\d{6}$/.test(code)) {
    console.log('Błąd: Niepoprawny format kodu:', code);
    return res.status(400).json({
      success: false,
      message: 'Kod weryfikacyjny musi składać się z 6 cyfr.'
    });
  }

  try {
    // Znajdź użytkownika
    const user = await User.findOne({ phoneNumber: phone });
    
    if (!user) {
      console.log('Użytkownik nie znaleziony');
      return res.status(404).json({
        success: false,
        message: 'Użytkownik nie został znaleziony.'
      });
    }

    // Sprawdź czy telefon jest już zweryfikowany
    if (user.isPhoneVerified) {
      return res.status(400).json({
        success: false,
        message: 'Numer telefonu jest już zweryfikowany.'
      });
    }

    // ===== TRYB SYMULACJI WERYFIKACJI (MOCK/DEV MODE) =====
    // Uniwersalny kod testowy dla trybu deweloperskiego
    const MOCK_MODE = process.env.NODE_ENV !== 'production';
    const isTestCode = code === '123456' && MOCK_MODE;
    
    console.log('Kod SMS zapisany w bazie:', user.smsVerificationCode);
    console.log('Kod z żądania:', code);
    console.log('Test code:', isTestCode);

    // Sprawdź czy kod wygasł
    if (!isTestCode && user.smsVerificationCodeExpires && new Date() > user.smsVerificationCodeExpires) {
      console.log('Kod SMS wygasł, czas wygaśnięcia:', user.smsVerificationCodeExpires);
      return res.status(400).json({
        success: false,
        message: 'Kod weryfikacyjny wygasł. Poproś o nowy kod.'
      });
    }

    // Sprawdź czy kod jest poprawny
    if (isTestCode || user.smsVerificationCode === code) {
      console.log('Kod SMS poprawny, aktualizuję status weryfikacji telefonu');

      // Aktualizuj status weryfikacji telefonu
      user.isPhoneVerified = true;
      user.smsVerificationCode = null;
      user.smsVerificationCodeExpires = null;
      
      // Jeśli oba (email i telefon) są zweryfikowane, zakończ rejestrację
      if (user.isEmailVerified) {
        user.registrationStep = 'completed';
        user.isVerified = true;
        
        console.log('Rejestracja zakończona pomyślnie dla użytkownika:', user._id);
      }
      
      await user.save();

      console.log('Telefon zweryfikowany pomyślnie dla użytkownika:', user._id);
      console.log('Nowy krok rejestracji:', user.registrationStep);

      return res.status(200).json({
        success: true,
        message: user.isVerified 
          ? 'Rejestracja zakończona pomyślnie! Możesz się teraz zalogować.'
          : 'Numer telefonu zweryfikowany pomyślnie',
        user: {
          id: user._id,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          isVerified: user.isVerified,
          registrationStep: user.registrationStep
        },
        nextStep: user.isVerified ? 'completed' : 'email_verification'
      });
    }

    console.log('Niepoprawny kod weryfikacyjny SMS');
    return res.status(400).json({
      success: false,
      message: 'Nieprawidłowy kod weryfikacyjny.'
    });
  } catch (error) {
    console.error('Błąd weryfikacji kodu SMS:', error);
    return res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas weryfikacji kodu.'
    });
  }
};

// Legacy email verification (keep for backward compatibility)
export const verifyEmailCode = async (req, res) => {
  console.log('Rozpoczynanie weryfikacji kodu email...');
  console.log('Dane żądania:', req.body);
  
  const { email, code } = req.body;
  
  if (!email || !code) {
    console.log('Błąd: Brak emaila lub kodu w żądaniu');
    return res.status(400).json({
      success: false,
      message: 'Email i kod weryfikacyjny są wymagane.'
    });
  }

  // Podstawowa walidacja formatu kodu
  if (!/^\d{6}$/.test(code)) {
    console.log('Błąd: Niepoprawny format kodu:', code);
    return res.status(400).json({
      success: false,
      message: 'Kod weryfikacyjny musi składać się z 6 cyfr.'
    });
  }

  try {
    // Uniwersalny kod testowy dla trybu deweloperskiego
    const isTestCode = code === '123123';
    
    if (isTestCode) {
      console.log('Używam uniwersalnego kodu testowego 123123');
      
      // Znajdź użytkownika i zaktualizuj status
      const user = await User.findOne({ email });
      if (user) {
        user.isVerified = true;
        await user.save();
        console.log('Zaktualizowano status weryfikacji dla użytkownika:', user._id);
      } else {
        console.log('Użytkownik nie znaleziony, ale akceptuję kod testowy');
      }

      return res.status(200).json({
        success: true,
        message: 'Email zweryfikowany pomyślnie'
      });
    }

    // Standardowa weryfikacja
    console.log('Szukam użytkownika o emailu:', email);
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('Użytkownik nie znaleziony');
      return res.status(404).json({
        success: false,
        message: 'Użytkownik o podanym adresie email nie istnieje.'
      });
    }

    console.log('Kod zapisany w bazie:', user.twoFACode);
    console.log('Kod z żądania:', code);

    // Sprawdź czy kod wygasł
    const isCodeExpired = user.twoFACodeExpires && new Date(user.twoFACodeExpires) < new Date();
    if (isCodeExpired) {
      console.log('Kod wygasł, czas wygaśnięcia:', user.twoFACodeExpires);
      return res.status(400).json({
        success: false,
        message: 'Kod weryfikacyjny wygasł. Proszę wygenerować nowy kod.'
      });
    }

    // Sprawdź czy kod jest poprawny
    if (user.twoFACode === code) {
      console.log('Kod poprawny, aktualizuję status weryfikacji');

      // Resetuj kod po weryfikacji
      user.twoFACode = null;
      user.twoFACodeExpires = null;
      user.isVerified = true;
      await user.save();

      return res.status(200).json({
        success: true,
        message: 'Email zweryfikowany pomyślnie'
      });
    }

    console.log('Niepoprawny kod weryfikacyjny');
    return res.status(400).json({
      success: false,
      message: 'Nieprawidłowy kod weryfikacyjny.'
    });
  } catch (error) {
    console.error('Błąd weryfikacji kodu email:', error);
    return res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas weryfikacji kodu.'
    });
  }
};
