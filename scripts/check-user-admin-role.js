/**
 * SPRAWDZENIE ROLI UŻYTKOWNIKA I STATUSU TOKENA
 * Sprawdza czy użytkownik ma rolę admin i czy token nie jest na blackliście
 */

import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from '../models/user/user.js';
import { isBlacklisted } from '../models/security/TokenBlacklist.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Połączono z bazą danych');
  } catch (error) {
    console.error('❌ Błąd połączenia z bazą:', error.message);
    process.exit(1);
  }
};

const checkUserAndToken = async () => {
  console.log('🔍 SPRAWDZENIE ROLI UŻYTKOWNIKA I STATUSU TOKENA');
  console.log('================================================\n');

  // Token z poprzedniej analizy (bez podpisu dla bezpieczeństwa)
  const testUserId = '688b4aba9c0f2fecd035b20a';
  const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1IjoiNjg4YjRhYmE5YzBmMmZlY2QwMzViMjBhIiwiaiI6IjQyMzlhZDFiIiwiaWF0IjoxNzU3MTg3ODMwLCJleHAiOjE3NTcxODgwMTB9.example';

  try {
    // 1. Sprawdź użytkownika w bazie danych
    console.log('1. SPRAWDZENIE UŻYTKOWNIKA W BAZIE:');
    const user = await User.findById(testUserId);
    
    if (!user) {
      console.log('❌ Użytkownik nie został znaleziony w bazie danych');
      return;
    }
    
    console.log('✅ Użytkownik znaleziony:');
    console.log('   ID:', user._id);
    console.log('   Email:', user.email);
    console.log('   Rola:', user.role);
    console.log('   Status:', user.status);
    console.log('   Konto zablokowane:', user.accountLocked || false);
    console.log('   Ostatnia aktywność:', user.lastActivity);
    console.log();

    // 2. Sprawdź czy ma uprawnienia admin
    console.log('2. SPRAWDZENIE UPRAWNIEŃ ADMIN:');
    const hasAdminRole = ['admin', 'moderator'].includes(user.role);
    console.log('   Ma rolę admin/moderator:', hasAdminRole ? '✅ TAK' : '❌ NIE');
    
    if (!hasAdminRole) {
      console.log('   ❌ PROBLEM: Użytkownik nie ma roli admin ani moderator');
      console.log('   Aktualna rola:', user.role);
    }
    console.log();

    // 3. Sprawdź status konta
    console.log('3. SPRAWDZENIE STATUSU KONTA:');
    const isAccountActive = user.status !== 'suspended' && user.status !== 'banned' && !user.accountLocked;
    console.log('   Konto aktywne:', isAccountActive ? '✅ TAK' : '❌ NIE');
    
    if (!isAccountActive) {
      console.log('   ❌ PROBLEM: Konto jest nieaktywne');
      console.log('   Status:', user.status);
      console.log('   Zablokowane:', user.accountLocked);
    }
    console.log();

    // 4. Sprawdź blacklistę tokenów
    console.log('4. SPRAWDZENIE BLACKLISTY TOKENÓW:');
    try {
      const isTokenBlacklisted = await isBlacklisted(testToken);
      console.log('   Token na blackliście:', isTokenBlacklisted ? '❌ TAK' : '✅ NIE');
      
      if (isTokenBlacklisted) {
        console.log('   ❌ PROBLEM: Token jest na blackliście');
      }
    } catch (error) {
      console.log('   ⚠️  Błąd sprawdzania blacklisty:', error.message);
    }
    console.log();

    // 5. Podsumowanie
    console.log('5. PODSUMOWANIE PROBLEMÓW:');
    const problems = [];
    
    if (!hasAdminRole) {
      problems.push(`Brak roli admin (aktualna rola: ${user.role})`);
    }
    
    if (!isAccountActive) {
      problems.push(`Konto nieaktywne (status: ${user.status}, zablokowane: ${user.accountLocked})`);
    }
    
    if (problems.length === 0) {
      console.log('✅ Nie znaleziono problemów z użytkownikiem');
      console.log('   Problem może być w middleware lub JWT verification');
    } else {
      console.log('❌ Znalezione problemy:');
      problems.forEach((problem, index) => {
        console.log(`   ${index + 1}. ${problem}`);
      });
    }

  } catch (error) {
    console.error('❌ Błąd podczas sprawdzania:', error.message);
  }
};

const main = async () => {
  await connectDB();
  await checkUserAndToken();
  await mongoose.disconnect();
  console.log('\n✅ Analiza zakończona');
};

main().catch(console.error);
