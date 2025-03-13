import Joi from 'joi';

const registerSchema = Joi.object({
  name: Joi.string().min(2).required().messages({
    'string.empty': 'Imię jest wymagane.',
    'string.min': 'Imię musi zawierać co najmniej 2 znaki.',
    'any.required': 'Imię jest wymagane.'
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Nieprawidłowy format email.',
    'any.required': 'Email jest wymagany.'
  }),
  password: Joi.string().pattern(new RegExp('^(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$')).required().messages({
    'string.pattern.base': 'Hasło musi mieć co najmniej 8 znaków, jedną wielką literę, jedną cyfrę i jeden znak specjalny.',
    'any.required': 'Hasło jest wymagane.'
  }),
  phone: Joi.string().pattern(/^[0-9]{9,12}$/).required().messages({
    'string.pattern.base': 'Nieprawidłowy numer telefonu. Powinien zawierać 9-12 cyfr.',
    'any.required': 'Numer telefonu jest wymagany.'
  }),
  dob: Joi.date().less('now').required().messages({
    'date.base': 'Nieprawidłowa data urodzenia.',
    'any.required': 'Data urodzenia jest wymagana.'
  }),
  address: Joi.object({
    street: Joi.string().allow('', null),
    city: Joi.string().allow('', null),
    zip: Joi.string().allow('', null)
  }).optional(),
  gender: Joi.string().valid('male', 'female', 'other').optional(),
  termsAccepted: Joi.boolean().valid(true).required().messages({
    'any.only': 'Musisz zaakceptować warunki korzystania.',
    'any.required': 'Akceptacja warunków jest wymagana.'
  }),
  newsletterSubscribed: Joi.boolean().optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Nieprawidłowy format email.',
    'any.required': 'Email jest wymagany.'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Hasło jest wymagane.'
  })
});

export { registerSchema, loginSchema };
