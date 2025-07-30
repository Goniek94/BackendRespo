/**
 * COMPREHENSIVE USER REGISTRATION INTEGRATION TESTS
 * 
 * Tests for user registration endpoint with complete validation scenarios:
 * - Happy path registration
 * - Email/phone uniqueness validation
 * - Password validation and security
 * - Data validation and error handling
 * - Database state verification
 * - Response security (password not returned)
 */

import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import app from '../../app.js';
import User from '../../models/user/user.js';
import { setupTestDB, teardownTestDB, clearTestDB } from '../setup.js';

describe('User Registration Integration Tests', () => {
  let validUserData;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    
    // Valid test user data
    validUserData = {
      name: 'Jan',
      lastName: 'Kowalski',
      email: 'jan.kowalski@test.com',
      confirmEmail: 'jan.kowalski@test.com',
      password: 'TestPassword123!',
      confirmPassword: 'TestPassword123!',
      phone: '+48123456789',
      dob: '1990-01-01',
      termsAccepted: true
    };
  });

  describe('Happy Path - Successful Registration', () => {
    test('should successfully register a new user with all valid data', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send(validUserData)
        .expect(201);

      // Verify response structure
      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('Rejestracja rozpoczęta'),
        user: expect.objectContaining({
          id: expect.any(String),
          name: validUserData.name,
          lastName: validUserData.lastName,
          email: validUserData.email,
          phoneNumber: validUserData.phone,
          registrationStep: 'email_verification',
          isEmailVerified: false,
          isPhoneVerified: false,
          isVerified: false,
          role: 'user'
        }),
        nextStep: 'email_verification'
      });

      // Verify password is NOT returned in response
      expect(response.body.user.password).toBeUndefined();
      expect(response.body.user.hashedPassword).toBeUndefined();

      // Verify user was created in database with correct flags
      const dbUser = await User.findById(response.body.user.id);
      expect(dbUser).toBeTruthy();
      expect(dbUser.name).toBe(validUserData.name);
      expect(dbUser.lastName).toBe(validUserData.lastName);
      expect(dbUser.email).toBe(validUserData.email.toLowerCase());
      expect(dbUser.phoneNumber).toBe(validUserData.phone);
      
      // Verify verification flags
      expect(dbUser.isEmailVerified).toBe(false);
      expect(dbUser.isPhoneVerified).toBe(false);
      expect(dbUser.isVerified).toBe(false);
      expect(dbUser.registrationStep).toBe('email_verification');
      
      // Verify terms acceptance
      expect(dbUser.termsAccepted).toBe(true);
      expect(dbUser.termsAcceptedAt).toBeTruthy();
      
      // Verify password is hashed
      expect(dbUser.password).not.toBe(validUserData.password);
      const isPasswordValid = await bcrypt.compare(validUserData.password, dbUser.password);
      expect(isPasswordValid).toBe(true);
      
      // Verify verification codes are generated
      expect(dbUser.emailVerificationCode).toBeTruthy();
      expect(dbUser.smsVerificationCode).toBeTruthy();
      expect(dbUser.emailVerificationCodeExpires).toBeTruthy();
      expect(dbUser.smsVerificationCodeExpires).toBeTruthy();
      
      // Verify default values
      expect(dbUser.role).toBe('user');
      expect(dbUser.status).toBe('active');
      expect(dbUser.loginAttempts).toBe(0);
    });

    test('should format phone number correctly for Polish numbers', async () => {
      const testCases = [
        { input: '123456789', expected: '+48123456789' },
        { input: '48123456789', expected: '+48123456789' },
        { input: '+48123456789', expected: '+48123456789' },
        { input: '0123456789', expected: '+48123456789' }
      ];

      for (const testCase of testCases) {
        await clearTestDB();
        
        const userData = {
          ...validUserData,
          email: `test${Math.random()}@test.com`,
          confirmEmail: `test${Math.random()}@test.com`,
          phone: testCase.input
        };
        userData.confirmEmail = userData.email;

        const response = await request(app)
          .post('/api/users/register')
          .send(userData)
          .expect(201);

        expect(response.body.user.phoneNumber).toBe(testCase.expected);
        
        const dbUser = await User.findById(response.body.user.id);
        expect(dbUser.phoneNumber).toBe(testCase.expected);
      }
    });
  });

  describe('Email Uniqueness Validation', () => {
    test('should reject registration with existing email', async () => {
      // Create first user
      await request(app)
        .post('/api/users/register')
        .send(validUserData)
        .expect(201);

      // Try to register with same email but different phone
      const duplicateEmailUser = {
        ...validUserData,
        phone: '+48987654321'
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(duplicateEmailUser)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Użytkownik z tym adresem email już istnieje'
      });

      // Verify second user was not created
      const userCount = await User.countDocuments();
      expect(userCount).toBe(1);
    });

    test('should handle case-insensitive email uniqueness', async () => {
      // Create first user
      await request(app)
        .post('/api/users/register')
        .send(validUserData)
        .expect(201);

      // Try to register with same email in different case
      const duplicateEmailUser = {
        ...validUserData,
        email: 'JAN.KOWALSKI@TEST.COM',
        confirmEmail: 'JAN.KOWALSKI@TEST.COM',
        phone: '+48987654321'
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(duplicateEmailUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('email już istnieje');
    });
  });

  describe('Phone Number Uniqueness Validation', () => {
    test('should reject registration with existing phone number', async () => {
      // Create first user
      await request(app)
        .post('/api/users/register')
        .send(validUserData)
        .expect(201);

      // Try to register with same phone but different email
      const duplicatePhoneUser = {
        ...validUserData,
        email: 'different@test.com',
        confirmEmail: 'different@test.com'
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(duplicatePhoneUser)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Użytkownik z tym numerem telefonu już istnieje'
      });

      // Verify second user was not created
      const userCount = await User.countDocuments();
      expect(userCount).toBe(1);
    });

    test('should handle phone number format variations for uniqueness', async () => {
      // Create first user with formatted phone
      await request(app)
        .post('/api/users/register')
        .send(validUserData)
        .expect(201);

      // Try to register with same phone in different format
      const duplicatePhoneUser = {
        ...validUserData,
        email: 'different@test.com',
        confirmEmail: 'different@test.com',
        phone: '123456789' // Will be formatted to +48123456789
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(duplicatePhoneUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('telefonu już istnieje');
    });
  });

  describe('Password Validation', () => {
    test('should reject mismatched passwords', async () => {
      const invalidUser = {
        ...validUserData,
        password: 'TestPassword123!',
        confirmPassword: 'DifferentPassword123!'
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(invalidUser)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Błędy walidacji',
        errors: expect.arrayContaining([
          expect.objectContaining({
            msg: expect.stringContaining('identyczne')
          })
        ])
      });

      // Verify user was not created
      const userCount = await User.countDocuments();
      expect(userCount).toBe(0);
    });

    test('should reject weak passwords', async () => {
      const weakPasswordCases = [
        {
          password: 'weak',
          confirmPassword: 'weak',
          expectedError: 'od 8 do 128 znaków'
        },
        {
          password: 'weakpassword',
          confirmPassword: 'weakpassword',
          expectedError: 'wielką literę'
        },
        {
          password: 'WEAKPASSWORD',
          confirmPassword: 'WEAKPASSWORD',
          expectedError: 'małą literę'
        },
        {
          password: 'WeakPassword',
          confirmPassword: 'WeakPassword',
          expectedError: 'cyfrę'
        }
      ];

      for (const testCase of weakPasswordCases) {
        const invalidUser = {
          ...validUserData,
          email: `test${Math.random()}@test.com`,
          password: testCase.password,
          confirmPassword: testCase.confirmPassword
        };
        invalidUser.confirmEmail = invalidUser.email;

        const response = await request(app)
          .post('/api/users/register')
          .send(invalidUser)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.errors.some(err => 
          err.msg.includes(testCase.expectedError)
        )).toBe(true);
      }
    });
  });

  describe('Email Validation', () => {
    test('should reject mismatched email confirmation', async () => {
      const invalidUser = {
        ...validUserData,
        email: 'test@example.com',
        confirmEmail: 'different@example.com'
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(invalidUser)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Błędy walidacji',
        errors: expect.arrayContaining([
          expect.objectContaining({
            msg: expect.stringContaining('identyczne')
          })
        ])
      });
    });

    test('should reject invalid email formats', async () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test..test@example.com',
        'test@example',
        ''
      ];

      for (const invalidEmail of invalidEmails) {
        const invalidUser = {
          ...validUserData,
          email: invalidEmail,
          confirmEmail: invalidEmail
        };

        const response = await request(app)
          .post('/api/users/register')
          .send(invalidUser)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.errors.some(err => 
          err.msg.includes('prawidłowy adres email')
        )).toBe(true);
      }
    });
  });

  describe('Phone Number Validation', () => {
    test('should reject invalid phone number formats', async () => {
      const invalidPhones = [
        '123456', // Too short
        'abcdefghij', // Non-numeric
        '123456789012345678', // Too long
        '+1234567890123456789', // Too long with country code
        '123-456-789', // Invalid format
        ''
      ];

      for (const invalidPhone of invalidPhones) {
        const invalidUser = {
          ...validUserData,
          email: `test${Math.random()}@test.com`,
          phone: invalidPhone
        };
        invalidUser.confirmEmail = invalidUser.email;

        const response = await request(app)
          .post('/api/users/register')
          .send(invalidUser)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.errors.some(err => 
          err.msg.includes('kod kraju') || err.msg.includes('9 do 16 znaków')
        )).toBe(true);
      }
    });
  });

  describe('Age Validation', () => {
    test('should reject users under 16 years old', async () => {
      const underageUser = {
        ...validUserData,
        dob: '2010-01-01' // 15 years old
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(underageUser)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Błędy walidacji',
        errors: expect.arrayContaining([
          expect.objectContaining({
            msg: expect.stringContaining('16 lat')
          })
        ])
      });

      // Verify user was not created
      const userCount = await User.countDocuments();
      expect(userCount).toBe(0);
    });

    test('should accept users exactly 16 years old', async () => {
      const today = new Date();
      const sixteenYearsAgo = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate());
      
      const validAgeUser = {
        ...validUserData,
        dob: sixteenYearsAgo.toISOString().split('T')[0]
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(validAgeUser)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    test('should reject unrealistic birth dates', async () => {
      const unrealisticUser = {
        ...validUserData,
        dob: '1900-01-01' // Over 120 years old
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(unrealisticUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.some(err => 
        err.msg.includes('nieprawidłowa')
      )).toBe(true);
    });
  });

  describe('Terms Acceptance Validation', () => {
    test('should reject registration without terms acceptance', async () => {
      const noTermsUser = {
        ...validUserData,
        termsAccepted: false
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(noTermsUser)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Musisz zaakceptować regulamin, aby się zarejestrować'
      });

      // Verify user was not created
      const userCount = await User.countDocuments();
      expect(userCount).toBe(0);
    });

    test('should reject registration without terms field', async () => {
      const noTermsUser = { ...validUserData };
      delete noTermsUser.termsAccepted;

      const response = await request(app)
        .post('/api/users/register')
        .send(noTermsUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('regulamin');
    });
  });

  describe('Required Fields Validation', () => {
    test('should reject registration with missing required fields', async () => {
      const requiredFields = ['name', 'email', 'password', 'phone', 'dob'];
      
      for (const field of requiredFields) {
        const incompleteUser = { ...validUserData };
        delete incompleteUser[field];
        
        // Also delete confirm fields if main field is deleted
        if (field === 'email') delete incompleteUser.confirmEmail;
        if (field === 'password') delete incompleteUser.confirmPassword;

        const response = await request(app)
          .post('/api/users/register')
          .send(incompleteUser)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.errors).toBeDefined();
        
        // Verify user was not created
        const userCount = await User.countDocuments();
        expect(userCount).toBe(0);
      }
    });
  });

  describe('Response Security', () => {
    test('should never return password in response', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send(validUserData)
        .expect(201);

      // Check response body
      expect(response.body.user.password).toBeUndefined();
      expect(response.body.user.hashedPassword).toBeUndefined();
      expect(response.body.password).toBeUndefined();
      
      // Check that no password-related fields are exposed
      const responseString = JSON.stringify(response.body);
      expect(responseString).not.toContain(validUserData.password);
      expect(responseString).not.toContain('$2b$'); // bcrypt hash prefix
    });

    test('should not expose sensitive verification codes in production', async () => {
      // Temporarily set NODE_ENV to production
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .post('/api/users/register')
        .send(validUserData)
        .expect(201);

      expect(response.body.devCodes).toBeUndefined();
      
      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Database State Verification', () => {
    test('should save user with correct database structure', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send(validUserData)
        .expect(201);

      const dbUser = await User.findById(response.body.user.id);
      
      // Verify all required fields are saved
      expect(dbUser.name).toBe(validUserData.name);
      expect(dbUser.lastName).toBe(validUserData.lastName);
      expect(dbUser.email).toBe(validUserData.email.toLowerCase());
      expect(dbUser.phoneNumber).toBe(validUserData.phone);
      expect(dbUser.dob).toEqual(new Date(validUserData.dob));
      
      // Verify verification status
      expect(dbUser.isEmailVerified).toBe(false);
      expect(dbUser.isPhoneVerified).toBe(false);
      expect(dbUser.isVerified).toBe(false);
      expect(dbUser.registrationStep).toBe('email_verification');
      
      // Verify security fields
      expect(dbUser.loginAttempts).toBe(0);
      expect(dbUser.status).toBe('active');
      expect(dbUser.role).toBe('user');
      
      // Verify timestamps
      expect(dbUser.createdAt).toBeTruthy();
      expect(dbUser.updatedAt).toBeTruthy();
      expect(dbUser.termsAcceptedAt).toBeTruthy();
      
      // Verify verification codes exist and have expiration
      expect(dbUser.emailVerificationCode).toBeTruthy();
      expect(dbUser.smsVerificationCode).toBeTruthy();
      expect(dbUser.emailVerificationCodeExpires).toBeTruthy();
      expect(dbUser.smsVerificationCodeExpires).toBeTruthy();
      
      // Verify expiration times are in the future
      expect(dbUser.emailVerificationCodeExpires.getTime()).toBeGreaterThan(Date.now());
      expect(dbUser.smsVerificationCodeExpires.getTime()).toBeGreaterThan(Date.now());
    });

    test('should not create user in database on validation failure', async () => {
      const invalidUser = {
        ...validUserData,
        email: 'invalid-email'
      };

      await request(app)
        .post('/api/users/register')
        .send(invalidUser)
        .expect(400);

      // Verify no user was created
      const userCount = await User.countDocuments();
      expect(userCount).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      // Temporarily close database connection
      await mongoose.connection.close();

      const response = await request(app)
        .post('/api/users/register')
        .send(validUserData)
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Błąd serwera podczas rejestracji'
      });

      // Reconnect for other tests
      await setupTestDB();
    });

    test('should handle malformed request data', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send('invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
