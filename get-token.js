import mongoose from 'mongoose';
import User from './models/user.js';
import jwt from 'jsonwebtoken';

mongoose.connect('mongodb://localhost:27017/marketplace');

async function getTestToken() {
  try {
    const user = await User.findOne().sort({ createdAt: -1 });
    if (!user) {
      console.log('Brak użytkowników w bazie');
      process.exit(1);
    }
    
    console.log('Znaleziony użytkownik:', user.email, 'ID:', user._id);
    
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role || 'user' 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    console.log('Token:', token);
    process.exit(0);
  } catch (error) {
    console.error('Błąd:', error);
    process.exit(1);
  }
}

getTestToken();
