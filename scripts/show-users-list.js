import mongoose from 'mongoose';
import User from '../models/user/user.js';
import config from '../config/index.js';

/**
 * Prosty skrypt do wyświetlenia listy użytkowników z bazy danych
 * Pokazuje wszystkich użytkowników zarejestrowanych w systemie
 */

async function showUsersList() {
  try {
    console.log('🔧 Łączenie z bazą danych...');
    
    await mongoose.connect(config.database.uri, config.database.options);
    console.log('✅ Połączono z bazą danych');
    
    // Pobierz wszystkich użytkowników
    const users = await User.find({})
      .select('name lastName email role status isVerified createdAt lastLogin')
      .sort({ createdAt: -1 })
      .lean();
    
    console.log(`\n👥 LISTA UŻYTKOWNIKÓW (${users.length} użytkowników):`);
    console.log('=' .repeat(80));
    
    if (users.length === 0) {
      console.log('⚠️ Brak użytkowników w bazie danych');
    } else {
      users.forEach((user, index) => {
        const fullName = `${user.name} ${user.lastName || ''}`.trim();
        const lastLogin = user.lastLogin ? 
          new Date(user.lastLogin).toLocaleDateString('pl-PL') : 
          'Nigdy';
        const createdAt = new Date(user.createdAt).toLocaleDateString('pl-PL');
        
        console.log(`\n${index + 1}. ${fullName}`);
        console.log(`   📧 Email: ${user.email}`);
        console.log(`   👤 Rola: ${user.role}`);
        console.log(`   📊 Status: ${user.status}`);
        console.log(`   ✅ Zweryfikowany: ${user.isVerified ? 'Tak' : 'Nie'}`);
        console.log(`   📅 Zarejestrowany: ${createdAt}`);
        console.log(`   🕐 Ostatnie logowanie: ${lastLogin}`);
      });
    }
    
    // Statystyki
    console.log('\n📊 STATYSTYKI:');
    console.log('=' .repeat(40));
    
    const stats = {
      total: users.length,
      admins: users.filter(u => u.role === 'admin').length,
      moderators: users.filter(u => u.role === 'moderator').length,
      regularUsers: users.filter(u => u.role === 'user').length,
      verified: users.filter(u => u.isVerified).length,
      active: users.filter(u => u.status === 'active').length,
      blocked: users.filter(u => u.status === 'blocked').length
    };
    
    console.log(`📈 Łączna liczba użytkowników: ${stats.total}`);
    console.log(`👑 Administratorzy: ${stats.admins}`);
    console.log(`🛡️ Moderatorzy: ${stats.moderators}`);
    console.log(`👤 Zwykli użytkownicy: ${stats.regularUsers}`);
    console.log(`✅ Zweryfikowani: ${stats.verified}`);
    console.log(`🟢 Aktywni: ${stats.active}`);
    console.log(`🔴 Zablokowani: ${stats.blocked}`);
    
    console.log('\n✅ Lista użytkowników wyświetlona pomyślnie!');
    
  } catch (error) {
    console.error('❌ Błąd:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Rozłączono z bazą danych');
    process.exit(0);
  }
}

// Uruchom skrypt
showUsersList();
