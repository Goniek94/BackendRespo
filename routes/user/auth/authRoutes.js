/**
 * AUTHENTICATION ROUTES
 * Trasy związane z uwierzytelnianiem użytkowników
 */

import express from "express";
import { body } from "express-validator";
import {
  authLimiter,
  passwordResetLimiter,
  registrationLimiter,
} from "../../../middleware/rateLimiting.js";
import {
  registerUser,
  loginUser,
  logoutUser,
  verify2FACode,
  send2FACode,
  checkAuth,
  requestPasswordReset,
  resetPassword,
  changePassword,
} from "../../../controllers/user/index.js";
import auth from "../../../middleware/auth.js";

const router = express.Router();

// Rejestracja użytkownika
router.post(
  "/register",
  registrationLimiter,
  [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Imię jest wymagane.")
      .isLength({ min: 2, max: 50 })
      .withMessage("Imię musi zawierać od 2 do 50 znaków.")
      .matches(/^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s-]+$/)
      .withMessage("Imię może zawierać tylko litery, spacje i myślniki."),

    body("lastName")
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Nazwisko musi zawierać od 2 do 50 znaków.")
      .matches(/^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s-]+$/)
      .withMessage("Nazwisko może zawierać tylko litery, spacje i myślniki."),

    body("email")
      .isEmail()
      .withMessage("Podaj prawidłowy adres email.")
      .normalizeEmail({ gmail_remove_dots: false })
      .isLength({ max: 100 })
      .withMessage("Email nie może być dłuższy niż 100 znaków."),

    body("confirmEmail")
      .isEmail()
      .withMessage("Podaj prawidłowy adres email w potwierdzeniu.")
      .normalizeEmail({ gmail_remove_dots: false })
      .custom((value, { req }) => {
        if (value !== req.body.email) {
          throw new Error("Adresy email nie są identyczne.");
        }
        return true;
      }),

    body("password")
      .isLength({ min: 8, max: 128 })
      .withMessage("Hasło musi mieć od 8 do 128 znaków.")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage(
        "Hasło musi zawierać co najmniej jedną małą literę, jedną wielką literę i jedną cyfrę."
      ),

    body("confirmPassword")
      .isLength({ min: 8, max: 128 })
      .withMessage("Potwierdzenie hasła musi mieć od 8 do 128 znaków.")
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error("Hasła nie są identyczne.");
        }
        return true;
      }),

    body("phone")
      .matches(/^\+[1-9]\d{1,14}$/)
      .withMessage(
        "Numer telefonu musi zaczynać się od + i zawierać kod kraju oraz numer (np. +48123456789)."
      )
      .isLength({ min: 9, max: 16 })
      .withMessage("Numer telefonu musi mieć od 9 do 16 znaków."),

    body("dob")
      .isISO8601()
      .withMessage("Data urodzenia musi być w formacie YYYY-MM-DD.")
      .custom((value) => {
        const birthDate = new Date(value);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        let actualAge = age;
        if (
          monthDiff < 0 ||
          (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ) {
          actualAge--;
        }

        if (actualAge < 16) {
          throw new Error(
            "Musisz mieć co najmniej 16 lat, aby się zarejestrować."
          );
        }

        if (actualAge > 120) {
          throw new Error("Podana data urodzenia jest nieprawidłowa.");
        }

        return true;
      }),
  ],
  registerUser
);

// Logowanie użytkownika
router.post(
  "/login",
  authLimiter,
  [
    body("email").isEmail().withMessage("Nieprawidłowy format email."),
    body("password").notEmpty().withMessage("Hasło jest wymagane."),
  ],
  loginUser
);

// Wylogowanie użytkownika
router.post("/logout", logoutUser);

// Sprawdzanie stanu autoryzacji
router.get("/check-auth", auth, checkAuth);

// Wysyłanie kodu SMS 2FA
router.post("/send-2fa", send2FACode);

// Weryfikacja kodu 2FA
router.post("/verify-2fa", verify2FACode);

// Żądanie resetu hasła
router.post(
  "/request-reset-password",
  passwordResetLimiter,
  [body("email").isEmail().withMessage("Proszę podać prawidłowy adres email.")],
  requestPasswordReset
);

// Resetowanie hasła (bez rate limitera - token już zapewnia bezpieczeństwo)
router.post(
  "/reset-password",
  [
    body("password")
      .optional()
      .isLength({ min: 8 })
      .withMessage("Hasło musi mieć co najmniej 8 znaków."),
    body("newPassword")
      .optional()
      .isLength({ min: 8 })
      .withMessage("Hasło musi mieć co najmniej 8 znaków."),
    body("token").notEmpty().withMessage("Token resetu hasła jest wymagany."),
  ],
  resetPassword
);

// Zmiana hasła (gdy użytkownik jest zalogowany)
router.put(
  "/change-password",
  auth,
  [
    body("oldPassword").notEmpty().withMessage("Stare hasło jest wymagane."),
    body("newPassword")
      .isLength({ min: 8 })
      .withMessage("Nowe hasło musi mieć co najmniej 8 znaków."),
  ],
  changePassword
);

export default router;
