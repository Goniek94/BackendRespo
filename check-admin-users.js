import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/user.js';
import bcrypt from 'bcryptjs';

dotenv.config();

async function checkAdminUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://mateusz:Neluchu321@mateusz.hkdgv.mongodb.net/MarketplaceDB?retryWrites=true&w=majority&appName=Mateusz');
    console.log('✅ Połączono z MongoDB');
    
    // Sprawdź wszystkich użytkowników
    const allUsers = await User.find().select('email role firstName lastName createdAt');
    console.log('\n👥 Wszyscy użytkownicy w bazie:');
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} - Rola: ${user.role} - ${user.firstName} ${user.lastName}`);
    });
    
    // Sprawdź adminów
    const adminUsers = await User.find({ role: { $in: ['admin', 'moderator'] } });
    console.log(`\n👑 Liczba adminów/moderatorów: ${adminUsers.length}`);
    
    if (adminUsers.length === 0) {
      console.log('\n🔧 Tworzenie użytkownika admin...');
      
      const hashedPassword = await bcrypt.hash('admin123', 12);
      const adminUser = new User({
        email: 'admin@marketplace.pl',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isVerified: true,
        isActive: true
      });
      
      await adminUser.save();
      console.log('✅ Utworzono użytkownika admin:');
      console.log('   Email: admin@marketplace.pl');
      console.log('   Hasło: admin123');
    } else {
      console.log('\n👑 Dostępni adminowie:');
      adminUsers.forEach((admin, index) => {
        console.log(`${index + 1}. ${admin.email} - Rola: ${admin.role}`);
      });
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Rozłączono z MongoDB');
  } catch (error) {
    console.error('❌ Błąd:', error.message);
    console.error('Stack:', error.stack);
  }
}

checkAdminUsers();
