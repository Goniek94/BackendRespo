import test from 'node:test';
import assert from 'node:assert';
import { setupTestDB, teardownTestDB, clearTestDB, createTestUser } from '../setup.js';
import User from '../../models/user/user.js';
import bcrypt from 'bcryptjs';

/**
 * USER MODEL TESTS
 * Tests for user model validation, methods, and security
 */

test.describe('User Model Tests', () => {
  test.before(async () => {
    await setupTestDB();
  });

  test.after(async () => {
    await teardownTestDB();
  });

  test.beforeEach(async () => {
    await clearTestDB();
  });

  test('User Creation - Valid Data', async () => {
    const userData = createTestUser();
    const user = new User(userData);
    
    const savedUser = await user.save();
    
    assert.ok(savedUser._id, 'User should have an ID');
    assert.strictEqual(savedUser.email, userData.email);
    assert.strictEqual(savedUser.name, userData.name);
    assert.strictEqual(savedUser.role, 'user');
    assert.strictEqual(savedUser.status, 'active');
  });

  test('User Creation - Password Hashing', async () => {
    const userData = createTestUser({ password: 'PlainTextPassword123!' });
    const user = new User(userData);
    
    const savedUser = await user.save();
    
    // Password should be hashed
    assert.notStrictEqual(savedUser.password, 'PlainTextPassword123!');
    assert.ok(savedUser.password.startsWith('$2'), 'Password should be bcrypt hashed');
    
    // Should be able to compare password
    const isValid = await savedUser.comparePassword('PlainTextPassword123!');
    assert.strictEqual(isValid, true, 'Password comparison should work');
    
    const isInvalid = await savedUser.comparePassword('WrongPassword');
    assert.strictEqual(isInvalid, false, 'Wrong password should not match');
  });

  test('User Validation - Required Fields', async () => {
    const invalidUsers = [
      { ...createTestUser(), name: undefined },
      { ...createTestUser(), lastName: undefined },
      { ...createTestUser(), email: undefined },
      { ...createTestUser(), password: undefined },
      { ...createTestUser(), phoneNumber: undefined },
      { ...createTestUser(), dob: undefined }
    ];

    for (const userData of invalidUsers) {
      const user = new User(userData);
      
      try {
        await user.save();
        assert.fail('Should have thrown validation error');
      } catch (error) {
        assert.ok(error.name === 'ValidationError', 'Should be validation error');
      }
    }
  });

  test('User Validation - Email Format', async () => {
    const invalidEmails = [
      'invalid-email',
      'test@',
      '@example.com',
      'test..test@example.com',
      'test@example',
      ''
    ];

    for (const email of invalidEmails) {
      const userData = createTestUser({ email });
      const user = new User(userData);
      
      try {
        await user.save();
        assert.fail(`Should have rejected invalid email: ${email}`);
      } catch (error) {
        assert.ok(error.name === 'ValidationError', 'Should be validation error');
      }
    }
  });

  test('User Validation - Phone Number Format', async () => {
    const validPhones = ['+48123456789', '+1234567890123', '+49123456789'];
    const invalidPhones = ['123456789', '48123456789', 'invalid', '+', '+48abc123456'];

    // Test valid phone numbers
    for (const phone of validPhones) {
      const userData = createTestUser({ 
        email: `test${Math.random()}@example.com`, // Unique email
        phoneNumber: phone 
      });
      const user = new User(userData);
      
      const savedUser = await user.save();
      assert.strictEqual(savedUser.phoneNumber, phone);
    }

    // Test invalid phone numbers
    for (const phone of invalidPhones) {
      const userData = createTestUser({ 
        email: `test${Math.random()}@example.com`, // Unique email
        phoneNumber: phone 
      });
      const user = new User(userData);
      
      try {
        await user.save();
        assert.fail(`Should have rejected invalid phone: ${phone}`);
      } catch (error) {
        assert.ok(error.name === 'ValidationError', 'Should be validation error');
      }
    }
  });

  test('User Validation - Age Requirement', async () => {
    const today = new Date();
    
    // Test valid ages (16+ years)
    const validDates = [
      new Date(today.getFullYear() - 16, today.getMonth(), today.getDate()), // Exactly 16
      new Date(today.getFullYear() - 25, today.getMonth(), today.getDate()), // 25 years old
      new Date(today.getFullYear() - 50, today.getMonth(), today.getDate())  // 50 years old
    ];

    for (const dob of validDates) {
      const userData = createTestUser({ 
        email: `test${Math.random()}@example.com`,
        phoneNumber: `+48${Math.floor(Math.random() * 1000000000)}`,
        dob 
      });
      const user = new User(userData);
      
      const savedUser = await user.save();
      assert.ok(savedUser._id, 'Valid age should be accepted');
    }

    // Test invalid ages (under 16)
    const invalidDates = [
      new Date(today.getFullYear() - 15, today.getMonth(), today.getDate()), // 15 years old
      new Date(today.getFullYear() - 10, today.getMonth(), today.getDate()), // 10 years old
      new Date() // Today (0 years old)
    ];

    for (const dob of invalidDates) {
      const userData = createTestUser({ 
        email: `test${Math.random()}@example.com`,
        phoneNumber: `+48${Math.floor(Math.random() * 1000000000)}`,
        dob 
      });
      const user = new User(userData);
      
      try {
        await user.save();
        assert.fail(`Should have rejected age under 16: ${dob}`);
      } catch (error) {
        assert.ok(error.name === 'ValidationError', 'Should be validation error');
      }
    }
  });

  test('User Validation - Unique Constraints', async () => {
    const userData1 = createTestUser();
    const user1 = new User(userData1);
    await user1.save();

    // Test duplicate email
    const userData2 = createTestUser({ 
      phoneNumber: '+48987654321',
      email: userData1.email // Same email
    });
    const user2 = new User(userData2);
    
    try {
      await user2.save();
      assert.fail('Should have rejected duplicate email');
    } catch (error) {
      assert.ok(error.code === 11000, 'Should be duplicate key error');
    }

    // Test duplicate phone
    const userData3 = createTestUser({ 
      email: 'different@example.com',
      phoneNumber: userData1.phoneNumber // Same phone
    });
    const user3 = new User(userData3);
    
    try {
      await user3.save();
      assert.fail('Should have rejected duplicate phone');
    } catch (error) {
      assert.ok(error.code === 11000, 'Should be duplicate key error');
    }
  });

  test('User Methods - Password Comparison', async () => {
    const password = 'TestPassword123!';
    const userData = createTestUser({ password });
    const user = new User(userData);
    const savedUser = await user.save();

    // Test correct password
    const isCorrect = await savedUser.comparePassword(password);
    assert.strictEqual(isCorrect, true, 'Correct password should match');

    // Test incorrect password
    const isIncorrect = await savedUser.comparePassword('WrongPassword');
    assert.strictEqual(isIncorrect, false, 'Incorrect password should not match');

    // Test empty password
    const isEmpty = await savedUser.comparePassword('');
    assert.strictEqual(isEmpty, false, 'Empty password should not match');
  });

  test('User Security - Password Strength', async () => {
    const weakPasswords = [
      'weak',
      '123456',
      'password',
      'Password',
      'Password123'
    ];

    const strongPasswords = [
      'StrongPassword123!',
      'MySecure@Pass1',
      'Complex#Password2024'
    ];

    // Weak passwords should still be saved (validation is done at controller level)
    // But we test that they get hashed properly
    for (const password of weakPasswords) {
      const userData = createTestUser({ 
        email: `test${Math.random()}@example.com`,
        phoneNumber: `+48${Math.floor(Math.random() * 1000000000)}`,
        password 
      });
      const user = new User(userData);
      const savedUser = await user.save();
      
      assert.notStrictEqual(savedUser.password, password, 'Password should be hashed');
    }

    // Strong passwords should work normally
    for (const password of strongPasswords) {
      const userData = createTestUser({ 
        email: `test${Math.random()}@example.com`,
        phoneNumber: `+48${Math.floor(Math.random() * 1000000000)}`,
        password 
      });
      const user = new User(userData);
      const savedUser = await user.save();
      
      const isValid = await savedUser.comparePassword(password);
      assert.strictEqual(isValid, true, 'Strong password should work');
    }
  });

  test('User Roles and Status', async () => {
    const roles = ['user', 'moderator', 'admin'];
    const statuses = ['active', 'suspended', 'banned'];

    for (const role of roles) {
      const userData = createTestUser({ 
        email: `test${Math.random()}@example.com`,
        phoneNumber: `+48${Math.floor(Math.random() * 1000000000)}`,
        role 
      });
      const user = new User(userData);
      const savedUser = await user.save();
      
      assert.strictEqual(savedUser.role, role, `Role ${role} should be saved`);
    }

    for (const status of statuses) {
      const userData = createTestUser({ 
        email: `test${Math.random()}@example.com`,
        phoneNumber: `+48${Math.floor(Math.random() * 1000000000)}`,
        status 
      });
      const user = new User(userData);
      const savedUser = await user.save();
      
      assert.strictEqual(savedUser.status, status, `Status ${status} should be saved`);
    }
  });

  test('User Preferences and Settings', async () => {
    const userData = createTestUser({
      notificationPreferences: {
        email: false,
        sms: true,
        push: true
      },
      privacySettings: {
        showEmail: false,
        showPhone: true,
        showProfile: true
      },
      securitySettings: {
        twoFactorAuth: true,
        loginAlerts: false
      }
    });

    const user = new User(userData);
    const savedUser = await user.save();

    assert.strictEqual(savedUser.notificationPreferences.email, false);
    assert.strictEqual(savedUser.notificationPreferences.sms, true);
    assert.strictEqual(savedUser.privacySettings.showEmail, false);
    assert.strictEqual(savedUser.securitySettings.twoFactorAuth, true);
  });

  test('User Bonuses System', async () => {
    const userData = createTestUser({
      bonuses: [{
        type: 'discount',
        value: 10,
        description: '10% discount',
        isUsed: false,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      }]
    });

    const user = new User(userData);
    const savedUser = await user.save();

    assert.strictEqual(savedUser.bonuses.length, 1);
    assert.strictEqual(savedUser.bonuses[0].type, 'discount');
    assert.strictEqual(savedUser.bonuses[0].value, 10);
    assert.strictEqual(savedUser.bonuses[0].isUsed, false);
  });

  test('User Timestamps', async () => {
    const userData = createTestUser();
    const user = new User(userData);
    const savedUser = await user.save();

    assert.ok(savedUser.createdAt instanceof Date, 'createdAt should be a Date');
    assert.ok(savedUser.updatedAt instanceof Date, 'updatedAt should be a Date');
    
    // Update user and check if updatedAt changes
    const originalUpdatedAt = savedUser.updatedAt;
    
    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));
    
    savedUser.name = 'Updated Name';
    const updatedUser = await savedUser.save();
    
    assert.ok(updatedUser.updatedAt > originalUpdatedAt, 'updatedAt should be updated');
  });

  test('User Query Methods', async () => {
    // Create test users
    const users = [
      createTestUser({ email: 'active@test.com', status: 'active' }),
      createTestUser({ email: 'suspended@test.com', phoneNumber: '+48111111111', status: 'suspended' }),
      createTestUser({ email: 'banned@test.com', phoneNumber: '+48222222222', status: 'banned' }),
      createTestUser({ email: 'admin@test.com', phoneNumber: '+48333333333', role: 'admin' })
    ];

    for (const userData of users) {
      const user = new User(userData);
      await user.save();
    }

    // Test finding by status
    const activeUsers = await User.find({ status: 'active' });
    assert.ok(activeUsers.length >= 2, 'Should find active users');

    const suspendedUsers = await User.find({ status: 'suspended' });
    assert.strictEqual(suspendedUsers.length, 1, 'Should find one suspended user');

    // Test finding by role
    const adminUsers = await User.find({ role: 'admin' });
    assert.strictEqual(adminUsers.length, 1, 'Should find one admin user');

    // Test finding by email
    const specificUser = await User.findOne({ email: 'admin@test.com' });
    assert.ok(specificUser, 'Should find user by email');
    assert.strictEqual(specificUser.role, 'admin');
  });
});
