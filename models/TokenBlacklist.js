import mongoose from 'mongoose';

// Schemat dla unieważnionych tokenów
const tokenBlacklistSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true // Token musi być unikalny
  },
  expiresAt: {
    type: Date,
    required: true // Data wygaśnięcia tokena
  }
});

// Model czarnej listy tokenów
const TokenBlacklist = mongoose.model('TokenBlacklist', tokenBlacklistSchema);

export default TokenBlacklist;