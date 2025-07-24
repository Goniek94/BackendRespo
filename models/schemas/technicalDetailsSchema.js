import mongoose from 'mongoose';

/**
 * Helper function to capitalize boolean-like values
 */
const capitalizeBooleanValue = function(value) {
  if (!value) return value;
  const lowerValue = value.toLowerCase();
  if (lowerValue === 'tak') return 'Tak';
  if (lowerValue === 'nie') return 'Nie';
  if (lowerValue === 'prywatny') return 'Prywatny';
  if (lowerValue === 'sprzedaż') return 'Sprzedaż';
  return value;
};

/**
 * Helper function to capitalize accident status values
 */
const capitalizeAccidentStatus = function(value) {
  if (!value) return value;
  const lowerValue = value.toLowerCase();
  if (lowerValue === 'bezwypadkowy') return 'Bezwypadkowy';
  if (lowerValue === 'powypadkowy') return 'Powypadkowy';
  if (lowerValue === 'tak') return 'Tak';
  if (lowerValue === 'nie') return 'Nie';
  return value;
};

/**
 * Helper function to capitalize damage status values
 */
const capitalizeDamageStatus = function(value) {
  if (!value) return value;
  const lowerValue = value.toLowerCase();
  if (lowerValue === 'nieuszkodzony') return 'Nieuszkodzony';
  if (lowerValue === 'uszkodzony') return 'Uszkodzony';
  if (lowerValue === 'tak') return 'Tak';
  if (lowerValue === 'nie') return 'Nie';
  return value;
};

/**
 * Helper function to capitalize condition values
 */
const capitalizeCondition = function(value) {
  if (!value) return value;
  const lowerValue = value.toLowerCase();
  if (lowerValue === 'nowy') return 'Nowy';
  if (lowerValue === 'używany' || lowerValue === 'uzywany') return 'Używany';
  return value;
};

/**
 * Schemat danych technicznych pojazdu
 */
const technicalDetailsSchema = new mongoose.Schema({
  // Stan pojazdu - akceptujemy różne formaty z frontendu
  condition: {
    type: String,
    enum: ['Nowy', 'Używany', 'nowy', 'używany', 'uzywany'],
    set: capitalizeCondition
  },
  accidentStatus: {
    type: String,
    enum: ['Bezwypadkowy', 'Powypadkowy', 'bezwypadkowy', 'powypadkowy', 'tak', 'nie', 'Tak', 'Nie'],
    set: capitalizeAccidentStatus
  },
  damageStatus: {
    type: String,
    enum: ['Nieuszkodzony', 'Uszkodzony', 'nieuszkodzony', 'uszkodzony', 'tak', 'nie', 'Tak', 'Nie'],
    set: capitalizeDamageStatus
  },
  tuning: {
    type: String,
    enum: ['Tak', 'Nie', 'tak', 'nie'],
    set: capitalizeBooleanValue
  },
  imported: {
    type: String,
    enum: ['Tak', 'Nie', 'tak', 'nie'],
    set: capitalizeBooleanValue
  },
  registeredInPL: {
    type: String,
    enum: ['Tak', 'Nie', 'tak', 'nie'],
    set: capitalizeBooleanValue
  },
  firstOwner: {
    type: String,
    enum: ['Tak', 'Nie', 'tak', 'nie'],
    set: capitalizeBooleanValue
  },
  disabledAdapted: {
    type: String,
    enum: ['Tak', 'Nie', 'tak', 'nie'],
    set: capitalizeBooleanValue
  },
  
  // Dane techniczne
  bodyType: {
    type: String,
    enum: ['Hatchback', 'Sedan', 'Kombi', 'SUV', 'Coupe', 'Cabrio', 'Terenowe', 'Minivan', 'Dostawcze',
           'Pickup', 'Van', 'Limuzyna', 'Roadster', 'Targa']
  },
  color: {
    type: String
  },
  paintFinish: {
    type: String,
    enum: ['Metalik', 'Perła', 'Mat', 'Połysk', 'Inne']
  },
  seats: {
    type: String,
    enum: ['2', '3', '4', '5', '6', '7', '8', '9+']
  },
  lastOfficialMileage: {
    type: Number,
    min: 0
  },
  power: {
    type: Number,
    min: 0
  },
  engineSize: {
    type: Number,
    min: 0
  },
  drive: {
    type: String,
    enum: ['Przedni', 'Tylny', '4x4', 'Na cztery koła stały', 'Na cztery koła dołączany', 
           'AWD', '4WD', 'RWD', 'FWD', 'Inne']
  },
  doors: {
    type: String,
    enum: ['1', '2', '3', '4', '5', '6']
  },
  weight: {
    type: Number,
    min: 0
  },
  
  // Lokalizacja
  voivodeship: {
    type: String
  },
  city: {
    type: String
  },
  
  // Najem
  rentalPrice: {
    type: Number,
    min: 0
  },
  
  // Kraj pochodzenia
  countryOfOrigin: {
    type: String
  }
});

export default technicalDetailsSchema;
