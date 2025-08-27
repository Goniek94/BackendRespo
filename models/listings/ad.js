import mongoose from 'mongoose';
import basicInfoSchema from '../schemas/basicInfoSchema.js';
import technicalDetailsSchema from '../schemas/technicalDetailsSchema.js';
import ownerInfoSchema from '../schemas/ownerInfoSchema.js';
import statisticsSchema from '../schemas/statisticsSchema.js';
import metadataSchema from '../schemas/metadataSchema.js';

/**
 * Główny schemat ogłoszenia, składający się z mniejszych schematów
 * Podzielenie na mniejsze schematy ułatwia zarządzanie i utrzymanie kodu
 */
const adSchema = new mongoose.Schema({
  // Podstawowe informacje o pojeździe
  ...basicInfoSchema.obj,
  
  // Dane techniczne pojazdu
  ...technicalDetailsSchema.obj,
  
  // Dane właściciela ogłoszenia
  ...ownerInfoSchema.obj,
  
  // Statystyki ogłoszenia
  ...statisticsSchema.obj,
  
  // Metadane ogłoszenia
  ...metadataSchema.obj
}, { timestamps: true });

// Dodanie metod z poszczególnych schematów
adSchema.methods = {
  ...ownerInfoSchema.methods
};

// Sprawdzamy, czy model już istnieje, żeby nie nadpisywać
const Ad = mongoose.models.Ad || mongoose.model('Ad', adSchema, 'ads');

export default Ad;
