/**
 * Authentication Controller
 * Handles user authentication operations: login, logout, registration, 2FA
 */

import crypto from 'crypto';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { sendVerificationCode } from '../../config/twilio.js';
import User from '../../models/user.js';
import adminConfig from '../../config/adminConfig.js';

/**
 * Register new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const registerUser = async (req, res) => {
  // Handle validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, lastName, email, phone, password, dob } = req.body;

  try {
    // Validate date of birth
    let dobDate;
    try {
      dobDate = new Date(dob);
      if (isNaN(dobDate.getTime())) {
        return res.status(400).json({ 
          message: 'Invalid date of birth format.',
          field: 'dob' 
        });
      }
      
      // Check age range (16-100 years)
      const today = new Date();
      let age = today.getFullYear() - dobDate.getFullYear();
      const monthDiff = today.getMonth() - dobDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) {
        age--;
      }
      
      if (age < 16) {
        return res.status(400).json({ 
          message: 'Musisz mieć co najmniej 16 lat, aby się zarejestrować.',
          field: 'dob',
          code: 'AGE_TOO_YOUNG'
        });
      }
      
      if (age > 100) {
        return res.status(400).json({ 
          message: 'Podana data urodzenia jest nieprawidłowa.',
          field: 'dob',
          code: 'INVALID_DATE'
        });
      }
    } catch (err) {
      return res.status(400).json({ 
        message: 'Invalid date of birth format.',
        field: 'dob' 
      });
    }
    
    // Validate Polish phone number format
    if (phone.startsWith('+48') && !phone.match(/^\+48\d{9}$/)) {
      return res.status(400).json({ 
        message: 'Invalid Polish phone number format. Should contain +48 prefix and exactly 9 digits.',
        field: 'phone' 
      });
    }
    
    // General phone format validation for other countries
    if (!phone.match(/^\+\d{1,4}\d{6,14}$/)) {
      return res.status(400).json({ 
        message: 'Invalid phone number format.',
        field: 'phone' 
      });
    }
    
    // Check if user with this email already exists
    const existingUserEmail = await User.findOne({ email });
    if (existingUserEmail) {
      return res.status(400).json({ 
        message: 'Ten adres email jest już zarejestrowany. Spróbuj się zalogować lub użyj innego adresu.',
        field: 'email',
        code: 'EMAIL_ALREADY_EXISTS'
      });
    }

    // Check if user with this phone number already exists
    const existingUserPhone = await User.findOne({ phoneNumber: phone });
    if (existingUserPhone) {
      return res.status(400).json({ 
        message: 'Ten numer telefonu jest już przypisany do innego konta. Użyj innego numeru.',
        field: 'phone',
        code: 'PHONE_ALREADY_EXISTS'
      });
    }

    // Generate 2FA code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Create new user
    const user = new User({
      name,
      lastName,
      email,
      phoneNumber: phone,
      password, // Will be hashed by pre-save hook
      dob: dobDate,
      is2FAEnabled: true, 
      twoFACode: code, 
      twoFACodeExpires: Date.now() + 10 * 60 * 1000
    });

    // Send verification code
    await sendVerificationCode(phone, code);

    // Save user to database
    await user.save();

    return res.status(201).json({ 
      message: 'Registration successful. Verification code has been sent.'
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Error during user registration.' });
  }
};

/**
 * Login user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const loginUser = async (req, res) => {
  console.log('🔍 LOGIN REQUEST RECEIVED:', {
    method: req.method,
    url: req.originalUrl,
    body: req.body,
    headers: {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent'],
      'origin': req.headers.origin
    },
    timestamp: new Date().toISOString()
  });

  // Validation - tylko email i password dla logowania
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ VALIDATION ERRORS:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;
  
  // Sprawdź czy mamy wymagane pola do logowania
  if (!email || !password) {
    return res.status(400).json({ 
      message: 'Email and password are required for login.',
      error: 'MISSING_CREDENTIALS'
    });
  }

  try {
    console.log('🔍 Starting login process for email:', email);
    
    // Check if database is connected
    console.log('📊 Database connection state:', mongoose.connection.readyState);
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      console.warn('Warning: Database not connected during login attempt.');
      return res.status(503).json({ 
        message: 'Database service is unavailable. Please try again later.',
        error: 'DB_UNAVAILABLE'
      });
    }

    // Find user in database - nie próbuj tworzyć nowego użytkownika
    console.log('🔍 Searching for user in database...');
    const user = await User.findOne({ email });
    console.log('👤 User found:', !!user);
    
    if (!user) {
      console.log('❌ User not found in database');
      return res.status(404).json({ 
        message: 'User does not exist.',
        error: 'USER_NOT_FOUND'
      });
    }
    
    console.log('✅ User found, checking password...');
    console.log('👤 User data:', {
      id: user._id,
      email: user.email,
      name: user.name,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      role: user.role,
      status: user.status
    });

    // Check if account is not banned
    if (user.status === 'banned') {
      return res.status(403).json({ 
        message: 'Account has been banned. Contact administration.',
        error: 'ACCOUNT_BANNED'
      });
    }

    if (user.status === 'suspended' && user.suspendedUntil && user.suspendedUntil > new Date()) {
      return res.status(403).json({ 
        message: `Account is temporarily suspended until ${user.suspendedUntil.toLocaleDateString()}.`,
        error: 'ACCOUNT_SUSPENDED'
      });
    }

    console.log('🔐 Starting password comparison...');
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('🔐 Password match result:', isMatch);
    if (!isMatch) {
      // Increase failed attempts counter
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      
      // If limit exceeded, temporarily lock account
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        try {
          await user.save();
        } catch (saveError) {
          console.warn('Could not save failed login attempt:', saveError.message);
        }
        return res.status(403).json({ 
          message: 'Too many failed login attempts. Account temporarily locked for 30 minutes.',
          error: 'ACCOUNT_LOCKED'
        });
      }
      
      try {
        await user.save();
      } catch (saveError) {
        console.warn('Could not save failed login attempt:', saveError.message);
      }
      return res.status(400).json({ 
        message: 'Incorrect password.',
        error: 'INVALID_PASSWORD',
        attemptsLeft: 5 - user.loginAttempts
      });
    }
    
    // Check if account is not temporarily locked
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingTime = Math.ceil((user.lockUntil - new Date()) / (60 * 1000)); // in minutes
      return res.status(403).json({ 
        message: `Account is temporarily locked. Try again in ${remainingTime} minutes.`,
        error: 'ACCOUNT_LOCKED',
        unlockTime: user.lockUntil
      });
    }
    
    // Reset failed attempts counter and lock after successful login
    user.loginAttempts = 0;
    user.lockUntil = null;
    
    // Check if email is in admin list and update role if needed
    if (adminConfig.adminEmails && adminConfig.adminEmails.includes(email) && user.role !== 'admin') {
      console.log(`Admin detected: ${email} - updating role`);
      user.role = adminConfig.defaultAdminRole || 'admin';
    }

    // Fix user data if needed before saving
    if (!user.lastName) {
      user.lastName = user.name || 'User';
    }
    
    // Fix phone number format if needed
    if (user.phoneNumber && !user.phoneNumber.startsWith('+')) {
      if (user.phoneNumber.length === 9) {
        user.phoneNumber = '+48' + user.phoneNumber;
      }
    }

    // Save user changes only if role was updated
    if (adminConfig.adminEmails && adminConfig.adminEmails.includes(email) && user.role === 'admin') {
      try {
        await user.save();
      } catch (saveError) {
        console.warn('Could not save user role update:', saveError.message);
        // Continue with login even if role update fails
      }
    }

    // Generate JWT token with role
    const jwtSecret = process.env.JWT_SECRET || 'default_jwt_secret_key';
    const token = jwt.sign(
      { 
        userId: user._id,
        role: user.role,
        type: 'access',
        lastActivity: Date.now()
      }, 
      jwtSecret, 
      { 
        expiresIn: '24h',
        audience: 'marketplace-users',
        issuer: 'marketplace-api',
        subject: user._id.toString()
      }
    );
    
    // Generate refresh token
    const refreshSecret = process.env.JWT_REFRESH_SECRET || 'default_refresh_secret_key';
    const refreshToken = jwt.sign(
      { 
        userId: user._id,
        role: user.role,
        type: 'refresh',
        jti: crypto.randomBytes(16).toString('hex')
      }, 
      refreshSecret, 
      { 
        expiresIn: '7d',
        audience: 'marketplace-users',
        issuer: 'marketplace-api',
        subject: user._id.toString()
      }
    );
    
    // Set tokens in HttpOnly cookies
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 86400000 // 24 hours in milliseconds
    });
    
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 3600000 // 7 days
    });
    
    // Return user data and token
    return res.status(200).json({ 
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name || user.email.split('@')[0],
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        dob: user.dob ? user.dob.toISOString().split('T')[0] : null,
        isAuthenticated: true,
        isAdmin: user.role === 'admin',
        isModerator: user.role === 'moderator'
      },
      token: token
    });
  } catch (error) {
    console.error('❌ LOGIN ERROR DETAILS:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      email: email,
      timestamp: new Date().toISOString()
    });
    return res.status(500).json({ 
      message: 'An error occurred during login. Please try again.',
      error: 'SERVER_ERROR'
    });
  }
};

/**
 * Logout user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const logoutUser = (req, res) => {
  // Clear token cookie
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
  
  return res.status(200).json({ message: 'Logged out successfully.' });
};

/**
 * Verify 2FA code
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const verify2FACode = async (req, res) => {
  const { email, code } = req.body;
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ message: 'Invalid 2FA code format.' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user || !user.is2FAEnabled) {
      return res.status(400).json({ message: '2FA is not enabled or user does not exist.' });
    }

    if (user.twoFACodeExpires < Date.now()) {
      return res.status(400).json({ message: 'Code expired. Please request a new code.' });
    }

    if (user.twoFACode === code) {
      user.twoFACode = null;
      user.twoFACodeExpires = null;
      await user.save();
      
      // JWT token after 2FA
      const token = jwt.sign(
        { userId: user._id }, 
        process.env.JWT_SECRET, 
        { expiresIn: '1h' }
      );
      
      // Set token in HttpOnly cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 3600000 // 1 hour in milliseconds
      });
      
      return res.status(200).json({ 
        message: 'Verification code correct, logged in.',
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          name: user.name,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          dob: user.dob ? user.dob.toISOString().split('T')[0] : null,
          isAuthenticated: true
        }
      });
    }
    return res.status(400).json({ message: 'Invalid verification code.' });
  } catch (error) {
    console.error('Code verification error:', error);
    return res.status(500).json({ message: 'Error during code verification.' });
  }
};

/**
 * Send 2FA code
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const send2FACode = async (req, res) => {
  const { phone } = req.body;
  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await sendVerificationCode(phone, code);
    return res.status(200).json({ message: 'Verification code has been sent.' });
  } catch (error) {
    console.error('Error sending code:', error);
    return res.status(500).json({ message: 'Error sending verification code.' });
  }
};

/**
 * Check authentication status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const checkAuth = (req, res) => {
  return res.status(200).json({ 
    isAuthenticated: true,
    user: {
      id: req.user.userId,
      role: req.user.role
    }
  });
};
