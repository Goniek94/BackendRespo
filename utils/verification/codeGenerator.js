/**
 * Code Generator Utilities
 * Generates and verifies secure 6-digit verification codes
 * Used for pre-registration email and phone verification
 */

import bcrypt from "bcryptjs";

/**
 * Generate secure 6-digit verification code
 * @returns {string} 6-digit numeric code
 */
export const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Hash verification code with bcrypt
 * @param {string} code - Plain text code
 * @returns {Promise<string>} Hashed code
 */
export const hashCode = async (code) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(code, salt);
};

/**
 * Verify code against hashed version
 * @param {string} code - Plain text code from user
 * @param {string} hashedCode - Hashed code from database
 * @returns {Promise<boolean>} True if code matches
 */
export const verifyCode = async (code, hashedCode) => {
  return await bcrypt.compare(code, hashedCode);
};
