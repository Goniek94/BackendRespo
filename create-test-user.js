// Tworzenie użytkownika testowego do testowania wiadomości
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/user/user.js';
import config from './config/index.js';

async function createTestUser() {
  try {
    console.log('🔧 Łączenie z bazą danych...');
    await mongoose.connect(config.database.uri);
    console.log('✅ Połączono z bazą danych');

    // Sprawdź czy użytkownik już istnieje
    const existingUser = await User.findOne({ email: 'testuser@example.com' });
    if (existingUser) {
      console.log('👤 Użytkownik testowy już istnieje');
      console.log('📧 Email:', existingUser.email);
      console.log('🔑 Hasło: TestPassword123!');
      return;
    }

    // Utwórz nowego użytkownika testowego
    const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
    
    const testUser = new User({
      name: 'Test',
      lastName: 'User',
      email: 'testuser@example.com',
      password: hashedPassword,
      phoneNumber: '+48123456789',
      dob: new Date('1990-01-01'),
      isVerified: true,
      role: 'user',
      status: 'active',
      termsAccepted: true,
      dataProcessingAccepted: true,
      termsAcceptedAt: new Date(),
      dataProcessingAcceptedAt: new Date(),
      registrationStep: 'completed'
    });

    await testUser.save();
    console.log('✅ Utworzono użytkownika testowego');
    console.log('📧 Email: testuser@example.com');
    console.log('🔑 Hasło: TestPassword123!');
    console.log('👤 ID:', testUser._id);

  } catch (error) {
    console.error('❌ Błąd podczas tworzenia użytkownika:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Rozłączono z bazą danych');
  }
}

createTestUser();
