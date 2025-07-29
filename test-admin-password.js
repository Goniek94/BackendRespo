const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/marketplace', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String
});

const User = mongoose.model('User', userSchema);

async function checkAdminPassword() {
  try {
    console.log('🔍 Sprawdzanie hasła administratora...\n');
    
    const admin = await User.findOne({ email: 'mateusz.goszczycki1994@gmail.com' });
    
    if (!admin) {
      console.log('❌ Nie znaleziono administratora');
      return;
    }
    
    console.log('✅ Znaleziono administratora:');
    console.log('Email:', admin.email);
    console.log('Rola:', admin.role);
    console.log('Hash hasła:', admin.password);
    
    // Test różnych haseł
    const testPasswords = ['haslo123', 'admin123', 'password', '123456', 'mateusz123'];
    
    console.log('\n🔐 Testowanie haseł:');
    
    for (const password of testPasswords) {
      try {
        const isMatch = await bcrypt.compare(password, admin.password);
        console.log(`${password}: ${isMatch ? '✅ POPRAWNE' : '❌ niepoprawne'}`);
        
        if (isMatch) {
          console.log(`\n🎉 Znaleziono poprawne hasło: ${password}`);
          break;
        }
      } catch (error) {
        console.log(`${password}: ❌ błąd porównania`);
      }
    }
    
  } catch (error) {
    console.error('❌ Błąd:', error);
  } finally {
    mongoose.disconnect();
  }
}

checkAdminPassword();
