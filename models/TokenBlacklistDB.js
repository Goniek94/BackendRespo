import mongoose from 'mongoose';

/**
 * Model dla blacklisty tokenów JWT
 * Przechowuje unieważnione tokeny w bazie danych MongoDB
 * Zawiera mechanizm automatycznego usuwania wygasłych tokenów
 */
const tokenBlacklistSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '24h' // Automatyczne usuwanie po 24h (TTL index)
  },
  reason: {
    type: String,
    enum: ['LOGOUT', 'PASSWORD_CHANGE', 'ROTATION', 'SECURITY_ISSUE', 'OTHER'],
    default: 'OTHER'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  }
});

// Indeks dla szybkiego wyszukiwania
tokenBlacklistSchema.index({ token: 1 });

const TokenBlacklist = mongoose.model('TokenBlacklist', tokenBlacklistSchema);

export default TokenBlacklist;
