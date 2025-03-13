import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: { // Kwota transakcji
    type: Number,
    required: true
  },
  transactionDate: { // Data transakcji
    type: Date,
    default: Date.now
  },
  status: { // Status płatności (np. completed, pending, failed)
    type: String,
    enum: ['completed', 'pending', 'failed'],
    default: 'pending'
  },
  paymentMethod: { // Metoda płatności (np. karta kredytowa, Przelewy24)
    type: String,
    required: true
  }
});

const Payment = mongoose.model('Payment', paymentSchema);

// Eksport domyślny dla Payment
export default Payment;
