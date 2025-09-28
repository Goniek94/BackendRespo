import express from "express";
import { targetedAuthCookieCleanup } from "../middleware/cookieCleanup.js";

const router = express.Router();

/**
 * POST /_dev/cleanup-auth-cookies
 * RĘCZNY cleanup WYŁĄCZNIE auth-cookies (gdy ENABLE_TARGETED_COOKIE_CLEANUP=1).
 * Zabezpiecz to trasą tylko w dev/staging (nie montuj w production!).
 */
router.post("/cleanup-auth-cookies", (req, res) => {
  const cleared = targetedAuthCookieCleanup(req, res);
  return res.json({ ok: true, cleared });
});

export default router;
