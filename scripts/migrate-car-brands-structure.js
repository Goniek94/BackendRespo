/**
 * Skrypt migracji struktury danych CarBrands
 * Konwertuje starą strukturę (modele jako stringi) na nową strukturę (modele jako obiekty z generacjami)
 */

import mongoose from 'mongoose';
import CarBrand from '../models/listings/CarBrand.js';

// Konfiguracja połączenia z bazą danych
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/marketplace';

async function migrateCarBrandsStructure() {
  try {
    console.log('🔄 Rozpoczynam migrację struktury CarBrands...');
    
    // Połącz z bazą danych
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Połączono z bazą danych');
    
    // Pobierz wszystkie dokumenty CarBrands
    const carBrands = await CarBrand.find({});
    console.log(`📊 Znaleziono ${carBrands.length} dokumentów do migracji`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const brand of carBrands) {
      // Sprawdź czy dokument już ma nową strukturę
      if (brand.models && brand.models.length > 0 && typeof brand.models[0] === 'object' && brand.models[0].name) {
        console.log(`⏭️  Pomijam ${brand.brand} - już ma nową strukturę`);
        skippedCount++;
        continue;
      }
      
      // Konwertuj starą strukturę na nową
      const newModels = brand.models.map(modelName => ({
        name: modelName,
        generations: [] // Puste generacje - będą dodane później
      }));
      
      // Aktualizuj dokument
      await CarBrand.updateOne(
        { _id: brand._id },
        { $set: { models: newModels } }
      );
      
      console.log(`✅ Zmigrowano ${brand.brand} - ${newModels.length} modeli`);
      migratedCount++;
    }
    
    console.log('\n🎉 Migracja zakończona pomyślnie!');
    console.log(`📈 Statystyki:`);
    console.log(`   - Zmigrowane dokumenty: ${migratedCount}`);
    console.log(`   - Pominięte dokumenty: ${skippedCount}`);
    console.log(`   - Łącznie dokumentów: ${carBrands.length}`);
    
  } catch (error) {
    console.error('❌ Błąd podczas migracji:', error);
    process.exit(1);
  } finally {
    // Zamknij połączenie z bazą danych
    await mongoose.disconnect();
    console.log('🔌 Rozłączono z bazą danych');
  }
}

// Funkcja do dodawania przykładowych generacji dla popularnych modeli
async function addSampleGenerations() {
  try {
    console.log('🔄 Dodaję przykładowe generacje...');
    
    await mongoose.connect(MONGODB_URI);
    
    // Przykładowe generacje dla popularnych modeli
    const sampleGenerations = {
      'Audi': {
        'A3': ['8L (1996-2003)', '8P (2003-2012)', '8V (2012-2020)', '8Y (2020-)'],
        'A4': ['B5 (1994-2001)', 'B6 (2000-2005)', 'B7 (2004-2008)', 'B8 (2007-2015)', 'B9 (2015-)'],
        'A6': ['C4 (1994-1997)', 'C5 (1997-2004)', 'C6 (2004-2011)', 'C7 (2011-2018)', 'C8 (2018-)']
      },
      'BMW': {
        '3 Series': ['E30 (1982-1994)', 'E36 (1990-2000)', 'E46 (1998-2006)', 'E90/E91/E92/E93 (2005-2013)', 'F30/F31/F34/F35 (2012-2019)', 'G20/G21 (2019-)'],
        '5 Series': ['E28 (1981-1988)', 'E34 (1988-1996)', 'E39 (1995-2003)', 'E60/E61 (2003-2010)', 'F10/F11/F07 (2009-2017)', 'G30/G31 (2016-)']
      },
      'Mercedes-Benz': {
        'C-Class': ['W202 (1993-2000)', 'W203 (2000-2007)', 'W204 (2007-2014)', 'W205 (2014-2021)', 'W206 (2021-)'],
        'E-Class': ['W124 (1984-1997)', 'W210 (1995-2003)', 'W211 (2002-2009)', 'W212 (2009-2016)', 'W213 (2016-)']
      },
      'Volkswagen': {
        'Golf': ['Golf I (1974-1983)', 'Golf II (1983-1992)', 'Golf III (1991-1997)', 'Golf IV (1997-2006)', 'Golf V (2003-2009)', 'Golf VI (2008-2013)', 'Golf VII (2012-2020)', 'Golf VIII (2019-)'],
        'Passat': ['B2 (1980-1988)', 'B3 (1988-1993)', 'B4 (1993-1997)', 'B5 (1996-2005)', 'B6 (2005-2010)', 'B7 (2010-2014)', 'B8 (2014-)']
      },
      'Toyota': {
        'Corolla': ['E80 (1983-1987)', 'E90 (1987-1992)', 'E100 (1991-1997)', 'E110 (1995-2002)', 'E120 (2000-2007)', 'E140/E150 (2006-2013)', 'E160/E170 (2013-2019)', 'E210 (2019-)'],
        'Camry': ['V10 (1982-1986)', 'V20 (1986-1991)', 'V30 (1990-1996)', 'V40 (1994-2001)', 'V50 (2006-2011)', 'V60 (2017-)']
      }
    };
    
    let updatedCount = 0;
    
    for (const [brandName, models] of Object.entries(sampleGenerations)) {
      const brand = await CarBrand.findOne({ brand: brandName });
      
      if (!brand) {
        console.log(`⚠️  Nie znaleziono marki: ${brandName}`);
        continue;
      }
      
      let brandUpdated = false;
      
      for (const [modelName, generations] of Object.entries(models)) {
        const modelIndex = brand.models.findIndex(m => m.name === modelName);
        
        if (modelIndex !== -1) {
          brand.models[modelIndex].generations = generations;
          brandUpdated = true;
          console.log(`✅ Dodano ${generations.length} generacji dla ${brandName} ${modelName}`);
        }
      }
      
      if (brandUpdated) {
        await brand.save();
        updatedCount++;
      }
    }
    
    console.log(`\n🎉 Dodano przykładowe generacje dla ${updatedCount} marek`);
    
  } catch (error) {
    console.error('❌ Błąd podczas dodawania generacji:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Główna funkcja
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--with-generations')) {
    await migrateCarBrandsStructure();
    await addSampleGenerations();
  } else {
    await migrateCarBrandsStructure();
    console.log('\n💡 Aby dodać przykładowe generacje, uruchom: node migrate-car-brands-structure.js --with-generations');
  }
}

// Uruchom migrację
main().catch(console.error);
