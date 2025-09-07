import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Konfiguracja ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Załaduj zmienne środowiskowe
config();

// Import modeli - używamy dynamic import
let User, AdminUser;

/**
 * 🔍 DIAGNOZA SYSTEMU AUTORYZACJI I TOKENÓW
 * Sprawdza jak są nadawane tokeny dla użytkowników i adminów
 * oraz dlaczego występują błędy UNAUTHORIZED
 */

async function diagnoseTokenAuthorization() {
  try {
    console.log('🔍 === DIAGNOZA SYSTEMU AUTORYZACJI I TOKENÓW ===\n');

    // Połącz z bazą danych
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Połączono z bazą danych\n');

    // Dynamiczny import modeli
    try {
      const userModule = await import('../models/user/user.js');
      User = userModule.default;
      console.log('✅ Model User załadowany');
    } catch (error) {
      console.log('❌ Błąd ładowania modelu User:', error.message);
    }

    try {
      const adminModule = await import('../models/admin/adminUser.js');
      AdminUser = adminModule.default;
      console.log('✅ Model AdminUser załadowany');
    } catch (error) {
      console.log('❌ Błąd ładowania modelu AdminUser:', error.message);
    }

    console.log('');

    // 1. Sprawdź konfigurację JWT
    console.log('🔑 === KONFIGURACJA JWT ===');
    console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Ustawiony' : '❌ BRAK!');
    console.log('JWT_ADMIN_SECRET:', process.env.JWT_ADMIN_SECRET ? '✅ Ustawiony' : '❌ BRAK!');
    console.log('JWT_EXPIRES_IN:', process.env.JWT_EXPIRES_IN || 'Domyślnie');
    console.log('JWT_ADMIN_EXPIRES_IN:', process.env.JWT_ADMIN_EXPIRES_IN || 'Domyślnie');
    console.log('');

    // 2. Sprawdź użytkowników zwykłych
    if (User) {
      console.log('👤 === UŻYTKOWNICY ZWYKLI ===');
      const users = await User.find({}).select('_id name email role isVerified createdAt').limit(5);
      console.log(`Znaleziono ${users.length} użytkowników:`);
      
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        console.log(`\n  ${i + 1}. ${user.name || user.email}`);
        console.log(`     ID: ${user._id}`);
        console.log(`     Email: ${user.email}`);
        console.log(`     Rola: ${user.role || 'user'}`);
        console.log(`     Zweryfikowany: ${user.isVerified ? '✅' : '❌'}`);
        console.log(`     Utworzony: ${user.createdAt}`);
        
        // Testuj generowanie tokenu dla tego użytkownika
        await testUserTokenGeneration(user);
      }
    } else {
      console.log('❌ Model User nie został załadowany - pomijam testy użytkowników');
    }

    // 3. Sprawdź użytkowników admin
    if (AdminUser) {
      console.log('\n👑 === UŻYTKOWNICY ADMIN ===');
      const adminUsers = await AdminUser.find({}).select('_id username email role permissions isActive createdAt').limit(5);
      console.log(`Znaleziono ${adminUsers.length} adminów:`);
      
      for (let i = 0; i < adminUsers.length; i++) {
        const admin = adminUsers[i];
        console.log(`\n  ${i + 1}. ${admin.username || admin.email}`);
        console.log(`     ID: ${admin._id}`);
        console.log(`     Email: ${admin.email}`);
        console.log(`     Rola: ${admin.role || 'admin'}`);
        console.log(`     Uprawnienia: ${admin.permissions ? admin.permissions.join(', ') : 'Brak'}`);
        console.log(`     Aktywny: ${admin.isActive ? '✅' : '❌'}`);
        console.log(`     Utworzony: ${admin.createdAt}`);
        
        // Testuj generowanie tokenu dla tego admina
        await testAdminTokenGeneration(admin);
      }
    } else {
      console.log('\n❌ Model AdminUser nie został załadowany - pomijam testy adminów');
    }

    // 4. Testuj middleware autoryzacji
    console.log('\n🛡️ === TEST MIDDLEWARE AUTORYZACJI ===');
    await testAuthMiddleware();

    // 5. Sprawdź różnice w kontrolerach
    console.log('\n🔄 === ANALIZA KONTROLERÓW AUTORYZACJI ===');
    await analyzeAuthControllers();

    // 6. Testuj rzeczywiste scenariusze logowania
    console.log('\n🧪 === TEST SCENARIUSZY LOGOWANIA ===');
    await testLoginScenarios();

    // 7. Sprawdź cookies i nagłówki
    console.log('\n🍪 === ANALIZA COOKIES I NAGŁÓWKÓW ===');
    await analyzeCookiesAndHeaders();

    // 8. Sprawdź pliki .env
    console.log('\n📄 === ANALIZA PLIKÓW KONFIGURACYJNYCH ===');
    await analyzeConfigFiles();

    console.log('\n✅ === DIAGNOZA ZAKOŃCZONA ===');
    
  } catch (error) {
    console.error('❌ Błąd podczas diagnozy:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Rozłączono z bazą danych');
  }
}

/**
 * Testuje generowanie tokenu dla zwykłego użytkownika
 */
async function testUserTokenGeneration(user) {
  try {
    console.log('     🔑 Test generowania tokenu użytkownika...');
    
    if (!process.env.JWT_SECRET) {
      console.log('     ❌ Brak JWT_SECRET - nie można wygenerować tokenu');
      return;
    }

    // Generuj token jak w kontrolerze użytkownika
    const payload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role || 'user',
      type: 'user'
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });

    console.log('     ✅ Token wygenerowany pomyślnie');
    console.log(`     📝 Payload: ${JSON.stringify(payload)}`);
    console.log(`     🎫 Token (pierwsze 50 znaków): ${token.substring(0, 50)}...`);

    // Testuj weryfikację tokenu
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('     ✅ Token zweryfikowany pomyślnie');
      console.log(`     📋 Zdekodowany payload: ${JSON.stringify(decoded)}`);
    } catch (verifyError) {
      console.log('     ❌ Błąd weryfikacji tokenu:', verifyError.message);
    }

  } catch (error) {
    console.log('     ❌ Błąd generowania tokenu:', error.message);
  }
}

/**
 * Testuje generowanie tokenu dla admina
 */
async function testAdminTokenGeneration(admin) {
  try {
    console.log('     🔑 Test generowania tokenu admina...');
    
    if (!process.env.JWT_ADMIN_SECRET) {
      console.log('     ❌ Brak JWT_ADMIN_SECRET - nie można wygenerować tokenu');
      return;
    }

    // Generuj token jak w kontrolerze admina
    const payload = {
      adminId: admin._id.toString(),
      username: admin.username,
      email: admin.email,
      role: admin.role || 'admin',
      permissions: admin.permissions || [],
      type: 'admin'
    };

    const token = jwt.sign(payload, process.env.JWT_ADMIN_SECRET, {
      expiresIn: process.env.JWT_ADMIN_EXPIRES_IN || '8h'
    });

    console.log('     ✅ Token admina wygenerowany pomyślnie');
    console.log(`     📝 Payload: ${JSON.stringify(payload)}`);
    console.log(`     🎫 Token (pierwsze 50 znaków): ${token.substring(0, 50)}...`);

    // Testuj weryfikację tokenu
    try {
      const decoded = jwt.verify(token, process.env.JWT_ADMIN_SECRET);
      console.log('     ✅ Token admina zweryfikowany pomyślnie');
      console.log(`     📋 Zdekodowany payload: ${JSON.stringify(decoded)}`);
    } catch (verifyError) {
      console.log('     ❌ Błąd weryfikacji tokenu admina:', verifyError.message);
    }

  } catch (error) {
    console.log('     ❌ Błąd generowania tokenu admina:', error.message);
  }
}

/**
 * Testuje middleware autoryzacji
 */
async function testAuthMiddleware() {
  try {
    console.log('Sprawdzanie plików middleware...');
    
    // Sprawdź middleware/auth.js
    const authMiddlewarePath = path.join(__dirname, '../middleware/auth.js');
    if (fs.existsSync(authMiddlewarePath)) {
      console.log('✅ middleware/auth.js istnieje');
      const authContent = fs.readFileSync(authMiddlewarePath, 'utf8');
      
      // Sprawdź kluczowe elementy
      if (authContent.includes('JWT_SECRET')) {
        console.log('✅ Middleware używa JWT_SECRET');
      } else {
        console.log('❌ Middleware nie używa JWT_SECRET');
      }
      
      if (authContent.includes('req.user')) {
        console.log('✅ Middleware ustawia req.user');
      } else {
        console.log('❌ Middleware nie ustawia req.user');
      }

      if (authContent.includes('Authorization')) {
        console.log('✅ Middleware sprawdza nagłówek Authorization');
      } else {
        console.log('❌ Middleware nie sprawdza nagłówka Authorization');
      }

      if (authContent.includes('cookie')) {
        console.log('✅ Middleware sprawdza cookies');
      } else {
        console.log('❌ Middleware nie sprawdza cookies');
      }
    } else {
      console.log('❌ middleware/auth.js nie istnieje');
    }

    // Sprawdź admin middleware
    const adminAuthPath = path.join(__dirname, '../admin/middleware/adminAuth.js');
    if (fs.existsSync(adminAuthPath)) {
      console.log('✅ admin/middleware/adminAuth.js istnieje');
      const adminAuthContent = fs.readFileSync(adminAuthPath, 'utf8');
      
      if (adminAuthContent.includes('JWT_ADMIN_SECRET')) {
        console.log('✅ Admin middleware używa JWT_ADMIN_SECRET');
      } else {
        console.log('❌ Admin middleware nie używa JWT_ADMIN_SECRET');
      }

      if (adminAuthContent.includes('req.admin')) {
        console.log('✅ Admin middleware ustawia req.admin');
      } else {
        console.log('❌ Admin middleware nie ustawia req.admin');
      }
    } else {
      console.log('❌ admin/middleware/adminAuth.js nie istnieje');
    }

  } catch (error) {
    console.log('❌ Błąd sprawdzania middleware:', error.message);
  }
}

/**
 * Analizuje kontrolery autoryzacji
 */
async function analyzeAuthControllers() {
  try {
    console.log('Sprawdzanie kontrolerów autoryzacji...');
    
    // Sprawdź kontroler użytkownika
    const userAuthPath = path.join(__dirname, '../controllers/user/authController.js');
    if (fs.existsSync(userAuthPath)) {
      console.log('✅ controllers/user/authController.js istnieje');
      const userAuthContent = fs.readFileSync(userAuthPath, 'utf8');
      
      if (userAuthContent.includes('jwt.sign')) {
        console.log('✅ Kontroler użytkownika generuje tokeny JWT');
      }
      
      if (userAuthContent.includes('httpOnly')) {
        console.log('✅ Kontroler użytkownika ustawia httpOnly cookies');
      }

      if (userAuthContent.includes('JWT_SECRET')) {
        console.log('✅ Kontroler użytkownika używa JWT_SECRET');
      } else {
        console.log('❌ Kontroler użytkownika nie używa JWT_SECRET');
      }
    }

    // Sprawdź kontroler admina
    const adminAuthPath = path.join(__dirname, '../admin/controllers/auth/authController.js');
    if (fs.existsSync(adminAuthPath)) {
      console.log('✅ admin/controllers/auth/authController.js istnieje');
      const adminAuthContent = fs.readFileSync(adminAuthPath, 'utf8');
      
      if (adminAuthContent.includes('jwt.sign')) {
        console.log('✅ Kontroler admina generuje tokeny JWT');
      }
      
      if (adminAuthContent.includes('JWT_ADMIN_SECRET')) {
        console.log('✅ Kontroler admina używa JWT_ADMIN_SECRET');
      } else {
        console.log('❌ Kontroler admina nie używa JWT_ADMIN_SECRET');
      }

      if (adminAuthContent.includes('httpOnly')) {
        console.log('✅ Kontroler admina ustawia httpOnly cookies');
      }
    }

  } catch (error) {
    console.log('❌ Błąd analizy kontrolerów:', error.message);
  }
}

/**
 * Testuje scenariusze logowania
 */
async function testLoginScenarios() {
  try {
    console.log('Testowanie scenariuszy logowania...');
    
    // Znajdź pierwszego użytkownika do testów
    if (User) {
      const testUser = await User.findOne({});
      if (testUser) {
        console.log(`\n📧 Test logowania użytkownika: ${testUser.email}`);
        
        // Symuluj proces logowania
        const loginPayload = {
          userId: testUser._id.toString(),
          email: testUser.email,
          role: testUser.role || 'user',
          type: 'user'
        };
        
        if (process.env.JWT_SECRET) {
          const token = jwt.sign(loginPayload, process.env.JWT_SECRET, { expiresIn: '24h' });
          console.log('✅ Token użytkownika wygenerowany podczas logowania');
          
          // Test weryfikacji
          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('✅ Token użytkownika poprawnie zweryfikowany');
            console.log(`   Typ: ${decoded.type}, UserID: ${decoded.userId}`);
          } catch (err) {
            console.log('❌ Błąd weryfikacji tokenu użytkownika:', err.message);
          }
        }
      }
    }

    // Znajdź pierwszego admina do testów
    if (AdminUser) {
      const testAdmin = await AdminUser.findOne({});
      if (testAdmin) {
        console.log(`\n👑 Test logowania admina: ${testAdmin.username || testAdmin.email}`);
        
        const adminPayload = {
          adminId: testAdmin._id.toString(),
          username: testAdmin.username,
          email: testAdmin.email,
          role: testAdmin.role || 'admin',
          permissions: testAdmin.permissions || [],
          type: 'admin'
        };
        
        if (process.env.JWT_ADMIN_SECRET) {
          const adminToken = jwt.sign(adminPayload, process.env.JWT_ADMIN_SECRET, { expiresIn: '8h' });
          console.log('✅ Token admina wygenerowany podczas logowania');
          
          // Test weryfikacji
          try {
            const decoded = jwt.verify(adminToken, process.env.JWT_ADMIN_SECRET);
            console.log('✅ Token admina poprawnie zweryfikowany');
            console.log(`   Typ: ${decoded.type}, AdminID: ${decoded.adminId}`);
          } catch (err) {
            console.log('❌ Błąd weryfikacji tokenu admina:', err.message);
          }
        }
      }
    }

  } catch (error) {
    console.log('❌ Błąd testowania scenariuszy:', error.message);
  }
}

/**
 * Analizuje konfigurację cookies i nagłówków
 */
async function analyzeCookiesAndHeaders() {
  try {
    console.log('Sprawdzanie konfiguracji cookies...');
    
    // Sprawdź config/cookieConfig.js
    const cookieConfigPath = path.join(__dirname, '../config/cookieConfig.js');
    if (fs.existsSync(cookieConfigPath)) {
      console.log('✅ config/cookieConfig.js istnieje');
      const cookieContent = fs.readFileSync(cookieConfigPath, 'utf8');
      
      if (cookieContent.includes('httpOnly')) {
        console.log('✅ Konfiguracja zawiera httpOnly');
      }
      
      if (cookieContent.includes('secure')) {
        console.log('✅ Konfiguracja zawiera secure');
      }
      
      if (cookieContent.includes('sameSite')) {
        console.log('✅ Konfiguracja zawiera sameSite');
      }
    }

    // Sprawdź zmienne środowiskowe związane z cookies
    console.log('\n🔧 Zmienne środowiskowe cookies:');
    console.log('NODE_ENV:', process.env.NODE_ENV || 'nie ustawione');
    console.log('COOKIE_SECRET:', process.env.COOKIE_SECRET ? '✅ Ustawiony' : '❌ BRAK');
    console.log('SESSION_SECRET:', process.env.SESSION_SECRET ? '✅ Ustawiony' : '❌ BRAK');

  } catch (error) {
    console.log('❌ Błąd analizy cookies:', error.message);
  }
}

/**
 * Analizuje pliki konfiguracyjne
 */
async function analyzeConfigFiles() {
  try {
    console.log('Sprawdzanie plików .env...');
    
    // Sprawdź główny plik .env
    const envPath = path.join(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
      console.log('✅ .env istnieje');
      const envContent = fs.readFileSync(envPath, 'utf8');
      
      // Sprawdź kluczowe zmienne (bez pokazywania wartości)
      const requiredVars = [
        'MONGODB_URI',
        'JWT_SECRET',
        'JWT_ADMIN_SECRET',
        'PORT',
        'NODE_ENV'
      ];
      
      requiredVars.forEach(varName => {
        if (envContent.includes(`${varName}=`)) {
          console.log(`✅ ${varName} jest zdefiniowany w .env`);
        } else {
          console.log(`❌ ${varName} BRAK w .env`);
        }
      });
    } else {
      console.log('❌ .env nie istnieje');
    }

    // Sprawdź inne pliki env
    const envFiles = ['.env.example', '.env.test'];
    envFiles.forEach(file => {
      const filePath = path.join(__dirname, `../${file}`);
      if (fs.existsSync(filePath)) {
        console.log(`✅ ${file} istnieje`);
      } else {
        console.log(`❌ ${file} nie istnieje`);
      }
    });

  } catch (error) {
    console.log('❌ Błąd analizy plików konfiguracyjnych:', error.message);
  }
}

/**
 * Główne problemy i rozwiązania
 */
function printCommonIssuesAndSolutions() {
  console.log('\n🚨 === CZĘSTE PROBLEMY I ROZWIĄZANIA ===');
  
  console.log('\n1. UNAUTHORIZED - Brak tokenu:');
  console.log('   - Sprawdź czy token jest wysyłany w nagłówku Authorization');
  console.log('   - Sprawdź czy token jest w cookies');
  console.log('   - Format: "Bearer <token>" lub cookie');
  
  console.log('\n2. UNAUTHORIZED - Nieprawidłowy token:');
  console.log('   - Sprawdź czy używasz właściwego JWT_SECRET');
  console.log('   - Sprawdź czy token nie wygasł');
  console.log('   - Sprawdź czy payload zawiera wymagane pola');
  
  console.log('\n3. UNAUTHORIZED - Różne sekrety:');
  console.log('   - Użytkownicy: JWT_SECRET');
  console.log('   - Admini: JWT_ADMIN_SECRET');
  console.log('   - Sprawdź czy middleware używa właściwego sekretu');
  
  console.log('\n4. UNAUTHORIZED - Middleware:');
  console.log('   - Sprawdź czy middleware jest podłączony do tras');
  console.log('   - Sprawdź kolejność middleware');
  console.log('   - Sprawdź czy req.user jest ustawiany');
  
  console.log('\n5. UNAUTHORIZED - Cookies:');
  console.log('   - Sprawdź ustawienia httpOnly, secure, sameSite');
  console.log('   - Sprawdź czy domena i ścieżka są poprawne');
  console.log('   - Sprawdź czy cookies nie są blokowane przez CORS');

  console.log('\n6. UNAUTHORIZED - Frontend/Backend mismatch:');
  console.log('   - Sprawdź czy frontend wysyła token w poprawnym formacie');
  console.log('   - Sprawdź czy CORS jest poprawnie skonfigurowany');
  console.log('   - Sprawdź czy cookies są przekazywane między domenami');
}

// Uruchom diagnozę
diagnoseTokenAuthorization()
  .then(() => {
    printCommonIssuesAndSolutions();
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Krytyczny błąd:', error);
    process.exit(1);
  });
