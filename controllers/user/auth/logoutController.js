import { addToBlacklist } from "../../../models/security/TokenBlacklist.js";
import { clearAuthCookies } from "../../../middleware/auth.js";
import logger from "../../../utils/logger.js";

/**
 * Logout user with token blacklisting
 */
export const logoutUser = async (req, res) => {
  try {
    const accessToken = req.cookies?.token;
    const refreshToken = req.cookies?.refreshToken;
    const userId = req.user?.userId;

    if (accessToken) {
      try {
        await addToBlacklist(accessToken, {
          reason: "LOGOUT",
          userId: userId,
          ip: req.ip,
        });

        logger.debug("Access token blacklisted on logout", {
          userId,
          ip: req.ip,
        });
      } catch (error) {
        logger.warn("Failed to blacklist access token on logout", {
          error: error.message,
          userId,
          ip: req.ip,
        });
      }
    }

    if (refreshToken) {
      try {
        await addToBlacklist(refreshToken, {
          reason: "LOGOUT",
          userId: userId,
          ip: req.ip,
        });

        logger.debug("Refresh token blacklisted on logout", {
          userId,
          ip: req.ip,
        });
      } catch (error) {
        logger.warn("Failed to blacklist refresh token on logout", {
          error: error.message,
          userId,
          ip: req.ip,
        });
      }
    }

    clearAuthCookies(res);

    logger.info("User logged out successfully", {
      userId,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.status(200).json({
      success: true,
      message: "Wylogowanie przebiegło pomyślnie",
    });
  } catch (error) {
    logger.error("Logout error", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.status(500).json({
      success: false,
      message: "Błąd serwera podczas wylogowania",
    });
  }
};
