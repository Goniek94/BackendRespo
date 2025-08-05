import mongoose from 'mongoose';
import User from './models/user/user.js';

async function fixUserAccount() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/marketplace');
    console.log('✅ Połączono z bazą danych');
    
    const email = 'mateusz.goszczycki1994@gmail.com';
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('❌ Użytkownik nie został znaleziony w bazie danych');
      return;
    }
    
    console.log('\n📋 ANALIZA WYMAGAŃ DO LOGOWANIA:');
    console.log('Na podstawie modelu User i authController, wymagane są:');
    
    console.log('\n🔍 OBECNY STAN KONTA:');
    console.log('- Email:', user.email);
    console.log('- Hasło:', user.password ? '✅ JEST' : '❌ BRAK');
    console.log('- Status konta:', user.status || 'BRAK');
    console.log('- Konto zablokowane:', user.accountLocked || false);
    console.log('- Nieudane próby logowania:', user.failedLoginAttempts || 0);
    
    // Sprawdź mapowanie pól - w bazie są inne nazwy niż w modelu
    console.log('\n🔄 MAPOWANIE PÓL (baza danych vs model):');
    console.log('- firstName (baza) -> name (model):', user.firstName || 'BRAK');
    console.log('- lastName (baza):', user.lastName || 'BRAK');
    console.log('- phone (baza) -> phoneNumber (model):', user.phone || 'BRAK');
    console.log('- emailVerified (baza) -> isEmailVerified (model):', user.emailVerified);
    console.log('- phoneVerified (baza) -> isPhoneVerified (model):', user.phoneVerified);
    console.log('- termsAccepted (baza):', user.termsAccepted);
    
    console.log('\n🛠️  NAPRAWIAM KONTO...');
    
    // Przygotuj aktualizacje - używaj nazw pól z bazy danych
    const updates = {
      // Podstawowe pola wymagane przez model
      name: user.firstName || 'Mateusz', // Mapowanie firstName -> name
      lastName: user.lastName || 'Goszczycki',
      phoneNumber: user.phone || '+48123456789', // Mapowanie phone -> phoneNumber
      
      // Weryfikacja - używaj nazw z bazy danych
      emailVerified: true,
      isEmailVerified: true,
      phoneVerified: true, 
      isPhoneVerified: true,
      isVerified: true,
      
      // Status konta
      status: 'active',
      accountLocked: false,
      failedLoginAttempts: 0,
      lockUntil: null,
      
      // Regulamin
      termsAccepted: true,
      termsAcceptedAt: new Date(),
      dataProcessingAccepted: true,
      dataProcessingAcceptedAt: new Date(),
      
      // Krok rejestracji
      registrationStep: 'completed',
      
      // Dodatkowe pola jeśli brakują
      dob: user.dob || new Date('1994-01-01'), // Przykładowa data urodzenia
      country: user.country || 'pl',
      role: user.role || 'user',
      
      // Aktualizacja aktywności
      lastActivity: new Date(),
      updatedAt: new Date()
    };
    
    // Wykonaj aktualizację
    const result = await User.updateOne(
      { email: email },
      { $set: updates }
    );
    
    if (result.modifiedCount > 0) {
      console.log('✅ Konto zostało naprawione!');
      
      // Sprawdź zaktualizowane dane
      const updatedUser = await User.findOne({ email });
      
      console.log('\n🎉 NOWY STAN KONTA:');
      console.log('- Name:', updatedUser.name);
      console.log('- LastName:', updatedUser.lastName);
      console.log('- Email:', updatedUser.email);
      console.log('- PhoneNumber:', updatedUser.phoneNumber);
      console.log('- EmailVerified:', updatedUser.emailVerified);
      console.log('- PhoneVerified:', updatedUser.phoneVerified);
      console.log('- IsVerified:', updatedUser.isVerified);
      console.log('- Status:', updatedUser.status);
      console.log('- TermsAccepted:', updatedUser.termsAccepted);
      console.log('- RegistrationStep:', updatedUser.registrationStep);
      console.log('- AccountLocked:', updatedUser.accountLocked);
      console.log('- FailedLoginAttempts:', updatedUser.failedLoginAttempts);
      
      console.log('\n✅ TERAZ MOŻESZ SIĘ ZALOGOWAĆ!');
      console.log('Użyj:');
      console.log('- Email: mateusz.goszczycki1994@gmail.com');
      console.log('- Hasło: Neluchu321.');
      
    } else {
      console.log('⚠️  Nie dokonano żadnych zmian');
    }
    
  } catch (error) {
    console.error('❌ Błąd:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Rozłączono z bazą danych');
  }
}

fixUserAccount();
