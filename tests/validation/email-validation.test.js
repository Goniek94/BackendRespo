/**
 * EMAIL VALIDATION TESTS
 * 
 * Testy walidacji emaili w schemacie użytkownika
 * Sprawdza czy niepoprawne emaile są odrzucane z błędem 400
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import express from 'express';
import User from '../../models/user/user.js';
import userRoutes from '../../routes/user/userRoutes.js';

// Konfiguracja testowej aplikacji Express
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/users', userRoutes);
  return app;
};

describe('Email Validation Tests', () => {
  let app;
  let testDbConnection;

  beforeAll(async () => {
    // Połączenie z testową bazą danych
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/marketplace-test-email';
    testDbConnection = await mongoose.connect(mongoUri);
    
    app = createTestApp();
  });

  afterAll(async () => {
    // Czyszczenie i zamknięcie połączenia
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Czyszczenie kolekcji użytkowników przed każdym testem
    await User.deleteMany({});
  });

  describe('Schema Email Validation', () => {
    it('should reject email without @ symbol', async () => {
      const invalidUser = {
        name: 'Test',
        lastName: 'User',
        email: 'invalidemail.com', // Brak @
        password: 'TestPassword123',
        phone: '+48123456789',
        dob: '1990-01-01'
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(invalidUser);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('email');
    });

    it('should reject email without domain', async () => {
      const invalidUser = {
        name: 'Test',
        lastName: 'User',
        email: 'test@', // Brak domeny
        password: 'TestPassword123',
        phone: '+48123456789',
        dob: '1990-01-01'
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(invalidUser);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('email');
    });

    it('should reject email without TLD', async () => {
      const invalidUser = {
        name: 'Test',
        lastName: 'User',
        email: 'test@domain', // Brak TLD (.com, .pl, etc.)
        password: 'TestPassword123',
        phone: '+48123456789',
        dob: '1990-01-01'
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(invalidUser);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('email');
    });

    it('should reject email with spaces', async () => {
      const invalidUser = {
        name: 'Test',
        lastName: 'User',
        email: 'test @domain.com', // Spacja w emailu
        password: 'TestPassword123',
        phone: '+48123456789',
        dob: '1990-01-01'
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(invalidUser);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('email');
    });

    it('should reject email with multiple @ symbols', async () => {
      const invalidUser = {
        name: 'Test',
        lastName: 'User',
        email: 'test@@domain.com', // Podwójny @
        password: 'TestPassword123',
        phone: '+48123456789',
        dob: '1990-01-01'
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(invalidUser);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('email');
    });

    it('should reject empty email', async () => {
      const invalidUser = {
        name: 'Test',
        lastName: 'User',
        email: '', // Pusty email
        password: 'TestPassword123',
        phone: '+48123456789',
        dob: '1990-01-01'
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(invalidUser);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('email');
    });
  });

  describe('Valid Email Acceptance', () => {
    it('should accept valid email format', async () => {
      const validUser = {
        name: 'Test',
        lastName: 'User',
        email: 'test@example.com', // Poprawny email
        password: 'TestPassword123',
        phone: '+48123456789',
        dob: '1990-01-01'
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(validUser);

      // Może być 201 (created) lub 200 (success) w zależności od implementacji
      expect([200, 201]).toContain(response.status);
      
      // Sprawdź czy użytkownik został utworzony w bazie
      const user = await User.findOne({ email: 'test@example.com' });
      expect(user).toBeTruthy();
      expect(user.email).toBe('test@example.com');
    });

    it('should accept email with subdomain', async () => {
      const validUser = {
        name: 'Test',
        lastName: 'User',
        email: 'test@mail.example.com', // Email z subdomeną
        password: 'TestPassword123',
        phone: '+48123456790', // Inny numer telefonu
        dob: '1990-01-01'
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(validUser);

      expect([200, 201]).toContain(response.status);
      
      const user = await User.findOne({ email: 'test@mail.example.com' });
      expect(user).toBeTruthy();
    });

    it('should accept email with numbers and special characters', async () => {
      const validUser = {
        name: 'Test',
        lastName: 'User',
        email: 'test.user+123@example-domain.co.uk', // Złożony ale poprawny email
        password: 'TestPassword123',
        phone: '+48123456791', // Inny numer telefonu
        dob: '1990-01-01'
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(validUser);

      expect([200, 201]).toContain(response.status);
      
      const user = await User.findOne({ email: 'test.user+123@example-domain.co.uk' });
      expect(user).toBeTruthy();
    });
  });

  describe('Direct Schema Validation', () => {
    it('should validate email directly in schema', async () => {
      // Test bezpośredniej walidacji w schemacie Mongoose
      const invalidUser = new User({
        name: 'Test',
        lastName: 'User',
        email: 'invalid-email', // Niepoprawny email
        password: 'TestPassword123',
        phoneNumber: '+48123456789',
        dob: new Date('1990-01-01')
      });

      let validationError;
      try {
        await invalidUser.validate();
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeTruthy();
      expect(validationError.errors.email).toBeTruthy();
      expect(validationError.errors.email.message).toContain('not a valid email');
    });

    it('should pass validation for correct email in schema', async () => {
      const validUser = new User({
        name: 'Test',
        lastName: 'User',
        email: 'valid@example.com', // Poprawny email
        password: 'TestPassword123',
        phoneNumber: '+48123456789',
        dob: new Date('1990-01-01')
      });

      let validationError;
      try {
        await validUser.validate();
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeFalsy();
    });
  });
});
