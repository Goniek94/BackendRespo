import User from "../../../models/user/user.js";
import { addToBlacklist } from "../../../models/security/TokenBlacklist.js";
import { clearAuthCookies } from "../../../middleware/auth.js";
import logger from "../../../utils/logger.js";

/**
 * Check authentication status
 * 🔒 SECURITY FIX: Blacklists tokens when user is suspended/banned
 */
export const checkAuth = async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: "Nie jesteś zalogowany",
      });
    }

    // Get fresh user data from database
    const dbUser = await User.findById(req.user.userId).select("-password");

    if (!dbUser) {
      logger.warn("Auth check failed - user not found", {
        userId: req.user.userId,
        ip: req.ip,
      });

      return res.status(401).json({
        success: false,
        message: "Użytkownik nie istnieje",
      });
    }

    // 🔒 SECURITY FIX: Check if user is suspended/banned and blacklist tokens
    if (dbUser.status === "suspended" || dbUser.status === "banned") {
      logger.warn("Auth check - suspended/banned user detected", {
        userId: dbUser._id,
        email: dbUser.email,
        status: dbUser.status,
        ip: req.ip,
      });

      // Blacklist the current access token
      const accessToken = req.cookies?.token;
      if (accessToken) {
        try {
          await addToBlacklist(accessToken, {
            reason: "ACCOUNT_SUSPENDED",
            userId: dbUser._id,
            ip: req.ip,
          });

          logger.info("Access token blacklisted for suspended/banned user", {
            userId: dbUser._id,
            status: dbUser.status,
            ip: req.ip,
          });
        } catch (error) {
          logger.error("Failed to blacklist token for suspended user", {
            error: error.message,
            userId: dbUser._id,
            ip: req.ip,
          });
        }
      }

      // Clear cookies
      clearAuthCookies(res);

      return res.status(403).json({
        success: false,
        message: "Konto zostało zawieszone. Skontaktuj się z administratorem.",
      });
    }

    // Update last activity
    dbUser.lastActivity = new Date();
    await dbUser.save();

    // Return user data
    const userData = {
      id: dbUser._id,
      name: dbUser.name,
      lastName: dbUser.lastName,
      email: dbUser.email,
      phoneNumber: dbUser.phoneNumber,
      role: dbUser.role,
      isVerified: dbUser.isVerified,
      status: dbUser.status,
      lastActivity: dbUser.lastActivity,
    };

    res.status(200).json({
      success: true,
      user: userData,
    });
  } catch (error) {
    logger.error("Check auth error", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.status(500).json({
      success: false,
      message: "Błąd serwera podczas sprawdzania autoryzacji",
    });
  }
};
