import mongoose from 'mongoose';

/**
 * Helper function to capitalize boolean-like values
 */
const capitalizeBooleanValue = function(value) {
  if (!value) return value;
  const lowerValue = value.toLowerCase();
  if (lowerValue === 'tak') return 'Tak';
  if (lowerValue === 'nie') return 'Nie';
  return value;
};

/**
 * Helper function to capitalize purchase options
 */
const capitalizePurchaseOptions = function(value) {
  if (!value) return value;
  const lowerValue = value.toLowerCase();
  if (lowerValue === 'sprzedaż' || lowerValue === 'sprzedaz') return 'Sprzedaż';
  if (lowerValue === 'faktura vat') return 'Faktura VAT';
  if (lowerValue === 'inne') return 'Inne';
  if (lowerValue === 'cesja leasingu') return 'Cesja leasingu';
  if (lowerValue === 'zamiana') return 'Zamiana';
  if (lowerValue === 'najem') return 'Najem';
  if (lowerValue === 'leasing') return 'Leasing';
  return value;
};

/**
 * Helper function to capitalize fuel type values
 */
const capitalizeFuelType = function(value) {
  if (!value) return value;
  const lowerValue = value.toLowerCase();
  if (lowerValue === 'benzyna') return 'Benzyna';
  if (lowerValue === 'diesel') return 'Diesel';
  if (lowerValue === 'elektryczny') return 'Elektryczny';
  if (lowerValue === 'hybryda' || lowerValue === 'hybrydowy') return 'Hybryda';
  if (lowerValue === 'benzyna+lpg') return 'Benzyna+LPG';
  if (lowerValue === 'benzyna+cng') return 'Benzyna+CNG';
  if (lowerValue === 'etanol') return 'Etanol';
  if (lowerValue === 'hybryda plug-in') return 'Hybryda plug-in';
  if (lowerValue === 'wodór') return 'Wodór';
  if (lowerValue === 'benzyna+etanol') return 'Benzyna+Etanol';
  if (lowerValue === 'inne') return 'Inne';
  return value;
};

/**
 * Helper function to capitalize transmission values
 */
const capitalizeTransmission = function(value) {
  if (!value) return value;
  const lowerValue = value.toLowerCase();
  if (lowerValue === 'manualna') return 'Manualna';
  if (lowerValue === 'automatyczna') return 'Automatyczna';
  if (lowerValue === 'półautomatyczna') return 'Półautomatyczna';
  if (lowerValue === 'bezstopniowa cvt') return 'Bezstopniowa CVT';
  if (lowerValue === 'automatyczna dwusprzęgłowa') return 'Automatyczna dwusprzęgłowa';
  if (lowerValue === 'sekwencyjna') return 'Sekwencyjna';
  if (lowerValue === 'inne') return 'Inne';
  return value;
};

/**
 * Helper function to capitalize model names (all uppercase)
 */
const capitalizeModel = function(value) {
  if (!value) return value;
  return value.toUpperCase();
};

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
    trim: true,
    set: capitalizeModel
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
    enum: ['Benzyna', 'Diesel', 'Elektryczny', 'Hybryda', 'Benzyna+LPG', 'Benzyna+CNG', 
           'Etanol', 'Inne'],
    default: 'Benzyna',
    set: capitalizeFuelType
  },
  transmission: {
    type: String,
    required: true,
    enum: ['Manualna', 'Automatyczna', 'Półautomatyczna', 'Automatyczna CVT', 'Inne'],
    default: 'Manualna',
    set: capitalizeTransmission
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
  
  // Data pierwszej rejestracji
  firstRegistrationDate: {
    type: Date
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
  shortDescription: {
    type: String,
    trim: true,
    maxlength: 120
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
    enum: ['Sprzedaż', 'Faktura VAT', 'Inne', 'Cesja leasingu', 'Zamiana', 'Najem', 'Leasing'],
    default: 'Sprzedaż',
    set: capitalizePurchaseOptions
  },
  negotiable: {
    type: String,
    enum: ['Tak', 'Nie'],
    default: 'Nie',
    set: capitalizeBooleanValue
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
    enum: ['pending', 'active', 'opublikowane', 'w toku', 'archiwalne', 'archived', 'rejected', 'needs_changes', 'sold'],
    default: 'pending'
  },
  
  // Pola dla cesji leasingu
  leasingCompany: {
    type: String,
    trim: true
  },
  remainingInstallments: {
    type: Number,
    min: 0
  },
  installmentAmount: {
    type: Number,
    min: 0
  },
  cessionFee: {
    type: Number,
    min: 0
  },
  
  // Pola dla zamiany
  exchangeOffer: {
    type: String,
    trim: true
  },
  exchangeValue: {
    type: Number,
    min: 0
  },
  exchangePayment: {
    type: Number,
    min: 0
  },
  exchangeConditions: {
    type: String,
    trim: true
  }
});

export default basicInfoSchema;
