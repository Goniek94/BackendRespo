import mongoose from 'mongoose';

/**
 * Model dla kolekcji CarBrands - marki i modele samochodów
 * Odpowiada kolekcji CarBrands w MongoDB
 */
const carBrandSchema = new mongoose.Schema({
  brand: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  models: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    generations: [{
      type: String,
      trim: true
    }]
  }]
}, {
  timestamps: true,
  collection: 'carbrands' // Nazwa kolekcji w MongoDB (z małą literą)
});

// Indeksy dla wydajniejszego wyszukiwania
carBrandSchema.index({ brand: 1 });
carBrandSchema.index({ 'models.name': 1 });

// Metody statyczne
carBrandSchema.statics.getAllBrands = function() {
  return this.find({}, 'brand').sort({ brand: 1 });
};

carBrandSchema.statics.getModelsByBrand = function(brandName) {
  return this.findOne({ brand: brandName }, 'models');
};

carBrandSchema.statics.getGenerationsByModel = function(brandName, modelName) {
  return this.findOne(
    { 
      brand: brandName,
      'models.name': modelName 
    },
    { 
      'models.$': 1 
    }
  );
};

carBrandSchema.statics.searchBrands = function(query) {
  return this.find({
    brand: { $regex: query, $options: 'i' }
  }, 'brand').sort({ brand: 1 });
};

carBrandSchema.statics.searchModels = function(brandName, query) {
  return this.findOne({
    brand: brandName,
    'models.name': { $regex: query, $options: 'i' }
  }, 'models');
};

// Sprawdzamy, czy model już istnieje, żeby nie nadpisywać
const CarBrand = mongoose.models.CarBrand || mongoose.model('CarBrand', carBrandSchema);

export default CarBrand;
