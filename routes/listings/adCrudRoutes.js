/**
 * CRUD Routes dla Ogłoszeń
 * Odpowiada za: tworzenie, pobieranie, edycję i usuwanie ogłoszeń
 */

import express from 'express';
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import auth from '../../middleware/auth.js';
import Ad from '../../models/ad.js';
import User from '../../models/user.js';
import validate from '../../middleware/validate.js';
import adValidationSchema from '../../validationSchemas/adValidation.js';
import rateLimit from 'express-rate-limit';
import errorHandler from '../../middleware/errorHandler.js';
import { notificationService } from '../../controllers/notifications/notificationController.js';

const router = Router();

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

// Limiter dla trasy dodawania ogłoszenia - 1 ogłoszenie na 5 minut per użytkownik
const createAdLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minut
  max: 1, // 1 ogłoszenie na 5 minut
  message: 'Możesz dodać tylko 1 ogłoszenie na 5 minut. Spróbuj ponownie później.',
  // Używamy ID użytkownika jako klucza, jeśli użytkownik jest zalogowany
  keyGenerator: function (req) {
    // Jeśli użytkownik jest zalogowany, używamy jego ID jako klucza
    if (req.user && req.user.userId) {
      return req.user.userId;
    }
    // W przeciwnym razie używamy adresu IP
    return req.ip;
  },
  // Nie stosuj limitu dla administratorów
  skip: function (req) {
    return req.user && req.user.role === 'admin';
  }
});

// POST /ads/add - Tworzenie nowego ogłoszenia z URL-ami zdjęć z Supabase
router.post('/add', auth, createAdLimiter, validate(adValidationSchema), async (req, res, next) => {
  try {
    console.log('Rozpoczęto dodawanie ogłoszenia z Supabase');
    console.log('Oryginalne dane z frontendu:', req.body);
    
    // Mapowanie wartości z frontendu na backend
    const mapFormDataToBackend = (data) => {
      const fuelTypeMapping = {
        'Benzyna': 'benzyna',
        'Diesel': 'diesel', 
        'Elektryczny': 'elektryczny',
        'Hybryda': 'hybryda',
        'Hybrydowy': 'hybrydowy',
        'Benzyna+LPG': 'benzyna+LPG',
        'Benzyna+CNG': 'benzyna+LPG',
        'Etanol': 'inne'
      };

      const transmissionMapping = {
        'Manualna': 'manualna',
        'Automatyczna': 'automatyczna',
        'Półautomatyczna': 'półautomatyczna',
        'Bezstopniowa CVT': 'automatyczna'
      };

      const purchaseOptionsMapping = {
        'sprzedaz': 'Sprzedaż',
        'faktura': 'Faktura VAT', 
        'inne': 'Inne',
        'najem': 'Inne',
        'leasing': 'Inne'
      };

      return {
        ...data,
        // Mapowanie roku produkcji
        year: parseInt(data.productionYear || data.year || '2010'),
        // Mapowanie paliwa
        fuelType: fuelTypeMapping[data.fuelType] || data.fuelType?.toLowerCase() || 'benzyna',
        // Mapowanie skrzyni biegów
        transmission: transmissionMapping[data.transmission] || data.transmission?.toLowerCase() || 'manualna',
        // Mapowanie opcji zakupu
        purchaseOptions: purchaseOptionsMapping[data.purchaseOption] || data.purchaseOptions || 'Sprzedaż'
      };
    };

    // Mapowanie danych
    const mappedData = mapFormDataToBackend(req.body);
    
    const {
      brand, model, generation, version, year, price, mileage, fuelType, transmission, vin,
      registrationNumber, headline, description, purchaseOptions, listingType, condition,
      accidentStatus, damageStatus, tuning, imported, registeredInPL, firstOwner, disabledAdapted,
      bodyType, color, paintFinish, seats, lastOfficialMileage, power, engineSize, drive, doors, weight,
      voivodeship, city, rentalPrice, status, sellerType, countryOfOrigin, negotiable, images, mainImage // Odbieramy tablicę URL-i i główne zdjęcie
    } = mappedData;

    console.log('Dane po mapowaniu:', {
      brand, model, year, price, mileage, fuelType, transmission,
      description, purchaseOptions, listingType, sellerType, images
    });

    // Pobieranie danych użytkownika
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'Użytkownik nie znaleziony' });
    }

    // Walidacja czy tablica `images` istnieje i nie jest pusta
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ message: 'Ogłoszenie musi zawierać przynajmniej jedno zdjęcie.' });
    }
    console.log(`Otrzymano ${images.length} URL-i zdjęć z Supabase:`, images);

    // Walidacja, czy `mainImage` jest jednym z URL-i w `images`
    if (!mainImage || !images.includes(mainImage)) {
        // Jeśli nie ma `mainImage` lub nie ma go w `images`, ustaw pierwszy obraz jako główny
        console.log('Brak `mainImage` lub nieprawidłowy URL. Ustawiam pierwszy obraz jako główny.');
        req.body.mainImage = images[0];
    }

    // Generowanie krótkiego opisu z nagłówka (do 120 znaków)
    const shortDescription = headline
      ? headline.substring(0, 120)
      : '';

    // Ustawienie daty wygaśnięcia na podstawie roli użytkownika
    let expiresAt = null;
    if (user.role !== 'admin' && user.role !== 'moderator') {
      // Zwykłe ogłoszenia wygasają po 30 dniach od utworzenia
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
    }
    // Ogłoszenia adminów i moderatorów nie mają terminu ważności (expiresAt = null)

    // Tworzenie nowego ogłoszenia
    const newAd = new Ad({
      // Podstawowe dane
      brand,
      model,
      generation,
      version,
      year: parseInt(year),
      price: parseFloat(price),
      mileage: parseInt(mileage),
      fuelType,
      transmission,
      vin: vin || '',
      registrationNumber: registrationNumber || '',
      headline,
      description,
      shortDescription, // <-- dodane pole
      images,
      mainImage: req.body.mainImage, // Używamy zwalidowanego lub domyślnego mainImage
      purchaseOptions,
      negotiable: req.body.negotiable || 'Nie', // <-- dodane pole negotiable
      listingType,
      sellerType, // <-- dodane pole sellerType
      
      // Dane techniczne
      condition,
      accidentStatus,
      damageStatus,
      tuning,
      imported,
      registeredInPL,
      firstOwner,
      disabledAdapted,
      bodyType,
      color,
      paintFinish,
      seats,
      lastOfficialMileage: lastOfficialMileage ? parseInt(lastOfficialMileage) : undefined,
      power: power ? parseInt(power) : undefined,
      engineSize: engineSize ? parseInt(engineSize) : undefined,
      drive,
      doors: doors ? parseInt(doors) : undefined,
      weight: weight ? parseInt(weight) : undefined,
      countryOfOrigin,
      
      // Lokalizacja
      voivodeship,
      city,
      
      // Najem
      rentalPrice: rentalPrice ? parseFloat(rentalPrice) : undefined,
      
      // Dane właściciela
      owner: req.user.userId,
      ownerName: user.name,
      ownerLastName: user.lastName,
      ownerEmail: user.email,
      ownerPhone: user.phoneNumber,
      ownerRole: user.role, // Dodanie roli właściciela
      
      // Termin ważności ogłoszenia
      expiresAt: expiresAt,
      
      // Status - admini mają automatycznie aktywne ogłoszenia, reszta pending
      status: (user.role === 'admin' || user.role === 'moderator') ? 'active' : 'pending'
    });

    console.log('Utworzono obiekt ogłoszenia, próba zapisania w bazie danych');
    
    // Zapisz ogłoszenie w bazie danych
    const ad = await newAd.save();
    console.log('Ogłoszenie zapisane w bazie danych:', ad._id);
    
    // Tworzenie powiadomienia o dodaniu ogłoszenia
    try {
      const adTitle = headline || `${brand} ${model}`;
      await notificationService.notifyAdCreated(req.user.userId, adTitle);
      console.log(`Utworzono powiadomienie o dodaniu ogłoszenia dla użytkownika ${req.user.userId}`);
    } catch (notificationError) {
      console.error('Błąd podczas tworzenia powiadomienia:', notificationError);
      // Nie przerywamy głównego procesu w przypadku błędu powiadomienia
    }
    
    // Odpowiedź z utworzonym ogłoszeniem
    res.status(201).json(ad);
  } catch (err) {
    console.error('Błąd podczas dodawania ogłoszenia:', err);
    next(err);
  }
}, errorHandler);

// GET /ads/:id - Pobieranie szczegółów ogłoszenia oraz aktualizacja wyświetleń
router.get('/:id', async (req, res, next) => {
  // Sprawdź, czy id to nie jest jedna z naszych specjalnych ścieżek
  if (req.params.id === 'stats' || req.params.id === 'rotated' || 
      req.params.id === 'brands' || req.params.id === 'models' || 
      req.params.id === 'search' || req.params.id === 'user') {
    return next();
  }

  try {
    const ad = await Ad.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true, runValidators: false }
    );

    if (!ad) {
      return res.status(404).json({ message: 'Ogłoszenie nie znalezione' });
    }

    // Konwertuj dokument Mongoose na zwykły obiekt JavaScript
    const adObj = ad.toObject();
    
    // Sprawdź, czy ogłoszenie ma zdjęcia
    if (!adObj.images || adObj.images.length === 0) {
      adObj.images = [];
    } else {
      // Filtruj tylko niepuste zdjęcia
      adObj.images = adObj.images.filter(imageUrl => imageUrl);
      
      // Jeśli po filtrowaniu nie ma zdjęć, zwróć pustą tablicę
      if (adObj.images.length === 0) {
        adObj.images = [];
      }
      
      // Przekształć ścieżki zdjęć, aby były pełnymi URL-ami
      adObj.images = adObj.images.map(imageUrl => {
        if (imageUrl.startsWith('http')) {
          return imageUrl;
        } else if (imageUrl.startsWith('/uploads/')) {
          return `${process.env.BACKEND_URL || 'http://localhost:5000'}${imageUrl}`;
        } else if (imageUrl.startsWith('uploads/')) {
          return `${process.env.BACKEND_URL || 'http://localhost:5000'}/${imageUrl}`;
        } else {
          return `${process.env.BACKEND_URL || 'http://localhost:5000'}/uploads/${imageUrl}`;
        }
      });
    }

    console.log(`Zwracam ogłoszenie ${adObj._id} ze zdjęciami:`, adObj.images);
    res.status(200).json(adObj);
  } catch (err) {
    next(err);
  }
}, errorHandler);

// PUT /ads/:id - Aktualizacja ogłoszenia
router.put('/:id', auth, upload.array('images', 10), async (req, res, next) => {
  try {
    const ad = await Ad.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({ message: 'Ogłoszenie nie znalezione' });
    }

    // Sprawdź czy użytkownik jest właścicielem lub adminem
    if (ad.owner.toString() !== req.user.userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Brak uprawnień do edycji tego ogłoszenia' });
    }

    // Pola, które można aktualizować - rozszerzona lista
    const updatableFields = [
      // Podstawowe informacje
      'description', 'price', 'city', 'voivodeship', 'color',
      'headline', 'mainImage', 'images', 'mileage', 'negotiable',
      
      // Dane techniczne
      'condition', 'accidentStatus', 'damageStatus', 'tuning', 
      'imported', 'registeredInPL', 'firstOwner', 'disabledAdapted',
      'bodyType', 'paintFinish', 'seats', 'lastOfficialMileage', 'power', 'engineSize', 
      'drive', 'doors', 'weight', 'rentalPrice', 'countryOfOrigin',
      
      // Identyfikatory (tylko dla adminów)
      ...(req.user.role === 'admin' ? ['vin', 'registrationNumber'] : []),
      
      // Opcje zakupu
      'purchaseOptions'
    ];

    console.log('=== AKTUALIZACJA OGŁOSZENIA ===');
    console.log('ID ogłoszenia:', req.params.id);
    console.log('Użytkownik:', req.user.userId);
    console.log('Dane otrzymane z frontendu:', JSON.stringify(req.body, null, 2));
    console.log('Dozwolone pola do aktualizacji:', updatableFields);

    // Aktualizuj tylko dozwolone pola
    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        const oldValue = ad[field];
        const newValue = req.body[field];
        console.log(`Aktualizuję pole ${field}: "${oldValue}" -> "${newValue}"`);
        ad[field] = newValue;
      }
    });

    // Specjalna obsługa dla mainImageIndex - konwertuj na mainImage
    if (req.body.mainImageIndex !== undefined && ad.images && ad.images.length > 0) {
      const index = parseInt(req.body.mainImageIndex);
      if (index >= 0 && index < ad.images.length) {
        ad.mainImage = ad.images[index];
        console.log(`Ustawiono główne zdjęcie na indeks ${index}: ${ad.mainImage}`);
      }
    }

    // Jeśli dodano nowe zdjęcia, zaktualizuj tablicę images
    if (req.files && req.files.length > 0) {
      console.log(`Dodawanie ${req.files.length} nowych zdjęć`);
      const newImageUrls = req.files.map(file => file.path || file.filename);
      ad.images = [...ad.images, ...newImageUrls];
      console.log('Zaktualizowana tablica zdjęć:', ad.images);
    }

    // Automatyczne generowanie shortDescription z headline lub description
    if (req.body.description || req.body.headline) {
      const sourceText = req.body.headline || ad.headline || req.body.description || ad.description;
      ad.shortDescription = sourceText ? sourceText.substring(0, 120) : '';
      console.log('Wygenerowano shortDescription:', ad.shortDescription);
    }

    // Zapisz zmiany
    await ad.save();

    console.log('Ogłoszenie zaktualizowane pomyślnie');
    res.status(200).json({ message: 'Ogłoszenie zaktualizowane', ad });
  } catch (err) {
    console.error('Błąd podczas aktualizacji ogłoszenia:', err);
    next(err);
  }
}, errorHandler);

// PUT /ads/:id/status - Zmiana statusu ogłoszenia
router.put('/:id/status', auth, async (req, res, next) => {
  try {
    const { status } = req.body;
    
    // Walidacja statusu
    const allowedStatuses = ['active', 'archived', 'sold', 'pending'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ 
        message: 'Nieprawidłowy status. Dozwolone wartości: active, archived, sold, pending' 
      });
    }

    const ad = await Ad.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({ message: 'Ogłoszenie nie znalezione' });
    }

    // Sprawdź czy użytkownik jest właścicielem lub adminem
    if (ad.owner.toString() !== req.user.userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Brak uprawnień do zmiany statusu tego ogłoszenia' });
    }

    // Aktualizuj status
    ad.status = status;
    
    // Jeśli status to 'archived', ustaw datę archiwizacji
    if (status === 'archived') {
      ad.archivedAt = new Date();
    }
    
    await ad.save();

    // Tworzenie powiadomienia o zmianie statusu
    try {
      const adTitle = ad.headline || `${ad.brand} ${ad.model}`;
      const statusText = status === 'archived' ? 'zarchiwizowane' : 
                        status === 'sold' ? 'sprzedane' : 
                        status === 'active' ? 'aktywne' : status;
      await notificationService.notifyAdStatusChange(ad.owner.toString(), adTitle, statusText);
      console.log(`Utworzono powiadomienie o zmianie statusu ogłoszenia dla użytkownika ${ad.owner}`);
    } catch (notificationError) {
      console.error('Błąd podczas tworzenia powiadomienia:', notificationError);
      // Nie przerywamy głównego procesu w przypadku błędu powiadomienia
    }

    res.status(200).json({ 
      message: `Status ogłoszenia został zmieniony na ${status}`, 
      ad 
    });
  } catch (err) {
    console.error('Błąd podczas zmiany statusu ogłoszenia:', err);
    next(err);
  }
}, errorHandler);

// DELETE /ads/:id/images/:index - Usuwanie zdjęcia z ogłoszenia
router.delete('/:id/images/:index', auth, async (req, res, next) => {
  try {
    const { id, index } = req.params;
    const imageIndex = parseInt(index);

    const ad = await Ad.findById(id);

    if (!ad) {
      return res.status(404).json({ message: 'Ogłoszenie nie znalezione' });
    }

    // Sprawdź czy użytkownik jest właścicielem lub adminem
    if (ad.owner.toString() !== req.user.userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Brak uprawnień do edycji tego ogłoszenia' });
    }

    // Sprawdź czy indeks jest prawidłowy
    if (imageIndex < 0 || imageIndex >= ad.images.length) {
      return res.status(400).json({ message: 'Nieprawidłowy indeks zdjęcia' });
    }

    // Sprawdź czy to nie jest ostatnie zdjęcie
    if (ad.images.length <= 1) {
      return res.status(400).json({ message: 'Ogłoszenie musi zawierać co najmniej jedno zdjęcie' });
    }

    // Usuń zdjęcie z tablicy
    const removedImage = ad.images[imageIndex];
    ad.images.splice(imageIndex, 1);

    // Jeśli usuwane zdjęcie było głównym, ustaw nowe główne zdjęcie
    if (ad.mainImage === removedImage) {
      ad.mainImage = ad.images[0]; // Ustaw pierwsze dostępne zdjęcie jako główne
    }

    // Zapisz zmiany
    await ad.save();

    console.log(`Usunięto zdjęcie o indeksie ${imageIndex} z ogłoszenia ${id}`);
    res.status(200).json({ 
      message: 'Zdjęcie zostało usunięte',
      images: ad.images,
      mainImage: ad.mainImage
    });
  } catch (err) {
    console.error('Błąd podczas usuwania zdjęcia:', err);
    next(err);
  }
}, errorHandler);

// POST /ads/:id/extend - Przedłużenie ogłoszenia o 30 dni
router.post('/:id/extend', auth, async (req, res, next) => {
  try {
    const ad = await Ad.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({ message: 'Ogłoszenie nie znalezione' });
    }

    // Sprawdź czy użytkownik jest właścicielem lub adminem
    if (ad.owner.toString() !== req.user.userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Brak uprawnień do przedłużenia tego ogłoszenia' });
    }

    // Sprawdź czy ogłoszenie można przedłużyć (tylko aktywne ogłoszenia)
    if (ad.status !== 'active') {
      return res.status(400).json({ message: 'Można przedłużyć tylko aktywne ogłoszenia' });
    }

    // Przedłuż ogłoszenie o 30 dni od dzisiaj
    const newExpiryDate = new Date();
    newExpiryDate.setDate(newExpiryDate.getDate() + 30);
    
    ad.expiresAt = newExpiryDate;
    ad.createdAt = new Date(); // Resetuj datę utworzenia dla licznika dni
    
    await ad.save();

    // Tworzenie powiadomienia o przedłużeniu
    try {
      const adTitle = ad.headline || `${ad.brand} ${ad.model}`;
      await notificationService.notifyAdStatusChange(ad.owner.toString(), adTitle, 'przedłużone o 30 dni');
      console.log(`Utworzono powiadomienie o przedłużeniu ogłoszenia dla użytkownika ${ad.owner}`);
    } catch (notificationError) {
      console.error('Błąd podczas tworzenia powiadomienia:', notificationError);
      // Nie przerywamy głównego procesu w przypadku błędu powiadomienia
    }

    console.log(`Przedłużono ogłoszenie ${req.params.id} do ${newExpiryDate}`);
    res.status(200).json({ 
      message: 'Ogłoszenie zostało przedłużone o 30 dni',
      expiresAt: newExpiryDate,
      ad 
    });
  } catch (err) {
    console.error('Błąd podczas przedłużania ogłoszenia:', err);
    next(err);
  }
}, errorHandler);

// DELETE /ads/:id - Usuwanie ogłoszenia
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const ad = await Ad.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({ message: 'Ogłoszenie nie znalezione' });
    }

    // Sprawdź czy użytkownik jest właścicielem lub adminem
    if (ad.owner.toString() !== req.user.userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Brak uprawnień do usunięcia tego ogłoszenia' });
    }

    // Usuń ogłoszenie z bazy danych
    await Ad.findByIdAndDelete(req.params.id);

    // Tworzenie powiadomienia o usunięciu ogłoszenia
    try {
      const adTitle = ad.headline || `${ad.brand} ${ad.model}`;
      await notificationService.notifyAdStatusChange(ad.owner.toString(), adTitle, 'usunięte');
      console.log(`Utworzono powiadomienie o usunięciu ogłoszenia dla użytkownika ${ad.owner}`);
    } catch (notificationError) {
      console.error('Błąd podczas tworzenia powiadomienia:', notificationError);
      // Nie przerywamy głównego procesu w przypadku błędu powiadomienia
    }

    res.status(200).json({ message: 'Ogłoszenie zostało usunięte' });
  } catch (err) {
    console.error('Błąd podczas usuwania ogłoszenia:', err);
    next(err);
  }
}, errorHandler);

export default router;
