// admin/routes/authRoutes.js
import express from "express";
import jwt from "jsonwebtoken";
import config from "../../config/index.js";
import User from "../../models/user/user.js";
import { refreshUserSession } from "../../middleware/auth.js";
import { clearAuthCookies } from "../../config/cookieConfig.js";

const router = express.Router();

/**
 * Tu zakładam, że masz już własne logowanie (POST /login) gdzieś w projekcie.
 * Ten plik dostarcza: /auth/logout, /auth/check, /auth/refresh dla panelu admina.
 */

/** POST /admin-panel/auth/logout */
router.post("/logout", (req, res) => {
  try {
    clearAuthCookies(res);
  } catch {}
  res.json({ success: true });
});

/** GET /admin-panel/auth/check */
router.get("/check", async (req, res) => {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ success: false });

    const jwtCfg = config.security?.jwt || {};
    const decoded = jwt.verify(token, jwtCfg.secret || process.env.JWT_SECRET);
    const user = await User.findById(
      decoded.userId || decoded.u || decoded.id
    ).select("-password");
    if (!user) return res.status(401).json({ success: false });

    return res.json({
      success: true,
      user: { id: String(user._id), role: user.role, email: user.email },
    });
  } catch {
    return res.status(401).json({ success: false });
  }
});

/** POST /admin-panel/auth/refresh */
router.post("/refresh", async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      clearAuthCookies(res);
      return res
        .status(401)
        .json({ success: false, error: "NO_REFRESH_TOKEN" });
    }

    // Twoje refreshUserSession rotuje ciasteczka i zwraca info o userze
    const userData = await refreshUserSession(refreshToken, req, res);

    // Wykorzystujemy HttpOnly cookies; accessToken w body nie jest wymagany.
    return res.json({ success: true, user: userData });
  } catch {
    clearAuthCookies(res);
    return res.status(401).json({ success: false, error: "REFRESH_FAILED" });
  }
});

export default router;
