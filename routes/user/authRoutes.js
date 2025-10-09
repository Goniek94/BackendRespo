import express from "express";
import { body } from "express-validator";
import {
  authLimiter,
  registrationLimiter,
} from "../../middleware/rateLimiting.js";
import {
  registerUser,
  loginUser,
  logoutUser,
  verify2FACode,
  send2FACode,
  checkAuth,
  checkEmailExists,
  checkPhoneExists,
} from "../../controllers/user/index.js";

const router = express.Router();

/**
 * AUTHENTICATION ROUTES
 * Trasy związane z autoryzacją użytkowników
 */

// Sprawdzanie czy email istnieje
router.post("/check-email", checkEmailExists);

// Sprawdzanie czy telefon istnieje
router.post("/check-phone", checkPhoneExists);

// Rejestracja użytkownika
router.post(
  "/register",
  registrationLimiter, // Rate limiting dla rejestracji
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
  authLimiter, // Rate limiting dla logowania
  [
    body("email").isEmail().withMessage("Nieprawidłowy format email."),
    body("password").notEmpty().withMessage("Hasło jest wymagane."),
  ],
  loginUser
);

// Wylogowanie użytkownika
router.post("/logout", logoutUser);

// Sprawdzanie stanu autoryzacji - używa optionalAuthMiddleware
import authMiddleware, {
  optionalAuthMiddleware,
} from "../../middleware/auth.js";
router.get("/check-auth", optionalAuthMiddleware, checkAuth);

// Wysyłanie kodu SMS 2FA
router.post("/send-2fa", send2FACode);

// Weryfikacja kodu 2FA
router.post("/verify-2fa", verify2FACode);

export default router;
