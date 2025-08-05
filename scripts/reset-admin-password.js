/**
 * Reset hasła administratora
 */

import mongoose from 'mongoose';
import User from '../models/user/user.js';
import config from '../config/index.js';
import bcrypt from 'bcryptjs';

async function resetAdminPassword() {
  try {
    console.log('🔧 Łączenie z bazą danych...');
    
    await mongoose.connect(config.database.uri, config.database.options);
    console.log('✅ Połączono z bazą danych');
    
    const email = 'kontakt@autosell.pl';
    const newPassword = 'admin123';
    
    // Znajdź administratora
    const admin = await User.findOne({ email });
    
    if (!admin) {
      console.log('❌ Administrator nie znaleziony:', email);
      process.exit(1);
    }
    
    console.log('👤 Znaleziono administratora:', admin.email);
    
    // Zahashuj nowe hasło
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Zaktualizuj hasło
    admin.password = hashedPassword;
    await admin.save();
    
    console.log('✅ Hasło zostało zresetowane!');
    console.log('📧 Email:', email);
    console.log('🔑 Nowe hasło:', newPassword);
    
    // Sprawdź czy hasło działa
    const isMatch = await bcrypt.compare(newPassword, admin.password);
    console.log('🔍 Weryfikacja hasła:', isMatch ? '✅ OK' : '❌ BŁĄD');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Błąd:', error.message);
    process.exit(1);
  }
}

// Uruchom skrypt
resetAdminPassword();
