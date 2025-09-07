import mongoose from 'mongoose';
import User from '../models/user/user.js';
import { generateAccessToken } from '../middleware/auth.js';

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

    // Użyj zoptymalizowanej funkcji z middleware/auth.js
    const token = generateAccessToken({
      userId: user._id,
      role: user.role || 'user'
    });
    
    console.log('🔐 ZOPTYMALIZOWANY TOKEN (ultra-mały payload):');
    console.log('Token:', token);
    console.log('Długość:', token.length, 'znaków');
    process.exit(0);
  } catch (error) {
    console.error('Błąd:', error);
    process.exit(1);
  }
}

getTestToken();
