// Tworzenie użytkownika testowego do testowania wiadomości
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/user/user.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/marketplace';

async function createTestUser() {
  try {
    console.log('🔌 Łączenie z bazą danych...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Połączono z bazą danych');

    // Sprawdź czy użytkownik już istnieje
    const existingUser = await User.findOne({ email: 'test.messages@example.com' });
    if (existingUser) {
      console.log('👤 Użytkownik testowy już istnieje');
      console.log(`ID: ${existingUser._id}`);
      console.log(`Email: ${existingUser.email}`);
      console.log(`Nazwa: ${existingUser.name}`);
      return;
    }

    // Hashuj hasło
    const password = 'TestMessages123!';
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Utwórz nowego użytkownika
    const newUser = new User({
      email: 'test.messages@example.com',
      password: hashedPassword,
      name: 'Test Messages User',
      role: 'user',
      isVerified: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newUser.save();

    console.log('✅ Utworzono użytkownika testowego:');
    console.log(`ID: ${newUser._id}`);
    console.log(`Email: ${newUser.email}`);
    console.log(`Nazwa: ${newUser.name}`);
    console.log(`Hasło: ${password}`);

  } catch (error) {
    console.error('💥 Błąd:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Rozłączono z bazą danych');
  }
}

createTestUser();
