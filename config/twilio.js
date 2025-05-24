// config/twilio.js
/**
 * Symulacja wysyłania kodu weryfikacyjnego SMS
 * @param {string} phone - Numer telefonu odbiorcy
 * @param {string} code - Kod weryfikacyjny
 * @returns {Promise<object>} - Obiekt z informacjami o wysłanej wiadomości
 */
export const sendVerificationCode = async (phone, code) => {
  console.log('====================================');
  console.log(`SYMULACJA TWILIO: Wysyłanie kodu ${code} na numer ${phone}`);
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
  sendWelcomeMessage
};