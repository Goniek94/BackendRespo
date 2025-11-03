/**
 * Verification Token Generator
 * Generates and verifies JWT tokens for pre-registration verification
 * These tokens prove that email/phone was verified before account creation
 */

import jwt from "jsonwebtoken";

/**
 * Generate verification token after successful code verification
 * Token is valid for 1 hour and contains identifier and type
 *
 * @param {string} identifier - Email or phone number
 * @param {string} type - 'email' or 'phone'
 * @returns {string} JWT token
 */
export const generateVerificationToken = (identifier, type) => {
  return jwt.sign(
    {
      identifier: identifier.toLowerCase().trim(),
      type,
      verified: true,
      purpose: "pre-registration-verification",
      timestamp: Date.now(),
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
};

/**
 * Verify verification token
 * Returns decoded token data if valid, null if invalid/expired
 *
 * @param {string} token - JWT token to verify
 * @returns {object|null} Decoded token data or null
 */
export const verifyVerificationToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Validate token purpose
    if (decoded.purpose !== "pre-registration-verification") {
      console.warn("Invalid token purpose:", decoded.purpose);
      return null;
    }

    // Validate required fields
    if (!decoded.identifier || !decoded.type || !decoded.verified) {
      console.warn("Missing required token fields");
      return null;
    }

    return decoded;
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      console.warn("Verification token expired");
    } else if (error.name === "JsonWebTokenError") {
      console.warn("Invalid verification token:", error.message);
    } else {
      console.error("Token verification error:", error);
    }
    return null;
  }
};

/**
 * Verify both email and phone tokens for registration
 * Returns true only if both tokens are valid and match expected identifiers
 *
 * @param {string} emailToken - Email verification token
 * @param {string} phoneToken - Phone verification token
 * @param {string} expectedEmail - Expected email address
 * @param {string} expectedPhone - Expected phone number
 * @returns {boolean} True if both tokens are valid
 */
export const verifyBothTokens = (
  emailToken,
  phoneToken,
  expectedEmail,
  expectedPhone
) => {
  const emailData = verifyVerificationToken(emailToken);
  const phoneData = verifyVerificationToken(phoneToken);

  if (!emailData || !phoneData) {
    console.warn("One or both tokens are invalid");
    return false;
  }

  // Verify email token
  if (
    emailData.type !== "email" ||
    emailData.identifier !== expectedEmail.toLowerCase().trim()
  ) {
    console.warn("Email token mismatch");
    return false;
  }

  // Verify phone token
  if (phoneData.type !== "phone" || phoneData.identifier !== expectedPhone) {
    console.warn("Phone token mismatch");
    return false;
  }

  return true;
};
