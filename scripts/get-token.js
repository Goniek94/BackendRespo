import mongoose from 'mongoose';
import User from '../models/user/user.js';
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
    
    // Sprawdź czy JWT_SECRET jest ustawiony
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET nie jest ustawiony w .env');
      process.exit(1);
    }

    // Minimalny payload zgodny z wymaganiami bezpieczeństwa
    const token = jwt.sign(
      { 
        userId: user._id, 
        role: user.role || 'user',
        type: 'access',
        iat: Math.floor(Date.now() / 1000),
        jti: require('crypto').randomBytes(16).toString('hex')
      },
      process.env.JWT_SECRET,
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
