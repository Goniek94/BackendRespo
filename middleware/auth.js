import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import adminConfig from '../config/adminConfig.js';
import { addToBlacklist, isBlacklisted } from '../models/TokenBlacklist.js';

dotenv.config();

/**
 * Middleware do uwierzytelniania użytkowników
 * Sprawdza token JWT w ciasteczku lub nagłówku Authorization
 * Weryfikuje token i sprawdza czas ostatniej aktywności
 * 
 * Authentication middleware
 * Checks JWT token in cookie or Authorization header
 * Verifies token and checks last activity time
 */
const authMiddleware = (req, res, next) => {
  try {
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

    // Token blacklist check
    if (isBlacklisted(token)) {
      console.log(`[SECURITY] 401 Unauthorized (blacklisted token) IP: ${req.ip}`);
      return res.status(401).json({ message: 'Token unieważniony. Zaloguj się ponownie.', code: 'TOKEN_BLACKLISTED' });
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'tajnyKluczJWT123';

    console.log('Weryfikuję token JWT');
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Sprawdź czas ostatniej aktywności (15 minut = 900000 ms)
      const inactivityLimit = 15 * 60 * 1000; // 15 minut w milisekundach
      const currentTime = Date.now();
      const lastActivity = decoded.lastActivity || 0;

      // Jeśli minęło więcej niż 15 minut od ostatniej aktywności
      if (currentTime - lastActivity > inactivityLimit) {
        console.log('Sesja wygasła z powodu braku aktywności');
        console.log(`[SECURITY] 401 SESSION_INACTIVE userId: ${decoded.userId} IP: ${req.ip}`);
        return res.status(401).json({ 
          message: 'Sesja wygasła z powodu braku aktywności. Zaloguj się ponownie.',
          code: 'SESSION_INACTIVE'
        });
      }

      // Preemptive refresh: jeśli do końca ważności tokena zostało <3 min, odśwież token
      const refreshThreshold = 3 * 60 * 1000; // 3 minuty
      let updatedToken = null;
      if (currentTime - lastActivity > inactivityLimit - refreshThreshold) {
        updatedToken = jwt.sign(
          { 
            userId: decoded.userId,
            role: decoded.role || 'user',
            lastActivity: currentTime
          }, 
          JWT_SECRET, 
          { expiresIn: '24h' }
        );
        // Dodaj stary token do blacklisty (rotacja)
        addToBlacklist(token);
        // Ustaw nowy token w ciasteczku
        res.cookie('token', updatedToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 86400000 // 24 godziny w milisekundach
        });
      } else {
        // Standardowe odświeżenie lastActivity (nie rotujemy tokena jeśli nie trzeba)
        updatedToken = jwt.sign(
          { 
            userId: decoded.userId,
            role: decoded.role || 'user',
            lastActivity: currentTime
          }, 
          JWT_SECRET, 
          { expiresIn: '24h' }
        );
        res.cookie('token', updatedToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 86400000 // 24 godziny w milisekundach
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

      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          message: 'Token wygasł. Zaloguj się ponownie.',
          code: 'TOKEN_EXPIRED'
        });
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

export default authMiddleware;
