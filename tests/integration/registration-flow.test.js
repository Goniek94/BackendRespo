// tests/integration/registration-flow.test.js
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../index.js';
import User from '../../models/user/user.js';

describe('Registration Flow Integration Tests', () => {
  let testUser;
  
  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/marketplace_test');
    }
  });

  beforeEach(async () => {
    // Clean up test data
    await User.deleteMany({});
    
    testUser = {
      name: 'Jan',
      lastName: 'Kowalski',
      email: 'jan.kowalski@test.com',
      confirmEmail: 'jan.kowalski@test.com',
      password: 'Test123!@#',
      confirmPassword: 'Test123!@#',
      phone: '+48123456789',
      dob: '1990-01-01',
      termsAccepted: true,
      dataProcessingAccepted: true,
      marketingAccepted: false
    };
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  describe('Complete Registration Flow', () => {
    test('should complete full registration process', async () => {
      // Step 1: Register user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.user).toBeDefined();
      expect(registerResponse.body.user.email).toBe(testUser.email);
      expect(registerResponse.body.nextStep).toBe('email_verification');
      
      // In development mode, we should get verification codes
      expect(registerResponse.body.devCodes).toBeDefined();
      expect(registerResponse.body.devCodes.emailCode).toBeDefined();
      expect(registerResponse.body.devCodes.smsCode).toBeDefined();

      const userId = registerResponse.body.user.id;
      const emailCode = registerResponse.body.devCodes.emailCode;
      const smsCode = registerResponse.body.devCodes.smsCode;

      // Verify user was created in database
      const dbUser = await User.findById(userId);
      expect(dbUser).toBeTruthy();
      expect(dbUser.isEmailVerified).toBe(false);
      expect(dbUser.isPhoneVerified).toBe(false);
      expect(dbUser.isVerified).toBe(false);
      expect(dbUser.registrationStep).toBe('email_verification');

      // Step 2: Verify email
      const emailVerifyResponse = await request(app)
        .post('/api/auth/verify-email-advanced')
        .send({
          email: testUser.email,
          code: emailCode
        })
        .expect(200);

      expect(emailVerifyResponse.body.success).toBe(true);
      expect(emailVerifyResponse.body.user.isEmailVerified).toBe(true);
      expect(emailVerifyResponse.body.nextStep).toBe('sms_verification');

      // Step 3: Verify SMS
      const smsVerifyResponse = await request(app)
        .post('/api/auth/verify-sms-advanced')
        .send({
          phone: testUser.phone,
          code: smsCode
        })
        .expect(200);

      expect(smsVerifyResponse.body.success).toBe(true);
      expect(smsVerifyResponse.body.user.isPhoneVerified).toBe(true);
      expect(smsVerifyResponse.body.user.isVerified).toBe(true);
      expect(smsVerifyResponse.body.nextStep).toBe('completed');

      // Verify final state in database
      const finalUser = await User.findById(userId);
      expect(finalUser.isEmailVerified).toBe(true);
      expect(finalUser.isPhoneVerified).toBe(true);
      expect(finalUser.isVerified).toBe(true);
      expect(finalUser.registrationStep).toBe('completed');
    });

    test('should handle email uniqueness validation', async () => {
      // Create first user
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      // Try to register with same email
      const duplicateUser = { ...testUser, phone: '+48987654321' };
      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('email już istnieje');
    });

    test('should handle phone uniqueness validation', async () => {
      // Create first user
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      // Try to register with same phone
      const duplicateUser = { ...testUser, email: 'different@test.com', confirmEmail: 'different@test.com' };
      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('telefonu już istnieje');
    });

    test('should validate password confirmation', async () => {
      const invalidUser = {
        ...testUser,
        confirmPassword: 'DifferentPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.some(err => err.msg.includes('identyczne'))).toBe(true);
    });

    test('should validate email confirmation', async () => {
      const invalidUser = {
        ...testUser,
        confirmEmail: 'different@test.com'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.some(err => err.msg.includes('identyczne'))).toBe(true);
    });

    test('should validate age requirement (minimum 16)', async () => {
      const underageUser = {
        ...testUser,
        dob: '2010-01-01' // 15 years old
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(underageUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.some(err => err.msg.includes('16 lat'))).toBe(true);
    });

    test('should validate password strength', async () => {
      const weakPasswordUser = {
        ...testUser,
        password: 'weak',
        confirmPassword: 'weak'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(weakPasswordUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.some(err => err.msg.includes('wielką literę'))).toBe(true);
    });

    test('should validate phone format', async () => {
      const invalidPhoneUser = {
        ...testUser,
        phone: '123456789' // Missing country code
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidPhoneUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.some(err => err.msg.includes('kod kraju'))).toBe(true);
    });

    test('should require terms acceptance', async () => {
      const noTermsUser = {
        ...testUser,
        termsAccepted: false
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(noTermsUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('regulamin');
    });
  });

  describe('Email/Phone Existence Check', () => {
    beforeEach(async () => {
      // Create a test user in database
      const user = new User({
        name: 'Existing',
        lastName: 'User',
        email: 'existing@test.com',
        password: 'hashedpassword',
        phoneNumber: '+48111222333',
        dob: new Date('1990-01-01'),
        termsAccepted: true,
        dataProcessingAccepted: true
      });
      await user.save();
    });

    test('should check if email exists', async () => {
      const response = await request(app)
        .post('/api/auth/check-email')
        .send({ email: 'existing@test.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.exists).toBe(true);
      expect(response.body.message).toContain('już istnieje');
    });

    test('should check if email is available', async () => {
      const response = await request(app)
        .post('/api/auth/check-email')
        .send({ email: 'available@test.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.exists).toBe(false);
      expect(response.body.message).toContain('dostępny');
    });

    test('should check if phone exists', async () => {
      const response = await request(app)
        .post('/api/auth/check-phone')
        .send({ phone: '+48111222333' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.exists).toBe(true);
      expect(response.body.message).toContain('już istnieje');
    });

    test('should check if phone is available', async () => {
      const response = await request(app)
        .post('/api/auth/check-phone')
        .send({ phone: '+48999888777' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.exists).toBe(false);
      expect(response.body.message).toContain('dostępny');
    });
  });

  describe('Verification Code Resending', () => {
    let userId, userEmail, userPhone;

    beforeEach(async () => {
      // Register a user first
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      userId = registerResponse.body.user.id;
      userEmail = registerResponse.body.user.email;
      userPhone = registerResponse.body.user.phoneNumber;
    });

    test('should resend email verification code', async () => {
      const response = await request(app)
        .post('/api/auth/resend-email-code')
        .send({ email: userEmail })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('wysłany na email');
      expect(response.body.devCode).toBeDefined(); // In development mode
    });

    test('should resend SMS verification code', async () => {
      const response = await request(app)
        .post('/api/auth/resend-sms-code')
        .send({ phone: userPhone })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('wysłany SMS');
      expect(response.body.devCode).toBeDefined(); // In development mode
    });

    test('should not resend email code for verified email', async () => {
      // First verify the email
      const user = await User.findById(userId);
      user.isEmailVerified = true;
      await user.save();

      const response = await request(app)
        .post('/api/auth/resend-email-code')
        .send({ email: userEmail })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('już zweryfikowany');
    });
  });

  describe('Email Verification Link', () => {
    let userId, userEmail;

    beforeEach(async () => {
      // Register a user first
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      userId = registerResponse.body.user.id;
      userEmail = registerResponse.body.user.email;
    });

    test('should send email verification link', async () => {
      const response = await request(app)
        .post('/api/auth/send-email-verification-link')
        .send({ email: userEmail })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Link weryfikacyjny został wysłany');
      expect(response.body.devLink).toBeDefined(); // In development mode
      expect(response.body.devLink).toContain('verify-email?token=');
    });

    test('should not send link for already verified email', async () => {
      // First verify the email
      const user = await User.findById(userId);
      user.isEmailVerified = true;
      await user.save();

      const response = await request(app)
        .post('/api/auth/send-email-verification-link')
        .send({ email: userEmail })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('już zweryfikowany');
    });

    test('should not send link for non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/send-email-verification-link')
        .send({ email: 'nonexistent@test.com' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('nie został znaleziony');
    });
  });
});
