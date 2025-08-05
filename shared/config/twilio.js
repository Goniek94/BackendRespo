// config/twilio.js
/**
 * Symulacja wysyłania kodu weryfikacyjnego SMS
 * @param {string} phone - Numer telefonu odbiorcy
 * @param {string} code - Kod weryfikacyjny
 * @returns {Promise<object>} - Obiekt z informacjami o wysłanej wiadomości
 */
export const sendVerificationCode = async (phone, code) => {
  console.log('====================================');
  console.log(`SYMULACJA TWILIO: Wysyłanie kodu weryfikacyjnego na numer ${phone.substring(0, 3)}***`);
  console.log('====================================');
  
  // Symulacja opóźnienia sieciowego
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Zwracamy bardziej realistyczny obiekt odpowiedzi
  return {
    sid: 'SM' + Math.random().toString(36).substring(2, 15),
    to: phone,
    body: `Twój kod weryfikacyjny: ${code}`,
    status: 'delivered',
    dateCreated: new Date().toISOString(),
    success: true
  };
};

/**
 * Symulacja weryfikacji kodu SMS
 * @param {string} phone - Numer telefonu
 * @param {string} code - Kod do weryfikacji
 * @returns {Promise<object>} - Obiekt z wynikiem weryfikacji
 */
export const verifyCode = async (phone, code) => {
  console.log('====================================');
  console.log(`SYMULACJA TWILIO: Weryfikacja kodu dla numeru ${phone.substring(0, 3)}***`);
  console.log('====================================');
  
  // Symulacja opóźnienia
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Symulacja weryfikacji (zawsze zwraca sukces dla kodu 4-cyfrowego)
  const isValid = code && code.length === 4 && /^\d+$/.test(code);
  
  return {
    valid: isValid,
    status: isValid ? 'approved' : 'denied',
    phone: phone
  };
};

/**
 * Symulacja wysyłania wiadomości powitalnej
 * @param {string} phone - Numer telefonu odbiorcy
 * @param {string} name - Imię użytkownika
 * @returns {Promise<object>} - Obiekt z informacjami o wysłanej wiadomości
 */
export const sendWelcomeMessage = async (phone, name) => {
  console.log('====================================');
  console.log(`SYMULACJA TWILIO: Wysyłanie wiadomości powitalnej do ${name} na numer ${phone}`);
  console.log('====================================');
  
  // Symulacja opóźnienia sieciowego
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Zwracamy bardziej realistyczny obiekt odpowiedzi
  return {
    sid: 'SM' + Math.random().toString(36).substring(2, 15),
    to: phone,
    body: `Witaj ${name}! Dziękujemy za rejestrację w naszym serwisie.`,
    status: 'delivered',
    dateCreated: new Date().toISOString(),
    success: true
  };
};

// Eksportowanie funkcji jako domyślnych
export default {
  sendVerificationCode,
  verifyCode,
  sendWelcomeMessage
};
