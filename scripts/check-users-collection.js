const mongoose = require('mongoose');
require('dotenv').config();

// Import User model
const User = require('../../../Marketplace-Backend/models/user/User');

const checkUsersCollection = async () => {
  try {
    console.log('SPRAWDZANIE KOLEKCJI UŻYTKOWNIKÓW');
    console.log('==================================================');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/marketplace', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Połączono z bazą danych');
    
    // Find all users
    const allUsers = await User.find({}).select('email firstName lastName role isActive createdAt');
    console.log(`\n📊 Znaleziono ${allUsers.length} użytkowników w kolekcji:`);
    console.log('==================================================');
    
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   Imię: ${user.firstName || 'brak'}`);
      console.log(`   Nazwisko: ${user.lastName || 'brak'}`);
      console.log(`   Rola: ${user.role || 'user'}`);
      console.log(`   Aktywny: ${user.isActive ? 'TAK' : 'NIE'}`);
      console.log(`   Utworzony: ${user.createdAt}`);
      console.log('   ---');
    });
    
    // Find specifically admin users
    const adminUsers = await User.find({ role: 'admin' }).select('email firstName lastName role isActive');
    console.log(`\n👑 ADMINISTRATORZY (${adminUsers.length}):`);
    console.log('==================================================');
    
    if (adminUsers.length === 0) {
      console.log('❌ Brak użytkowników z rolą "admin" w bazie danych!');
    } else {
      adminUsers.forEach((admin, index) => {
        console.log(`${index + 1}. ${admin.email}`);
        console.log(`   Imię: ${admin.firstName || 'brak'}`);
        console.log(`   Nazwisko: ${admin.lastName || 'brak'}`);
        console.log(`   Aktywny: ${admin.isActive ? 'TAK' : 'NIE'}`);
        console.log('   ---');
      });
    }
    
    // Find moderators
    const moderators = await User.find({ role: 'moderator' }).select('email firstName lastName role isActive');
    console.log(`\n🛡️ MODERATORZY (${moderators.length}):`);
    console.log('==================================================');
    
    if (moderators.length === 0) {
      console.log('❌ Brak użytkowników z rolą "moderator" w bazie danych!');
    } else {
      moderators.forEach((mod, index) => {
        console.log(`${index + 1}. ${mod.email}`);
        console.log(`   Imię: ${mod.firstName || 'brak'}`);
        console.log(`   Nazwisko: ${mod.lastName || 'brak'}`);
        console.log(`   Aktywny: ${mod.isActive ? 'TAK' : 'NIE'}`);
        console.log('   ---');
      });
    }
    
    // Check specific emails from admin-codes.json
    const adminEmails = [
      'mateusz.goszczycki1994@gmail.com',
      'admin2@autosell.pl',
      'admin3@autosell.pl'
    ];
    
    console.log(`\n🔍 SPRAWDZANIE KONKRETNYCH EMAILI Z admin-codes.json:`);
    console.log('==================================================');
    
    for (const email of adminEmails) {
      const user = await User.findOne({ email }).select('email firstName lastName role isActive loginAttempts lockUntil');
      if (user) {
        console.log(`✅ ${email}:`);
        console.log(`   Rola: ${user.role || 'user'}`);
        console.log(`   Aktywny: ${user.isActive ? 'TAK' : 'NIE'}`);
        console.log(`   Próby logowania: ${user.loginAttempts || 0}`);
        console.log(`   Zablokowany do: ${user.lockUntil ? new Date(user.lockUntil) : 'NIE'}`);
      } else {
        console.log(`❌ ${email}: UŻYTKOWNIK NIE ISTNIEJE W BAZIE`);
      }
      console.log('   ---');
    }
    
  } catch (error) {
    console.error('❌ Błąd:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Rozłączono z bazą danych');
  }
};

checkUsersCollection();
