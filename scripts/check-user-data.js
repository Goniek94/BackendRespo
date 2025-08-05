import mongoose from 'mongoose';
import User from '../models/user/user.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/marketplace';

async function checkUserData() {
  try {
    console.log('🔍 Łączenie z bazą danych...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Połączono z bazą danych\n');

    const email = 'mateusz.goszczycki1994@gmail.com';
    console.log(`🔍 Szukam użytkownika: ${email}`);
    
    const user = await User.findOne({ email: email });
    
    if (!user) {
      console.log('❌ Użytkownik nie znaleziony');
      return;
    }

    console.log('✅ Znaleziono użytkownika:');
    console.log('📧 Email:', user.email);
    console.log('👤 Imię:', user.firstName || 'BRAK');
    console.log('👤 Nazwisko:', user.lastName || 'BRAK');
    console.log('📱 Telefon:', user.phoneNumber || 'BRAK');
    console.log('🔑 Rola:', user.role);
    console.log('📅 Utworzony:', user.createdAt);
    console.log('❤️  Ulubione:', user.favorites?.length || 0, 'ogłoszeń');
    
    console.log('\n🔍 Szczegółowe dane:');
    console.log('lastName type:', typeof user.lastName);
    console.log('lastName value:', JSON.stringify(user.lastName));
    console.log('phoneNumber type:', typeof user.phoneNumber);
    console.log('phoneNumber value:', JSON.stringify(user.phoneNumber));
    
    // Sprawdź walidację
    console.log('\n🧪 Test walidacji:');
    try {
      await user.validate();
      console.log('✅ Walidacja przeszła pomyślnie');
    } catch (validationError) {
      console.log('❌ Błąd walidacji:');
      console.log(validationError.message);
      
      if (validationError.errors) {
        Object.keys(validationError.errors).forEach(field => {
          console.log(`  - ${field}: ${validationError.errors[field].message}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Błąd:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Rozłączono z bazą danych');
  }
}

checkUserData();
