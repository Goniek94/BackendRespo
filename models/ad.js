import mongoose from 'mongoose';

const adSchema = new mongoose.Schema({
  make: {
    type: String,
    required: true,
    trim: true
  },
  model: {
    type: String,
    required: true,
    trim: true
  },
  year: {
    type: Number,
    required: true,
    validate: {
      validator: function(v) {
        const currentYear = new Date().getFullYear();
        return v >= 1886 && v <= currentYear;
      },
      message: props => `${props.value} to nieprawidłowy rok produkcji!`
    }
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Cena nie może być mniejsza niż 0.']
  },
  mileage: {
    type: Number,
    required: true,
    min: [0, 'Przebieg nie może być mniejszy niż 0.']
  },
  fuelType: {
    type: String,
    required: true,
    enum: ['benzyna', 'diesel', 'elektryczny', 'hybryda', 'inne'],
    default: 'benzyna'
  },
  transmission: {
    type: String,
    required: true,
    enum: ['manualna', 'automatyczna', 'półautomatyczna'],
    default: 'manualna'
  },
  vin: {
    type: String,
    unique: true,
    sparse: true,
    validate: {
      validator: function(v) {
        return !v || /^[A-HJ-NPR-Z0-9]{17}$/.test(v);
      },
      message: props => `${props.value} to nieprawidłowy numer VIN!`
    }
  },
  registrationNumber: {
    type: String,
    unique: true,
    sparse: true,
    validate: {
      validator: function(v) {
        return !v || /^[A-Z0-9]{1,8}$/.test(v);
      },
      message: props => `${props.value} to nieprawidłowy numer rejestracyjny!`
    }
  },
  description: {
    type: String,
    required: true,
    trim: true,
    minlength: [10, 'Opis musi zawierać co najmniej 10 znaków.']
  },
  images: [{
    type: String,
    validate: {
      validator: function(v) {
        return v.startsWith('http') || v.startsWith('https');
      },
      message: props => `${props.value} to nieprawidłowy link do zdjęcia!`
    }
  }],
  purchaseOptions: {
    type: String,
    required: true,
    enum: ['faktura VAT', 'umowa kupna-sprzedaży', 'inne'],
    default: 'umowa kupna-sprzedaży'
  },
  listingType: {
    type: String,
    required: true,
    enum: ['standardowe', 'wyróżnione'],
    default: 'standardowe'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  views: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['w toku', 'opublikowane', 'archiwalne'],
    default: 'w toku'
  }
});

// Sprawdzamy, czy model już istnieje, żeby nie nadpisywać
const Ad = mongoose.models.Ad || mongoose.model('Ad', adSchema);

export default Ad;
