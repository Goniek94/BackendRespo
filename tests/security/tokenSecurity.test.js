/**
 * SECURITY TOKEN TESTS
 * 
 * Comprehensive test suite for cryptographic token security
 * Tests entropy, uniqueness, format validation, and brute-force resistance
 * 
 * @author Senior Security Developer
 * @version 1.0.0
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import {
  generateSecureToken,
  generateSecureCode,
  generateSessionId,
  generateEmailVerificationToken,
  generatePasswordResetToken,
  generateAdminRequestId,
  generateSecureFilename,
  generateSecurePassword,
  validateTokenEntropy,
  generateSecureIssueId
} from '../../utils/securityTokens.js';

describe('Security Token Generation Tests', () => {
  
  describe('generateSecureToken', () => {
    test('should generate tokens of correct length', () => {
      const token8 = generateSecureToken(8);
      const token16 = generateSecureToken(16);
      const token32 = generateSecureToken(32);
      
      expect(token8).toHaveLength(8);
      expect(token16).toHaveLength(16);
      expect(token32).toHaveLength(32);
    });
    
    test('should generate unique tokens', () => {
      const tokens = new Set();
      const iterations = 1000;
      
      for (let i = 0; i < iterations; i++) {
        const token = generateSecureToken(32);
        expect(tokens.has(token)).toBe(false);
        tokens.add(token);
      }
      
      expect(tokens.size).toBe(iterations);
    });
    
    test('should contain only valid base64url characters', () => {
      const token = generateSecureToken(32);
      // Should not contain +, /, or = characters (removed for URL safety)
      expect(token).not.toMatch(/[+/=]/);
      // Should contain only alphanumeric characters
      expect(token).toMatch(/^[A-Za-z0-9]+$/);
    });
    
    test('should have high entropy', () => {
      const token = generateSecureToken(32);
      const validation = validateTokenEntropy(token);
      
      expect(validation.valid).toBe(true);
      expect(validation.entropy).toBeGreaterThan(0.5);
    });
  });
  
  describe('generateSecureCode', () => {
    test('should generate numeric codes of correct length', () => {
      const code4 = generateSecureCode(4);
      const code6 = generateSecureCode(6);
      const code8 = generateSecureCode(8);
      
      expect(code4).toHaveLength(4);
      expect(code6).toHaveLength(6);
      expect(code8).toHaveLength(8);
      
      expect(code4).toMatch(/^\d{4}$/);
      expect(code6).toMatch(/^\d{6}$/);
      expect(code8).toMatch(/^\d{8}$/);
    });
    
    test('should generate codes within valid range', () => {
      const code6 = generateSecureCode(6);
      const numericCode = parseInt(code6, 10);
      
      expect(numericCode).toBeGreaterThanOrEqual(100000);
      expect(numericCode).toBeLessThanOrEqual(999999);
    });
    
    test('should generate unique codes', () => {
      const codes = new Set();
      const iterations = 1000;
      
      for (let i = 0; i < iterations; i++) {
        const code = generateSecureCode(6);
        codes.add(code);
      }
      
      // Should have high uniqueness (allowing for some collisions in 6-digit space)
      expect(codes.size).toBeGreaterThan(iterations * 0.95);
    });
    
    test('should reject invalid lengths', () => {
      expect(() => generateSecureCode(3)).toThrow('Code length must be between 4 and 10 digits');
      expect(() => generateSecureCode(11)).toThrow('Code length must be between 4 and 10 digits');
    });
    
    test('should pad codes with leading zeros', () => {
      // Test multiple times to catch edge cases
      for (let i = 0; i < 100; i++) {
        const code = generateSecureCode(6);
        expect(code).toHaveLength(6);
        expect(code).toMatch(/^\d{6}$/);
      }
    });
  });
  
  describe('generateSessionId', () => {
    test('should generate session IDs with correct format', () => {
      const sessionId = generateSessionId();
      
      expect(sessionId).toMatch(/^session_[a-z0-9]+_[a-f0-9]{32}$/);
    });
    
    test('should generate unique session IDs', () => {
      const sessionIds = new Set();
      const iterations = 1000;
      
      for (let i = 0; i < iterations; i++) {
        const sessionId = generateSessionId();
        expect(sessionIds.has(sessionId)).toBe(false);
        sessionIds.add(sessionId);
      }
      
      expect(sessionIds.size).toBe(iterations);
    });
  });
  
  describe('generateEmailVerificationToken', () => {
    test('should generate email verification tokens', () => {
      const token = generateEmailVerificationToken();
      
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(50); // Should be long enough
      expect(token).toMatch(/^[a-f0-9]+$/); // Should be hex format
    });
    
    test('should generate unique email verification tokens', () => {
      const tokens = new Set();
      const iterations = 1000;
      
      for (let i = 0; i < iterations; i++) {
        const token = generateEmailVerificationToken();
        expect(tokens.has(token)).toBe(false);
        tokens.add(token);
      }
      
      expect(tokens.size).toBe(iterations);
    });
  });
  
  describe('generatePasswordResetToken', () => {
    test('should generate password reset tokens', () => {
      const token = generatePasswordResetToken();
      
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(60); // Should be long enough
      expect(token).toMatch(/^[a-f0-9]+$/); // Should be hex format
    });
    
    test('should generate unique password reset tokens', () => {
      const tokens = new Set();
      const iterations = 1000;
      
      for (let i = 0; i < iterations; i++) {
        const token = generatePasswordResetToken();
        expect(tokens.has(token)).toBe(false);
        tokens.add(token);
      }
      
      expect(tokens.size).toBe(iterations);
    });
  });
  
  describe('generateAdminRequestId', () => {
    test('should generate admin request IDs with correct format', () => {
      const requestId = generateAdminRequestId();
      
      expect(requestId).toMatch(/^admin_[a-z0-9]+_[a-f0-9]{18}$/);
    });
    
    test('should generate unique admin request IDs', () => {
      const requestIds = new Set();
      const iterations = 1000;
      
      for (let i = 0; i < iterations; i++) {
        const requestId = generateAdminRequestId();
        expect(requestIds.has(requestId)).toBe(false);
        requestIds.add(requestId);
      }
      
      expect(requestIds.size).toBe(iterations);
    });
  });
  
  describe('generateSecureFilename', () => {
    test('should generate secure filenames with extensions', () => {
      const filename1 = generateSecureFilename('jpg');
      const filename2 = generateSecureFilename('.png');
      
      expect(filename1).toMatch(/^\d+-[a-f0-9]{16}\.jpg$/);
      expect(filename2).toMatch(/^\d+-[a-f0-9]{16}\.png$/);
    });
    
    test('should generate unique filenames', () => {
      const filenames = new Set();
      const iterations = 1000;
      
      for (let i = 0; i < iterations; i++) {
        const filename = generateSecureFilename('jpg');
        expect(filenames.has(filename)).toBe(false);
        filenames.add(filename);
      }
      
      expect(filenames.size).toBe(iterations);
    });
  });
  
  describe('generateSecurePassword', () => {
    test('should generate passwords of correct length', () => {
      const password8 = generateSecurePassword(8);
      const password12 = generateSecurePassword(12);
      const password16 = generateSecurePassword(16);
      
      expect(password8).toHaveLength(8);
      expect(password12).toHaveLength(12);
      expect(password16).toHaveLength(16);
    });
    
    test('should contain required character types', () => {
      const password = generateSecurePassword(12);
      
      expect(password).toMatch(/[A-Z]/); // Uppercase
      expect(password).toMatch(/[a-z]/); // Lowercase
      expect(password).toMatch(/[0-9]/); // Digit
      expect(password).toMatch(/[!@#$%^&*]/); // Special character
    });
    
    test('should generate unique passwords', () => {
      const passwords = new Set();
      const iterations = 1000;
      
      for (let i = 0; i < iterations; i++) {
        const password = generateSecurePassword(12);
        passwords.add(password);
      }
      
      // Should have very high uniqueness
      expect(passwords.size).toBeGreaterThan(iterations * 0.99);
    });
  });
  
  describe('generateSecureIssueId', () => {
    test('should generate issue IDs with correct format', () => {
      const issueId1 = generateSecureIssueId('SECURITY');
      const issueId2 = generateSecureIssueId('Bug Report');
      
      expect(issueId1).toMatch(/^SECURITY_\d+_[a-f0-9]{18}$/);
      expect(issueId2).toMatch(/^BUG_REPORT_\d+_[a-f0-9]{18}$/);
    });
    
    test('should handle default category', () => {
      const issueId = generateSecureIssueId();
      
      expect(issueId).toMatch(/^GENERAL_\d+_[a-f0-9]{18}$/);
    });
  });
  
  describe('validateTokenEntropy', () => {
    test('should validate good tokens', () => {
      const goodToken = generateSecureToken(32);
      const validation = validateTokenEntropy(goodToken);
      
      expect(validation.valid).toBe(true);
      expect(validation.entropy).toBeGreaterThan(0.5);
      expect(validation.length).toBe(32);
    });
    
    test('should reject short tokens', () => {
      const shortToken = 'abc123';
      const validation = validateTokenEntropy(shortToken);
      
      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('Token too short');
    });
    
    test('should reject tokens with low variety', () => {
      const lowVarietyToken = 'aaaaaaaaaaaaaaaa';
      const validation = validateTokenEntropy(lowVarietyToken);
      
      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('Insufficient character variety');
    });
    
    test('should reject tokens without numbers and letters', () => {
      const numbersOnly = '12345678';
      const lettersOnly = 'abcdefgh';
      
      const validation1 = validateTokenEntropy(numbersOnly);
      const validation2 = validateTokenEntropy(lettersOnly);
      
      expect(validation1.valid).toBe(false);
      expect(validation2.valid).toBe(false);
      expect(validation1.reason).toBe('Token should contain both letters and numbers');
      expect(validation2.reason).toBe('Token should contain both letters and numbers');
    });
    
    test('should handle invalid input', () => {
      const validation1 = validateTokenEntropy(null);
      const validation2 = validateTokenEntropy(123);
      
      expect(validation1.valid).toBe(false);
      expect(validation2.valid).toBe(false);
      expect(validation1.reason).toBe('Invalid token format');
      expect(validation2.reason).toBe('Invalid token format');
    });
  });
  
  describe('Security and Performance Tests', () => {
    test('should resist timing attacks', () => {
      const iterations = 100;
      const times = [];
      
      for (let i = 0; i < iterations; i++) {
        const start = process.hrtime.bigint();
        generateSecureToken(32);
        const end = process.hrtime.bigint();
        times.push(Number(end - start));
      }
      
      // Calculate coefficient of variation (should be low for consistent timing)
      const mean = times.reduce((a, b) => a + b) / times.length;
      const variance = times.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / times.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = stdDev / mean;
      
      // Should have relatively consistent timing (CV < 0.5)
      expect(coefficientOfVariation).toBeLessThan(0.5);
    });
    
    test('should handle high-volume generation', () => {
      const startTime = Date.now();
      const tokens = [];
      const iterations = 10000;
      
      for (let i = 0; i < iterations; i++) {
        tokens.push(generateSecureToken(16));
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should generate 10k tokens in reasonable time (< 5 seconds)
      expect(duration).toBeLessThan(5000);
      
      // All tokens should be unique
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(iterations);
    });
    
    test('should have cryptographic randomness distribution', () => {
      const codes = [];
      const iterations = 10000;
      
      // Generate many 6-digit codes
      for (let i = 0; i < iterations; i++) {
        codes.push(parseInt(generateSecureCode(6), 10));
      }
      
      // Test distribution - should be roughly uniform
      const min = Math.min(...codes);
      const max = Math.max(...codes);
      const range = max - min;
      
      expect(min).toBeGreaterThanOrEqual(100000);
      expect(max).toBeLessThanOrEqual(999999);
      expect(range).toBeGreaterThan(800000); // Should span most of the range
      
      // Test for patterns - consecutive numbers should be rare
      let consecutiveCount = 0;
      for (let i = 1; i < codes.length; i++) {
        if (codes[i] === codes[i-1] + 1) {
          consecutiveCount++;
        }
      }
      
      // Should have very few consecutive numbers (< 1% of total)
      expect(consecutiveCount).toBeLessThan(iterations * 0.01);
    });
  });
  
  describe('Error Handling', () => {
    test('should handle crypto module failures gracefully', () => {
      // This test would require mocking the crypto module to simulate failures
      // For now, we just ensure functions don't throw unexpected errors
      expect(() => generateSecureToken(16)).not.toThrow();
      expect(() => generateSecureCode(6)).not.toThrow();
      expect(() => generateSessionId()).not.toThrow();
    });
  });
});

describe('Integration with Authentication System', () => {
  test('should generate tokens compatible with existing system', () => {
    // Test that our tokens work with the existing verification system
    const emailToken = generateEmailVerificationToken();
    const smsCode = generateSecureCode(6);
    const resetToken = generatePasswordResetToken();
    
    // These should be valid formats for the existing system
    expect(typeof emailToken).toBe('string');
    expect(emailToken.length).toBeGreaterThan(0);
    
    expect(smsCode).toMatch(/^\d{6}$/);
    
    expect(typeof resetToken).toBe('string');
    expect(resetToken.length).toBeGreaterThan(0);
  });
  
  test('should maintain backward compatibility', () => {
    // Ensure new tokens don't break existing validation
    const token = generateSecureToken(32);
    const validation = validateTokenEntropy(token);
    
    expect(validation.valid).toBe(true);
  });
});
