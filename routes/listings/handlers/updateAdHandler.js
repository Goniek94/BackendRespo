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
 * PUT /ads/:id - Aktualizacja ogłoszenia z poprawkami mapowania
 */
export const updateAd = [
  auth,
  validate(adValidationSchema),
  upload.array('images', 10),
  async (req, res, next) => {
    try {
      const ad = await Ad.findById(req.params.id);

      if (!ad) {
        return res.status(404).json({ message: 'Ogłoszenie nie znalezione' });
      }

      // Sprawdź czy użytkownik jest właścicielem lub adminem
      if (ad.owner.toString() !== req.user.userId.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Brak uprawnień do edycji tego ogłoszenia' });
      }

      // Pola, które można aktualizować - rozszerzona lista z wszystkimi brakującymi polami
      const updatableFields = [
        // Podstawowe informacje
        'description', 'price', 'city', 'voivodeship', 'color',
        'headline', 'mainImage', 'images', 'mileage', 'negotiable',
        'firstRegistrationDate', // DODANE - brakujące pole
        
        // Dane techniczne
        'condition', 'accidentStatus', 'damageStatus', 'tuning', 
        'imported', 'registeredInPL', 'firstOwner', 'disabledAdapted',
        'bodyType', 'paintFinish', 'seats', 'lastOfficialMileage', 'power', 'engineSize', 
        'drive', 'doors', 'weight', 'rentalPrice', 'countryOfOrigin',
        
        // Identyfikatory (tylko dla adminów)
        ...(req.user.role === 'admin' ? ['vin', 'registrationNumber'] : []),
        
        // Opcje zakupu z poprawkami
        'purchaseOptions', 'sellerType', // DODANE - sellerType
        
        // DODANE - pola Cesja
        'leasingCompany', 'remainingInstallments', 'installmentAmount', 'cessionFee',
        
        // DODANE - pola Zamiana
        'exchangeOffer', 'exchangeValue', 'exchangePayment', 'exchangeConditions'
      ];

      console.log('=== AKTUALIZACJA OGŁOSZENIA ===');
      console.log('ID ogłoszenia:', req.params.id);
      console.log('Użytkownik:', req.user.userId);
      console.log('Dane otrzymane z frontendu:', JSON.stringify(req.body, null, 2));
      console.log('Dozwolone pola do aktualizacji:', updatableFields);

      // Loguj pola przed aktualizacją
      console.log('=== POLA PRZED AKTUALIZACJĄ ===');
      updatableFields.forEach(field => {
        if (req.body.hasOwnProperty(field)) {
          console.log(`${field}: "${ad[field]}" -> "${req.body[field]}" (obecne w request)`);
        }
      });

      // === MAPOWANIE PURCHASEOPTIONS ===
      if (req.body.hasOwnProperty('purchaseOptions') && req.body.purchaseOptions !== undefined && req.body.purchaseOptions !== null) {
        const originalPurchaseOptions = req.body.purchaseOptions;
        const mappedPurchaseOptions = purchaseOptionsMapping[originalPurchaseOptions] || originalPurchaseOptions;
        
        console.log(`=== MAPOWANIE PURCHASEOPTIONS ===`);
        console.log(`Oryginalna wartość: "${originalPurchaseOptions}"`);
        console.log(`Zmapowana wartość: "${mappedPurchaseOptions}"`);
        console.log(`Dostępne mapowania:`, purchaseOptionsMapping);
        
        ad.purchaseOptions = mappedPurchaseOptions;
      }

      // === MAPOWANIE SELLERTYPE ===
      if (req.body.hasOwnProperty('sellerType') && req.body.sellerType !== undefined && req.body.sellerType !== null) {
        const originalSellerType = req.body.sellerType;
        const mappedSellerType = sellerTypeMapping[originalSellerType] || originalSellerType;
        
        console.log(`=== MAPOWANIE SELLERTYPE ===`);
        console.log(`Oryginalna wartość: "${originalSellerType}"`);
        console.log(`Zmapowana wartość: "${mappedSellerType}"`);
        console.log(`Dostępne mapowania:`, sellerTypeMapping);
        
        ad.sellerType = mappedSellerType;
      }

      // Aktualizuj tylko dozwolone pola - używaj hasOwnProperty i sprawdzaj undefined
      updatableFields.forEach(field => {
        if (req.body.hasOwnProperty(field) && req.body[field] !== undefined && req.body[field] !== null) {
          const oldValue = ad[field];
          let newValue = req.body[field];
          
          // NAPRAWIONE: Kapitalizacja marki i modelu - ZAWSZE Z DUŻYCH LITER
          if (field === 'brand' || field === 'model') {
            newValue = toUpperCase(newValue);
            console.log(`Kapitalizacja ${field}: "${req.body[field]}" -> "${newValue}"`);
          }
          
          // Pomiń purchaseOptions i sellerType - już obsłużone powyżej
          if (field === 'purchaseOptions' || field === 'sellerType') {
            console.log(`Pomijam ${field} - już obsłużone przez mapowanie`);
            return;
          }
          
          console.log(`Aktualizuję pole ${field}: "${oldValue}" -> "${newValue}"`);
          ad[field] = newValue;
        } else if (req.body.hasOwnProperty(field)) {
          console.log(`Pomijam pole ${field} - wartość undefined/null:`, req.body[field]);
        }
      });
      
      // NAPRAWIONE: Dodaj brand i model do updatableFields jeśli nie są tam już
      if (req.body.hasOwnProperty('brand') && req.body.brand !== undefined && req.body.brand !== null) {
        const oldBrand = ad.brand;
        const newBrand = toUpperCase(req.body.brand);
        console.log(`Kapitalizacja marki: "${req.body.brand}" -> "${newBrand}"`);
        ad.brand = newBrand;
      }
      
      if (req.body.hasOwnProperty('model') && req.body.model !== undefined && req.body.model !== null) {
        const oldModel = ad.model;
        const newModel = toUpperCase(req.body.model);
        console.log(`Kapitalizacja modelu: "${req.body.model}" -> "${newModel}"`);
        ad.model = newModel;
      }

      // === OBSŁUGA OPERACJI NA ZDJĘCIACH ===
      console.log('=== OPERACJE NA ZDJĘCIACH ===');
      
      // 1. Obsługa nowych zdjęć z plików (upload)
      if (req.files && req.files.length > 0) {
        console.log(`Dodawanie ${req.files.length} nowych zdjęć z uploadu`);
        const newImageUrls = req.files.map(file => file.path || file.filename);
        ad.images = [...(ad.images || []), ...newImageUrls];
        console.log('Zaktualizowana tablica zdjęć po dodaniu nowych:', ad.images);
      }
      
      // 2. Obsługa nadpisania całej tablicy zdjęć (np. nowa tablica URL-i)
      if (req.body.hasOwnProperty('images') && Array.isArray(req.body.images)) {
        console.log('Nadpisywanie całej tablicy zdjęć:', req.body.images);
        ad.images = req.body.images.filter(url => url && url.trim() !== ''); // Filtruj puste URL-e
        console.log('Nowa tablica zdjęć po filtrowaniu:', ad.images);
      }
      
      // 3. Obsługa usuwania zdjęć (jeśli przesłano listę do usunięcia)
      if (req.body.hasOwnProperty('removeImages') && Array.isArray(req.body.removeImages)) {
        console.log('Usuwanie zdjęć:', req.body.removeImages);
        ad.images = ad.images.filter(imageUrl => !req.body.removeImages.includes(imageUrl));
        console.log('Tablica zdjęć po usunięciu:', ad.images);
      }
      
      // 4. Walidacja - ogłoszenie musi mieć przynajmniej jedno zdjęcie
      if (!ad.images || ad.images.length === 0) {
        return res.status(400).json({ 
          message: 'Ogłoszenie musi zawierać przynajmniej jedno zdjęcie.' 
        });
      }
      
      // 5. Obsługa głównego zdjęcia
      if (req.body.hasOwnProperty('mainImageIndex') && ad.images && ad.images.length > 0) {
        const index = parseInt(req.body.mainImageIndex);
        if (index >= 0 && index < ad.images.length) {
          ad.mainImage = ad.images[index];
          console.log(`Ustawiono główne zdjęcie na indeks ${index}: ${ad.mainImage}`);
        } else {
          console.log(`Nieprawidłowy indeks głównego zdjęcia: ${index}, używam pierwszego zdjęcia`);
          ad.mainImage = ad.images[0];
        }
      } else if (req.body.hasOwnProperty('mainImage') && ad.images.includes(req.body.mainImage)) {
        ad.mainImage = req.body.mainImage;
        console.log(`Ustawiono główne zdjęcie bezpośrednio: ${ad.mainImage}`);
      } else if (!ad.mainImage || !ad.images.includes(ad.mainImage)) {
        // Jeśli główne zdjęcie nie istnieje lub nie ma go w tablicy, ustaw pierwsze
        ad.mainImage = ad.images[0];
        console.log(`Automatycznie ustawiono pierwsze zdjęcie jako główne: ${ad.mainImage}`);
      }

      // Automatyczne generowanie shortDescription z headline lub description
      if (req.body.hasOwnProperty('description') || req.body.hasOwnProperty('headline')) {
        const sourceText = req.body.headline || ad.headline || req.body.description || ad.description;
        ad.shortDescription = sourceText ? sourceText.substring(0, 120) : '';
        console.log('Wygenerowano shortDescription:', ad.shortDescription);
      }

      // === ZAPIS ZMIAN Z OBSŁUGĄ BŁĘDÓW ===
      console.log('=== PRZED ZAPISEM ===');
      console.log('Zmodyfikowane pola:', ad.modifiedPaths());
      console.log('Główne zdjęcie:', ad.mainImage);
      console.log('Liczba zdjęć:', ad.images ? ad.images.length : 0);

      try {
        const savedAd = await ad.save();
        console.log('=== PO ZAPISIE ===');
        console.log('Ogłoszenie zaktualizowane pomyślnie, ID:', savedAd._id);
        
        res.status(200).json({ 
          message: 'Ogłoszenie zaktualizowane pomyślnie', 
          ad: savedAd,
          modifiedFields: ad.modifiedPaths()
        });
      } catch (saveError) {
        console.error('=== BŁĄD ZAPISU ===');
        console.error('Błąd podczas zapisu w bazie danych:', saveError);
        
        if (saveError.name === 'ValidationError') {
          console.error('Błędy walidacji Mongoose:', saveError.errors);
          const validationErrors = Object.keys(saveError.errors).map(key => ({
            field: key,
            message: saveError.errors[key].message,
            value: saveError.errors[key].value
          }));
          
          return res.status(400).json({ 
            message: 'Błąd walidacji danych', 
            errors: validationErrors,
            details: saveError.message
          });
        } else if (saveError.name === 'CastError') {
          console.error('Błąd rzutowania typu:', saveError);
          return res.status(400).json({ 
            message: 'Nieprawidłowy format danych', 
            field: saveError.path,
            value: saveError.value,
            details: saveError.message
          });
        } else {
          console.error('Nieznany błąd zapisu:', saveError);
          return res.status(500).json({ 
            message: 'Błąd serwera podczas zapisu', 
            details: process.env.NODE_ENV === 'development' ? saveError.message : 'Wewnętrzny błąd serwera'
          });
        }
      }
    } catch (err) {
      console.error('Błąd podczas aktualizacji ogłoszenia:', err);
      next(err);
    }
  },
  errorHandler
];

export default { updateAd };
