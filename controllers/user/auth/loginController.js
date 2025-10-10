import bcrypt from "bcryptjs";
import { validationResult } from "express-validator";
import User from "../../../models/user/user.js";
import {
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
} from "../../../middleware/auth.js";
import logger from "../../../utils/logger.js";

/**
 * Login user with enterprise security
 */
export const loginUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn("Login validation failed", {
        errors: errors.array(),
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });

      return res.status(400).json({
        success: false,
        message: "Błędy walidacji",
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!user) {
      logger.warn("Login attempt with non-existent email", {
        email: email.toLowerCase().trim(),
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });

      return res.status(401).json({
        success: false,
        message: "Nieprawidłowy email lub hasło",
      });
    }

    if (user.accountLocked) {
      const lockTime = user.lockUntil;
      if (lockTime && lockTime > Date.now()) {
        const remainingTime = Math.ceil((lockTime - Date.now()) / (1000 * 60));

        logger.warn("Login attempt on locked account", {
          userId: user._id,
          email: user.email,
          remainingLockTime: remainingTime,
          ip: req.ip,
          userAgent: req.get("User-Agent"),
        });

        return res.status(423).json({
          success: false,
          message: `Konto jest zablokowane. Spróbuj ponownie za ${remainingTime} minut.`,
        });
      } else {
        user.accountLocked = false;
        user.failedLoginAttempts = 0;
        user.lockUntil = undefined;
        await user.save();

        logger.info("Account automatically unlocked", {
          userId: user._id,
          email: user.email,
          ip: req.ip,
        });
      }
    }

    if (user.status === "suspended" || user.status === "banned") {
      logger.warn("Login attempt on suspended/banned account", {
        userId: user._id,
        email: user.email,
        status: user.status,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });

      return res.status(403).json({
        success: false,
        message: "Konto zostało zawieszone. Skontaktuj się z administratorem.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      if (user.failedLoginAttempts >= 4) {
        user.accountLocked = true;
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();

        logger.warn("Account locked due to failed login attempts", {
          userId: user._id,
          email: user.email,
          failedAttempts: user.failedLoginAttempts,
          ip: req.ip,
          userAgent: req.get("User-Agent"),
        });

        return res.status(423).json({
          success: false,
          message:
            "Konto zostało zablokowane na 15 minut z powodu zbyt wielu nieudanych prób logowania.",
          isBlocked: true,
          blockDuration: 15 * 60 * 1000,
        });
      }

      await user.save();

      logger.warn("Failed login attempt", {
        userId: user._id,
        email: user.email,
        failedAttempts: user.failedLoginAttempts,
        attemptsLeft: 4 - user.failedLoginAttempts,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });

      const attemptsLeft = 4 - user.failedLoginAttempts;
      return res.status(401).json({
        success: false,
        message: `Błędny login lub hasło. Pozostało ${attemptsLeft} ${
          attemptsLeft === 1 ? "próba" : attemptsLeft < 4 ? "próby" : "prób"
        }.`,
        attemptsLeft: attemptsLeft,
        failedAttempts: user.failedLoginAttempts,
        maxAttempts: 4,
      });
    }

    user.failedLoginAttempts = 0;
    user.lastLogin = new Date();
    user.lastActivity = new Date();
    user.lastIP = req.ip;
    await user.save();

    const tokenPayload = {
      userId: user._id,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    setAuthCookies(res, accessToken, refreshToken);

    const userData = {
      id: user._id,
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      isVerified: user.isVerified,
      lastLogin: user.lastLogin,
    };

    logger.info("User logged in successfully", {
      userId: user._id,
      email: user.email,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.status(200).json({
      success: true,
      message: "Logowanie przebiegło pomyślnie",
      user: userData,
    });
  } catch (error) {
    logger.error("Login error", {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.status(500).json({
      success: false,
      message: "Błąd serwera podczas logowania",
    });
  }
};
