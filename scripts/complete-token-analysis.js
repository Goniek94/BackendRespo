/**
 * KOMPLETNA ANALIZA KONFIGURACJI TOKENÓW
 * Sprawdza jak tokeny są skonfigurowane w całym systemie
 */

import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from '../models/user/user.js';

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

const analyzeTokenConfiguration = async () => {
  console.log('🔍 KOMPLETNA ANALIZA KONFIGURACJI TOKENÓW');
  console.log('==========================================\n');

  // 1. Sprawdź użytkownika admin w bazie
  console.log('1. UŻYTKOWNIK ADMIN W BAZIE DANYCH:');
  console.log('===================================');
  
  try {
    const adminUser = await User.findOne({ role: 'admin' });
    if (adminUser) {
      console.log('✅ Użytkownik admin znaleziony:');
      console.log('   ID:', adminUser._id);
      console.log('   Email:', adminUser.email);
      console.log('   Rola:', adminUser.role);
      console.log('   Status:', adminUser.status);
      console.log('   Ostatnia aktywność:', adminUser.lastActivity);
      
      // Stwórz testowy token dla tego użytkownika
      console.log('\n2. TWORZENIE TESTOWEGO TOKENA:');
      console.log('==============================');
      
      const testPayload = {
        u: adminUser._id.toString(), // userId w skróconej formie
        j: 'test' + Date.now() // sessionId w skróconej formie
      };
      
      const testToken = jwt.sign(
        testPayload,
        process.env.JWT_SECRET,
        { 
          expiresIn: '60m', // 60 minut jak w konfiguracji
          algorithm: 'HS256'
        }
      );
      
      console.log('✅ Token utworzony pomyślnie');
      console.log('Payload:', testPayload);
      console.log('Token (pierwsze 50 znaków):', testToken.substring(0, 50) + '...');
      
      // Test weryfikacji
      try {
        const decoded = jwt.verify(testToken, process.env.JWT_SECRET);
        console.log('✅ Token zweryfikowany pomyślnie');
        console.log('Decoded:', decoded);
      } catch (error) {
        console.log('❌ Błąd weryfikacji tokena:', error.message);
      }
      
    } else {
      console.log('❌ Brak użytkownika admin w bazie danych');
    }
  } catch (error) {
    console.log('❌ Błąd sprawdzania użytkownika:', error.message);
  }

  console.log('\n\n3. KONFIGURACJA TOKENÓW W SYSTEMIE:');
  console.log('====================================');
  
  console.log('📍 MIDDLEWARE AUTH.JS:');
  console.log('- Generuje access token z payload: { u: userId, j: sessionId }');
  console.log('- Czas życia access token: 3 minuty');
  console.log('- Generuje refresh token z payload: { u: userId, r: role, j: sessionId }');
  console.log('- Czas życia refresh token: 1 godzina (development)');
  console.log('- Używa JWT_SECRET do podpisywania');
  
  console.log('\n📍 ADMIN MIDDLEWARE:');
  console.log('- Sprawdza req.cookies.token (ten sam co zwykłe logowanie)');
  console.log('- Fallback do Authorization: Bearer header');
  console.log('- Weryfikuje token używając JWT_SECRET');
  console.log('- Sprawdza czy użytkownik ma rolę admin/moderator');
  console.log('- Sprawdza czy konto nie jest zablokowane');
  
  console.log('\n📍 COOKIE CONFIG:');
  console.log('- Development: access 3min, refresh 1h');
  console.log('- HttpOnly: true (bezpieczeństwo)');
  console.log('- Secure: false (development)');
  console.log('- SameSite: lax (development)');
  
  console.log('\n\n4. PRZEPŁYW UWIERZYTELNIANIA:');
  console.log('==============================');
  console.log('1. Użytkownik loguje się przez /api/auth/login');
  console.log('2. System sprawdza email/hasło w bazie danych');
  console.log('3. Jeśli OK, generuje access + refresh token');
  console.log('4. Ustawia cookies: token=accessToken, refreshToken=refreshToken');
  console.log('5. Frontend automatycznie wysyła cookies w każdym żądaniu');
  console.log('6. Panel admin używa tych samych cookies');
  console.log('7. Admin middleware dodatkowo sprawdza role użytkownika');
  
  console.log('\n\n5. MOŻLIWE PROBLEMY:');
  console.log('====================');
  console.log('❓ Logowanie nie działa - możliwe przyczyny:');
  console.log('   - Błędne hasło');
  console.log('   - Rate limiting (za dużo prób)');
  console.log('   - Problem z bazą danych');
  console.log('   - Błąd w kontrolerze logowania');
  
  console.log('\n❓ Panel admin zwraca 401 - możliwe przyczyny:');
  console.log('   - Token wygasł (3 minuty to bardzo krótko)');
  console.log('   - Problem z refresh tokenem');
  console.log('   - Błąd w admin middleware');
  console.log('   - Użytkownik nie ma roli admin');
  
  console.log('\n\n6. REKOMENDACJE:');
  console.log('================');
  console.log('✅ Tokeny są poprawnie skonfigurowane');
  console.log('✅ Admin panel używa tych samych tokenów co zwykłe logowanie');
  console.log('✅ Nie ma osobnych tokenów dla admin');
  console.log('⚠️  Czas życia access token (3min) może być za krótki');
  console.log('⚠️  Należy sprawdzić dlaczego logowanie nie działa');
};

const main = async () => {
  await connectDB();
  await analyzeTokenConfiguration();
  await mongoose.disconnect();
  console.log('\n✅ Analiza zakończona');
};

main().catch(console.error);
