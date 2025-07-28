import logger from '../utils/logger.js';

/**
 * Bezpieczny error handler - nie ujawnia szczegółów technicznych w produkcji
 * Loguje wszystkie błędy dla celów debugowania
 */
const errorHandler = (err, req, res, next) => {
  // Zawsze loguj błąd z pełnymi szczegółami dla deweloperów
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id || 'anonymous',
    timestamp: new Date().toISOString()
  });

  // Sprawdź czy to potencjalny atak - loguj podejrzane aktywności
  if (isSecurityThreat(err, req)) {
    logger.warn('Potential security threat detected:', {
      error: err.message,
      ip: req.ip,
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
  }

  // Błędy walidacji Mongoose
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({ 
      success: false,
      error: 'Dane wejściowe są nieprawidłowe.',
      details: process.env.NODE_ENV === 'development' ? messages[0] : undefined
    });
  }
  
  // Duplikat klucza (np. email już istnieje)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    let message = 'Podane dane już istnieją w systemie.';
    
    if (field === 'email') {
      message = 'Ten adres email jest już zajęty.';
    } else if (field === 'phone') {
      message = 'Ten numer telefonu jest już zajęty.';
    }
    
    return res.status(400).json({ 
      success: false,
      error: message
    });
  }
  
  // Błędy JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ 
      success: false,
      error: 'Sesja jest nieprawidłowa. Zaloguj się ponownie.'
    });
  }
  
  // Wygaśnięcie tokenu
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ 
      success: false,
      error: 'Sesja wygasła. Zaloguj się ponownie.'
    });
  }

  // Błędy Cast (nieprawidłowe ID MongoDB)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'Nieprawidłowy identyfikator zasobu.'
    });
  }

  // Rate limiting errors
  if (err.status === 429) {
    return res.status(429).json({
      success: false,
      error: 'Zbyt wiele żądań. Spróbuj ponownie później.',
      retryAfter: err.retryAfter
    });
  }

  // Błędy autoryzacji
  if (err.statusCode === 403 || err.status === 403) {
    return res.status(403).json({
      success: false,
      error: 'Brak uprawnień do wykonania tej operacji.'
    });
  }

  // Błędy uwierzytelniania
  if (err.statusCode === 401 || err.status === 401) {
    return res.status(401).json({
      success: false,
      error: 'Wymagane uwierzytelnienie. Zaloguj się ponownie.'
    });
  }

  // Błędy "nie znaleziono"
  if (err.statusCode === 404 || err.status === 404) {
    return res.status(404).json({
      success: false,
      error: 'Żądany zasób nie został znaleziony.'
    });
  }

  // Błędy walidacji danych
  if (err.statusCode === 400 || err.status === 400) {
    return res.status(400).json({
      success: false,
      error: 'Nieprawidłowe dane wejściowe.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  // Standardowy błąd serwera - nie ujawniaj szczegółów w produkcji
  const statusCode = err.statusCode || err.status || 500;
  
  if (process.env.NODE_ENV === 'production') {
    // W produkcji zwracaj tylko ogólny komunikat
    return res.status(statusCode).json({
      success: false,
      error: statusCode >= 500 
        ? 'Wystąpił błąd serwera. Spróbuj ponownie później.'
        : 'Wystąpił błąd podczas przetwarzania żądania.'
    });
  } else {
    // W developmencie można pokazać więcej szczegółów
    return res.status(statusCode).json({
      success: false,
      error: err.message || 'Wystąpił błąd serwera',
      stack: err.stack,
      details: err
    });
  }
};

/**
 * Sprawdza czy błąd może wskazywać na próbę ataku
 */
function isSecurityThreat(err, req) {
  const suspiciousPatterns = [
    /script/i,
    /javascript/i,
    /vbscript/i,
    /onload/i,
    /onerror/i,
    /eval\(/i,
    /union.*select/i,
    /drop.*table/i,
    /insert.*into/i,
    /delete.*from/i,
    /<.*>/,
    /\.\.\//,
    /etc\/passwd/,
    /proc\/self/,
    /cmd\.exe/,
    /powershell/i
  ];

  const userInput = JSON.stringify({
    body: req.body,
    query: req.query,
    params: req.params,
    headers: req.headers
  });

  return suspiciousPatterns.some(pattern => pattern.test(userInput)) ||
         suspiciousPatterns.some(pattern => pattern.test(err.message));
}

export default errorHandler;
