/**
 * ADMIN PASSWORD MANAGEMENT SYSTEM
 * 
 * System zarządzania hasłami administratorów:
 * - Ustawianie nowego hasła dla admina
 * - Zmiana hasła przez admina
 * - Resetowanie hasła przez super admina
 * - Walidacja siły hasła
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import config from '../config/index.js';
import User from '../models/user/user.js';
import readline from 'readline';

const logger = require('../utils/logger.js');
logger.info('Admin Password Management System started');
console.log('===================================\n');

// Connect to database
try {
  await mongoose.connect(config.database.uri);
  console.log('✅ Database connected\n');
} catch (error) {
  console.log('❌ Database connection failed:', error.message);
  process.exit(1);
}

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to ask questions
const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
};

// Function to validate password strength
const validatePasswordStrength = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const issues = [];
  
  if (password.length < minLength) {
    issues.push(`Hasło musi mieć co najmniej ${minLength} znaków`);
  }
  
  if (!hasUpperCase) {
    issues.push('Hasło musi zawierać co najmniej jedną wielką literę');
  }
  
  if (!hasLowerCase) {
    issues.push('Hasło musi zawierać co najmniej jedną małą literę');
  }
  
  if (!hasNumbers) {
    issues.push('Hasło musi zawierać co najmniej jedną cyfrę');
  }
  
  if (!hasSpecialChar) {
    issues.push('Hasło musi zawierać co najmniej jeden znak specjalny');
  }
  
  return {
    isValid: issues.length === 0,
    issues: issues,
    strength: calculatePasswordStrength(password)
  };
};

// Function to calculate password strength
const calculatePasswordStrength = (password) => {
  let score = 0;
  
  // Length bonus
  score += Math.min(password.length * 2, 20);
  
  // Character variety bonus
  if (/[a-z]/.test(password)) score += 5;
  if (/[A-Z]/.test(password)) score += 5;
  if (/\d/.test(password)) score += 5;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 10;
  
  // Complexity bonus
  if (password.length >= 12) score += 10;
  if (/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(password)) score += 15;
  
  if (score < 30) return 'Słabe';
  if (score < 50) return 'Średnie';
  if (score < 70) return 'Dobre';
  return 'Bardzo silne';
};

// Function to hash password
const hashPassword = async (password) => {
  const saltRounds = 12; // Higher than standard for admin passwords
  return await bcrypt.hash(password, saltRounds);
};

// Main menu
const showMainMenu = async () => {
  console.log('📋 WYBIERZ OPCJĘ:');
  console.log('1. Ustaw hasło dla nowego admina');
  console.log('2. Zmień hasło istniejącego admina');
  console.log('3. Resetuj hasło admina (super admin)');
  console.log('4. Lista adminów');
  console.log('5. Sprawdź siłę hasła');
  console.log('0. Wyjście');
  console.log('');
  
  const choice = await askQuestion('Wybierz opcję (0-5): ');
  return choice.trim();
};

// Function to set password for new admin
const setNewAdminPassword = async () => {
  console.log('\n🆕 USTAWIANIE HASŁA DLA NOWEGO ADMINA');
  console.log('====================================');
  
  const email = await askQuestion('Podaj email nowego admina: ');
  
  // Check if user exists
  let user = await User.findOne({ email: email.toLowerCase() });
  
  if (!user) {
    console.log('❌ Użytkownik o podanym emailu nie istnieje');
    const createUser = await askQuestion('Czy chcesz utworzyć nowego użytkownika? (t/n): ');
    
    if (createUser.toLowerCase() === 't' || createUser.toLowerCase() === 'tak') {
      const firstName = await askQuestion('Imię: ');
      const lastName = await askQuestion('Nazwisko: ');
      
      user = new User({
        email: email.toLowerCase(),
        firstName: firstName,
        lastName: lastName,
        role: 'admin',
        isVerified: true,
        createdAt: new Date()
      });
    } else {
      return;
    }
  }
  
  // Set password
  let passwordSet = false;
  while (!passwordSet) {
    const password = await askQuestion('Podaj nowe hasło: ');
    const confirmPassword = await askQuestion('Potwierdź hasło: ');
    
    if (password !== confirmPassword) {
      console.log('❌ Hasła nie są identyczne. Spróbuj ponownie.\n');
      continue;
    }
    
    const validation = validatePasswordStrength(password);
    
    console.log(`\n🔍 Siła hasła: ${validation.strength}`);
    
    if (!validation.isValid) {
      console.log('❌ Hasło nie spełnia wymagań:');
      validation.issues.forEach(issue => console.log(`   - ${issue}`));
      
      const forceSet = await askQuestion('\nCzy chcesz mimo to ustawić to hasło? (t/n): ');
      if (forceSet.toLowerCase() !== 't' && forceSet.toLowerCase() !== 'tak') {
        continue;
      }
    }
    
    // Hash and save password
    user.password = await hashPassword(password);
    user.role = 'admin';
    
    await user.save();
    
    console.log('✅ Hasło zostało ustawione pomyślnie!');
    console.log(`👤 Admin: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`🔐 Siła hasła: ${validation.strength}`);
    
    passwordSet = true;
  }
};

// Function to change existing admin password
const changeAdminPassword = async () => {
  console.log('\n🔄 ZMIANA HASŁA ADMINA');
  console.log('======================');
  
  const email = await askQuestion('Podaj email admina: ');
  
  const user = await User.findOne({ 
    email: email.toLowerCase(),
    role: { $in: ['admin', 'moderator'] }
  }).select('+password');
  
  if (!user) {
    console.log('❌ Nie znaleziono admina o podanym emailu');
    return;
  }
  
  console.log(`👤 Znaleziono: ${user.firstName} ${user.lastName} (${user.role})`);
  
  // Verify current password
  const currentPassword = await askQuestion('Podaj obecne hasło: ');
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
  
  if (!isCurrentPasswordValid) {
    console.log('❌ Nieprawidłowe obecne hasło');
    return;
  }
  
  // Set new password
  let passwordChanged = false;
  while (!passwordChanged) {
    const newPassword = await askQuestion('Podaj nowe hasło: ');
    const confirmPassword = await askQuestion('Potwierdź nowe hasło: ');
    
    if (newPassword !== confirmPassword) {
      console.log('❌ Hasła nie są identyczne. Spróbuj ponownie.\n');
      continue;
    }
    
    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      console.log('❌ Nowe hasło musi być różne od obecnego');
      continue;
    }
    
    const validation = validatePasswordStrength(newPassword);
    
    console.log(`\n🔍 Siła nowego hasła: ${validation.strength}`);
    
    if (!validation.isValid) {
      console.log('❌ Hasło nie spełnia wymagań:');
      validation.issues.forEach(issue => console.log(`   - ${issue}`));
      
      const forceSet = await askQuestion('\nCzy chcesz mimo to ustawić to hasło? (t/n): ');
      if (forceSet.toLowerCase() !== 't' && forceSet.toLowerCase() !== 'tak') {
        continue;
      }
    }
    
    // Hash and save new password
    user.password = await hashPassword(newPassword);
    user.passwordChangedAt = new Date();
    
    await user.save();
    
    console.log('✅ Hasło zostało zmienione pomyślnie!');
    console.log(`🔐 Siła nowego hasła: ${validation.strength}`);
    
    passwordChanged = true;
  }
};

// Function to reset admin password (super admin only)
const resetAdminPassword = async () => {
  console.log('\n🔄 RESET HASŁA ADMINA (SUPER ADMIN)');
  console.log('===================================');
  
  console.log('⚠️  Ta opcja jest dostępna tylko dla super adminów');
  
  const email = await askQuestion('Podaj email admina do resetu: ');
  
  const user = await User.findOne({ 
    email: email.toLowerCase(),
    role: { $in: ['admin', 'moderator'] }
  });
  
  if (!user) {
    console.log('❌ Nie znaleziono admina o podanym emailu');
    return;
  }
  
  console.log(`👤 Znaleziono: ${user.firstName} ${user.lastName} (${user.role})`);
  
  const confirm = await askQuestion('Czy na pewno chcesz zresetować hasło tego admina? (t/n): ');
  if (confirm.toLowerCase() !== 't' && confirm.toLowerCase() !== 'tak') {
    console.log('❌ Anulowano reset hasła');
    return;
  }
  
  // Generate temporary password
  const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';
  
  // Hash and save temporary password
  user.password = await hashPassword(tempPassword);
  user.passwordChangedAt = new Date();
  user.mustChangePassword = true; // Flag to force password change on next login
  
  await user.save();
  
  const logger = require('../utils/logger.js');
  logger.info('Admin password reset successfully', {
    adminId: user._id,
    adminEmail: user.email,
    resetAt: new Date()
  });
  console.log('✅ Hasło zostało zresetowane!');
  console.log('🔑 Tymczasowe hasło zostało wygenerowane');
  console.log('⚠️  Admin będzie musiał zmienić hasło przy następnym logowaniu');
  console.log(`📧 Tymczasowe hasło: ${tempPassword}`);
};

// Function to list admins
const listAdmins = async () => {
  console.log('\n👥 LISTA ADMINISTRATORÓW');
  console.log('========================');
  
  const admins = await User.find({ 
    role: { $in: ['admin', 'moderator'] }
  }).select('firstName lastName email role createdAt passwordChangedAt');
  
  if (admins.length === 0) {
    console.log('❌ Nie znaleziono administratorów');
    return;
  }
  
  admins.forEach((admin, index) => {
    console.log(`\n${index + 1}. ${admin.firstName} ${admin.lastName}`);
    console.log(`   📧 Email: ${admin.email}`);
    console.log(`   👑 Rola: ${admin.role}`);
    console.log(`   📅 Utworzony: ${admin.createdAt.toLocaleDateString()}`);
    if (admin.passwordChangedAt) {
      logger.info('Admin password change date displayed', {
        adminId: admin._id,
        changeDate: admin.passwordChangedAt.toLocaleDateString()
      });
      console.log(`   🔐 Hasło zmienione: ${admin.passwordChangedAt.toLocaleDateString()}`);
    }
  });
};

// Function to check password strength
const checkPasswordStrength = async () => {
  console.log('\n🔍 SPRAWDZANIE SIŁY HASŁA');
  console.log('=========================');
  
  const password = await askQuestion('Podaj hasło do sprawdzenia: ');
  const validation = validatePasswordStrength(password);
  
  console.log(`\n📊 WYNIKI ANALIZY:`);
  console.log(`🔐 Siła hasła: ${validation.strength}`);
  console.log(`✅ Spełnia wymagania: ${validation.isValid ? 'TAK' : 'NIE'}`);
  
  if (!validation.isValid) {
    console.log('\n❌ Problemy:');
    validation.issues.forEach(issue => console.log(`   - ${issue}`));
  }
  
  console.log('\n💡 WYMAGANIA DLA SILNEGO HASŁA:');
  console.log('   - Co najmniej 8 znaków');
  console.log('   - Wielkie i małe litery');
  console.log('   - Cyfry');
  console.log('   - Znaki specjalne (!@#$%^&*...)');
  console.log('   - Unikalne i nieprzewidywalne');
};

// Main program loop
const main = async () => {
  let running = true;
  
  while (running) {
    const choice = await showMainMenu();
    
    switch (choice) {
      case '1':
        await setNewAdminPassword();
        break;
      case '2':
        await changeAdminPassword();
        break;
      case '3':
        await resetAdminPassword();
        break;
      case '4':
        await listAdmins();
        break;
      case '5':
        await checkPasswordStrength();
        break;
      case '0':
        running = false;
        break;
      default:
        console.log('❌ Nieprawidłowa opcja. Wybierz 0-5.');
    }
    
    if (running) {
      await askQuestion('\nNaciśnij Enter aby kontynuować...');
      console.clear();
    }
  }
  
  console.log('\n👋 Dziękujemy za korzystanie z systemu zarządzania hasłami adminów!');
  
  // Cleanup
  rl.close();
  await mongoose.disconnect();
  console.log('📡 Rozłączono z bazą danych');
  
  process.exit(0);
};

// Start the program
main().catch(error => {
  console.error('❌ Błąd aplikacji:', error);
  rl.close();
  mongoose.disconnect();
  process.exit(1);
});
