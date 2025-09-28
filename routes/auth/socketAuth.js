import express from "express";
import jwt from "jsonwebtoken";
import authMiddleware from "../../middleware/auth.js";
import logger from "../../utils/logger.js";
import config from "../../config/index.js";

const router = express.Router();

/**
 * Endpoint do pobierania tokenu dla Socket.IO
 * Zwraca token JWT na podstawie HttpOnly cookies
 */
router.get("/socket-token", authMiddleware, async (req, res) => {
  try {
    const user = req.user;

    if (!user || !user.userId) {
      return res.status(401).json({
        success: false,
        message: "Brak danych użytkownika",
      });
    }

    // Generuj token specjalnie dla Socket.IO zgodnie z config.security.jwt
    const jwtCfg = config.security?.jwt || {};
    const payload = {
      userId: user.userId,
      email: user.email,
      role: user.role,
    };
    const signOpts = {
      // 15m żeby nie kolidować z verify (możesz użyć jwtCfg.accessTokenExpiry)
      expiresIn: jwtCfg.accessTokenExpiry || "15m",
      issuer: jwtCfg.issuer || "marketplace-app",
      audience: jwtCfg.audience || "marketplace-users",
      algorithm: jwtCfg.algorithm || "HS256",
    };
    const socketToken = jwt.sign(
      payload,
      jwtCfg.secret || process.env.JWT_SECRET,
      signOpts
    );

    logger.info("Socket token generated for user", {
      userId: user.userId,
      email: user.email,
    });

    res.json({
      success: true,
      token: socketToken,
      // w sekundach, spójne z 15m lub accessTokenExpiry
      expiresIn: signOpts.expiresIn === "15m" ? 900 : 3600,
    });
  } catch (error) {
    logger.error("Error generating socket token", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
    });

    res.status(500).json({
      success: false,
      message: "Błąd podczas generowania tokenu",
    });
  }
});

export default router;
