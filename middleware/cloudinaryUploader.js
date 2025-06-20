import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';

// Upewniamy się, że folder temp istnieje z odpowiednimi uprawnieniami
if (!fs.existsSync('temp')) {
  console.log('Tworzenie folderu temp...');
  fs.mkdirSync('temp', { recursive: true, mode: 0o755 });
  console.log('Folder temp utworzony pomyślnie!');
}

// Konfiguracja tymczasowego przechowywania z Multer
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'temp/');
  },
  filename: function(req, file, cb) {
    // Tworzenie unikalnej nazwy pliku
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueName + path.extname(file.originalname));
  }
});

// Filtr do akceptowania tylko obrazów
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Dozwolone są tylko pliki obrazów!'), false);
  }
};

// Konfiguracja multer
export const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Limit 5MB
});

/**
 * Middleware do przesyłania plików do Cloudinary
 * @param {Object} req - Obiekt żądania
 * @param {Object} res - Obiekt odpowiedzi
 * @param {Function} next - Funkcja next
 */
export const uploadToCloudinaryMiddleware = async (req, res, next) => {
  try {
    // Jeśli nie ma plików, przejdź dalej
    if (!req.files || req.files.length === 0) {
      console.log('Brak plików do przesłania do Cloudinary');
      return next();
    }

    console.log(`Przesyłanie ${req.files.length} plików do Cloudinary...`);
    
    // Tablica na wyniki przesyłania
    const cloudinaryResults = [];
    const errors = [];
    
    // Przesyłanie plików do Cloudinary
    for (const file of req.files) {
      try {
        console.log(`Rozpoczęcie przesyłania pliku ${file.filename} do Cloudinary...`);
        
        // Sprawdzenie czy plik istnieje
        if (!fs.existsSync(file.path)) {
          console.error(`❌ Plik ${file.filename} nie istnieje pod ścieżką ${file.path}`);
          errors.push({
            filename: file.filename,
            error: 'Plik nie istnieje'
          });
          continue;
        }
        
        // Przesłanie pliku do Cloudinary
        const result = await uploadToCloudinary(file.path);
        
        console.log(`✅ Plik ${file.filename} przesłany do Cloudinary:`, {
          public_id: result.public_id,
          url: result.secure_url,
          format: result.format,
          size: `${result.width}x${result.height}`
        });
        
        // Dodanie wyniku do tablicy
        cloudinaryResults.push({
          originalPath: file.path,
          cloudinaryId: result.public_id,
          cloudinaryUrl: result.secure_url,
          format: result.format,
          width: result.width,
          height: result.height
        });
        
        // Usunięcie pliku tymczasowego
        fs.unlinkSync(file.path);
        console.log(`✅ Plik tymczasowy ${file.filename} usunięty z ${file.path}`);
      } catch (error) {
        console.error(`❌ Błąd podczas przesyłania pliku ${file.filename} do Cloudinary:`, error);
        errors.push({
          filename: file.filename,
          error: error.message || 'Nieznany błąd'
        });
        // Nie przerywamy pętli, próbujemy przesłać pozostałe pliki
      }
    }
    
    // Dodanie wyników do obiektu żądania
    req.cloudinaryResults = cloudinaryResults;
    
    // Jeśli są błędy, dodaj je do obiektu żądania
    if (errors.length > 0) {
      req.cloudinaryErrors = errors;
      console.warn(`⚠️ Wystąpiły błędy podczas przesyłania ${errors.length} z ${req.files.length} plików`);
    }
    
    console.log(`✅ Przesyłanie plików do Cloudinary zakończone. Przesłano ${cloudinaryResults.length} z ${req.files.length} plików`);
    
    next();
  } catch (error) {
    console.error('❌ Błąd podczas przesyłania plików do Cloudinary:', error);
    next(error);
  }
};

/**
 * Usuwa plik z Cloudinary
 * @param {string} publicId - Publiczne ID pliku
 * @returns {Promise<Object>} - Obiekt z informacjami o usuniętym pliku
 */
export const deleteCloudinaryImage = async (publicId) => {
  try {
    if (!publicId) {
      console.warn('⚠️ Brak publicId do usunięcia z Cloudinary');
      return null;
    }
    
    // Usunięcie pliku z Cloudinary
    const result = await deleteFromCloudinary(publicId);
    console.log(`✅ Plik ${publicId} usunięty z Cloudinary`);
    return result;
  } catch (error) {
    console.error(`❌ Błąd podczas usuwania pliku ${publicId} z Cloudinary:`, error);
    throw error;
  }
};

/**
 * Ekstrahuje publicId z URL Cloudinary
 * @param {string} url - URL Cloudinary
 * @returns {string|null} - Publiczne ID pliku lub null
 */
export const extractPublicIdFromUrl = (url) => {
  if (!url) return null;
  
  try {
    // URL Cloudinary ma format: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/public_id.ext
    const regex = /\/v\d+\/(.+)\.\w+$/;
    const match = url.match(regex);
    
    if (match && match[1]) {
      return match[1];
    }
    
    return null;
  } catch (error) {
    console.error('❌ Błąd podczas ekstrahowania publicId z URL:', error);
    return null;
  }
};

export default {
  upload,
  uploadToCloudinaryMiddleware,
  deleteCloudinaryImage,
  extractPublicIdFromUrl
};
