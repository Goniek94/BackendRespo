import mongoose from 'mongoose';

/**
 * Schemat danych technicznych pojazdu
 */
const technicalDetailsSchema = new mongoose.Schema({
  // Stan pojazdu - akceptujemy różne formaty z frontendu
  condition: {
    type: String,
    enum: ['Nowy', 'Używany', 'nowy', 'używany', 'uzywany']
  },
  accidentStatus: {
    type: String,
    enum: ['Bezwypadkowy', 'Powypadkowy', 'bezwypadkowy', 'powypadkowy', 'tak', 'nie', 'Tak', 'Nie']
  },
  damageStatus: {
    type: String,
    enum: ['Nieuszkodzony', 'Uszkodzony', 'nieuszkodzony', 'uszkodzony', 'tak', 'nie', 'Tak', 'Nie']
  },
  tuning: {
    type: String,
    enum: ['Tak', 'Nie', 'tak', 'nie']
  },
  imported: {
    type: String,
    enum: ['Tak', 'Nie', 'tak', 'nie']
  },
  registeredInPL: {
    type: String,
    enum: ['Tak', 'Nie', 'tak', 'nie']
  },
  firstOwner: {
    type: String,
    enum: ['Tak', 'Nie', 'tak', 'nie']
  },
  disabledAdapted: {
    type: String,
    enum: ['Tak', 'Nie', 'tak', 'nie']
  },
  
  // Dane techniczne
  bodyType: {
    type: String,
    enum: ['Hatchback', 'Sedan', 'Kombi', 'SUV', 'Coupe', 'Cabrio', 'Terenowe', 'Minivan', 'Dostawcze']
  },
  color: {
    type: String
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
    enum: ['Przedni', 'Tylny', '4x4']
  },
  doors: {
    type: Number,
    min: 2,
    max: 5
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
