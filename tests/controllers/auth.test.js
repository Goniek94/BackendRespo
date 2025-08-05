import test from 'node:test';
import assert from 'node:assert';
import { setupTestDB, teardownTestDB, clearTestDB, createTestUser } from '../setup.js';
import express from 'express';
import request from 'supertest';
import User from '../../models/user/user.js';
import { registerUser, loginUser, logoutUser, checkAuth } from '../../controllers/user/authController.js';
import cookieParser from 'cookie-parser';

/**
 * AUTHENTICATION CONTROLLER TESTS
 * Tests for user registration, login, logout, and authentication
 */

test.describe('Authentication Controller Tests', () => {
  let app;

  test.before(async () => {
    await setupTestDB();
    
    // Create test Express app
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    
    // Add auth routes
    app.post('/api/auth/register', registerUser);
    app.post('/api/auth/login', loginUser);
    app.post('/api/auth/logout', logoutUser);
    app.get('/api/auth/check', checkAuth);
  });

  test.after(async () => {
    await teardownTestDB();
  });

  test.beforeEach(async () => {
    await clearTestDB();
  });

  test('User Registration - Valid Data', async () => {
    const userData = {
      name: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'TestPassword123!',
      phone: '+48123456789',
      dob: '1990-01-01',
      termsAccepted: true
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    assert.strictEqual(response.body.success, true);
    assert.ok(response.body.user, 'User data should be returned');
    assert.strictEqual(response.body.user.email, userData.email);
    assert.strictEqual(response.body.user.name, userData.name);
    assert.ok(!response.body.user.password, 'Password should not be returned');

    // Verify user was created in database
    const dbUser = await User.findOne({ email: userData.email });
    assert.ok(dbUser, 'User should be created in database');
    assert.strictEqual(dbUser.isVerified, false, 'User should not be verified initially');
  });

  test('User Registration - Invalid Data', async () => {
    const invalidData = [
      // Missing required fields
      { name: 'Test', email: 'test@example.com' },
      // Invalid email
      { name: 'Test', lastName: 'User', email: 'invalid-email', password: 'Test123!', phone: '+48123456789', dob: '1990-01-01', termsAccepted: true },
      // Weak password
      { name: 'Test', lastName: 'User', email: 'test@example.com', password: '123', phone: '+48123456789', dob: '1990-01-01', termsAccepted: true },
      // Invalid phone
      { name: 'Test', lastName: 'User', email: 'test@example.com', password: 'Test123!', phone: 'invalid', dob: '1990-01-01', termsAccepted: true },
      // Under age
      { name: 'Test', lastName: 'User', email: 'test@example.com', password: 'Test123!', phone: '+48123456789', dob: '2010-01-01', termsAccepted: true },
      // Terms not accepted
      { name: 'Test', lastName: 'User', email: 'test@example.com', password: 'Test123!', phone: '+48123456789', dob: '1990-01-01', termsAccepted: false }
    ];

    for (const data of invalidData) {
      const response = await request(app)
        .post('/api/auth/register')
        .send(data)
        .expect(400);

      assert.strictEqual(response.body.success, false);
      assert.ok(response.body.message, 'Error message should be provided');
    }
  });

  test('User Registration - Duplicate Email/Phone', async () => {
    const userData = createTestUser();
    const user = new User(userData);
    await user.save();

    // Try to register with same email
    const duplicateEmailData = {
      name: 'Another',
      lastName: 'User',
      email: userData.email, // Same email
      password: 'TestPassword123!',
      phone: '+48987654321',
      dob: '1990-01-01',
      termsAccepted: true
    };

    const response1 = await request(app)
      .post('/api/auth/register')
      .send(duplicateEmailData)
      .expect(400);

    assert.strictEqual(response1.body.success, false);
    assert.ok(response1.body.message.includes('email'), 'Should mention email conflict');

    // Try to register with same phone
    const duplicatePhoneData = {
      name: 'Another',
      lastName: 'User',
      email: 'different@example.com',
      password: 'TestPassword123!',
      phone: userData.phoneNumber, // Same phone
      dob: '1990-01-01',
      termsAccepted: true
    };

    const response2 = await request(app)
      .post('/api/auth/register')
      .send(duplicatePhoneData)
      .expect(400);

    assert.strictEqual(response2.body.success, false);
    assert.ok(response2.body.message.includes('telefon'), 'Should mention phone conflict');
  });

  test('User Login - Valid Credentials', async () => {
    // Create a user first
    const userData = createTestUser({ password: 'TestPassword123!' });
    const user = new User(userData);
    await user.save();

    const loginData = {
      email: userData.email,
      password: 'TestPassword123!'
    };

    const response = await request(app)
      .post('/api/auth/login')
      .send(loginData)
      .expect(200);

    assert.strictEqual(response.body.success, true);
    assert.ok(response.body.user, 'User data should be returned');
    assert.strictEqual(response.body.user.email, userData.email);
    assert.ok(!response.body.user.password, 'Password should not be returned');

    // Check that cookies are set
    const cookies = response.headers['set-cookie'];
    assert.ok(cookies, 'Cookies should be set');
    
    const tokenCookie = cookies.find(cookie => cookie.startsWith('token='));
    const refreshCookie = cookies.find(cookie => cookie.startsWith('refreshToken='));
    
    assert.ok(tokenCookie, 'Access token cookie should be set');
    assert.ok(refreshCookie, 'Refresh token cookie should be set');
    
    // Check cookie security attributes
    assert.ok(tokenCookie.includes('HttpOnly'), 'Token cookie should be HttpOnly');
    assert.ok(tokenCookie.includes('SameSite=Strict'), 'Token cookie should have SameSite=Strict');
  });

  test('User Login - Invalid Credentials', async () => {
    // Create a user first
    const userData = createTestUser({ password: 'TestPassword123!' });
    const user = new User(userData);
    await user.save();

    const invalidLogins = [
      // Wrong password
      { email: userData.email, password: 'WrongPassword' },
      // Wrong email
      { email: 'wrong@example.com', password: 'TestPassword123!' },
      // Empty credentials
      { email: '', password: '' },
      // Missing fields
      { email: userData.email }
    ];

    for (const loginData of invalidLogins) {
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      assert.strictEqual(response.body.success, false);
      assert.ok(response.body.message, 'Error message should be provided');
    }
  });

  test('User Login - Account Lockout', async () => {
    // Create a user
    const userData = createTestUser({ password: 'TestPassword123!' });
    const user = new User(userData);
    await user.save();

    const loginData = {
      email: userData.email,
      password: 'WrongPassword'
    };

    // Make 5 failed login attempts
    for (let i = 0; i < 5; i++) {
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      if (i < 4) {
        assert.ok(response.body.attemptsLeft, 'Should show remaining attempts');
        assert.strictEqual(response.body.attemptsLeft, 4 - i);
      }
    }

    // 6th attempt should result in account lockout
    const lockoutResponse = await request(app)
      .post('/api/auth/login')
      .send(loginData)
      .expect(423);

    assert.strictEqual(lockoutResponse.body.success, false);
    assert.ok(lockoutResponse.body.message.includes('zablokowane'), 'Should mention account is locked');

    // Even correct password should fail when locked
    const correctPasswordResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: userData.email, password: 'TestPassword123!' })
      .expect(423);

    assert.strictEqual(correctPasswordResponse.body.success, false);
  });

  test('User Login - Suspended Account', async () => {
    // Create a suspended user
    const userData = createTestUser({ 
      password: 'TestPassword123!',
      status: 'suspended'
    });
    const user = new User(userData);
    await user.save();

    const loginData = {
      email: userData.email,
      password: 'TestPassword123!'
    };

    const response = await request(app)
      .post('/api/auth/login')
      .send(loginData)
      .expect(403);

    assert.strictEqual(response.body.success, false);
    assert.ok(response.body.message.includes('zawieszone'), 'Should mention account is suspended');
  });

  test('User Logout - Valid Session', async () => {
    // Create and login user first
    const userData = createTestUser({ password: 'TestPassword123!' });
    const user = new User(userData);
    await user.save();

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: userData.email, password: 'TestPassword123!' })
      .expect(200);

    // Extract cookies from login response
    const cookies = loginResponse.headers['set-cookie'];
    const cookieHeader = cookies.join('; ');

    // Logout with cookies
    const logoutResponse = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookieHeader)
      .expect(200);

    assert.strictEqual(logoutResponse.body.success, true);
    assert.ok(logoutResponse.body.message.includes('Wylogowanie'), 'Should confirm logout');

    // Check that cookies are cleared
    const logoutCookies = logoutResponse.headers['set-cookie'];
    if (logoutCookies) {
      const tokenCookie = logoutCookies.find(cookie => cookie.startsWith('token='));
      const refreshCookie = logoutCookies.find(cookie => cookie.startsWith('refreshToken='));
      
      if (tokenCookie) {
        assert.ok(tokenCookie.includes('Max-Age=0') || tokenCookie.includes('Expires='), 
          'Token cookie should be expired');
      }
      if (refreshCookie) {
        assert.ok(refreshCookie.includes('Max-Age=0') || refreshCookie.includes('Expires='), 
          'Refresh cookie should be expired');
      }
    }
  });

  test('Password Security - Hashing', async () => {
    const password = 'TestPassword123!';
    const userData = createTestUser({ password });
    
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: userData.name,
        lastName: userData.lastName,
        email: userData.email,
        password: password,
        phone: userData.phoneNumber,
        dob: userData.dob.toISOString().split('T')[0],
        termsAccepted: true
      })
      .expect(201);

    // Check user in database
    const dbUser = await User.findOne({ email: userData.email });
    
    // Password should be hashed
    assert.notStrictEqual(dbUser.password, password, 'Password should be hashed');
    assert.ok(dbUser.password.startsWith('$2'), 'Should use bcrypt hashing');
    assert.ok(dbUser.password.length > 50, 'Hashed password should be long');

    // Should be able to login with original password
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: userData.email, password: password })
      .expect(200);

    assert.strictEqual(loginResponse.body.success, true);
  });

  test('Phone Number Formatting', async () => {
    const phoneTests = [
      { input: '123456789', expected: '+48123456789' },
      { input: '48123456789', expected: '+48123456789' },
      { input: '+48123456789', expected: '+48123456789' },
      { input: '0123456789', expected: '+48123456789' }
    ];

    for (const phoneTest of phoneTests) {
      const userData = {
        name: 'Test',
        lastName: 'User',
        email: `test${Math.random()}@example.com`,
        password: 'TestPassword123!',
        phone: phoneTest.input,
        dob: '1990-01-01',
        termsAccepted: true
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      assert.strictEqual(response.body.user.phoneNumber, phoneTest.expected,
        `Phone ${phoneTest.input} should be formatted to ${phoneTest.expected}`);
    }
  });

  test('Age Validation', async () => {
    const today = new Date();
    
    // Test valid ages
    const validAges = [
      new Date(today.getFullYear() - 16, today.getMonth(), today.getDate()), // Exactly 16
      new Date(today.getFullYear() - 25, today.getMonth(), today.getDate()), // 25 years old
    ];

    for (const dob of validAges) {
      const userData = {
        name: 'Test',
        lastName: 'User',
        email: `test${Math.random()}@example.com`,
        password: 'TestPassword123!',
        phone: `+48${Math.floor(Math.random() * 1000000000)}`,
        dob: dob.toISOString().split('T')[0],
        termsAccepted: true
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      assert.strictEqual(response.body.success, true);
    }

    // Test invalid ages (under 16)
    const invalidAges = [
      new Date(today.getFullYear() - 15, today.getMonth(), today.getDate()), // 15 years old
      new Date(today.getFullYear() - 10, today.getMonth(), today.getDate()), // 10 years old
    ];

    for (const dob of invalidAges) {
      const userData = {
        name: 'Test',
        lastName: 'User',
        email: `test${Math.random()}@example.com`,
        password: 'TestPassword123!',
        phone: `+48${Math.floor(Math.random() * 1000000000)}`,
        dob: dob.toISOString().split('T')[0],
        termsAccepted: true
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      assert.strictEqual(response.body.success, false);
      assert.ok(response.body.message.includes('16 lat'), 'Should mention age requirement');
    }
  });

  test('Terms Acceptance Requirement', async () => {
    const userData = {
      name: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'TestPassword123!',
      phone: '+48123456789',
      dob: '1990-01-01',
      termsAccepted: false // Not accepted
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(400);

    assert.strictEqual(response.body.success, false);
    assert.ok(response.body.message.includes('regulamin'), 'Should mention terms requirement');
  });

  test('Registration Step Tracking', async () => {
    const userData = {
      name: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'TestPassword123!',
      phone: '+48123456789',
      dob: '1990-01-01',
      termsAccepted: true
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    assert.strictEqual(response.body.nextStep, 'email_verification');
    assert.strictEqual(response.body.user.registrationStep, 'email_verification');
    assert.strictEqual(response.body.user.isEmailVerified, false);
    assert.strictEqual(response.body.user.isPhoneVerified, false);
    assert.strictEqual(response.body.user.isVerified, false);

    // In development, verification codes should be returned
    if (process.env.NODE_ENV !== 'production') {
      assert.ok(response.body.devCodes, 'Dev codes should be provided in development');
      assert.ok(response.body.devCodes.emailCode, 'Email verification code should be provided');
      assert.ok(response.body.devCodes.smsCode, 'SMS verification code should be provided');
    }
  });
});
