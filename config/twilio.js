// config/twilio.js
export const sendVerificationCode = async (phone, code) => {
  console.log(`MOCK: Wysyłanie kodu ${code} na numer ${phone}`);
  return true;
};