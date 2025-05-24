/**
 * Skrypt do utworzenia testowego użytkownika w bazie MongoDB.
 * Uruchom: node createTestUser.js
 */
import mongoose from 'mongoose';
import User from './models/user.js';

const MONGO_URI = 'mongodb://localhost:27017/marketplace'; // Zmień jeśli masz inną bazę

async function main() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Połączono z bazą MongoDB');

  const existing = await User.findOne({ email: 'test@example.com' });
  if (existing) {
    console.log('Testowy użytkownik już istnieje:', existing._id);
    await mongoose.disconnect();
    return;
  }

  const user = new User({
    name: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    phoneNumber: '123456789',
    password: 'Test1234!', // Hasło testowe, zmień w razie potrzeby
    isEmailVerified: true,
    isPhoneVerified: true,
    role: 'user'
  });

  await user.save();
  console.log('Utworzono testowego użytkownika:', user._id);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Błąd podczas tworzenia użytkownika:', err);
  process.exit(1);
});
