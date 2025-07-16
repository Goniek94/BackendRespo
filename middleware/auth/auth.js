import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto';
import adminConfig from '../config/adminConfig.js';
import { addToBlacklist, isBlacklisted } from '../models/TokenBlacklist.js';
import User from '../models/user.js';
import mongoose from 'mongoose';

dotenv.config();

// Pobierz sekret JWT z zmiennych środowiskowych lub użyj domyślnego (tylko dla dev)
const JWT_SECRET = process.env.JWT_SECRET || 'tajnyKluczJWT123';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refreshSecretKey456';

// Czas życia tokenów
const ACCESS_TOKEN_EXPIRY = '1h'; // 1 godzina
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 dni
const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minut w milisekundach

/**
 * Generuje nowy token dostępu
 * @param {Object} payload - Dane do zapisania w tokenie
 * @returns {string} - Wygenerowany token JWT
 */
const generateAccessToken = (payload) => {
  return jwt.sign(
    { 
      ...payload,
      type: 'access',
      iat: Math.floor(Date.now() / 1000),
      lastActivity: Date.now()
    }, 
    JWT_SECRET, 
    { 
      expiresIn: ACCESS_TOKEN_EXPIRY,
      // Dodajemy standardowe pola JWT dla bezpieczeństwa
      audience: 'marketplace-users',
      issuer: 'marketplace-api',
      subject: payload.userId.toString()
    }
  );
};

/**
 * Generuje nowy token odświeżający
 * @param {Object} payload - Dane do zapisania w tokenie
 * @returns {string} - Wygenerowany token JWT
 */
const generateRefreshToken = (payload) => {
  // Generujemy unikalny identyfikator tokenu
  const tokenId = crypto.randomBytes(16).toString('hex');
  
  return jwt.sign(
    { 
      ...payload,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      jti: tokenId // Unikalny identyfikator tokenu w payloadzie
    }, 
    JWT_REFRESH_SECRET, 
    { 
      expiresIn: REFRESH_TOKEN_EXPIRY,
      // Dodajemy standardowe pola JWT dla bezpieczeństwa
      audience: 'marketplace-users',
      issuer: 'marketplace-api',
      subject: payload.userId.toString()
    }
  );
};

/**
 * Middleware do uwierzytelniania użytkowników
 * Sprawdza token JWT w ciasteczku lub nagłówku Authorization
 * Weryfikuje token i sprawdza czas ostatniej aktywności
 * Obsługuje refresh tokeny i automatyczne odświeżanie
 * 
 * Authentication middleware
 * Checks JWT token in cookie or Authorization header
 * Verifies token and checks last activity time
 * Handles refresh tokens and automatic token refresh
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Sprawdź połączenie z bazą danych
    const isDBConnected = mongoose.connection.readyState === 1;
    if (!isDBConnected) {
      console.warn('Uwaga: Baza danych nie jest podłączona. Autentykacja może działać w trybie awaryjnym.');
    }
    
    console.log('Auth middleware - sprawdzam endpoint:', req.originalUrl);

    // 1. Sprawdź token w ciasteczku
    const cookieToken = req.cookies?.token;
    if (cookieToken) {
      console.log('Znaleziono token w ciasteczkach');
    } else {
      console.log('Brak tokenu w ciasteczkach');
    }

    // 2. Jako fallback sprawdź nagłówek Authorization
    let headerToken = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      headerToken = authHeader.split(' ')[1];
      console.log('Znaleziono token w nagłówku Authorization');
    } else if (authHeader) {
      console.log('Nagłówek Authorization ma nieprawidłowy format:', authHeader);
    } else {
      console.log('Brak nagłówka Authorization');
    }

    // Użyj tokenu z ciasteczka lub nagłówka
    const token = cookieToken || headerToken;

    if (!token) {
      console.log('Brak tokenu w ciasteczkach i nagłówku');
      console.log(`[SECURITY] 401 Unauthorized (no token) IP: ${req.ip}`);
      return res.status(401).json({ message: 'Brak autoryzacji. Wymagane zalogowanie.' });
    }

    // Token blacklist check - teraz asynchronicznie
    try {
      const isTokenBlacklisted = await isBlacklisted(token);
      if (isTokenBlacklisted) {
        console.log(`[SECURITY] 401 Unauthorized (blacklisted token) IP: ${req.ip}`);
        return res.status(401).json({ message: 'Token unieważniony. Zaloguj się ponownie.', code: 'TOKEN_BLACKLISTED' });
      }
    } catch (blacklistError) {
      console.error('Błąd podczas sprawdzania blacklisty:', blacklistError);
      // Kontynuujemy mimo błędu blacklisty, żeby nie blokować uwierzytelniania
    }

    console.log('Weryfikuję token JWT');
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Sprawdzamy czy to token dostępu
      if (decoded.type !== 'access') {
        console.log('Nieprawidłowy typ tokenu');
        return res.status(401).json({ 
          message: 'Nieprawidłowy typ tokenu.',
          code: 'INVALID_TOKEN_TYPE'
        });
      }
      
      // Sprawdź czas ostatniej aktywności
      const currentTime = Date.now();
      const lastActivity = decoded.lastActivity || 0;

      // Jeśli minęło więcej niż 15 minut od ostatniej aktywności
      if (currentTime - lastActivity > INACTIVITY_LIMIT) {
        console.log('Sesja wygasła z powodu braku aktywności');
        console.log(`[SECURITY] 401 SESSION_INACTIVE userId: ${decoded.userId} IP: ${req.ip}`);
        
        // Sprawdź czy mamy refresh token
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken) {
          return res.status(401).json({ 
            message: 'Sesja wygasła z powodu braku aktywności. Zaloguj się ponownie.',
            code: 'SESSION_INACTIVE'
          });
        }
        
        // Próba odświeżenia sesji za pomocą refresh tokenu
        try {
          const refreshDecoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
          
          // Sprawdź czy refresh token nie jest na blackliście
          const isRefreshBlacklisted = await isBlacklisted(refreshToken);
          if (isRefreshBlacklisted) {
            return res.status(401).json({ 
              message: 'Token odświeżający unieważniony. Zaloguj się ponownie.',
              code: 'REFRESH_TOKEN_BLACKLISTED'
            });
          }
          
          // Sprawdź czy użytkownik istnieje
          const user = await User.findById(refreshDecoded.userId);
          if (!user) {
            return res.status(401).json({ 
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
          try {
            await addToBlacklist(refreshToken, {
              reason: 'ROTATION',
              userId: user._id
            });
          } catch (blacklistError) {
            console.error('Błąd podczas dodawania tokenu do blacklisty:', blacklistError);
            // Kontynuujemy mimo błędu blacklisty
          }
          
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
          
          // Zapisujemy dane użytkownika w req.user
          req.user = {
            userId: user._id,
            role: user.role || 'user',
            isAdmin: user.role === 'admin',
            isModerator: user.role === 'moderator' || user.role === 'admin',
            permissions: user.role === 'admin' 
              ? adminConfig.adminPermissions 
              : user.role === 'moderator' 
                ? adminConfig.moderatorPermissions 
                : {}
          };
          
          console.log('Sesja odświeżona za pomocą refresh tokenu');
          next();
        } catch (refreshError) {
          console.error('Błąd odświeżania sesji:', refreshError);
          return res.status(401).json({ 
            message: 'Sesja wygasła. Zaloguj się ponownie.',
            code: 'SESSION_EXPIRED'
          });
        }
        return;
      }

      // Preemptive refresh: jeśli do końca ważności tokena zostało <10 min, odśwież token
      const refreshThreshold = 10 * 60 * 1000; // 10 minut
      const tokenExp = decoded.exp * 1000; // exp jest w sekundach, konwertujemy na ms
      
      if (tokenExp - currentTime < refreshThreshold) {
        console.log('Preemptive refresh - token wygasa za mniej niż 10 minut');
        
        // Generuj nowy token dostępu
        const newAccessToken = generateAccessToken({
          userId: decoded.userId,
          role: decoded.role || 'user'
        });
        
        // Dodaj stary token do blacklisty (rotacja)
        try {
          await addToBlacklist(token, {
            reason: 'ROTATION',
            userId: decoded.userId
          });
        } catch (blacklistError) {
          console.error('Błąd podczas dodawania tokenu do blacklisty:', blacklistError);
          // Kontynuujemy mimo błędu blacklisty
        }
        
        // Ustaw nowy token w ciasteczku
        res.cookie('token', newAccessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 3600000 // 1 godzina
        });
      } else {
        // Standardowe odświeżenie lastActivity (nie rotujemy tokena jeśli nie trzeba)
        const updatedToken = generateAccessToken({
          userId: decoded.userId,
          role: decoded.role || 'user'
        });
        
        res.cookie('token', updatedToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 3600000 // 1 godzina
        });
      }
      
      // Zapisujemy dane użytkownika w req.user
      req.user = {
        userId: decoded.userId,
        role: decoded.role || 'user',
        // Dodajemy flagi uprawnień na podstawie roli
        isAdmin: decoded.role === 'admin',
        isModerator: decoded.role === 'moderator' || decoded.role === 'admin',
        // Dodajemy uprawnienia na podstawie roli
        permissions: decoded.role === 'admin' 
          ? adminConfig.adminPermissions 
          : decoded.role === 'moderator' 
            ? adminConfig.moderatorPermissions 
            : {}
      };

      console.log('Token poprawny dane:', { 
        userId: req.user.userId, 
        role: req.user.role,
        isAdmin: req.user.isAdmin,
        isModerator: req.user.isModerator
      });

      next();
    } catch (jwtError) {
      console.error('Błąd weryfikacji tokenu JWT:', jwtError.message);

      // Logowanie każdego 401 z IP i userId jeśli jest
      let userId = null;
      try {
        const decoded = jwt.decode(token);
        userId = decoded?.userId;
      } catch {}
      console.log(`[SECURITY] 401 JWT error: ${jwtError.message} userId: ${userId} IP: ${req.ip}`);

      // Jeśli token wygasł, spróbuj użyć refresh tokenu
      if (jwtError.name === 'TokenExpiredError') {
        const refreshToken = req.cookies?.refreshToken;
        
        if (!refreshToken) {
          return res.status(401).json({ 
            message: 'Token wygasł. Zaloguj się ponownie.',
            code: 'TOKEN_EXPIRED'
          });
        }
        
        // Próba odświeżenia sesji za pomocą refresh tokenu
        try {
          const refreshDecoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
          
          // Sprawdź czy refresh token nie jest na blackliście
          const isRefreshBlacklisted = await isBlacklisted(refreshToken);
          if (isRefreshBlacklisted) {
            return res.status(401).json({ 
              message: 'Token odświeżający unieważniony. Zaloguj się ponownie.',
              code: 'REFRESH_TOKEN_BLACKLISTED'
            });
          }
          
          // Sprawdź czy użytkownik istnieje
          const user = await User.findById(refreshDecoded.userId);
          if (!user) {
            return res.status(401).json({ 
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
          try {
            await addToBlacklist(refreshToken, {
              reason: 'ROTATION',
              userId: user._id
            });
          } catch (blacklistError) {
            console.error('Błąd podczas dodawania tokenu do blacklisty:', blacklistError);
            // Kontynuujemy mimo błędu blacklisty
          }
          
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
          
          // Zapisujemy dane użytkownika w req.user
          req.user = {
            userId: user._id,
            role: user.role || 'user',
            isAdmin: user.role === 'admin',
            isModerator: user.role === 'moderator' || user.role === 'admin',
            permissions: user.role === 'admin' 
              ? adminConfig.adminPermissions 
              : user.role === 'moderator' 
                ? adminConfig.moderatorPermissions 
                : {}
          };
          
          console.log('Sesja odświeżona za pomocą refresh tokenu po wygaśnięciu tokenu dostępu');
          next();
        } catch (refreshError) {
          console.error('Błąd odświeżania sesji:', refreshError);
          return res.status(401).json({ 
            message: 'Sesja wygasła. Zaloguj się ponownie.',
            code: 'SESSION_EXPIRED'
          });
        }
        return;
      }

      return res.status(401).json({ 
        message: 'Nieprawidłowy token.',
        code: 'INVALID_TOKEN'
      });
    }
  } catch (error) {
    console.error('Błąd w authMiddleware:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas autoryzacji.' });
  }
};

// Eksportujemy middleware i funkcje pomocnicze
export { generateAccessToken, generateRefreshToken };
export default authMiddleware;
