// middleware/auth.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config(); // wczytuje zmienne z .env, np. JWT_SECRET

const authMiddleware = (req, res, next) => {
  try {
    console.log('Auth middleware - sprawdzam endpoint:', req.originalUrl);
    // Odczytujemy nagłówek Authorization: "Bearer token"
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.log('Brak nagłówka Authorization');
      return res.status(401).json({ message: 'Brak nagłówka Authorization' });
    }

    const token = authHeader.split(' ')[1]; // np. "Bearer <token>"
    if (!token) {
      console.log('Brak tokenu w nagłówku');
      return res.status(401).json({ message: 'Brak tokenu' });
    }

    // Weryfikujemy token - USUNIĘTO fallback-secret!
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error('Brak ustawionego JWT_SECRET w zmiennych środowiskowych!');
      return res.status(500).json({ message: 'Błąd konfiguracji serwera' });
    }

    console.log('Weryfikuję token:', token.substring(0, 10) + '...');
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Token poprawny, użytkownik:', decoded.userId);

    // Jeśli OK, przekazujemy dekodowane info do dalszej obsługi
    req.user = decoded; // np. { userId: "...", iat: 1234, exp: 1234 }

    // Idziemy dalej
    next();
  } catch (error) {
    console.error('Błąd w authMiddleware:', error);
    return res.status(401).json({ message: 'Nieprawidłowy lub wygasły token' });
  }
};

export default authMiddleware;