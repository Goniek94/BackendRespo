// models/TransactionHistory.js
const mongoose = require('mongoose');

const transactionHistorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ad: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad', required: true }, // Ogłoszenie powiązane z transakcją
  amount: { type: Number, required: true }, // Kwota transakcji
  status: { type: String, enum: ['completed', 'pending', 'failed'], default: 'pending' }, // Status transakcji
  paymentMethod: { type: String, required: true }, // Metoda płatności
  transactionDate: { type: Date, default: Date.now },
});

const TransactionHistory = mongoose.model('TransactionHistory', transactionHistorySchema);
module.exports = TransactionHistory;
