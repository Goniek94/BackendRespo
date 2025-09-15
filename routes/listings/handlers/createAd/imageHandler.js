/**
 * Obsługa zdjęć dla tworzenia ogłoszeń
 */

import multer from 'multer';
import * as imageController from '../../../../controllers/media/imageController.js';

// Konfiguracja multer dla obsługi plików
const storage = multer.memoryStorage();
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB na plik
    files: 15 // maksymalnie 15 plików na raz
  },
  fileFilter: (req, file, cb) => {
    // Sprawdź typ pliku
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    console.log(`Sprawdzanie pliku: ${file.originalname}, MIME type: ${file.mimetype}`);
    
    if (allowedTypes.includes(file.mimetype)) {
      console.log(`✅ Plik ${file.originalname} zaakceptowany (${file.mimetype})`);
      cb(null, true);
    } else {
      console.log(`❌ Plik ${file.originalname} odrzucony (${file.mimetype})`);
      cb(new Error(`Nieobsługiwany format pliku: ${file.mimetype}. Dozwolone formaty: JPEG, PNG, WEBP`), false);
    }
  }
});

/**
 * Obsługa uploadu zdjęć do Supabase lub użycie gotowych URL-i
 */
export const handleImageUpload = async (req) => {
  let uploadedImages = [];
  
  console.log('=== ROZPOCZĘCIE OBSŁUGI ZDJĘĆ ===');
  console.log('req.files:', req.files ? req.files.length : 0);
  console.log('req.body.images:', req.body.images ? req.body.images.length : 0);
  
  // Sprawdź czy są pliki do uploadu (req.files) czy gotowe URL-e (req.body.images)
  if (req.files && req.files.length > 0) {
    console.log(`Upload ${req.files.length} zdjęć do Supabase`);
    
    // Walidacja liczby zdjęć - minimum 5, maksimum 15
    if (req.files.length < 5) {
      throw new Error(`Ogłoszenie musi zawierać minimum 5 zdjęć. Obecnie masz ${req.files.length}.`);
    }
    
    if (req.files.length > 15) {
      throw new Error(`Ogłoszenie może zawierać maksymalnie 15 zdjęć. Obecnie masz ${req.files.length}.`);
    }

    // Upload zdjęć do Supabase przez imageController
    try {
      // Generujemy tymczasowe carId dla nowego ogłoszenia
      const tempCarId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Tymczasowo ustawiamy req.files dla imageController
      const mockReq = { 
        files: req.files, 
        user: req.user,
        body: { carId: tempCarId }
      };
      
      // Wywołaj funkcję uploadu z imageController
      const uploadResult = await new Promise((resolve, reject) => {
        const mockRes = {
          json: (data) => {
            if (data.success && data.data) {
              // imageController zwraca tablicę obiektów z url, thumbnailUrl, etc.
              uploadedImages = data.data.map(img => img.url);
              resolve(data);
            } else {
              reject(new Error(data.message || 'Upload failed'));
            }
          },
          status: (code) => ({
            json: (data) => {
              reject(new Error(data.message || `HTTP ${code}`));
            }
          })
        };
        
        imageController.uploadImages(mockReq, mockRes);
      });
      
      console.log('Zdjęcia przesłane do Supabase:', uploadedImages.length);
    } catch (uploadError) {
      console.error('Błąd podczas uploadu zdjęć:', uploadError);
      throw new Error(`Błąd podczas przesyłania zdjęć do Supabase: ${uploadError.message}`);
    }
  } else if (req.body.images && Array.isArray(req.body.images)) {
    console.log(`Używanie gotowych URL-i z Supabase: ${req.body.images.length} zdjęć`);
    
    // Walidacja liczby zdjęć - minimum 5, maksimum 15
    if (req.body.images.length < 5) {
      throw new Error(`Ogłoszenie musi zawierać minimum 5 zdjęć. Obecnie masz ${req.body.images.length}.`);
    }
    
    if (req.body.images.length > 15) {
      throw new Error(`Ogłoszenie może zawierać maksymalnie 15 zdjęć. Obecnie masz ${req.body.images.length}.`);
    }

    uploadedImages = req.body.images;
  } else {
    throw new Error('Zdjęcia są wymagane. Prześlij pliki lub podaj URL-e zdjęć.');
  }

  // Ustaw zdjęcia i główne zdjęcie
  const finalImages = uploadedImages;
  const mainImageUrl = req.body.mainImage || uploadedImages[0];
  
  console.log('Finalne zdjęcia:', finalImages.length);
  console.log('Główne zdjęcie ustawione na:', mainImageUrl);
  
  return {
    images: finalImages,
    mainImage: mainImageUrl
  };
};
