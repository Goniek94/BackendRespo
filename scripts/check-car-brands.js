/**
 * Skrypt do sprawdzenia marek samochodów w bazie danych
 * Sprawdza, czy wszystkie marki są poprawnie pobierane z kolekcji carbrands
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Załaduj zmienne środowiskowe
dotenv.config();

// Schemat dla kolekcji carbrands
const CarBrandSchema = new mongoose.Schema({
  brand: String,
  models: [String]
}, { collection: 'carbrands' });

// Model dla kolekcji carbrands
const CarBrand = mongoose.model('CarBrand', CarBrandSchema);

// Funkcja do połączenia z bazą danych
async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Połączono z bazą danych MongoDB');
  } catch (error) {
    console.error('❌ Błąd podczas łączenia z bazą danych:', error);
    process.exit(1);
  }
}

// Funkcja do sprawdzenia marek samochodów
async function checkCarBrands() {
  try {
    // Pobierz wszystkie marki z kolekcji carbrands
    const brands = await CarBrand.find({}).sort({ brand: 1 });
    
    console.log(`\n📋 Znaleziono ${brands.length} marek samochodów w kolekcji carbrands:`);
    
    // Wyświetl listę marek i liczbę modeli
    brands.forEach((brand, index) => {
      console.log(`${index + 1}. ${brand.brand} (${brand.models.length} modeli)`);
    });
    
    // Zapisz dane do pliku JSON
    const outputData = {};
    brands.forEach(brand => {
      outputData[brand.brand] = brand.models;
    });
    
    const outputPath = path.join(process.cwd(), 'car-brands-data.json');
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    console.log(`\n✅ Zapisano dane do pliku: ${outputPath}`);
    
    // Sprawdź, czy są jakieś duplikaty marek
    const brandNames = brands.map(b => b.brand);
    const uniqueBrandNames = [...new Set(brandNames)];
    
    if (brandNames.length !== uniqueBrandNames.length) {
      console.warn('\n⚠️ Uwaga: Znaleziono duplikaty marek w bazie danych!');
      
      // Znajdź duplikaty
      const duplicates = brandNames.filter((item, index) => brandNames.indexOf(item) !== index);
      console.log('Duplikaty:', [...new Set(duplicates)]);
    } else {
      console.log('\n✅ Brak duplikatów marek w bazie danych');
    }
    
    // Sprawdź, czy są marki bez modeli
    const brandsWithoutModels = brands.filter(b => !b.models || b.models.length === 0);
    
    if (brandsWithoutModels.length > 0) {
      console.warn('\n⚠️ Uwaga: Znaleziono marki bez modeli:');
      brandsWithoutModels.forEach(b => console.log(`- ${b.brand}`));
    } else {
      console.log('\n✅ Wszystkie marki mają przypisane modele');
    }
    
  } catch (error) {
    console.error('\n❌ Błąd podczas sprawdzania marek samochodów:', error);
  } finally {
    // Zamknij połączenie z bazą danych
    mongoose.connection.close();
    console.log('\n👋 Zamknięto połączenie z bazą danych');
  }
}

// Uruchom skrypt
connectToDatabase()
  .then(checkCarBrands)
  .catch(error => {
    console.error('❌ Błąd podczas wykonywania skryptu:', error);
    mongoose.connection.close();
  });
