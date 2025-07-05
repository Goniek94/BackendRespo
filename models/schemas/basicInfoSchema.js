import mongoose from 'mongoose';

/**
 * Schemat podstawowych informacji o pojeździe
 */
const basicInfoSchema = new mongoose.Schema({
  // Podstawowe informacje o pojeździe
  brand: {
    type: String,
    required: true,
    trim: true
  },
  model: {
    type: String,
    required: true,
    trim: true
  },
  generation: {
    type: String,
    trim: true
  },
  version: {
    type: String,
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
    enum: ['benzyna', 'diesel', 'elektryczny', 'hybryda', 'hybrydowy', 'benzyna+LPG', 'inne',
           'Benzyna', 'Diesel', 'Elektryczny', 'Hybryda', 'Hybrydowy', 'Benzyna+LPG', 'Inne',
           'Benzyna+CNG', 'Etanol'],
    default: 'benzyna'
  },
  transmission: {
    type: String,
    required: true,
    enum: ['manualna', 'automatyczna', 'półautomatyczna',
           'Manualna', 'Automatyczna', 'Półautomatyczna', 'Bezstopniowa CVT'],
    default: 'manualna'
  },
  
  // Identyfikatory pojazdu
  vin: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^[A-HJ-NPR-Z0-9]{17}$/.test(v);
      },
      message: props => `${props.value} to nieprawidłowy numer VIN!`
    }
  },
  registrationNumber: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^[A-Z0-9]{1,8}$/.test(v);
      },
      message: props => `${props.value} to nieprawidłowy numer rejestracyjny!`
    }
  },
  
  // Opis i zdjęcia
  headline: {
    type: String,
    trim: true,
    maxlength: 120
  },
  description: {
    type: String,
    required: true,
    trim: true,
    minlength: [10, 'Opis musi zawierać co najmniej 10 znaków.']
  },
  images: [{
    type: String
  }],
  mainImage: {
    type: String,
    trim: true
  },
  
  // Opcje ogłoszenia
  purchaseOptions: {
    type: String,
    required: true,
    enum: ['Sprzedaż', 'Faktura VAT', 'Inne'],
    default: 'Sprzedaż'
  },
  negotiable: {
    type: String,
    enum: ['Tak', 'Nie'],
    default: 'Nie'
  },
  listingType: {
    type: String,
    required: true,
    enum: ['standardowe', 'wyróżnione'],
    default: 'standardowe'
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'opublikowane', 'w toku', 'archiwalne'],
    default: 'pending'
  }
});

export default basicInfoSchema;
