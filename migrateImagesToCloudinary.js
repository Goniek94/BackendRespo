import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import Ad from './models/ad.js';
import { uploadToCloudinary, deleteFromCloudinary } from './config/cloudinary.js';

// Załadowanie zmiennych środowiskowych
dotenv.config();

// Połączenie z bazą danych
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Połączono z bazą danych MongoDB'))
.catch(err => {
  console.error('❌ Błąd połączenia z bazą danych:', err);
  process.exit(1);
});

/**
 * Sprawdza, czy URL jest już URL-em Cloudinary
 * @param {string} url - URL do sprawdzenia
 * @returns {boolean} - Czy URL jest URL-em Cloudinary
 */
const isCloudinaryUrl = (url) => {
  if (!url) return false;
  return url.includes('res.cloudinary.com');
};

/**
 * Sprawdza, czy plik istnieje lokalnie
 * @param {string} filePath - Ścieżka do pliku
 * @returns {boolean} - Czy plik istnieje
 */
const fileExists = (filePath) => {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    console.error(`❌ Błąd podczas sprawdzania istnienia pliku ${filePath}:`, error);
    return false;
  }
};

/**
 * Migruje zdjęcia ogłoszenia do Cloudinary
 * @param {Object} ad - Ogłoszenie
 * @returns {Promise<Object>} - Zaktualizowane ogłoszenie
 */
const migrateAdImages = async (ad) => {
  console.log(`\n🔄 Migracja zdjęć dla ogłoszenia ${ad._id} (${ad.title || 'bez tytułu'})...`);
  
  // Jeśli ogłoszenie nie ma zdjęć, pomijamy je
  if (!ad.images || ad.images.length === 0) {
    console.log(`⚠️ Ogłoszenie ${ad._id} nie ma zdjęć.`);
    return ad;
  }
  
  console.log(`📊 Liczba zdjęć do migracji: ${ad.images.length}`);
  
  // Tablica na nowe URL-e zdjęć
  const newImages = [];
  const cloudinaryIds = [];
  
  // Migracja każdego zdjęcia
  for (let i = 0; i < ad.images.length; i++) {
    const imageUrl = ad.images[i];
    
    // Jeśli URL jest już URL-em Cloudinary, pomijamy je
    if (isCloudinaryUrl(imageUrl)) {
      console.log(`✅ Zdjęcie ${i + 1}/${ad.images.length} jest już w Cloudinary: ${imageUrl}`);
      newImages.push(imageUrl);
      continue;
    }
    
    // Przygotowanie ścieżki do pliku lokalnego
    let localPath = imageUrl;
    
    // Jeśli URL zaczyna się od "/uploads/", usuwamy początkowy slash
    if (localPath.startsWith('/uploads/')) {
      localPath = localPath.substring(1);
    }
    
    // Jeśli URL nie zaczyna się od "uploads/", dodajemy prefix
    if (!localPath.startsWith('uploads/')) {
      localPath = `uploads/${localPath}`;
    }
    
    // Sprawdzenie, czy plik istnieje lokalnie
    const fullPath = path.resolve(localPath);
    if (!fileExists(fullPath)) {
      console.error(`❌ Plik ${fullPath} nie istnieje. Pomijam.`);
      // Dodajemy oryginalny URL, aby nie utracić referencji
      newImages.push(imageUrl);
      continue;
    }
    
    try {
      // Przesłanie pliku do Cloudinary
      console.log(`🔄 Przesyłanie zdjęcia ${i + 1}/${ad.images.length} do Cloudinary: ${fullPath}`);
      const result = await uploadToCloudinary(fullPath, {
        folder: `marketplace/ads/${ad._id}`,
        public_id: `image_${i + 1}`
      });
      
      // Dodanie nowego URL-a do tablicy
      newImages.push(result.secure_url);
      cloudinaryIds.push(result.public_id);
      
      console.log(`✅ Zdjęcie ${i + 1}/${ad.images.length} przesłane do Cloudinary: ${result.secure_url}`);
    } catch (error) {
      console.error(`❌ Błąd podczas przesyłania zdjęcia ${i + 1}/${ad.images.length} do Cloudinary:`, error);
      // Dodajemy oryginalny URL, aby nie utracić referencji
      newImages.push(imageUrl);
    }
  }
  
  // Aktualizacja ogłoszenia
  ad.images = newImages;
  ad.cloudinaryIds = cloudinaryIds;
  
  // Zapisanie zmian w bazie danych
  try {
    await ad.save();
    console.log(`✅ Ogłoszenie ${ad._id} zaktualizowane z nowymi URL-ami zdjęć.`);
  } catch (error) {
    console.error(`❌ Błąd podczas zapisywania ogłoszenia ${ad._id}:`, error);
  }
  
  return ad;
};

/**
 * Główna funkcja migracji
 */
const migrateAllImages = async () => {
  try {
    console.log('🚀 Rozpoczęcie migracji zdjęć do Cloudinary...');
    
    // Pobranie wszystkich ogłoszeń
    const ads = await Ad.find({});
    console.log(`📊 Znaleziono ${ads.length} ogłoszeń do przetworzenia.`);
    
    // Liczniki
    let processed = 0;
    let success = 0;
    let skipped = 0;
    let errors = 0;
    
    // Migracja zdjęć dla każdego ogłoszenia
    for (const ad of ads) {
      try {
        // Jeśli ogłoszenie nie ma zdjęć, pomijamy je
        if (!ad.images || ad.images.length === 0) {
          console.log(`⚠️ Ogłoszenie ${ad._id} nie ma zdjęć. Pomijam.`);
          skipped++;
          continue;
        }
        
        // Sprawdzenie, czy wszystkie zdjęcia są już w Cloudinary
        const allInCloudinary = ad.images.every(isCloudinaryUrl);
        if (allInCloudinary) {
          console.log(`✅ Wszystkie zdjęcia ogłoszenia ${ad._id} są już w Cloudinary. Pomijam.`);
          skipped++;
          continue;
        }
        
        // Migracja zdjęć
        await migrateAdImages(ad);
        success++;
      } catch (error) {
        console.error(`❌ Błąd podczas migracji zdjęć dla ogłoszenia ${ad._id}:`, error);
        errors++;
      } finally {
        processed++;
        
        // Wyświetlenie postępu
        if (processed % 10 === 0 || processed === ads.length) {
          console.log(`📊 Postęp: ${processed}/${ads.length} (${Math.round(processed / ads.length * 100)}%)`);
        }
      }
    }
    
    // Podsumowanie
    console.log('\n📊 Podsumowanie migracji:');
    console.log(`- Przetworzono: ${processed}/${ads.length} ogłoszeń`);
    console.log(`- Sukces: ${success} ogłoszeń`);
    console.log(`- Pominięto: ${skipped} ogłoszeń`);
    console.log(`- Błędy: ${errors} ogłoszeń`);
    
    console.log('\n✅ Migracja zakończona!');
  } catch (error) {
    console.error('❌ Błąd podczas migracji zdjęć:', error);
  } finally {
    // Zamknięcie połączenia z bazą danych
    mongoose.connection.close();
    console.log('👋 Połączenie z bazą danych zamknięte.');
  }
};

// Uruchomienie migracji
migrateAllImages();
