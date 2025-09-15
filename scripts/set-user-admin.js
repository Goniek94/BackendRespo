#!/usr/bin/env node

/**
 * Set User as Admin
 * Nadaje rolę admin określonemu użytkownikowi
 */

import mongoose from 'mongoose';
import User from '../models/user/user.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const userEmail = 'mateusz.goszczycki1994@gmail.com';

console.log('🔧 Nadawanie roli admin użytkownikowi');
console.log('Email:', userEmail);

async function setUserAdmin() {
  try {
    // Połącz z bazą danych
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Połączono z bazą danych');

    // Znajdź użytkownika
    const user = await User.findOne({ email: userEmail });
    
    if (!user) {
      console.log('❌ Użytkownik nie został znaleziony:', userEmail);
      console.log('💡 Sprawdź czy email jest poprawny lub czy użytkownik się zarejestrował');
      return;
    }

    console.log('✅ Znaleziono użytkownika:');
    console.log('  ID:', user._id);
    console.log('  Name:', user.name);
    console.log('  Email:', user.email);
    console.log('  Current Role:', user.role);

    // Nadaj rolę admin
    user.role = 'admin';
    await user.save();

    console.log('🎉 Pomyślnie nadano rolę admin!');
    console.log('  New Role:', user.role);
    
    // Sprawdź czy zmiana została zapisana
    const updatedUser = await User.findById(user._id);
    console.log('✅ Weryfikacja - rola w bazie:', updatedUser.role);

  } catch (error) {
    console.error('❌ Błąd:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Rozłączono z bazą danych');
  }
}

// Uruchom skrypt
setUserAdmin().then(() => {
  console.log('\n🏁 Skrypt zakończony');
  console.log('💡 Teraz możesz zalogować się do panelu admin z tym emailem');
}).catch(error => {
  console.error('❌ Skrypt failed:', error);
});
