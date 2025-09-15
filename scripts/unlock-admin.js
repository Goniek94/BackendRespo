/**
 * Odblokuj konto administratora - resetuj failedLoginAttempts
 */

import mongoose from 'mongoose';
import User from '../models/user/user.js';

const unlockAdminAccount = async () => {
  try {
    console.log('🔓 Unlocking admin account...\n');

    // Połącz z bazą danych
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://waldemarkorepetycje:Nelusia321.@mateusz.hkdgv.mongodb.net/MarketplaceDB?retryWrites=true&w=majority&appName=Mateusz');
    console.log('✅ Connected to database');

    // Znajdź użytkownika admin
    const adminUser = await User.findOne({ 
      email: 'mateusz.goszczycki1994@gmail.com' 
    });

    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log('Current admin status:');
    console.log('- Failed login attempts:', adminUser.failedLoginAttempts || 0);
    console.log('- Account locked:', adminUser.accountLocked || false);
    console.log('- Lock until:', adminUser.lockUntil || 'Not set');

    // Resetuj blokadę
    adminUser.failedLoginAttempts = 0;
    adminUser.accountLocked = false;
    adminUser.lockUntil = undefined;
    
    await adminUser.save();

    console.log('\n✅ Admin account unlocked successfully!');
    console.log('- Failed login attempts: 0');
    console.log('- Account locked: false');
    console.log('- Lock until: cleared');

  } catch (error) {
    console.error('❌ Error unlocking admin account:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
};

unlockAdminAccount();
