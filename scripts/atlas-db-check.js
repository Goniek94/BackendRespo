// Skrypt do sprawdzenia bazy danych MongoDB Atlas
const { MongoClient } = require('mongodb');

const checkAtlasDatabase = async () => {
  let client;
  
  try {
    console.log('🌐 SPRAWDZANIE BAZY DANYCH MONGODB ATLAS');
    console.log('==================================================');
    
    // Connection string z backend .env
    const uri = 'mongodb+srv://waldemarkorepetycje:Nelusia321.@mateusz.hkdgv.mongodb.net/MarketplaceDB?retryWrites=true&w=majority&appName=Mateusz';
    console.log('📡 Łączenie z MongoDB Atlas...');
    
    // Connect to MongoDB Atlas
    client = new MongoClient(uri);
    await client.connect();
    
    console.log('✅ Połączono z bazą danych Atlas');
    
    const db = client.db('MarketplaceDB');
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log(`\n📚 Kolekcje w bazie danych (${collections.length}):`);
    collections.forEach((col, index) => {
      console.log(`${index + 1}. ${col.name}`);
    });
    
    // Check if users collection exists
    const usersCollection = db.collection('users');
    const userExists = collections.some(col => col.name === 'users');
    
    if (!userExists) {
      console.log('\n❌ Kolekcja "users" nie istnieje w bazie danych!');
      return;
    }
    
    // Count all users
    const totalUsers = await usersCollection.countDocuments();
    console.log(`\n📊 Łączna liczba użytkowników: ${totalUsers}`);
    
    if (totalUsers === 0) {
      console.log('\n❌ Brak użytkowników w kolekcji "users"!');
      return;
    }
    
    // Find all users
    const allUsers = await usersCollection.find({}).toArray();
    
    console.log('\n👥 WSZYSCY UŻYTKOWNICY:');
    console.log('==================================================');
    
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   Imię: ${user.firstName || 'brak'}`);
      console.log(`   Nazwisko: ${user.lastName || 'brak'}`);
      console.log(`   Rola: ${user.role || 'user'}`);
      console.log(`   Aktywny: ${user.isActive ? 'TAK' : 'NIE'}`);
      console.log(`   ID: ${user._id}`);
      if (user.loginAttempts) console.log(`   Próby logowania: ${user.loginAttempts}`);
      if (user.lockUntil) console.log(`   Zablokowany do: ${new Date(user.lockUntil)}`);
      console.log('   ---');
    });
    
    // Find admin users
    const adminUsers = await usersCollection.find({ role: 'admin' }).toArray();
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
        console.log(`   ID: ${admin._id}`);
        if (admin.loginAttempts) console.log(`   Próby logowania: ${admin.loginAttempts}`);
        if (admin.lockUntil) console.log(`   Zablokowany do: ${new Date(admin.lockUntil)}`);
        console.log('   ---');
      });
    }
    
    // Find moderators
    const moderators = await usersCollection.find({ role: 'moderator' }).toArray();
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
        console.log(`   ID: ${mod._id}`);
        console.log('   ---');
      });
    }
    
    // Check specific admin emails from admin-codes.json
    const adminEmails = [
      'mateusz.goszczycki1994@gmail.com',
      'admin2@autosell.pl', 
      'admin3@autosell.pl'
    ];
    
    console.log(`\n🔍 SPRAWDZANIE KONKRETNYCH EMAILI Z admin-codes.json:`);
    console.log('==================================================');
    
    for (const email of adminEmails) {
      const user = await usersCollection.findOne({ email });
      if (user) {
        console.log(`✅ ${email}:`);
        console.log(`   Rola: ${user.role || 'user'}`);
        console.log(`   Aktywny: ${user.isActive ? 'TAK' : 'NIE'}`);
        console.log(`   Próby logowania: ${user.loginAttempts || 0}`);
        console.log(`   Zablokowany do: ${user.lockUntil ? new Date(user.lockUntil) : 'NIE'}`);
        console.log(`   ID: ${user._id}`);
        console.log(`   Utworzony: ${user.createdAt || 'brak daty'}`);
      } else {
        console.log(`❌ ${email}: UŻYTKOWNIK NIE ISTNIEJE W BAZIE ATLAS`);
      }
      console.log('   ---');
    }
    
    console.log(`\n📋 PODSUMOWANIE:`);
    console.log('==================================================');
    console.log(`• Łączna liczba użytkowników: ${totalUsers}`);
    console.log(`• Administratorzy: ${adminUsers.length}`);
    console.log(`• Moderatorzy: ${moderators.length}`);
    console.log(`• Zwykli użytkownicy: ${totalUsers - adminUsers.length - moderators.length}`);
    
  } catch (error) {
    console.error('❌ Błąd połączenia z MongoDB Atlas:', error.message);
    console.error('💡 Sprawdź czy:');
    console.error('   - Connection string jest poprawny');
    console.error('   - Masz dostęp do internetu');
    console.error('   - IP jest dodane do whitelist w Atlas');
    console.error('   - Hasło w connection string jest poprawne');
  } finally {
    if (client) {
      await client.close();
      console.log('\n✅ Rozłączono z bazą danych Atlas');
    }
  }
};

checkAtlasDatabase();
