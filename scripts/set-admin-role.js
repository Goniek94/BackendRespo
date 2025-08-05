/**
 * SKRYPT DO USTAWIANIA ROLI ADMIN
 * Używa tej samej konfiguracji co serwer
 */

import mongoose from 'mongoose';
import User from '../models/user/user.js';
import config from '../config/index.js';

async function setAdminRole() {
  try {
    console.log('🔧 Łączenie z bazą danych...');
    
    // Użyj tej samej konfiguracji co serwer
    await mongoose.connect(config.database.uri, config.database.options);
    console.log('✅ Połączono z bazą danych');
    
    const email = 'mateusz.goszczycki1994@gmail.com';
    
    // Znajdź użytkownika
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('❌ Użytkownik nie znaleziony:', email);
      process.exit(1);
    }
    
    console.log('👤 Znaleziono użytkownika:');
    console.log('   Email:', user.email);
    console.log('   Nazwa:', user.name);
    console.log('   Aktualna rola:', user.role || 'brak');
    console.log('   ID:', user._id);
    
    // Ustaw rolę admin
    if (user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
      console.log('✅ Ustawiono rolę ADMIN dla użytkownika');
    } else {
      console.log('✅ Użytkownik już ma rolę ADMIN');
    }
    
    console.log('');
    console.log('🎉 GOTOWE! Teraz rate limiting nie będzie Cię dotyczył');
    console.log('');
    console.log('📋 Podsumowanie:');
    console.log('   • Email:', user.email);
    console.log('   • Rola: ADMIN');
    console.log('   • Rate limiting: WYŁĄCZONY dla tego konta');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Błąd:', error.message);
    process.exit(1);
  }
}

// Uruchom skrypt
setAdminRole();
