import mongoose from 'mongoose';
import User from '../models/user/user.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/marketplace';

async function fixUserData() {
  try {
    console.log('🔍 Łączenie z bazą danych...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Połączono z bazą danych\n');

    const email = 'Mateusz.gosczycki1994@gmail.com';
    console.log(`🔍 Szukam użytkownika: ${email}`);
    
    const user = await User.findOne({ email: email });
    
    if (!user) {
      console.log('❌ Użytkownik nie znaleziony');
      return;
    }

    console.log('✅ Znaleziono użytkownika:');
    console.log('📧 Email:', user.email);
    console.log('👤 Imię:', user.name || user.firstName || 'BRAK');
    console.log('👤 Nazwisko:', user.lastName || 'BRAK');
    console.log('📱 Telefon:', user.phoneNumber || 'BRAK');
    
    // Sprawdź co trzeba naprawić
    let needsUpdate = false;
    const updates = {};

    // Sprawdź lastName
    if (!user.lastName || user.lastName.length < 2) {
      console.log('\n🔧 Dodaję brakujące nazwisko...');
      updates.lastName = 'Goszczycki';
      needsUpdate = true;
    }

    // Sprawdź phoneNumber - format E.164
    if (user.phoneNumber) {
      const currentPhone = user.phoneNumber.toString();
      const correctPhone = '+48577886554';
      
      if (currentPhone !== correctPhone) {
        console.log('\n🔧 Poprawiam numer telefonu...');
        updates.phoneNumber = correctPhone;
        needsUpdate = true;
        console.log(`   Stary format: ${currentPhone}`);
        console.log(`   Nowy format: ${correctPhone}`);
      }
    } else {
      console.log('\n🔧 Dodaję brakujący numer telefonu...');
      updates.phoneNumber = '+48577886554';
      needsUpdate = true;
    }

    if (needsUpdate) {
      console.log('\n🔄 Aktualizuję dane użytkownika...');
      
      // Użyj findByIdAndUpdate z opcją runValidators: false, żeby ominąć walidację
      await User.findByIdAndUpdate(user._id, updates, { 
        runValidators: false,
        new: true 
      });
      
      console.log('✅ Dane użytkownika zostały zaktualizowane');
      
      // Sprawdź czy teraz przechodzi walidację
      const updatedUser = await User.findById(user._id);
      try {
        await updatedUser.validate();
        console.log('✅ Walidacja przeszła pomyślnie');
      } catch (validationError) {
        console.log('❌ Nadal błąd walidacji:');
        console.log(validationError.message);
      }
    } else {
      console.log('\n✅ Dane użytkownika są już poprawne');
    }

  } catch (error) {
    console.error('❌ Błąd:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Rozłączono z bazą danych');
  }
}

fixUserData();
