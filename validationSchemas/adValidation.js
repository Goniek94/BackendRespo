import Joi from 'joi';

const adSchema = Joi.object({
  make: Joi.string().required().messages({
    'any.required': 'Marka jest wymagana.',
    'string.empty': 'Marka nie może być pusta.'
  }),
  model: Joi.string().required().messages({
    'any.required': 'Model jest wymagany.',
    'string.empty': 'Model nie może być pusty.'
  }),
  price: Joi.number().greater(0).required().messages({
    'number.base': 'Cena musi być liczbą.',
    'number.greater': 'Cena musi być większa niż 0.'
  }),
  year: Joi.number().min(1886).max(new Date().getFullYear()).required().messages({
    'number.base': 'Rok produkcji musi być liczbą.',
    'number.min': 'Rok produkcji nie może być starszy niż 1886.',
    'number.max': `Rok produkcji nie może być nowszy niż ${new Date().getFullYear()}.`,
    'any.required': 'Rok produkcji jest wymagany.'
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
  fuelType: Joi.string().valid('benzyna', 'diesel', 'elektryczny', 'hybryda', 'inne').required().messages({
    'any.required': 'Typ paliwa jest wymagany.',
    'any.only': 'Dopuszczalne typy paliwa to: benzyna, diesel, elektryczny, hybryda, inne.'
  }),
  transmission: Joi.string().valid('manualna', 'automatyczna', 'półautomatyczna').required().messages({
    'any.required': 'Typ skrzyni biegów jest wymagany.',
    'any.only': 'Dopuszczalne typy skrzyni biegów to: manualna, automatyczna, półautomatyczna.'
  })
});

export default adSchema;
