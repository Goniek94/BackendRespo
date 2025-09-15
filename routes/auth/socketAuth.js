import express from 'express';
import jwt from 'jsonwebtoken';
import authMiddleware from '../../middleware/auth.js';
import logger from '../../utils/logger.js';

const router = express.Router();

/**
 * Endpoint do pobierania tokenu dla Socket.IO
 * Zwraca token JWT na podstawie HttpOnly cookies
 */
router.get('/socket-token', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user || !user.userId) {
      return res.status(401).json({
        success: false,
        message: 'Brak danych użytkownika'
      });
    }

    // Generuj token specjalnie dla Socket.IO (krótszy czas życia)
    const socketToken = jwt.sign(
      {
        userId: user.userId,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' } // Krótszy czas życia dla bezpieczeństwa
    );

    logger.info('Socket token generated for user', {
      userId: user.userId,
      email: user.email
    });

    res.json({
      success: true,
      token: socketToken,
      expiresIn: 3600 // 1 godzina w sekundach
    });

  } catch (error) {
    logger.error('Error generating socket token', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId
    });

    res.status(500).json({
      success: false,
      message: 'Błąd podczas generowania tokenu'
    });
  }
});

export default router;
