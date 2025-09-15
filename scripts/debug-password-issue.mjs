import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/user/user.js';

/**
 * Debug password hashing issue
 */

const debugPasswordIssue = async () => {
  try {
    // Connect to MongoDB Atlas
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://waldemarkorepetycje:Nelusia321.@mateusz.hkdgv.mongodb.net/MarketplaceDB?retryWrites=true&w=majority&appName=Mateusz';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const email = 'przemek.bajkowski@gmail.com';
    const testPassword = 'Test123!';

    console.log('🔍 DEBUGGING PASSWORD ISSUE');
    console.log('==========================');
    console.log('Email:', email);
    console.log('Test password:', testPassword);
    console.log('');

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log('❌ User NOT found in database');
      return;
    }

    console.log('✅ User found in database');
    console.log('Current password hash:', user.password);
    console.log('Hash length:', user.password.length);
    console.log('');

    // Test 1: Create fresh hash and compare immediately
    console.log('🧪 TEST 1: Fresh hash comparison');
    const freshHash = await bcrypt.hash(testPassword, 12);
    const freshTest = await bcrypt.compare(testPassword, freshHash);
    console.log('Fresh hash:', freshHash);
    console.log('Fresh test result:', freshTest ? '✅ PASS' : '❌ FAIL');
    console.log('');

    // Test 2: Compare with stored hash
    console.log('🧪 TEST 2: Stored hash comparison');
    const storedTest = await bcrypt.compare(testPassword, user.password);
    console.log('Stored test result:', storedTest ? '✅ PASS' : '❌ FAIL');
    console.log('');

    // Test 3: Try different passwords
    console.log('🧪 TEST 3: Try different passwords');
    const passwords = ['Test123!', 'Autosell13!', 'Autosell13', 'test123', 'Admin123!'];
    
    for (const pwd of passwords) {
      const result = await bcrypt.compare(pwd, user.password);
      console.log(`Password "${pwd}":`, result ? '✅ MATCH' : '❌ NO MATCH');
    }
    console.log('');

    // Test 4: Update password step by step
    console.log('🧪 TEST 4: Step-by-step password update');
    
    console.log('Step 1: Creating new hash...');
    const newHash = await bcrypt.hash(testPassword, 12);
    console.log('New hash created:', newHash);
    
    console.log('Step 2: Testing new hash before saving...');
    const preTest = await bcrypt.compare(testPassword, newHash);
    console.log('Pre-save test:', preTest ? '✅ PASS' : '❌ FAIL');
    
    if (preTest) {
      console.log('Step 3: Updating user password...');
      user.password = newHash;
      
      console.log('Step 4: Saving to database...');
      await user.save();
      console.log('Saved successfully');
      
      console.log('Step 5: Re-fetching user from database...');
      const updatedUser = await User.findOne({ email: email.toLowerCase() });
      console.log('Updated hash:', updatedUser.password);
      console.log('Hash matches what we set:', updatedUser.password === newHash ? '✅ YES' : '❌ NO');
      
      console.log('Step 6: Testing password with updated user...');
      const finalTest = await bcrypt.compare(testPassword, updatedUser.password);
      console.log('Final test result:', finalTest ? '✅ PASS' : '❌ FAIL');
      
      if (finalTest) {
        console.log('');
        console.log('🎉 SUCCESS! Password is working now!');
        console.log('📧 Email: przemek.bajkowski@gmail.com');
        console.log('🔑 Password: Test123!');
      } else {
        console.log('');
        console.log('❌ STILL FAILING after update');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the script
debugPasswordIssue();
