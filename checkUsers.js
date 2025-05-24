import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/user.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectToDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB database');
    return true;
  } catch (err) {
    console.error('❌ Error connecting to MongoDB:', err);
    return false;
  }
};

// Check for existing users
const checkUsers = async () => {
  try {
    // Count total users
    const userCount = await User.countDocuments();
    console.log(`Total users in database: ${userCount}`);
    
    // Get a list of users (limited to 10)
    const users = await User.find().limit(10).select('email name role');
    
    if (users.length > 0) {
      console.log('Users found:');
      users.forEach((user, index) => {
        console.log(`${index + 1}. Email: ${user.email}, Name: ${user.name || 'N/A'}, Role: ${user.role || 'user'}`);
      });
    } else {
      console.log('No users found in the database.');
    }
  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    // Close the connection
    mongoose.connection.close();
  }
};

// Run the script
const run = async () => {
  const connected = await connectToDatabase();
  if (connected) {
    await checkUsers();
  }
};

run();