import mongoose from 'mongoose';

/**
 * Schemat informacji o właścicielu ogłoszenia
 */
const ownerInfoSchema = new mongoose.Schema({
  // Dane właściciela ogłoszenia
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ownerName: {
    type: String
  },
  ownerLastName: {
    type: String
  },
  ownerEmail: {
    type: String
  },
  ownerPhone: {
    type: String
  },
  // Typ sprzedającego (osoba prywatna / firma)
  sellerType: {
    type: String,
    enum: ['prywatny', 'firma'],
    default: 'prywatny'
  }
});

// Metoda formatująca dane właściciela ogłoszenia
ownerInfoSchema.methods.getOwnerInfo = function() {
  return {
    name: this.ownerName,
    lastName: this.ownerLastName,
    email: this.ownerEmail,
    phone: this.ownerPhone
  };
};

export default ownerInfoSchema;
