/**
 * Handler do aktualizacji ogłoszeń
 * Odpowiada za: edycję ogłoszeń z wszystkimi poprawkami mapowania
 */

import Ad from '../../../models/listings/ad.js';
import auth from '../../../middleware/auth.js';
import validate from '../../../middleware/validation/validate.js';
import adValidationSchema from '../../../validationSchemas/adValidation.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import errorHandler from '../../../middleware/errors/errorHandler.js';

/**
 * Funkcja do pełnej kapitalizacji (wszystkie litery duże)
 */
const toUpperCase = (text) => {
  if (!text || typeof text !== 'string') return text;
  return text.toUpperCase();
};

/**
 * Mapowanie opcji zakupu z frontendu na wartości w schemacie
 */
const purchaseOptionsMapping = {
  'sprzedaz': 'Sprzedaż',
  'faktura': 'Faktura VAT', 
  'inne': 'Inne',
  'najem': 'Inne',
  'leasing': 'Inne',
  'Cesja': 'Cesja leasingu',
  'cesja': 'Cesja leasingu',
  'Cesja leasingu': 'Cesja leasingu',
  'Zamiana': 'Zamiana',
  'zamiana': 'Zamiana'
};

/**
 * Mapowanie sellerType z frontendu na wartości w schemacie
 */
const sellerTypeMapping = {
  'Prywatny': 'Prywatny',
  'prywatny': 'Prywatny',
  'private': 'Prywatny',
  'Firma': 'Firma',
  'firma': 'Firma',
  'company': 'Firma'
};

// Konfiguracja multera do obsługi plików
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/ads';
    // Sprawdź, czy katalog istnieje, jeśli nie - utwórz go
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generuj unikalną nazwę pliku
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10 // maksymalnie 10 plików
  },
  fileFilter: (req, file, cb) => {
    // Sprawdź czy plik to obraz
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Tylko pliki obrazów są dozwolone!'), false);
    }
  }
});

/**
 * PUT /ads/:id - UPROSZCZONA aktualizacja ogłoszenia
 */
export const updateAd = [
  auth,
  upload.array('images', 15), // Zwiększony limit do 15 zdjęć
  async (req, res, next) => {
    try {
      console.log('=== ROZPOCZĘCIE AKTUALIZACJI OGŁOSZENIA ===');
      console.log('ID ogłoszenia:', req.params.id);
      console.log('Użytkownik:', req.user.userId);
      console.log('Dane z frontendu:', req.body);
      console.log('Pliki:', req.files ? req.files.length : 0);

      const ad = await Ad.findById(req.params.id);

      if (!ad) {
        return res.status(404).json({ message: 'Ogłoszenie nie znalezione' });
      }

      // Sprawdź uprawnienia
      if (ad.owner.toString() !== req.user.userId.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Brak uprawnień do edycji tego ogłoszenia' });
      }

      // UPROSZCZONE pola do edycji - tylko te które rzeczywiście potrzebujemy
      const editableFields = ['description', 'price', 'city', 'voivodeship', 'color', 'mileage', 'condition', 'sellerType'];
      
      console.log('=== AKTUALIZACJA PÓL ===');
      editableFields.forEach(field => {
        if (req.body[field] !== undefined) {
          const oldValue = ad[field];
          
          // Specjalne mapowanie dla sellerType
          if (field === 'sellerType') {
            const mappedValue = sellerTypeMapping[req.body[field]] || req.body[field];
            ad[field] = mappedValue;
            console.log(`${field}: "${oldValue}" -> "${mappedValue}" (z mapowania: "${req.body[field]}")`);
          } else {
            ad[field] = req.body[field];
            console.log(`${field}: "${oldValue}" -> "${req.body[field]}"`);
          }
        }
      });

      // Obsługa zdjęć - UPROSZCZONA
      if (req.files && req.files.length > 0) {
        console.log(`Dodawanie ${req.files.length} nowych zdjęć`);
        const newImageUrls = req.files.map(file => `/${file.path.replace(/\\/g, '/')}`);
        ad.images = [...(ad.images || []), ...newImageUrls];
      }

      // Walidacja zdjęć - minimum 5, maksimum 15
      if (ad.images && ad.images.length < 5) {
        return res.status(400).json({ 
          message: `Ogłoszenie musi zawierać minimum 5 zdjęć. Obecnie masz ${ad.images.length}.` 
        });
      }
      
      if (ad.images && ad.images.length > 15) {
        return res.status(400).json({ 
          message: `Ogłoszenie może zawierać maksymalnie 15 zdjęć. Obecnie masz ${ad.images.length}.` 
        });
      }

      // Ustaw główne zdjęcie
      if (req.body.mainImageIndex !== undefined && ad.images && ad.images.length > 0) {
        const index = parseInt(req.body.mainImageIndex);
        if (index >= 0 && index < ad.images.length) {
          ad.mainImage = ad.images[index];
        }
      } else if (!ad.mainImage && ad.images && ad.images.length > 0) {
        ad.mainImage = ad.images[0];
      }

      // Automatyczne generowanie shortDescription
      if (req.body.description) {
        ad.shortDescription = req.body.description.substring(0, 120);
      }

      console.log('=== ZAPIS DO BAZY DANYCH ===');
      console.log('Zmodyfikowane pola:', ad.modifiedPaths());
      
      // KLUCZOWE: Zapis bez dodatkowej walidacji
      const savedAd = await ad.save({ validateBeforeSave: false });
      
      console.log('✅ SUKCES - Ogłoszenie zapisane w bazie danych');
      console.log('ID zapisanego ogłoszenia:', savedAd._id);
      
      res.status(200).json({ 
        message: 'Ogłoszenie zaktualizowane pomyślnie', 
        ad: savedAd,
        success: true
      });

    } catch (err) {
      console.error('❌ BŁĄD podczas aktualizacji ogłoszenia:', err);
      console.error('Stack trace:', err.stack);
      
      res.status(500).json({ 
        message: 'Błąd podczas aktualizacji ogłoszenia', 
        error: err.message,
        success: false
      });
    }
  },
  errorHandler
];

export default { updateAd };
