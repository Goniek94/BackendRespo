import jwt from "jsonwebtoken";
import {
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
  clearAuthCookies,
} from "../../../middleware/auth.js";
import logger from "../../../utils/logger.js";

/**
 * Refresh access token using refresh token
 */
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Brak tokenu odświeżającego",
      });
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

      const tokenPayload = {
        userId: decoded.userId,
        role: decoded.role,
      };

      const newAccessToken = generateAccessToken(tokenPayload);
      const newRefreshToken = generateRefreshToken(tokenPayload);

      setAuthCookies(res, newAccessToken, newRefreshToken);

      logger.info("Tokens refreshed successfully", {
        userId: decoded.userId,
        ip: req.ip,
      });

      res.status(200).json({
        success: true,
        message: "Token odświeżony pomyślnie",
      });
    } catch (error) {
      clearAuthCookies(res);

      logger.warn("Invalid or expired refresh token", {
        error: error.message,
        ip: req.ip,
      });

      return res.status(401).json({
        success: false,
        message: "Nieprawidłowy lub wygasły token odświeżający",
      });
    }
  } catch (error) {
    logger.error("Token refresh error", {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
    });

    res.status(500).json({
      success: false,
      message: "Błąd serwera podczas odświeżania tokenu",
    });
  }
};
