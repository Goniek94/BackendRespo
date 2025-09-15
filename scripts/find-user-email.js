import mongoose from 'mongoose';
import User from '../models/user/user.js';

// Konfiguracja połączenia z bazą danych
const connectDB = async () => {
  try {
    // Wczytaj zmienne środowiskowe
    const dotenv = await import('dotenv');
    dotenv.config();
    
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/marketplace';
    console.log('🔗 Łączenie z bazą danych...');
    await mongoose.connect(mongoURI);
    console.log('✅ Połączono z bazą danych MongoDB');
  } catch (error) {
    console.error('❌ Błąd połączenia z bazą danych:', error);
    process.exit(1);
  }
};

// Główna funkcja
const main = async () => {
  await connectDB();

  try {
    // Znajdź użytkownika o ID 688b4aba9c0f2fecd035b20a
    const user = await User.findById('688b4aba9c0f2fecd035b20a');
    
    if (user) {
      console.log('👤 Znaleziono użytkownika:');
      console.log(`   ID: ${user._id}`);
      console.log(`   Nazwa: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Data utworzenia: ${user.createdAt}`);
    } else {
      console.log('❌ Nie znaleziono użytkownika o podanym ID');
    }

    // Pokaż też wszystkich użytkowników o nazwie "Mateusz"
    console.log('\n📋 Wszyscy użytkownicy o nazwie "Mateusz":');
    const mateuszUsers = await User.find({ name: /mateusz/i }).select('_id name email createdAt');
    
    mateuszUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}) - ID: ${user._id}`);
    });

  } catch (error) {
    console.error('❌ Błąd:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Rozłączono z bazą danych');
  }
};

// Uruchom skrypt
main();
