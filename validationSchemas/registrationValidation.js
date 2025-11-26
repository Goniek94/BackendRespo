/**
 * Registration Validation Schemas
 * Validation rules for multi-step wizard registration
 */

import { body } from "express-validator";

/**
 * Step 2: Email Validation
 */
export const validateEmailStep = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email jest wymagany")
    .isEmail()
    .withMessage("Nieprawidłowy format adresu email")
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage("Email jest za długi"),
];

/**
 * Step 2: Email Code Verification
 */
export const validateEmailCodeStep = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email jest wymagany")
    .isEmail()
    .withMessage("Nieprawidłowy format adresu email")
    .normalizeEmail(),
  body("code")
    .trim()
    .notEmpty()
    .withMessage("Kod weryfikacyjny jest wymagany")
    .isLength({ min: 6, max: 6 })
    .withMessage("Kod weryfikacyjny musi mieć 6 cyfr")
    .isNumeric()
    .withMessage("Kod weryfikacyjny musi zawierać tylko cyfry"),
];

/**
 * Step 3: Phone Validation
 */
export const validatePhoneStep = [
  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Numer telefonu jest wymagany")
    .matches(/^(\+?48)?[0-9]{9}$/)
    .withMessage(
      "Nieprawidłowy format numeru telefonu (wymagany format: +48XXXXXXXXX lub 9 cyfr)"
    ),
];

/**
 * Step 3: Phone Code Verification
 */
export const validatePhoneCodeStep = [
  body("phone").trim().notEmpty().withMessage("Numer telefonu jest wymagany"),
  body("code")
    .trim()
    .notEmpty()
    .withMessage("Kod weryfikacyjny jest wymagany")
    .isLength({ min: 4, max: 4 })
    .withMessage("Kod weryfikacyjny musi mieć 4 cyfry")
    .isNumeric()
    .withMessage("Kod weryfikacyjny musi zawierać tylko cyfry"),
];

/**
 * Step 4: Finalize Registration
 */
export const validateFinalizeStep = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Imię jest wymagane")
    .isLength({ min: 2, max: 50 })
    .withMessage("Imię musi mieć od 2 do 50 znaków")
    .matches(/^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s-]+$/)
    .withMessage("Imię może zawierać tylko litery"),
  body("lastName")
    .trim()
    .notEmpty()
    .withMessage("Nazwisko jest wymagane")
    .isLength({ min: 2, max: 50 })
    .withMessage("Nazwisko musi mieć od 2 do 50 znaków")
    .matches(/^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s-]+$/)
    .withMessage("Nazwisko może zawierać tylko litery"),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email jest wymagany")
    .isEmail()
    .withMessage("Nieprawidłowy format adresu email")
    .normalizeEmail(),
  body("password")
    .notEmpty()
    .withMessage("Hasło jest wymagane")
    .isLength({ min: 8 })
    .withMessage("Hasło musi mieć co najmniej 8 znaków")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Hasło musi zawierać co najmniej jedną małą literę, jedną wielką literę, jedną cyfrę i jeden znak specjalny"
    ),
  body("phone").trim().notEmpty().withMessage("Numer telefonu jest wymagany"),
  body("dob")
    .notEmpty()
    .withMessage("Data urodzenia jest wymagana")
    .isISO8601()
    .withMessage("Nieprawidłowy format daty")
    .custom((value) => {
      const birthDate = new Date(value);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }

      if (age < 16) {
        throw new Error("Musisz mieć co najmniej 16 lat");
      }

      return true;
    }),
  body("emailVerificationToken")
    .notEmpty()
    .withMessage("Token weryfikacji email jest wymagany"),
  body("phoneVerificationToken")
    .notEmpty()
    .withMessage("Token weryfikacji telefonu jest wymagany"),
  body("termsAccepted")
    .notEmpty()
    .withMessage("Akceptacja regulaminu jest wymagana")
    .isBoolean()
    .withMessage("Akceptacja regulaminu musi być wartością logiczną")
    .custom((value) => {
      if (value !== true) {
        throw new Error("Musisz zaakceptować regulamin");
      }
      return true;
    }),
];
