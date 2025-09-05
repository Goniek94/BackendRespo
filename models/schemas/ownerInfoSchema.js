import mongoose from 'mongoose';

/**
 * Helper function to capitalize seller type values
 */
const capitalizeSellerType = function(value) {
  if (!value) return value;
  const lowerValue = value.toLowerCase();
  if (lowerValue === 'prywatny' || lowerValue === 'private') return 'Prywatny';
  if (lowerValue === 'firma' || lowerValue === 'company') return 'Firma';
  return value;
};

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
    enum: ['Prywatny', 'Firma', 'prywatny', 'firma', 'private', 'company'],
    default: 'Prywatny',
    set: capitalizeSellerType
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
