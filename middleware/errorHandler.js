const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  
  // Błędy walidacji Mongoose
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({ message: messages[0] });
  }
  
  // Duplikat klucza (np. email już istnieje)
  if (err.code === 11000) {
    return res.status(400).json({ message: 'Ten email jest już zajęty.' });
  }
  
  // Błąd JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Nieprawidłowy token' });
  }
  
  // Wygaśnięcie tokenu
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token wygasł' });
  }
  
  // Standardowy błąd serwera
  res.status(err.statusCode || 500).json({
    message: err.message || 'Wystąpił błąd serwera'
  });
};

export default errorHandler;