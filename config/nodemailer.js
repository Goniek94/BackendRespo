// config/nodemailer.js
import nodemailer from 'nodemailer';

// Konfiguracja transportera nodemailer
const createTransporter = () => {
  // W środowisku produkcyjnym użyj rzeczywistych danych SMTP
  if (process.env.NODE_ENV === 'production') {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
  } 
  // W środowisku deweloperskim używamy ethereal.email do testowania
  else {
    console.log('Używanie testowego konta email (ethereal.email)');
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: process.env.ETHEREAL_USER || 'mock@ethereal.email',
        pass: process.env.ETHEREAL_PASSWORD || 'mockpassword'
      }
    });
  }
};

/**
 * Wysyła email z resetem hasła
 * @param {string} email - Adres email odbiorcy
 * @param {string} token - Token resetowania hasła
 * @returns {Promise<boolean>} - Czy email został wysłany
 */
export const sendResetPasswordEmail = async (email, token) => {
  try {
    // W trybie deweloperskim tylko logujemy
    if (process.env.NODE_ENV !== 'production') {
      console.log(`MOCK: Wysyłanie emaila resetowania hasła do ${email} z tokenem ${token}`);
      return true;
    }

    const transporter = createTransporter();
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@marketplace.com',
      to: email,
      subject: 'Reset hasła',
      html: `
        <h1>Reset hasła</h1>
        <p>Otrzymujesz tę wiadomość, ponieważ Ty (lub ktoś inny) zażądał zresetowania hasła do Twojego konta.</p>
        <p>Kliknij poniższy link, aby zresetować hasło:</p>
        <a href="${resetUrl}" target="_blank">Resetuj hasło</a>
        <p>Jeśli to nie Ty zażądałeś zresetowania hasła, zignoruj tę wiadomość, a Twoje hasło pozostanie niezmienione.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Błąd podczas wysyłania emaila resetowania hasła:', error);
    return false;
  }
};

/**
 * Wysyła email z powiadomieniem o nowej wiadomości
 * @param {string} email - Adres email odbiorcy
 * @param {string} senderName - Nazwa nadawcy
 * @param {string} messageSubject - Temat wiadomości
 * @param {string} messagePreview - Podgląd treści wiadomości
 * @param {string} adTitle - Tytuł ogłoszenia (opcjonalnie)
 * @returns {Promise<boolean>} - Czy email został wysłany
 */
export const sendNewMessageEmail = async (email, senderName, messageSubject, messagePreview, adTitle = null) => {
  try {
    // W trybie deweloperskim tylko logujemy
    if (process.env.NODE_ENV !== 'production') {
      console.log(`MOCK: Wysyłanie emaila o nowej wiadomości do ${email} od ${senderName}`);
      console.log(`Temat: ${messageSubject}`);
      console.log(`Podgląd: ${messagePreview}`);
      if (adTitle) console.log(`Dotyczy ogłoszenia: ${adTitle}`);
      return true;
    }

    const transporter = createTransporter();
    const inboxUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile/messages`;

    // Przygotowanie treści emaila
    let subject = `Nowa wiadomość od ${senderName}`;
    let adInfo = '';
    
    if (adTitle) {
      subject += ` - ${adTitle}`;
      adInfo = `<p>Wiadomość dotyczy ogłoszenia: <strong>${adTitle}</strong></p>`;
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@marketplace.com',
      to: email,
      subject: subject,
      html: `
        <h1>Nowa wiadomość</h1>
        <p>Otrzymałeś nową wiadomość od użytkownika <strong>${senderName}</strong>.</p>
        ${adInfo}
        <h2>Temat: ${messageSubject}</h2>
        <p><em>${messagePreview}...</em></p>
        <p>Aby przeczytać całą wiadomość i odpowiedzieć, kliknij poniższy link:</p>
        <a href="${inboxUrl}" target="_blank">Przejdź do skrzynki odbiorczej</a>
      `
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Błąd podczas wysyłania emaila o nowej wiadomości:', error);
    return false;
  }
};
