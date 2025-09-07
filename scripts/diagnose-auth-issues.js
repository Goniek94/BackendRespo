/**
 * DIAGNOZA PROBLEMÓW Z AUTORYZACJĄ
 * Sprawdza wszystkie potencjalne przyczyny błędów 401
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user/user.js';
import config from '../config/index.js';

console.log('🔍 DIAGNOZA PROBLEMÓW Z AUTORYZACJĄ');
console.log('================================================================================\n');

async function diagnoseAuthIssues() {
  try {
    // 1. Sprawdź połączenie z bazą danych
    console.log('📊 TEST 1: POŁĄCZENIE Z BAZĄ DANYCH');
    console.log('============================================================');
    
    if (mongoose.connection.readyState === 0) {
      console.log('🔄 Łączenie z bazą danych...');
      await mongoose.connect(config.database.uri);
    }
    
    const dbState = mongoose.connection.readyState;
    const dbStates = {
      0: 'Rozłączony',
      1: 'Połączony',
      2: 'Łączenie...',
      3: 'Rozłączanie...'
    };
    
    console.log(`📡 Status bazy danych: ${dbStates[dbState]} (${dbState})`);
    
    if (dbState !== 1) {
      console.log('❌ PROBLEM: Brak połączenia z bazą danych!');
      return;
    }
    
    console.log('✅ Połączenie z bazą danych działa poprawnie\n');

    // 2. Sprawdź konfigurację JWT
    console.log('🔐 TEST 2: KONFIGURACJA JWT');
    console.log('============================================================');
    
    const jwtSecret = process.env.JWT_SECRET || config.jwt?.secret;
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || config.jwt?.refreshSecret;
    
    console.log(`🔑 JWT_SECRET: ${jwtSecret ? 'Ustawiony' : '❌ BRAK'} (${jwtSecret?.length || 0} znaków)`);
    console.log(`🔑 JWT_REFRESH_SECRET: ${jwtRefreshSecret ? 'Ustawiony' : '❌ BRAK'} (${jwtRefreshSecret?.length || 0} znaków)`);
    
    if (!jwtSecret || !jwtRefreshSecret) {
      console.log('❌ PROBLEM: Brak kluczy JWT w konfiguracji!');
      console.log('💡 ROZWIĄZANIE: Ustaw JWT_SECRET i JWT_REFRESH_SECRET w .env');
      return;
    }
    
    // Test generowania tokena
    try {
      const testPayload = { userId: 'test123', role: 'user' };
      const testToken = jwt.sign(testPayload, jwtSecret, { expiresIn: '15m' });
      const decoded = jwt.verify(testToken, jwtSecret);
      
      console.log('✅ Generowanie i weryfikacja tokenów działa poprawnie');
      console.log(`📏 Długość przykładowego tokena: ${testToken.length} znaków\n`);
    } catch (jwtError) {
      console.log('❌ PROBLEM: Błąd podczas testowania JWT!');
      console.log(`🔍 Błąd: ${jwtError.message}\n`);
      return;
    }

    // 3. Sprawdź użytkowników w bazie
    console.log('👥 TEST 3: UŻYTKOWNICY W BAZIE DANYCH');
    console.log('============================================================');
    
    const userCount = await User.countDocuments();
    console.log(`📊 Liczba użytkowników w bazie: ${userCount}`);
    
    if (userCount === 0) {
      console.log('⚠️  UWAGA: Brak użytkowników w bazie danych!');
      console.log('💡 ROZWIĄZANIE: Zarejestruj testowego użytkownika\n');
    } else {
      // Pokaż przykładowych użytkowników
      const sampleUsers = await User.find({}).limit(3).select('email role status isVerified createdAt');
      console.log('👤 Przykładowi użytkownicy:');
      sampleUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} (${user.role}) - Status: ${user.status}, Zweryfikowany: ${user.isVerified}`);
      });
      console.log('');
    }

    // 4. Test logowania z prawdziwymi danymi
    console.log('🔓 TEST 4: SYMULACJA LOGOWANIA');
    console.log('============================================================');
    
    // Znajdź pierwszego aktywnego użytkownika
    const testUser = await User.findOne({ 
      status: 'active',
      role: 'user'
    }).select('email password role status isVerified failedLoginAttempts accountLocked');
    
    if (!testUser) {
      console.log('❌ PROBLEM: Brak aktywnych użytkowników do testowania!');
      console.log('💡 ROZWIĄZANIE: Utwórz testowego użytkownika lub sprawdź status istniejących\n');
    } else {
      console.log(`🧪 Testowanie logowania dla: ${testUser.email}`);
      console.log(`📊 Status konta: ${testUser.status}`);
      console.log(`🔒 Konto zablokowane: ${testUser.accountLocked || false}`);
      console.log(`❌ Nieudane próby: ${testUser.failedLoginAttempts || 0}`);
      console.log(`✅ Zweryfikowany: ${testUser.isVerified}`);
      
      // Test z nieprawidłowym hasłem
      const wrongPasswordTest = await bcrypt.compare('wrongpassword', testUser.password);
      console.log(`🔍 Test nieprawidłowego hasła: ${wrongPasswordTest ? '❌ PROBLEM - hasło akceptowane!' : '✅ Odrzucone poprawnie'}`);
      
      console.log('');
    }

    // 5. Sprawdź middleware autoryzacji
    console.log('🛡️  TEST 5: MIDDLEWARE AUTORYZACJI');
    console.log('============================================================');
    
    try {
      const { generateAccessToken, generateRefreshToken } = await import('../middleware/auth.js');
      
      const testPayload = { userId: 'test123', role: 'user' };
      const accessToken = generateAccessToken(testPayload);
      const refreshToken = generateRefreshToken(testPayload);
      
      console.log('✅ Funkcje generowania tokenów działają');
      console.log(`📏 Access token: ${accessToken.length} znaków`);
      console.log(`📏 Refresh token: ${refreshToken.length} znaków`);
      
      // Test weryfikacji tokena
      const decoded = jwt.verify(accessToken, jwtSecret);
      console.log('✅ Weryfikacja tokena działa poprawnie');
      console.log(`🆔 Dekodowane userId: ${decoded.userId}`);
      console.log(`👤 Dekodowana rola: ${decoded.role}\n`);
      
    } catch (middlewareError) {
      console.log('❌ PROBLEM: Błąd w middleware autoryzacji!');
      console.log(`🔍 Błąd: ${middlewareError.message}\n`);
    }

    // 6. Sprawdź konfigurację cookies
    console.log('🍪 TEST 6: KONFIGURACJA COOKIES');
    console.log('============================================================');
    
    try {
      const cookieConfig = await import('../config/cookieConfig.js');
      console.log('✅ Konfiguracja cookies załadowana');
      console.log(`🔒 Secure cookies: ${process.env.NODE_ENV === 'production'}`);
      console.log(`🌐 SameSite: ${process.env.NODE_ENV === 'production' ? 'None' : 'Lax'}`);
      console.log(`🏠 Domain: ${process.env.COOKIE_DOMAIN || 'localhost'}\n`);
    } catch (cookieError) {
      console.log('❌ PROBLEM: Błąd w konfiguracji cookies!');
      console.log(`🔍 Błąd: ${cookieError.message}\n`);
    }

    // 7. Sprawdź zmienne środowiskowe
    console.log('🌍 TEST 7: ZMIENNE ŚRODOWISKOWE');
    console.log('============================================================');
    
    const requiredEnvVars = [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'MONGODB_URI',
      'NODE_ENV'
    ];
    
    const missingVars = [];
    requiredEnvVars.forEach(varName => {
      const value = process.env[varName];
      if (value) {
        console.log(`✅ ${varName}: Ustawiona (${value.length} znaków)`);
      } else {
        console.log(`❌ ${varName}: BRAK`);
        missingVars.push(varName);
      }
    });
    
    if (missingVars.length > 0) {
      console.log(`\n❌ PROBLEM: Brak wymaganych zmiennych środowiskowych: ${missingVars.join(', ')}`);
      console.log('💡 ROZWIĄZANIE: Dodaj brakujące zmienne do pliku .env');
    } else {
      console.log('\n✅ Wszystkie wymagane zmienne środowiskowe są ustawione');
    }

    console.log('\n================================================================================');
    console.log('📋 PODSUMOWANIE DIAGNOZY');
    console.log('================================================================================');
    
    console.log('🔍 Sprawdzone komponenty:');
    console.log('   ✅ Połączenie z bazą danych');
    console.log('   ✅ Konfiguracja JWT');
    console.log('   ✅ Użytkownicy w bazie');
    console.log('   ✅ Middleware autoryzacji');
    console.log('   ✅ Konfiguracja cookies');
    console.log('   ✅ Zmienne środowiskowe');
    
    console.log('\n💡 MOŻLIWE PRZYCZYNY BŁĘDÓW 401:');
    console.log('   1. Nieprawidłowe dane logowania (email/hasło)');
    console.log('   2. Konto użytkownika zablokowane lub nieaktywne');
    console.log('   3. Problemy z tokenami JWT (wygasłe, nieprawidłowe)');
    console.log('   4. Błędy w middleware autoryzacji');
    console.log('   5. Problemy z cookies (HttpOnly, Secure, SameSite)');
    console.log('   6. Brak wymaganych nagłówków w żądaniach');
    
    console.log('\n🛠️  NASTĘPNE KROKI:');
    console.log('   1. Sprawdź logi serwera podczas próby logowania');
    console.log('   2. Zweryfikuj dane logowania w bazie danych');
    console.log('   3. Przetestuj endpoint logowania z Postman/curl');
    console.log('   4. Sprawdź czy frontend wysyła poprawne żądania');

  } catch (error) {
    console.error('❌ BŁĄD PODCZAS DIAGNOZY:', error.message);
    console.error('🔍 Stack trace:', error.stack);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('\n🔌 Rozłączono z bazą danych');
    }
  }
}

// Uruchom diagnozę
diagnoseAuthIssues().catch(console.error);
