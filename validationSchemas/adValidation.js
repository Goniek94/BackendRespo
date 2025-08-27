import Joi from 'joi';

const currentYear = new Date().getFullYear();

const adValidationSchema = Joi.object({
  // Podstawowe pola
  brand: Joi.string().required().messages({
    'any.required': 'Marka jest wymagana.',
    'string.empty': 'Marka nie może być pusta.'
  }),
  model: Joi.string().required().messages({
    'any.required': 'Model jest wymagany.',
    'string.empty': 'Model nie może być pusty.'
  }),
  generation: Joi.string().allow(''),
  version: Joi.string().allow(''),
  year: Joi.any().required().messages({
    'any.required': 'Rok produkcji jest wymagany.'
  }),
  price: Joi.any().required().messages({
    'any.required': 'Cena jest wymagana.'
  }),
  mileage: Joi.any().required().messages({
    'any.required': 'Przebieg jest wymagany.'
  }),
  description: Joi.string().min(10).required().messages({
    'string.min': 'Opis musi mieć co najmniej 10 znaków.',
    'any.required': 'Opis jest wymagany.'
  }),

  // Paliwo - akceptujemy różne formaty z frontendu
  fuelType: Joi.string()
    .valid('benzyna', 'diesel', 'elektryczny', 'hybryda', 'hybrydowy', 'benzyna+LPG', 'inne',
           'Benzyna', 'Diesel', 'Elektryczny', 'Hybryda', 'Hybrydowy', 'Benzyna+LPG', 'Inne',
           'Benzyna+CNG', 'Etanol')
    .default('Benzyna')
    .messages({
      'any.only': 'Nieprawidłowy typ paliwa.'
    }),

  // Skrzynia biegów - akceptujemy różne formaty z frontendu
  transmission: Joi.string()
    .valid('manualna', 'automatyczna', 'półautomatyczna',
           'Manualna', 'Automatyczna', 'Półautomatyczna', 'Bezstopniowa CVT')
    .default('Manualna')
    .messages({
      'any.only': 'Nieprawidłowy typ skrzyni biegów.'
    }),

  // VIN (17 znaków, bez I/O/Q – opcjonalny)
  vin: Joi.string()
    .pattern(/^[A-HJ-NPR-Z0-9]{17}$/)
    .allow('')
    .optional()
    .messages({
      'string.pattern.base': 'Numer VIN musi składać się z 17 znaków (bez I, O, Q).'
    }),

  // Nr rej (max 8 znaków, opcjonalny)
  registrationNumber: Joi.string()
    .pattern(/^[A-Z0-9]{1,8}$/i)
    .allow('')
    .optional()
    .messages({
      'string.pattern.base': 'Numer rejestracyjny może zawierać maksymalnie 8 znaków (litery i cyfry).'
    }),

  // purchaseOptions - akceptujemy różne formaty z frontendu
  purchaseOptions: Joi.string()
    .valid('Sprzedaż', 'Faktura VAT', 'Inne', 'sprzedaz', 'faktura', 'inne', 
           'umowa kupna-sprzedaży', 'najem', 'leasing')
    .default('Sprzedaż')
    .messages({
      'any.only': 'Nieprawidłowa opcja zakupu.'
    }),
  
  // negotiable
  negotiable: Joi.string()
    .valid('Tak', 'Nie')
    .default('Nie')
    .messages({
      'any.only': 'Dopuszczalne wartości to: Tak, Nie.'
    }),

  // listingType
  listingType: Joi.string()
    .valid('standardowe', 'wyróżnione')
    .required()
    .messages({
      'any.required': 'Typ ogłoszenia jest wymagany.',
      'any.only': 'Dopuszczalne typy ogłoszeń to: standardowe, wyróżnione.'
    }),

  // Pozostałe pola (opcjonalne)
  headline: Joi.string().max(120).allow('').messages({
    'string.max': 'Tytuł ogłoszenia nie może przekraczać 120 znaków.'
  }),
  sellerType: Joi.string().valid('prywatny', 'firma', 'Prywatny', 'Firma').default('Prywatny').messages({
    'any.only': 'Dopuszczalne typy sprzedawcy to: Prywatny, Firma.'
  }),
  condition: Joi.string().allow(''),
  accidentStatus: Joi.string().allow(''),
  damageStatus: Joi.string().allow(''),
  tuning: Joi.string().allow(''),
  imported: Joi.string().allow(''),
  registeredInPL: Joi.string().allow(''),
  firstOwner: Joi.string().allow(''),
  disabledAdapted: Joi.string().allow(''),

  bodyType: Joi.string().allow(''),
  color: Joi.string().allow(''),
  paintFinish: Joi.string().allow(''),
  seats: Joi.string().allow(''),

  lastOfficialMileage: Joi.any().allow(null),
  countryOfOrigin: Joi.string().allow(''),
  power: Joi.any().allow(null),
  engineSize: Joi.any().allow(null),
  drive: Joi.string()
    .valid('FWD (przedni)', 'RWD (tylny)', 'AWD/4x4', 
           'Przedni', 'Tylny', 'Na cztery koła stały', 'Na cztery koła dołączany',
           'AWD', '4WD', 'RWD', 'FWD', 'Inne')
    .allow('')
    .optional()
    .messages({
      'any.only': 'Nieprawidłowy typ napędu.'
    }),
  doors: Joi.any().allow(null),
  weight: Joi.any().allow(null),

  voivodeship: Joi.string().allow(''),
  city: Joi.string().allow(''),

  photos: Joi.array().items(Joi.string()).optional(),
  images: Joi.array().items(Joi.string()).min(5).max(15).required().messages({
    'array.min': 'Ogłoszenie musi zawierać minimum 5 zdjęć.',
    'array.max': 'Ogłoszenie może zawierać maksymalnie 15 zdjęć.',
    'any.required': 'Zdjęcia są wymagane.'
  }),
  mainImage: Joi.string().optional(),
  mainImageIndex: Joi.any().optional(),

  rentalPrice: Joi.any().allow(null),
  purchaseOption: Joi.string().allow(''),
  
  // Nowe pola dla cesji
  leasingCompany: Joi.string().allow(''),
  remainingInstallments: Joi.number().integer().min(1).allow(null),
  installmentAmount: Joi.number().min(0).allow(null),
  cessionFee: Joi.number().min(0).allow(null),
  
  // Nowe pola dla zamiany
  exchangeOffer: Joi.string().allow(''),
  exchangeValue: Joi.number().min(0).allow(null),
  exchangePayment: Joi.number().allow(null), // może być ujemna
  exchangeConditions: Joi.string().allow(''),
  
  // Dane właściciela ogłoszenia (opcjonalne w walidacji)
  ownerName: Joi.string().allow(''),
  ownerLastName: Joi.string().allow(''),
  ownerEmail: Joi.string().allow(''),
  ownerPhone: Joi.string().allow('')
}).options({ allowUnknown: true });

export default adValidationSchema;
