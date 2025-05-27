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
  year: Joi.number().min(1886).max(currentYear).required().messages({
    'number.base': 'Rok produkcji musi być liczbą.',
    'number.min': 'Rok produkcji nie może być starszy niż 1886.',
    'number.max': `Rok produkcji nie może być nowszy niż ${currentYear}.`,
    'any.required': 'Rok produkcji jest wymagany.'
  }),
  price: Joi.number().min(0).required().messages({
    'number.base': 'Cena musi być liczbą.',
    'number.min': 'Cena nie może być mniejsza niż 0.',
    'any.required': 'Cena jest wymagana.'
  }),
  mileage: Joi.number().min(0).required().messages({
    'number.base': 'Przebieg musi być liczbą.',
    'number.min': 'Przebieg nie może być mniejszy niż 0.',
    'any.required': 'Przebieg jest wymagany.'
  }),
  description: Joi.string().min(10).required().messages({
    'string.min': 'Opis musi mieć co najmniej 10 znaków.',
    'any.required': 'Opis jest wymagany.'
  }),

  // Paliwo
  fuelType: Joi.string()
    .valid('benzyna', 'diesel', 'elektryczny', 'hybryda', 'benzyna+LPG', 'inne')
    .required()
    .messages({
      'any.required': 'Rodzaj paliwa jest wymagany.',
      'any.only': 'Dopuszczalne typy paliwa to: benzyna, diesel, elektryczny, hybryda, benzyna+LPG, inne.'
    }),

  // Skrzynia biegów
  transmission: Joi.string()
    .valid('manualna', 'automatyczna', 'półautomatyczna')
    .required()
    .messages({
      'any.required': 'Typ skrzyni biegów jest wymagany.',
      'any.only': 'Dopuszczalne typy skrzyni biegów to: manualna, automatyczna, półautomatyczna.'
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

  // purchaseOptions
  purchaseOptions: Joi.string()
    .valid('umowa kupna-sprzedaży', 'faktura VAT', 'inne')
    .required()
    .messages({
      'any.required': 'Opcje zakupu są wymagane.',
      'any.only': 'Dopuszczalne opcje zakupu to: umowa kupna-sprzedaży, faktura VAT, inne.'
    }),

  // listingType
  listingType: Joi.string()
    .valid('standardowe', 'wyróżnione')
    .required()
    .messages({
      'any.required': 'Typ ogłoszenia jest wymagany.',
      'any.only': 'Dopuszczalne typy ogłoszeń to: standardowe, wyróżnione.'
    }),

  // status
  status: Joi.string()
    .valid('w toku', 'opublikowane', 'archiwalne')
    .optional()
    .default('w toku')
    .messages({
      'any.only': 'Dopuszczalne statusy to: w toku, opublikowane, archiwalne.'
    }),

  // Pozostałe pola (opcjonalne)
  headline: Joi.string().max(60).allow('').messages({
    'string.max': 'Tytuł ogłoszenia nie może przekraczać 60 znaków.'
  }),
  sellerType: Joi.string().valid('prywatny', 'firma').default('prywatny').messages({
    'any.only': 'Dopuszczalne typy sprzedawcy to: prywatny, firma.'
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

  lastOfficialMileage: Joi.number().allow(null),
  countryOfOrigin: Joi.string().allow(''),
  power: Joi.number().allow(null),
  engineSize: Joi.number().allow(null),
  drive: Joi.string().allow(''),
  doors: Joi.number().allow(null), // Zmieniono z string na number
  weight: Joi.number().allow(null), // Zmieniono z string na number

  voivodeship: Joi.string().allow(''),
  city: Joi.string().allow(''),

  photos: Joi.array().items(Joi.string()).optional(),
  images: Joi.array().items(Joi.string()).optional(),
  mainImageIndex: Joi.number().optional(),

  rentalPrice: Joi.number().allow(null),
  purchaseOption: Joi.string().allow(''),
  
  // Dane właściciela ogłoszenia (opcjonalne w walidacji)
  ownerName: Joi.string().allow(''),
  ownerLastName: Joi.string().allow(''),
  ownerEmail: Joi.string().allow(''),
  ownerPhone: Joi.string().allow('')
});

export default adValidationSchema;
