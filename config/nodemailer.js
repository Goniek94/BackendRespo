// config/nodemailer.js
export const sendResetPasswordEmail = async (email, token) => {
  console.log(`MOCK: Wysyłanie emaila resetowania hasła do ${email} z tokenem ${token}`);
  return true;
};