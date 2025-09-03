/**
 * Handler dla tworzenia nowych ogłoszeń
 */

import Ad from '../../../models/listings/ad.js';
import User from '../../../models/user/user.js';
import auth from '../../../middleware/auth.js';
import validate from '../../../middleware/validation/validate.js';
import adValidationSchema from '../../../validationSchemas/adValidation.js';
import errorHandler from '../../../middleware/errors/errorHandler.js';
import { notificationService } from '../../../controllers/notifications/notificationController.js';

/**
 * Funkcja do kapitalizacji tekstu (pierwsza litera duża, reszta mała)
 */
const capitalizeText = (text) => {
  if (!text || typeof text !== 'string') return text;
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

/**
 * Funkcja do pełnej kapitalizacji (wszystkie litery duże)
 */
const toUpperCase = (text) => {
  if (!text || typeof text !== 'string') return text;
  return text.toUpperCase();
};

/**
 * Mapowanie wartości z frontendu na backend
 */
export const mapFormDataToBackend = (data) => {
  const fuelTypeMapping = {
    'Benzyna': 'BENZYNA',
    'benzyna': 'BENZYNA',
    'Diesel': 'DIESEL', 
    'diesel': 'DIESEL',
    'Elektryczny': 'ELEKTRYCZNY',
    'elektryczny': 'ELEKTRYCZNY',
    'Hybryda': 'HYBRYDA',
    'hybryda': 'HYBRYDA',
    'Hybrydowy': 'HYBRYDA',
    'hybrydowy': 'HYBRYDA',
    'Benzyna+LPG': 'BENZYNA+LPG',
    'benzyna+lpg': 'BENZYNA+LPG',
    'Benzyna+CNG': 'BENZYNA+CNG',
    'benzyna+cng': 'BENZYNA+CNG',
    'Etanol': 'ETANOL',
    'etanol': 'ETANOL'
  };

  const transmissionMapping = {
    'Manualna': 'MANUALNA',
    'manualna': 'MANUALNA',
    'Automatyczna': 'AUTOMATYCZNA',
    'automatyczna': 'AUTOMATYCZNA',
    'Półautomatyczna': 'PÓŁAUTOMATYCZNA',
    'półautomatyczna': 'PÓŁAUTOMATYCZNA',
    'Bezstopniowa CVT': 'AUTOMATYCZNA CVT',
    'bezstopniowa cvt': 'AUTOMATYCZNA CVT'
  };

  const purchaseOptionsMapping = {
    'sprzedaz': 'SPRZEDAŻ',
    'sprzedaż': 'SPRZEDAŻ',
    'Sprzedaż': 'SPRZEDAŻ',
    'umowa kupna-sprzedaży': 'SPRZEDAŻ',
    'faktura': 'FAKTURA VAT',
    'faktura VAT': 'FAKTURA VAT',
    'Faktura VAT': 'FAKTURA VAT', 
    'inne': 'INNE',
    'Inne': 'INNE',
    'najem': 'NAJEM',
    'Najem': 'NAJEM',
    'leasing': 'LEASING',
    'Leasing': 'LEASING',
    // NAPRAWIONE: Poprawne mapowanie zgodne ze schematem - DUŻE LITERY
    'Cesja': 'CESJA LEASINGU',
    'cesja': 'CESJA LEASINGU',
    'Cesja leasingu': 'CESJA LEASINGU',
    'cesja leasingu': 'CESJA LEASINGU',
    'Zamiana': 'ZAMIANA',
    'zamiana': 'ZAMIANA'
  };

  const driveMapping = {
    'RWD (tylny)': 'RWD',
    'FWD (przedni)': 'FWD',
    'AWD (na cztery koła)': 'AWD',
    'Na cztery koła stały': '4WD',
    'Na cztery koła dołączany': 'AWD',
    'Przedni': 'FWD',
    'przedni': 'FWD',
    'Tylny': 'RWD',
    'tylny': 'RWD',
    '4x4': '4WD',
    'Napęd na przód': 'FWD',
    'Napęd na tył': 'RWD',
    'Napęd na cztery koła': 'AWD'
  };

  const bodyTypeMapping = {
    'Hatchback': 'HATCHBACK',
    'hatchback': 'HATCHBACK',
    'Sedan': 'SEDAN',
    'sedan': 'SEDAN',
    'Kombi': 'KOMBI',
    'kombi': 'KOMBI',
    'SUV': 'SUV',
    'suv': 'SUV',
    'Coupe': 'COUPE',
    'coupe': 'COUPE',
    'Cabrio': 'CABRIO',
    'cabrio': 'CABRIO',
    'Kabriolet': 'CABRIO',
    'kabriolet': 'CABRIO',
    'Terenowe': 'TERENOWE',
    'terenowe': 'TERENOWE',
    'Minivan': 'MINIVAN',
    'minivan': 'MINIVAN',
    'Dostawcze': 'DOSTAWCZE',
    'dostawcze': 'DOSTAWCZE',
    'Pickup': 'PICKUP',
    'pickup': 'PICKUP',
    'Van': 'VAN',
    'van': 'VAN',
    'Limuzyna': 'LIMUZYNA',
    'limuzyna': 'LIMUZYNA',
    'Roadster': 'ROADSTER',
    'roadster': 'ROADSTER',
    'Targa': 'TARGA',
    'targa': 'TARGA'
  };

  const conditionMapping = {
    'nowy': 'NOWY',
    'Nowy': 'NOWY',
    'używany': 'UŻYWANY',
    'Używany': 'UŻYWANY',
    'uzywany': 'UŻYWANY'
  };

  const sellerTypeMapping = {
    'Prywatny': 'PRYWATNY',
    'prywatny': 'PRYWATNY',
    'private': 'PRYWATNY',
    'Firma': 'FIRMA',
    'firma': 'FIRMA',
    'company': 'FIRMA'
  };

  const paintFinishMapping = {
    'metalik': 'METALIK',
    'Metalik': 'METALIK',
    'perła': 'PERŁA',
    'Perła': 'PERŁA',
    'mat': 'MAT',
    'Mat': 'MAT',
    'połysk': 'POŁYSK',
    'Połysk': 'POŁYSK',
    'inne': 'INNE',
    'Inne': 'INNE'
  };

  return {
    ...data,
    // NAPRAWIONE: Kapitalizacja marki i modelu - ZAWSZE Z DUŻYCH LITER
    brand: toUpperCase(data.brand),
    model: toUpperCase(data.model),
    // NAPRAWIONE: Wersja silnika - ZAWSZE Z DUŻYCH LITER (np. TDI 1.5)
    version: toUpperCase(data.version),
    generation: toUpperCase(data.generation),
    // Mapowanie roku produkcji
    year: parseInt(data.productionYear || data.year || '2010'),
    // Mapowanie paliwa - DUŻE LITERY
    fuelType: fuelTypeMapping[data.fuelType] || toUpperCase(data.fuelType) || 'BENZYNA',
    // Mapowanie skrzyni biegów - DUŻE LITERY
    transmission: transmissionMapping[data.transmission] || toUpperCase(data.transmission) || 'MANUALNA',
    // NAPRAWIONE: Mapowanie opcji zakupu - DUŻE LITERY
    purchaseOptions: purchaseOptionsMapping[data.purchaseOption] || purchaseOptionsMapping[data.purchaseOptions] || toUpperCase(data.purchaseOptions) || 'SPRZEDAŻ',
    // NAPRAWIONE: Mapowanie typu sprzedającego - DUŻE LITERY
    sellerType: sellerTypeMapping[data.sellerType] || toUpperCase(data.sellerType) || 'PRYWATNY',
    // Mapowanie napędu - DUŻE LITERY
    drive: driveMapping[data.drive] || toUpperCase(data.drive) || 'FWD',
    // Mapowanie typu nadwozia - DUŻE LITERY
    bodyType: bodyTypeMapping[data.bodyType] || toUpperCase(data.bodyType),
    // Mapowanie stanu pojazdu - DUŻE LITERY
    condition: conditionMapping[data.condition] || toUpperCase(data.condition) || 'UŻYWANY',
    // DODANE: Mapowanie kraju pochodzenia - pierwsza litera wielka
    countryOfOrigin: data.countryOfOrigin || data.country || 'Polska',
    // NAPRAWIONE: Kolor - DUŻE LITERY
    color: toUpperCase(data.color),
    // NAPRAWIONE: Wykończenie lakieru - DUŻE LITERY
    paintFinish: paintFinishMapping[data.paintFinish] || toUpperCase(data.paintFinish)
  };
};

/**
 * Handler dla POST /ads/add - Tworzenie nowego ogłoszenia
 */
export const createAd = [
  auth,
  validate(adValidationSchema),
  async (req, res, next) => {
  try {
    console.log('Rozpoczęto dodawanie ogłoszenia z Supabase');
    console.log('Oryginalne dane z frontendu:', req.body);
    
    // Mapowanie danych
    const mappedData = mapFormDataToBackend(req.body);
    
    // NAPRAWIONE: Dodane wszystkie brakujące pola w destructuring
    const {
      brand, model, generation, version, year, price, mileage, fuelType, transmission, vin,
      registrationNumber, headline, description, purchaseOptions, listingType, condition,
      accidentStatus, damageStatus, tuning, imported, registeredInPL, firstOwner, disabledAdapted,
      bodyType, color, paintFinish, seats, lastOfficialMileage, power, engineSize, drive, doors, weight,
      voivodeship, city, rentalPrice, status, sellerType, countryOfOrigin, negotiable, images, mainImage,
      // NAPRAWIONE: Dodane brakujące pola
      firstRegistrationDate,
      // Pola cesji
      leasingCompany, remainingInstallments, installmentAmount, cessionFee,
      // Pola zamiany
      exchangeOffer, exchangeValue, exchangePayment, exchangeConditions
    } = mappedData;

    console.log('Dane po mapowaniu:', {
      brand, model, year, price, mileage, fuelType, transmission,
      description, purchaseOptions, listingType, sellerType, images,
      // Logowanie nowych pól
      firstRegistrationDate, countryOfOrigin, lastOfficialMileage,
      leasingCompany, exchangeOffer
    });

    // Pobieranie danych użytkownika
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'Użytkownik nie znaleziony' });
    }

    // Walidacja liczby zdjęć - minimum 5, maksimum 15
    if (!images || !Array.isArray(images)) {
      return res.status(400).json({ message: 'Zdjęcia są wymagane.' });
    }
    
    if (images.length < 5) {
      return res.status(400).json({ message: 'Ogłoszenie musi zawierać minimum 5 zdjęć.' });
    }
    
    if (images.length > 15) {
      return res.status(400).json({ message: 'Ogłoszenie może zawierać maksymalnie 15 zdjęć.' });
    }
    
    console.log(`Otrzymano ${images.length} URL-i zdjęć z Supabase (wymagane: 5-15):`, images);

    // Automatycznie ustaw pierwsze zdjęcie jako główne
    req.body.mainImage = images[0];
    console.log('Automatycznie ustawiono pierwsze zdjęcie jako główne:', images[0]);

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

    // NAPRAWIONE: Tworzenie nowego ogłoszenia z wszystkimi polami
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
      firstRegistrationDate, // NAPRAWIONE: Dodane pole
      headline,
      description,
      shortDescription,
      images,
      mainImage: req.body.mainImage,
      purchaseOptions,
      negotiable: req.body.negotiable || 'Nie',
      listingType,
      sellerType, // NAPRAWIONE: Powinno działać z 'firma'
      
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
      lastOfficialMileage: lastOfficialMileage ? parseInt(lastOfficialMileage) : undefined, // NAPRAWIONE: Dodane pole
      power: power ? parseInt(power) : undefined,
      engineSize: engineSize ? parseInt(engineSize) : undefined,
      drive,
      doors: doors ? parseInt(doors) : undefined,
      weight: weight ? parseInt(weight) : undefined,
      countryOfOrigin, // NAPRAWIONE: Dodane pole
      
      // Lokalizacja
      voivodeship,
      city,
      
      // Najem
      rentalPrice: rentalPrice ? parseFloat(rentalPrice) : undefined,
      
      // NAPRAWIONE: Pola cesji
      leasingCompany,
      remainingInstallments: remainingInstallments ? parseInt(remainingInstallments) : undefined,
      installmentAmount: installmentAmount ? parseFloat(installmentAmount) : undefined,
      cessionFee: cessionFee ? parseFloat(cessionFee) : undefined,
      
      // NAPRAWIONE: Pola zamiany
      exchangeOffer,
      exchangeValue: exchangeValue ? parseFloat(exchangeValue) : undefined,
      exchangePayment: exchangePayment ? parseFloat(exchangePayment) : undefined,
      exchangeConditions,
      
      // Dane właściciela
      owner: req.user.userId,
      ownerName: user.name,
      ownerLastName: user.lastName,
      ownerEmail: user.email,
      ownerPhone: user.phoneNumber,
      ownerRole: user.role,
      
      // Termin ważności ogłoszenia
      expiresAt: expiresAt,
      
      // Status - admini mają automatycznie aktywne ogłoszenia, reszta pending
      status: (user.role === 'admin' || user.role === 'moderator') ? 'active' : 'pending'
    });

    console.log('Utworzono obiekt ogłoszenia, próba zapisania w bazie danych');
    console.log('Sprawdzenie kluczowych pól przed zapisem:', {
      sellerType: newAd.sellerType,
      purchaseOptions: newAd.purchaseOptions,
      countryOfOrigin: newAd.countryOfOrigin,
      firstRegistrationDate: newAd.firstRegistrationDate,
      lastOfficialMileage: newAd.lastOfficialMileage,
      leasingCompany: newAd.leasingCompany,
      exchangeOffer: newAd.exchangeOffer
    });
    
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
  },
  errorHandler
];
